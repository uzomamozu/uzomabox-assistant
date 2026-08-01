//! Per-device persistent TCP workers (port 8888).
//!
//! Each connected device gets a background task that owns the socket:
//! line-based TX/RX, 2 s PING latency probes, 3 s STATUS polling, and
//! auto-reconnect with 1 s → 10 s exponential backoff. The firmware only
//! accepts ONE TCP client at a time, so every path out of a session drops
//! the stream (sending FIN) before anything else happens.

use crate::events;
use crate::protocol::{self, ListCollector, Reply};
use std::collections::BTreeMap;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, oneshot};

pub const DEVICE_PORT: u16 = 8888;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const BACKOFF_START: Duration = Duration::from_secs(1);
const BACKOFF_MAX: Duration = Duration::from_secs(10);
/// A STATUS dump is considered complete after this much line silence.
const STATUS_IDLE: Duration = Duration::from_millis(250);
const PING_INTERVAL: Duration = Duration::from_secs(2);
const STATUS_INTERVAL: Duration = Duration::from_secs(3);
/// A LIST reply without END:LIST after this long resolves with an error.
const LIST_TIMEOUT: Duration = Duration::from_secs(3);

/// Commands accepted by a running worker.
pub enum WorkerCmd {
    SendLine(String),
    /// Request/response for the multi-line LIST reply (v1's only one).
    ListFiles(oneshot::Sender<Result<Vec<String>, String>>),
    Shutdown,
}

/// Registry of live workers, keyed by device IP.
pub struct ConnectionManager {
    workers: Mutex<HashMap<String, mpsc::Sender<WorkerCmd>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            workers: Mutex::new(HashMap::new()),
        }
    }

    /// Start (or replace) the persistent worker for a device.
    pub fn connect(&self, app: AppHandle, ip: String) {
        self.connect_with_port(app, ip, DEVICE_PORT);
    }

    /// Same as `connect`, against a non-standard port (testing, futuros firmwares).
    pub fn connect_with_port(&self, app: AppHandle, ip: String, port: u16) {
        let mut workers = self.workers.lock().unwrap();
        // Replacing an existing worker: shut the old one down first so its
        // socket is closed before the firmware sees a second client.
        if let Some(old) = workers.remove(&ip) {
            let _ = old.try_send(WorkerCmd::Shutdown);
        }
        let (tx, rx) = mpsc::channel::<WorkerCmd>(32);
        workers.insert(ip.clone(), tx);
        drop(workers);
        // Los comandos sync de Tauri corren en el hilo principal (sin reactor
        // de tokio): hay que spawnear en el runtime global de Tauri.
        tauri::async_runtime::spawn(run_worker(app, ip, port, rx));
    }

    /// Stop the worker for a device, closing its socket cleanly.
    pub fn disconnect(&self, ip: &str) {
        let tx = self.workers.lock().unwrap().remove(ip);
        if let Some(tx) = tx {
            let _ = tx.try_send(WorkerCmd::Shutdown);
        }
    }

    /// Queue a raw protocol line for transmission.
    pub fn send_line(&self, ip: &str, line: String) -> Result<(), String> {
        let workers = self.workers.lock().unwrap();
        match workers.get(ip) {
            Some(tx) => tx
                .try_send(WorkerCmd::SendLine(line))
                .map_err(|e| format!("no se pudo encolar: {e}")),
            None => Err("dispositivo no conectado".to_string()),
        }
    }

    /// Ask a connected device for its file list (LIST request/response).
    pub async fn list_files(&self, ip: &str) -> Result<Vec<String>, String> {
        let (tx, rx) = oneshot::channel();
        {
            let workers = self.workers.lock().unwrap();
            match workers.get(ip) {
                Some(worker) => worker
                    .try_send(WorkerCmd::ListFiles(tx))
                    .map_err(|e| format!("no se pudo encolar: {e}"))?,
                None => return Err("dispositivo no conectado".to_string()),
            }
        }
        rx.await
            .map_err(|_| "el worker cerró sin responder".to_string())?
    }

    /// Shut every worker down (window/app close).
    pub fn shutdown_all(&self) {
        let txs: Vec<mpsc::Sender<WorkerCmd>> =
            self.workers.lock().unwrap().drain().map(|(_, tx)| tx).collect();
        for tx in txs {
            let _ = tx.try_send(WorkerCmd::Shutdown);
        }
    }
}

enum SessionEnd {
    /// Connection dropped; the worker should reconnect with backoff.
    Lost,
    /// Explicit shutdown requested; the worker must exit.
    Shutdown,
}

async fn run_worker(app: AppHandle, ip: String, port: u16, mut rx: mpsc::Receiver<WorkerCmd>) {
    let mut backoff = BACKOFF_START;
    loop {
        events::emit_connection_state(&app, &ip, "connecting");
        events::emit_log(&app, &ip, "sys", format!("Conectando a {ip}:{port}…"));

        let connect_result =
            tokio::time::timeout(CONNECT_TIMEOUT, TcpStream::connect((ip.as_str(), port)))
                .await;

        match connect_result {
            Ok(Ok(stream)) => {
                let _ = stream.set_nodelay(true);
                events::emit_connection_state(&app, &ip, "connected");
                events::emit_log(&app, &ip, "sys", "Conexión establecida");
                backoff = BACKOFF_START;

                match run_session(&app, &ip, stream, &mut rx).await {
                    SessionEnd::Shutdown => break,
                    SessionEnd::Lost => {
                        events::emit_connection_state(&app, &ip, "lost");
                        events::emit_log(&app, &ip, "sys", "Conexión perdida");
                    }
                }
            }
            Ok(Err(e)) => {
                events::emit_log(&app, &ip, "sys", format!("Error de conexión: {e}"));
            }
            Err(_) => {
                events::emit_log(&app, &ip, "sys", "Tiempo de conexión agotado");
            }
        }

        // Wait out the backoff, but stay responsive to commands meanwhile.
        let wait = tokio::time::sleep(backoff);
        tokio::pin!(wait);
        let mut shutting_down = false;
        loop {
            tokio::select! {
                _ = &mut wait => break,
                cmd = rx.recv() => match cmd {
                    Some(WorkerCmd::Shutdown) | None => {
                        shutting_down = true;
                        break;
                    }
                    Some(WorkerCmd::SendLine(_)) => {
                        events::emit_log(&app, &ip, "sys", "Comando ignorado: sin conexión");
                    }
                    Some(WorkerCmd::ListFiles(tx)) => {
                        let _ = tx.send(Err("sin conexión".to_string()));
                    }
                },
            }
        }
        if shutting_down {
            break;
        }
        events::emit_log(
            &app,
            &ip,
            "sys",
            format!("Reintentando en {} s…", backoff.as_secs()),
        );
        backoff = (backoff * 2).min(BACKOFF_MAX);
    }
    events::emit_connection_state(&app, &ip, "disconnected");
    events::emit_log(&app, &ip, "sys", "Desconectado");
}

/// One TCP session: greet, then multiplex reads, writes and timers until the
/// socket fails or a shutdown arrives. The stream is dropped on return,
/// which closes the socket cleanly (FIN) in every case.
async fn run_session(
    app: &AppHandle,
    ip: &str,
    stream: TcpStream,
    rx: &mut mpsc::Receiver<WorkerCmd>,
) -> SessionEnd {
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);
    let mut raw = String::new();

    let mut ping_timer = tokio::time::interval(PING_INTERVAL);
    let mut status_timer = tokio::time::interval(STATUS_INTERVAL);
    // Skip the immediate first ticks so the greeting settles first.
    ping_timer.tick().await;
    status_timer.tick().await;

    let mut last_ping_sent: Option<Instant> = None;
    let mut status_buf: BTreeMap<String, String> = BTreeMap::new();
    let mut status_flush: Option<std::pin::Pin<Box<tokio::time::Sleep>>> = None;

    // In-flight LIST request/response (v1's only multi-line one).
    let mut list: Option<(ListCollector, oneshot::Sender<Result<Vec<String>, String>>)> = None;
    let mut list_deadline: Option<std::pin::Pin<Box<tokio::time::Sleep>>> = None;

    // Helper results encoded in-loop to keep borrows simple.
    let end = loop {
        tokio::select! {
            read = reader.read_line(&mut raw) => {
                match read {
                    Ok(0) => break SessionEnd::Lost, // EOF: peer closed
                    Ok(_) => {
                        let line = raw.trim_end_matches(['\r', '\n']).to_string();
                        raw.clear();
                        events::emit_log(app, ip, "rx", line.clone());
                        // Feed the LIST collector first: its lines are also
                        // mirrored to the log above like any other traffic.
                        if let Some((collector, _)) = list.as_mut() {
                            if let Some(result) = collector.feed(&line) {
                                let (_, tx) = list.take().unwrap();
                                let _ = tx.send(result);
                                list_deadline = None;
                            }
                        }
                        match protocol::parse_reply_line(&line) {
                            Reply::Pong => {
                                if let Some(sent) = last_ping_sent.take() {
                                    events::emit_latency(app, ip, sent.elapsed().as_millis() as u64);
                                }
                            }
                            Reply::KeyValue(k, v) => {
                                status_buf.insert(k, v);
                                status_flush =
                                    Some(Box::pin(tokio::time::sleep(STATUS_IDLE)));
                            }
                            _ => {
                                // Any non key=value line terminates a dump.
                                if !status_buf.is_empty() {
                                    events::emit_status(app, ip, std::mem::take(&mut status_buf));
                                    status_flush = None;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        events::emit_log(app, ip, "sys", format!("Error de lectura: {e}"));
                        break SessionEnd::Lost;
                    }
                }
            }
            _ = async {
                match status_flush.as_mut() {
                    Some(t) => t.await,
                    None => std::future::pending().await,
                }
            } => {
                if !status_buf.is_empty() {
                    events::emit_status(app, ip, std::mem::take(&mut status_buf));
                }
                status_flush = None;
            }
            _ = async {
                match list_deadline.as_mut() {
                    Some(t) => t.await,
                    None => std::future::pending().await,
                }
            } => {
                // END:LIST lost: resolve with Err instead of hanging.
                if let Some((_, tx)) = list.take() {
                    let _ = tx.send(Err("LIST sin END:LIST (tiempo agotado)".to_string()));
                }
                list_deadline = None;
            }
            _ = ping_timer.tick() => {
                let line = protocol::encode_command(&protocol::Command::Ping);
                if write_line(&mut write_half, app, ip, &line).await.is_err() {
                    break SessionEnd::Lost;
                }
                last_ping_sent = Some(Instant::now());
            }
            _ = status_timer.tick() => {
                // Don't interleave a STATUS dump with an in-flight LIST reply.
                if list.is_none() {
                    let line = protocol::encode_command(&protocol::Command::Status);
                    if write_line(&mut write_half, app, ip, &line).await.is_err() {
                        break SessionEnd::Lost;
                    }
                }
            }
            cmd = rx.recv() => {
                match cmd {
                    Some(WorkerCmd::SendLine(line)) => {
                        if write_line(&mut write_half, app, ip, &line).await.is_err() {
                            break SessionEnd::Lost;
                        }
                    }
                    Some(WorkerCmd::ListFiles(tx)) => {
                        if list.is_some() {
                            let _ = tx.send(Err("ya hay un LIST en curso".to_string()));
                        } else {
                            let line = protocol::encode_command(&protocol::Command::List);
                            if write_line(&mut write_half, app, ip, &line).await.is_err() {
                                let _ = tx.send(Err("conexión perdida".to_string()));
                                break SessionEnd::Lost;
                            }
                            list = Some((ListCollector::new(), tx));
                            list_deadline = Some(Box::pin(tokio::time::sleep(LIST_TIMEOUT)));
                        }
                    }
                    Some(WorkerCmd::Shutdown) | None => break SessionEnd::Shutdown,
                }
            }
        }
    };

    // Resolve any pending LIST so callers never hang on a dead session.
    if let Some((_, tx)) = list.take() {
        let _ = tx.send(Err("conexión terminada durante LIST".to_string()));
    }
    end
}

/// Write one protocol line and mirror it to the TX log.
async fn write_line(
    write_half: &mut tokio::net::tcp::OwnedWriteHalf,
    app: &AppHandle,
    ip: &str,
    line: &str,
) -> std::io::Result<()> {
    let mut buf = String::with_capacity(line.len() + 1);
    buf.push_str(line);
    buf.push('\n');
    write_half.write_all(buf.as_bytes()).await?;
    events::emit_log(app, ip, "tx", line.to_string());
    Ok(())
}

/// One-shot IDENTIFY used from the device table context menu: open a short
/// connection, read the greeting, send IDENTIFY, read the reply, close.
/// Keeps the single-client firmware happy because the socket is always
/// dropped before this function returns.
pub async fn identify_once(app: &AppHandle, ip: &str) -> Result<(), String> {
    events::emit_log(app, ip, "sys", format!("Identificando {ip}…"));
    let fut = async {
        let mut stream = TcpStream::connect((ip, DEVICE_PORT))
            .await
            .map_err(|e| format!("error de conexión: {e}"))?;
        let (read_half, mut write_half) = stream.split();
        let mut reader = BufReader::new(read_half);

        // Greeting: OK:connected
        let mut greeting = String::new();
        reader
            .read_line(&mut greeting)
            .await
            .map_err(|e| format!("error de lectura: {e}"))?;
        events::emit_log(app, ip, "rx", greeting.trim_end().to_string());

        let line = protocol::encode_command(&protocol::Command::Identify);
        write_half
            .write_all(format!("{line}\n").as_bytes())
            .await
            .map_err(|e| format!("error de escritura: {e}"))?;
        events::emit_log(app, ip, "tx", line);

        let mut reply = String::new();
        reader
            .read_line(&mut reply)
            .await
            .map_err(|e| format!("error de lectura: {e}"))?;
        events::emit_log(app, ip, "rx", reply.trim_end().to_string());

        if reply.trim_end() == "OK:IDENTIFY" {
            Ok(())
        } else {
            Err(format!("respuesta inesperada: {}", reply.trim_end()))
        }
    };
    match tokio::time::timeout(Duration::from_secs(4), fut).await {
        Ok(result) => result,
        Err(_) => Err("tiempo agotado".to_string()),
    }
}

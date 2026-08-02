//! UzomaBox Assistant — Tauri backend entry point.
//!
//! All network I/O lives here (tokio); the frontend only invokes commands
//! and subscribes to events.

mod connection;
mod discovery;
mod events;
mod protocol;

use connection::ConnectionManager;
use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

struct AppState {
    connections: Arc<ConnectionManager>,
}

#[derive(Debug, Clone, Serialize)]
struct AdapterInfo {
    name: String,
    ip: String,
}

/// Enumerate local network interfaces with an IPv4 address (no shelling out).
#[tauri::command]
fn list_adapters() -> Vec<AdapterInfo> {
    let mut adapters: Vec<AdapterInfo> = if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter(|iface| !iface.is_loopback())
        .filter_map(|iface| match iface.addr {
            if_addrs::IfAddr::V4(v4) => Some(AdapterInfo {
                name: iface.name,
                ip: v4.ip.to_string(),
            }),
            _ => None,
        })
        .collect();
    adapters.sort_by(|a, b| a.name.cmp(&b.name).then(a.ip.cmp(&b.ip)));
    adapters.dedup_by(|a, b| a.name == b.name && a.ip == b.ip);
    adapters
}

/// Start a UDP discovery round from the given adapter IP.
/// Results arrive as `device_found` / `discovery_status` events.
#[tauri::command]
async fn discover(app: AppHandle, adapter_ip: String) {
    tauri::async_runtime::spawn(discovery::discover(app, adapter_ip));
}

/// Add a device by manually entered IP address.
#[tauri::command]
fn add_manual_device(app: AppHandle, ip: String) -> Result<(), String> {
    let ip = ip.trim().to_string();
    if ip.parse::<std::net::Ipv4Addr>().is_err() {
        return Err(format!("IP no válida: {ip}"));
    }
    discovery::add_manual_device(&app, ip);
    Ok(())
}

/// Open (or replace) the persistent TCP session to a device.
#[tauri::command]
fn connect(app: AppHandle, state: State<'_, AppState>, ip: String) {
    state.connections.connect(app, ip);
}

/// Close the TCP session to a device (socket is shut down cleanly).
#[tauri::command]
fn disconnect(state: State<'_, AppState>, ip: String) {
    state.connections.disconnect(&ip);
}

/// Queue one raw protocol line for a connected device.
#[tauri::command]
fn send_command(state: State<'_, AppState>, ip: String, command: String) -> Result<(), String> {
    let command = command.trim().to_string();
    if command.is_empty() {
        return Err("comando vacío".to_string());
    }
    state.connections.send_line(&ip, command)
}

/// One-shot IDENTIFY that does not disturb any persistent session state.
#[tauri::command]
async fn identify(app: AppHandle, ip: String) -> Result<(), String> {
    connection::identify_once(&app, &ip).await
}

/// Ask a connected device for its file list (LIST request/response).
#[tauri::command]
async fn list_files(state: State<'_, AppState>, ip: String) -> Result<Vec<String>, String> {
    state.connections.list_files(&ip).await
}

fn main() {
    let app = tauri::Builder::default()
        .manage(AppState {
            connections: Arc::new(ConnectionManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            list_adapters,
            discover,
            add_manual_device,
            connect,
            disconnect,
            send_command,
            identify,
            list_files
        ])
        .build(tauri::generate_context!())
        .expect("error while building UzomaBox Assistant");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            // Close every device socket cleanly before exiting.
            app_handle.state::<AppState>().connections.shutdown_all();
        }
    });
}

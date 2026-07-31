//! UDP broadcast discovery (port 7777) and manual device add.

use crate::events::{self, DeviceFoundEvent};
use crate::protocol;
use std::time::Duration;
use tauri::AppHandle;
use tokio::net::UdpSocket;

pub const DISCOVERY_PORT: u16 = 7777;
pub const SEARCH_PAYLOAD: &[u8] = b"UZOMA:SEARCH";
const DISCOVERY_WINDOW: Duration = Duration::from_millis(2500);

/// Broadcast `UZOMA:SEARCH` from the given adapter IP and emit a
/// `device_found` event per reply, plus `discovery_status` lifecycle events.
pub async fn discover(app: AppHandle, adapter_ip: String) {
    events::emit_discovery_status(&app, true, format!("Buscando desde {adapter_ip}…"));

    match collect_replies(&adapter_ip, DISCOVERY_WINDOW).await {
        Ok(devices) => {
            let found = devices.len();
            for device in devices {
                events::emit_device_found(&app, device);
            }
            let message = if found == 0 {
                "Búsqueda finalizada: sin respuestas".to_string()
            } else {
                format!("Búsqueda finalizada: {found} respuesta(s)")
            };
            events::emit_discovery_status(&app, false, message);
        }
        Err(e) => events::emit_discovery_status(&app, false, e),
    }
}

/// Pure socket round: broadcast `UZOMA:SEARCH` from `adapter_ip` and collect
/// every parseable reply for `window`. Split from `discover` so it runs
/// without a Tauri `AppHandle` (integration tests, diagnostics).
pub async fn collect_replies(
    adapter_ip: &str,
    window: Duration,
) -> Result<Vec<DeviceFoundEvent>, String> {
    let socket = UdpSocket::bind(format!("{adapter_ip}:0"))
        .await
        .map_err(|e| format!("No se pudo abrir UDP: {e}"))?;
    socket
        .set_broadcast(true)
        .map_err(|e| format!("No se pudo activar broadcast: {e}"))?;
    let target = format!("255.255.255.255:{DISCOVERY_PORT}");
    socket
        .send_to(SEARCH_PAYLOAD, &target)
        .await
        .map_err(|e| format!("No se pudo enviar búsqueda: {e}"))?;

    // Collect replies until the discovery window closes. Sockets that never
    // receive a datagram just hit the deadline and finish.
    let deadline = tokio::time::Instant::now() + window;
    let mut devices = Vec::new();
    let mut buf = [0u8; 1024];
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        match tokio::time::timeout(remaining, socket.recv_from(&mut buf)).await {
            Ok(Ok((len, _from))) => {
                let text = String::from_utf8_lossy(&buf[..len]);
                if let Some(fields) = protocol::parse_discovery_reply(&text) {
                    let get = |k: &str| fields.get(k).cloned().unwrap_or_default();
                    devices.push(DeviceFoundEvent {
                        model: get("MODEL"),
                        nick: get("NICK"),
                        ip: get("IP"),
                        fw: get("FW"),
                        temp: get("TEMP"),
                    });
                }
            }
            Ok(Err(_)) => break,    // socket error
            Err(_) => break,        // window elapsed
        }
    }
    Ok(devices)
}

/// Emit a `device_found` event for a manually entered IP (identity unknown
/// until the device is queried; the UI shows placeholders).
pub fn add_manual_device(app: &AppHandle, ip: String) {
    events::emit_device_found(
        app,
        DeviceFoundEvent {
            model: String::new(),
            nick: String::new(),
            ip,
            fw: String::new(),
            temp: String::new(),
        },
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Integración manual: requiere el simulador corriendo (`npm run sim`).
    #[tokio::test]
    #[ignore = "requiere el simulador UDP en ejecución"]
    async fn collects_simulator_replies() {
        let devices = collect_replies("192.168.1.129", Duration::from_millis(2500))
            .await
            .expect("socket round");
        assert!(!devices.is_empty(), "sin respuestas del simulador");
        assert_eq!(devices[0].model, "UzomaBox");
    }
}


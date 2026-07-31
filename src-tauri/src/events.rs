//! Event payloads emitted from the Rust backend to the frontend.

use serde::Serialize;
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct DeviceFoundEvent {
    pub model: String,
    pub nick: String,
    pub ip: String,
    pub fw: String,
    pub temp: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiscoveryStatusEvent {
    pub running: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectionStateEvent {
    pub ip: String,
    /// disconnected | connecting | connected | lost
    pub state: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LatencyEvent {
    pub ip: String,
    pub ms: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StatusEvent {
    pub ip: String,
    pub values: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogEvent {
    pub ip: String,
    /// tx | rx | sys
    pub dir: String,
    pub text: String,
    pub ts: u64,
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn emit_device_found(app: &AppHandle, device: DeviceFoundEvent) {
    let _ = app.emit("device_found", device);
}

pub fn emit_discovery_status(app: &AppHandle, running: bool, message: impl Into<String>) {
    let _ = app.emit(
        "discovery_status",
        DiscoveryStatusEvent {
            running,
            message: message.into(),
        },
    );
}

pub fn emit_connection_state(app: &AppHandle, ip: &str, state: &str) {
    let _ = app.emit(
        "connection_state",
        ConnectionStateEvent {
            ip: ip.to_string(),
            state: state.to_string(),
        },
    );
}

pub fn emit_latency(app: &AppHandle, ip: &str, ms: u64) {
    let _ = app.emit("latency", LatencyEvent { ip: ip.to_string(), ms });
}

pub fn emit_status(app: &AppHandle, ip: &str, values: BTreeMap<String, String>) {
    let _ = app.emit(
        "status_update",
        StatusEvent {
            ip: ip.to_string(),
            values,
        },
    );
}

pub fn emit_log(app: &AppHandle, ip: &str, dir: &str, text: impl Into<String>) {
    let _ = app.emit(
        "log_line",
        LogEvent {
            ip: ip.to_string(),
            dir: dir.to_string(),
            text: text.into(),
            ts: now_millis(),
        },
    );
}

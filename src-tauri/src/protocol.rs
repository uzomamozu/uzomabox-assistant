//! UzomaBox v1 line protocol: command encoding and reply decoding.
//!
//! Transport is TCP port 8888, ASCII lines terminated with `\n`.
//! Discovery replies (UDP 7777) use comma-separated `key=value` pairs.

use std::collections::BTreeMap;

/// A command that can be sent to a device. Encodes to a single protocol line.
/// The full v1 vocabulary is modelled here; later milestones build their
/// UI actions with these variants (M1 only sends Ping/Status/Identify itself).
#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    Ping,
    NumOutputs,
    SetMode(String),
    RecStart,
    RecStop,
    RecArm,
    RecStartMode(u8),
    RecStopMode(u8),
    RecTriggerUniv(u32),
    RecTriggerCh(u32),
    RecStopSecs(u32),
    Play(String),
    PlaySequence,
    Stop,
    Speed(f32),
    List,
    Delete(String),
    Config(String, String),
    TestPattern(u8),
    TestOutput(u16),
    Identify,
    Status,
    /// Pass-through for anything not modelled above (already trimmed, no `\n`).
    Raw(String),
}

/// Encode a command into its protocol line (without the trailing newline).
pub fn encode_command(cmd: &Command) -> String {
    match cmd {
        Command::Ping => "PING".to_string(),
        Command::NumOutputs => "NUM_OUTPUTS?".to_string(),
        Command::SetMode(mode) => format!("MODE:{mode}"),
        Command::RecStart => "REC:START".to_string(),
        Command::RecStop => "REC:STOP".to_string(),
        Command::RecArm => "REC:ARM".to_string(),
        Command::RecStartMode(m) => format!("REC:START_MODE={m}"),
        Command::RecStopMode(m) => format!("REC:STOP_MODE={m}"),
        Command::RecTriggerUniv(n) => format!("REC:TRIGGER_UNIV={n}"),
        Command::RecTriggerCh(n) => format!("REC:TRIGGER_CH={n}"),
        Command::RecStopSecs(n) => format!("REC:STOP_SECS={n}"),
        Command::Play(file) => format!("PLAY:{file}"),
        Command::PlaySequence => "PLAY:SEQUENCE".to_string(),
        Command::Stop => "STOP".to_string(),
        Command::Speed(v) => format!("SPEED:{v:.2}"),
        Command::List => "LIST".to_string(),
        Command::Delete(file) => format!("DELETE:{file}"),
        Command::Config(key, value) => format!("CONFIG:{key}={value}"),
        Command::TestPattern(n) => format!("COMMAND:TEST_PATTERN={n}"),
        Command::TestOutput(n) => format!("COMMAND:TEST_OUTPUT={n}"),
        Command::Identify => "IDENTIFY".to_string(),
        Command::Status => "STATUS".to_string(),
        Command::Raw(line) => line.trim().to_string(),
    }
}

/// Classification of a single line received from a device.
#[derive(Debug, Clone, PartialEq)]
pub enum Reply {
    /// `OK:<detail>` (also the `OK:connected` greeting).
    Ok(String),
    /// `ERR:<detail>`.
    Err(String),
    /// `PONG` answer to `PING`.
    Pong,
    /// A `key=value` line, part of a multi-line STATUS dump.
    KeyValue(String, String),
    /// `END:LIST`, terminates a file listing.
    ListEnd,
    /// Anything else (e.g. file names inside a LIST reply).
    Other(String),
}

/// Classify one received line.
pub fn parse_reply_line(line: &str) -> Reply {
    let line = line.trim_end();
    if let Some(detail) = line.strip_prefix("OK:") {
        return Reply::Ok(detail.to_string());
    }
    if let Some(detail) = line.strip_prefix("ERR:") {
        return Reply::Err(detail.to_string());
    }
    if line == "PONG" {
        return Reply::Pong;
    }
    if line == "END:LIST" {
        return Reply::ListEnd;
    }
    if let Some((key, value)) = parse_status_line(line) {
        return Reply::KeyValue(key, value);
    }
    Reply::Other(line.to_string())
}

/// Parse a `key=value` status line. Keys are lowercase snake_case (plus digits).
/// Returns `None` for lines that are not status lines (empty key, uppercase, no `=`).
pub fn parse_status_line(line: &str) -> Option<(String, String)> {
    let (key, value) = line.split_once('=')?;
    if key.is_empty()
        || !key
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    {
        return None;
    }
    Some((key.to_string(), value.to_string()))
}

/// Parse a discovery reply: `MODEL=…,NICK=…,IP=…,FW=…,TEMP=…`
/// (comma-separated key=value, values may not contain commas).
/// Returns `None` if the payload carries no recognizable keys at all.
pub fn parse_discovery_reply(line: &str) -> Option<BTreeMap<String, String>> {
    let mut map = BTreeMap::new();
    for pair in line.trim().split(',') {
        if let Some((key, value)) = pair.split_once('=') {
            let key = key.trim();
            if !key.is_empty() {
                map.insert(key.to_string(), value.trim().to_string());
            }
        }
    }
    if map.is_empty() {
        None
    } else {
        Some(map)
    }
}

/// State machine for multi-line framed replies: `OK:<kind>`, one item per
/// line, `END:<kind>`. Used for both LIST (file names) and PLAYLIST.
#[derive(Debug, Default)]
pub struct ListCollector {
    files: Vec<String>,
    active: bool,
    ok_marker: String,
    end_marker: String,
}

impl ListCollector {
    pub fn new() -> Self {
        Self {
            ok_marker: "OK:LIST".to_string(),
            end_marker: "END:LIST".to_string(),
            ..Default::default()
        }
    }

    /// Build a collector for the PLAYLIST framed reply (`OK:PLAYLIST` /
    /// `END:PLAYLIST`).
    pub fn for_playlist() -> Self {
        Self {
            ok_marker: "OK:PLAYLIST".to_string(),
            end_marker: "END:PLAYLIST".to_string(),
            ..Default::default()
        }
    }

    /// True mientras hay una recolección en curso (usado por los tests).
    #[allow(dead_code)]
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Feed one received line. Recognises the markers set at construction.
    pub fn feed(&mut self, line: &str) -> Option<Result<Vec<String>, String>> {
        let line = line.trim_end();
        if !self.active {
            if line == self.ok_marker {
                self.active = true;
                self.files.clear();
            }
            return None;
        }
        if line == self.end_marker {
            self.active = false;
            return Some(Ok(std::mem::take(&mut self.files)));
        }
        if line == self.ok_marker {
            self.active = false;
            self.files.clear();
            return Some(Err(format!("{} interrumpido por un nuevo {}", self.end_marker, self.ok_marker)));
        }
        if let Some(detail) = line.strip_prefix("ERR:") {
            self.active = false;
            self.files.clear();
            return Some(Err(detail.to_string()));
        }
        if line.starts_with("OK:") || line == "PONG" || parse_status_line(line).is_some() {
            self.active = false;
            self.files.clear();
            return Some(Err(format!("línea inesperada dentro de {}: {line}", self.ok_marker)));
        }
        if !line.is_empty() {
            self.files.push(line.to_string());
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_basic_commands() {
        assert_eq!(encode_command(&Command::Ping), "PING");
        assert_eq!(encode_command(&Command::NumOutputs), "NUM_OUTPUTS?");
        assert_eq!(encode_command(&Command::Identify), "IDENTIFY");
        assert_eq!(encode_command(&Command::Status), "STATUS");
        assert_eq!(encode_command(&Command::Stop), "STOP");
        assert_eq!(encode_command(&Command::List), "LIST");
    }

    #[test]
    fn encode_parameterized_commands() {
        assert_eq!(encode_command(&Command::SetMode("artnet".into())), "MODE:artnet");
        assert_eq!(encode_command(&Command::Play("REC_001.BIN".into())), "PLAY:REC_001.BIN");
        assert_eq!(encode_command(&Command::PlaySequence), "PLAY:SEQUENCE");
        assert_eq!(encode_command(&Command::Delete("SHOW_DEMO.BIN".into())), "DELETE:SHOW_DEMO.BIN");
        assert_eq!(encode_command(&Command::Speed(1.5)), "SPEED:1.50");
        assert_eq!(encode_command(&Command::Speed(0.05)), "SPEED:0.05");
        assert_eq!(encode_command(&Command::RecStartMode(2)), "REC:START_MODE=2");
        assert_eq!(encode_command(&Command::RecTriggerCh(7)), "REC:TRIGGER_CH=7");
        assert_eq!(encode_command(&Command::TestPattern(4)), "COMMAND:TEST_PATTERN=4");
        assert_eq!(encode_command(&Command::TestOutput(255)), "COMMAND:TEST_OUTPUT=255");
        assert_eq!(
            encode_command(&Command::Config("color_order".into(), "GRB".into())),
            "CONFIG:color_order=GRB"
        );
    }

    #[test]
    fn encode_raw_trims_whitespace() {
        assert_eq!(encode_command(&Command::Raw("  PING \n".into())), "PING");
    }

    #[test]
    fn parse_ok_err_pong() {
        assert_eq!(parse_reply_line("OK:connected"), Reply::Ok("connected".into()));
        assert_eq!(parse_reply_line("OK:MODE=artnet"), Reply::Ok("MODE=artnet".into()));
        assert_eq!(parse_reply_line("ERR:unknown"), Reply::Err("unknown".into()));
        assert_eq!(parse_reply_line("ERR:no such file"), Reply::Err("no such file".into()));
        assert_eq!(parse_reply_line("PONG"), Reply::Pong);
        assert_eq!(parse_reply_line("END:LIST"), Reply::ListEnd);
    }

    #[test]
    fn parse_status_lines() {
        assert_eq!(
            parse_reply_line("mode=artnet"),
            Reply::KeyValue("mode".into(), "artnet".into())
        );
        // Empty values are valid (`file=` when nothing is loaded).
        assert_eq!(parse_reply_line("file="), Reply::KeyValue("file".into(), "".into()));
        assert_eq!(
            parse_reply_line("start_universe=0,6,12,18"),
            Reply::KeyValue("start_universe".into(), "0,6,12,18".into())
        );
        // Uppercase keys are NOT status lines (e.g. OUTPUTS=8,16 reply).
        assert_eq!(
            parse_reply_line("OUTPUTS=8,16"),
            Reply::Other("OUTPUTS=8,16".into())
        );
        // Bare file names inside a LIST reply.
        assert_eq!(
            parse_reply_line("REC_001.BIN"),
            Reply::Other("REC_001.BIN".into())
        );
        // No '=' at all.
        assert_eq!(parse_status_line("garbage"), None);
        // Empty key.
        assert_eq!(parse_status_line("=value"), None);
    }

    #[test]
    fn parse_discovery_replies() {
        let map =
            parse_discovery_reply("MODEL=UzomaBox,NICK=Simulador,IP=192.168.1.50,FW=2.0.0,TEMP=0")
                .expect("valid discovery reply");
        assert_eq!(map.get("MODEL").unwrap(), "UzomaBox");
        assert_eq!(map.get("NICK").unwrap(), "Simulador");
        assert_eq!(map.get("IP").unwrap(), "192.168.1.50");
        assert_eq!(map.get("FW").unwrap(), "2.0.0");
        assert_eq!(map.get("TEMP").unwrap(), "0");
    }

    #[test]
    fn parse_discovery_rejects_garbage() {
        assert!(parse_discovery_reply("UZOMA:SEARCH").is_none());
        assert!(parse_discovery_reply("").is_none());
        assert!(parse_discovery_reply(",,,").is_none());
    }

    #[test]
    fn reply_lines_tolerate_crlf() {
        assert_eq!(parse_reply_line("PONG\r\n"), Reply::Pong);
        assert_eq!(
            parse_reply_line("fps=40\r\n"),
            Reply::KeyValue("fps".into(), "40".into())
        );
    }

    #[test]
    fn list_collector_happy_path() {
        let mut c = ListCollector::new();
        assert!(!c.is_active());
        // Unrelated traffic before OK:LIST is ignored.
        assert_eq!(c.feed("PONG"), None);
        assert!(!c.is_active());

        assert_eq!(c.feed("OK:LIST"), None);
        assert!(c.is_active());
        assert_eq!(c.feed("REC_001.BIN"), None);
        assert_eq!(c.feed("REC_002.BIN"), None);
        assert_eq!(c.feed("SHOW_DEMO.BIN"), None);
        let done = c.feed("END:LIST").expect("END:LIST completes the reply");
        assert_eq!(
            done.unwrap(),
            vec!["REC_001.BIN", "REC_002.BIN", "SHOW_DEMO.BIN"]
        );
        assert!(!c.is_active());
    }

    #[test]
    fn list_collector_empty_list() {
        let mut c = ListCollector::new();
        c.feed("OK:LIST");
        let done = c.feed("END:LIST").unwrap();
        assert_eq!(done.unwrap(), Vec::<String>::new());
    }

    #[test]
    fn list_collector_err_aborts() {
        let mut c = ListCollector::new();
        c.feed("OK:LIST");
        c.feed("REC_001.BIN");
        let err = c.feed("ERR:sd busy").unwrap().unwrap_err();
        assert_eq!(err, "sd busy");
        assert!(!c.is_active());
    }

    #[test]
    fn list_collector_rejects_protocol_lines_inside() {
        for line in ["OK:STOP", "PONG", "mode=artnet"] {
            let mut c = ListCollector::new();
            c.feed("OK:LIST");
            let err = c.feed(line).unwrap().unwrap_err();
            assert!(err.contains("inesperada"), "line: {line}");
            assert!(!c.is_active());
        }
    }

    #[test]
    fn list_collector_nested_ok_list_is_an_error() {
        let mut c = ListCollector::new();
        c.feed("OK:LIST");
        c.feed("REC_001.BIN");
        assert!(c.feed("OK:LIST").unwrap().is_err());
        assert!(!c.is_active());
    }
}

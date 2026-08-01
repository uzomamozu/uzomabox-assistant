#!/usr/bin/env node
/**
 * UzomaBox device simulator — implements the full v1 line protocol.
 *
 * - UDP 7777: answers exact `UZOMA:SEARCH` broadcasts with the identity line.
 * - TCP 8888: ONE client at a time; sends `OK:connected` on connect.
 * - In-memory state for mode, recording, playback, config and test commands.
 *
 * Zero dependencies. Run with: npm run sim
 */
import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';

const UDP_PORT = Number(process.env.UZOMA_SIM_UDP_PORT) || 7777;
const TCP_PORT = Number(process.env.UZOMA_SIM_TCP_PORT) || 8888;
const FIRMWARE = '2.0.0';
const COLOR_ORDERS = ['RGB', 'GRB', 'BGR', 'RBG', 'GBR', 'BRG'];
const MODES = ['artnet', 'playback', 'record', 'test'];
const REBOOT_KEYS = new Set(['ip', 'mac', 'led_width', 'record_fps']);
const REBOOT_MS = 3000;

function localIp() {
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return '127.0.0.1';
}

function ts() {
  return new Date().toISOString().slice(11, 23);
}
function log(msg) {
  process.stdout.write(`[${ts()}] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// In-memory device state
// ---------------------------------------------------------------------------
const files = ['REC_001.BIN', 'REC_002.BIN', 'SHOW_DEMO.BIN'];

const state = {
  model: 'UzomaBox',
  nick: 'Simulador',
  fw: FIRMWARE,
  temp: '0',
  ip: localIp(),
  mac: 'DE:AD:BE:EF:00:01',
  mode: 'artnet',
  led_width: 1020,
  record_fps: 30,
  color_order: 'RGB',
  playback_speed: 1.0,
  recording: false,
  armed: false,
  playing: false,
  file: '',
  frames: 0,
  record_time: 0,
  file_pos: 0,
  file_total: 0,
  output_count: 8,
  test_pattern: 0,
  test_output: 255,
  rec: { start_mode: 0, stop_mode: 0, trigger_univ: 0, trigger_ch: 0, stop_secs: 0 },
  output_active: Array.from({ length: 16 }, (_, i) => (i < 8 ? 1 : 0)),
  start_universe: Array.from({ length: 16 }, (_, i) => i * 6),
  fps: 0,
  artnet_fps: 0,
};

// Simulated live counters, recomputed once per second.
setInterval(() => {
  const jitter = () => 38 + Math.floor(Math.random() * 5); // 38..42
  if (state.mode === 'artnet') {
    state.fps = jitter();
    state.artnet_fps = state.fps;
  } else if (state.mode === 'playback' && state.playing) {
    state.fps = state.record_fps;
    state.artnet_fps = 0;
    state.frames += state.record_fps;
    if (state.file_total > 0) {
      state.file_pos = Math.min(state.file_total, state.file_pos + state.record_fps);
      if (state.file_pos >= state.file_total) {
        state.playing = false; // reached end of file
      }
    }
  } else if (state.mode === 'record' && state.recording) {
    state.fps = state.record_fps;
    state.artnet_fps = 0;
    state.frames += state.record_fps;
    state.record_time += 1;
  } else {
    state.fps = 0;
    state.artnet_fps = 0;
  }
}, 1000).unref();

// ---------------------------------------------------------------------------
// UDP discovery responder
// ---------------------------------------------------------------------------
const udp = dgram.createSocket('udp4');
udp.on('message', (msg, rinfo) => {
  const text = msg.toString('utf8');
  log(`UDP  <- ${rinfo.address}:${rinfo.port} ${JSON.stringify(text)}`);
  if (text === 'UZOMA:SEARCH') {
    const reply = `MODEL=${state.model},NICK=${state.nick},IP=${state.ip},FW=${state.fw},TEMP=${state.temp}`;
    udp.send(reply, rinfo.port, rinfo.address, () => {
      log(`UDP  -> ${rinfo.address}:${rinfo.port} ${reply}`);
    });
  }
});
udp.on('error', (err) => log(`UDP error: ${err.message}`));
udp.bind(UDP_PORT, () => log(`UDP discovery listening on 0.0.0.0:${UDP_PORT}`));

// ---------------------------------------------------------------------------
// TCP protocol server (one client at a time)
// ---------------------------------------------------------------------------
let currentClient = null;
let rebootUntil = 0;

function statusDump() {
  return [
    `mode=${state.mode}`,
    `ip=${state.ip}`,
    `led_width=${state.led_width}`,
    `fps=${state.fps}`,
    `recording=${state.recording ? 1 : 0}`,
    `playing=${state.playing ? 1 : 0}`,
    `file=${state.file}`,
    `frames=${state.frames}`,
    `artnet_active=${state.mode === 'artnet' ? 1 : 0}`,
    `artnet_fps=${state.artnet_fps}`,
    `color_order=${state.color_order}`,
    `playback_speed=${state.playback_speed.toFixed(2)}`,
    `record_fps=${state.record_fps}`,
    `record_time=${state.record_time}`,
    `start_universe=${state.start_universe.join(',')}`,
    `file_pos=${state.file_pos}`,
    `file_total=${state.file_total}`,
    `output_active=${state.output_active.join(',')}`,
    `output_count=${state.output_count}`,
  ];
}

function parseCsvInts(value, expected, min, max) {
  const parts = value.split(',');
  if (parts.length !== expected) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < min || n > max)) return null;
  return nums;
}

/** Handle one protocol line. Returns lines to send back. */
function handleCommand(line) {
  if (line === 'PING') return ['PONG'];
  if (line === 'NUM_OUTPUTS?') return ['OUTPUTS=8,16'];
  if (line === 'IDENTIFY') return ['OK:IDENTIFY'];
  if (line === 'STATUS') return statusDump();
  if (line === 'STOP') {
    state.playing = false;
    return ['OK:STOP'];
  }
  if (line === 'LIST') {
    return ['OK:LIST', ...files, 'END:LIST'];
  }

  if (line.startsWith('MODE:')) {
    const mode = line.slice(5);
    if (!MODES.includes(mode)) return ['ERR:bad mode'];
    state.mode = mode;
    if (mode === 'playback' && state.file) {
      // MODE:playback auto-starts the loaded sequence (v1 behaviour).
      state.playing = true;
    }
    if (mode !== 'playback') state.playing = false;
    if (mode !== 'record') state.recording = false;
    return [`OK:MODE=${mode}`];
  }

  if (line === 'REC:START') {
    if (state.mode !== 'record') return ['ERR:not in record mode'];
    state.recording = true;
    state.armed = false;
    state.record_time = 0;
    state.frames = 0;
    return ['OK:REC:START'];
  }
  if (line === 'REC:STOP') {
    state.recording = false;
    return ['OK:REC:STOP'];
  }
  if (line === 'REC:ARM') {
    state.armed = true;
    return ['OK:REC:ARM'];
  }
  if (line.startsWith('REC:START_MODE=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || n < 0 || n > 2) return ['ERR:range'];
    state.rec.start_mode = n;
    return [`OK:REC:START_MODE=${n}`];
  }
  if (line.startsWith('REC:STOP_MODE=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || n < 0 || n > 2) return ['ERR:range'];
    state.rec.stop_mode = n;
    return [`OK:REC:STOP_MODE=${n}`];
  }
  if (line.startsWith('REC:TRIGGER_UNIV=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || n < 0) return ['ERR:range'];
    state.rec.trigger_univ = n;
    return [`OK:REC:TRIGGER_UNIV=${n}`];
  }
  if (line.startsWith('REC:TRIGGER_CH=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || n < 0) return ['ERR:range'];
    state.rec.trigger_ch = n;
    return [`OK:REC:TRIGGER_CH=${n}`];
  }
  if (line.startsWith('REC:STOP_SECS=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || n < 0) return ['ERR:range'];
    state.rec.stop_secs = n;
    return [`OK:REC:STOP_SECS=${n}`];
  }

  if (line.startsWith('PLAY:')) {
    const file = line.slice(5);
    // v1 firmware quirk: PLAY:SEQUENCE always fails (faithful to the bug).
    if (!files.includes(file)) return ['ERR:no such file'];
    state.file = file;
    state.playing = true;
    state.file_pos = 0;
    state.file_total = 30 * 60 * 5; // fake 5 minutes @ 30 fps
    state.frames = 0;
    return [`OK:PLAY ${file}`];
  }

  if (line.startsWith('DELETE:')) {
    const file = line.slice(7);
    const idx = files.indexOf(file);
    if (idx === -1) return ['ERR:no such file'];
    files.splice(idx, 1);
    return [`OK:DELETE ${file}`];
  }

  if (line.startsWith('SPEED:')) {
    const v = Number(line.slice(6));
    if (!Number.isFinite(v) || v < 0.05 || v > 5.0) return ['ERR:range'];
    state.playback_speed = v;
    return [`OK:SPEED=${v.toFixed(2)}`];
  }

  if (line.startsWith('CONFIG:')) {
    const body = line.slice(7);
    const eq = body.indexOf('=');
    if (eq === -1) return ['ERR:bad config'];
    const key = body.slice(0, eq);
    const value = body.slice(eq + 1);
    switch (key) {
      case 'nickname':
        if (!value) return ['ERR:bad value'];
        state.nick = value;
        return ['OK:CONFIG'];
      case 'color_order':
        if (!COLOR_ORDERS.includes(value)) return ['ERR:bad value'];
        state.color_order = value;
        return ['OK:CONFIG'];
      case 'output_active': {
        const nums = parseCsvInts(value, 16, 0, 1);
        if (!nums) return ['ERR:bad value'];
        state.output_active = nums;
        return ['OK:CONFIG'];
      }
      case 'start_universe': {
        const nums = parseCsvInts(value, 16, 0, 65535);
        if (!nums) return ['ERR:bad value'];
        state.start_universe = nums;
        return ['OK:CONFIG'];
      }
      default:
        if (REBOOT_KEYS.has(key)) {
          // Apply, answer, then the caller drops the connection for 3 s.
          if (key === 'ip') state.ip = value;
          if (key === 'mac') state.mac = value;
          if (key === 'led_width') state.led_width = Number(value) || state.led_width;
          if (key === 'record_fps') state.record_fps = Number(value) || state.record_fps;
          return ['OK:CONFIG reboot', '__REBOOT__'];
        }
        return ['ERR:unknown key'];
    }
  }

  if (line.startsWith('COMMAND:TEST_PATTERN=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || n < 0 || n > 4) return ['ERR:range'];
    state.test_pattern = n;
    return [`OK:TEST_PATTERN=${n}`];
  }
  if (line.startsWith('COMMAND:TEST_OUTPUT=')) {
    const n = Number(line.split('=')[1]);
    if (!Number.isInteger(n) || !((n >= 0 && n <= 7) || n === 255)) return ['ERR:range'];
    state.test_output = n;
    return [`OK:TEST_OUTPUT=${n}`];
  }

  return ['ERR:unknown'];
}

const server = net.createServer((socket) => {
  const peer = `${socket.remoteAddress}:${socket.remotePort}`;

  if (Date.now() < rebootUntil) {
    log(`TCP  <- ${peer} rejected (device rebooting)`);
    socket.destroy();
    return;
  }
  if (currentClient) {
    log(`TCP  <- ${peer} rejected (another client is connected)`);
    socket.destroy();
    return;
  }

  currentClient = socket;
  log(`TCP  <- ${peer} connected`);
  socket.setNoDelay(true);
  socket.write('OK:connected\n');
  log(`TCP  -> ${peer} OK:connected`);

  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, '');
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      log(`TCP  <- ${peer} ${line}`);
      let reboot = false;
      for (const out of handleCommand(line)) {
        if (out === '__REBOOT__') {
          reboot = true;
          continue;
        }
        socket.write(out + '\n');
        log(`TCP  -> ${peer} ${out}`);
      }
      if (reboot) {
        log(`TCP  xx ${peer} simulating reboot: closing, refusing clients for ${REBOOT_MS} ms`);
        rebootUntil = Date.now() + REBOOT_MS;
        socket.end();
        socket.destroy();
        if (currentClient === socket) currentClient = null;
        return;
      }
    }
  });
  socket.on('close', () => {
    if (currentClient === socket) currentClient = null;
    log(`TCP  xx ${peer} disconnected`);
  });
  socket.on('error', (err) => log(`TCP  !! ${peer} ${err.message}`));
});

server.on('error', (err) => {
  log(`TCP server error: ${err.message}`);
  process.exit(1);
});

server.listen(TCP_PORT, () => {
  log(`UzomaBox simulator ready — UDP ${UDP_PORT}, TCP ${TCP_PORT}, identity ${state.model}/${state.nick} @ ${state.ip}`);
});

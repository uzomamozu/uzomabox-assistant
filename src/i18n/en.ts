/**
 * English UI strings. Must conform to `Strings` (defined by es.ts);
 * the key-parity test in ./parity.test.ts enforces it.
 */
import type { Strings } from './es';

export const en: Strings = {
  appName: 'UzomaBox Assistant',

  header: {
    help: 'Help',
    about: 'About',
    langLabel: 'Language',
  },

  toolbar: {
    search: 'Search controllers',
    searching: 'Searching…',
    adapter: 'Adapter:',
    noAdapters: 'No network adapters',
    refresh: 'Refresh adapters',
    manualPlaceholder: 'Add by IP…',
    add: 'Add',
  },

  table: {
    model: 'Model',
    nick: 'Nickname',
    ip: 'IP',
    fw: 'Firmware',
    unknown: '—',
    empty: 'No controllers. Press “Search controllers” to discover devices on the network.',
  },

  menu: {
    open: 'Open configuration',
    identify: 'Identify',
    remove: 'Remove from list',
  },

  tabs: {
    devices: 'Controllers',
  },

  statusbar: {
    ready: 'Ready',
    devices: (n: number) => (n === 1 ? '1 controller' : `${n} controllers`),
    version: (v: string) => `v${v}`,
  },

  device: {
    back: 'Back',
    close: 'Close',
    tabs: {
      general: 'General',
      leds: 'LEDs',
      artnet: 'ArtNet',
      playback: 'Playback',
      grabacion: 'Record',
      test: 'Test',
      estado: 'Status',
    },
    conn: {
      disconnected: 'Disconnected',
      connecting: 'Connecting…',
      connected: 'Connected',
      lost: 'Connection lost',
    },
    latency: (ms: number) => `${ms} ms`,
    stalledHint:
      'No response from the device. If it already had an open session from before (v1 firmware allows only one client), reboot it to free the session.',
  },

  estado: {
    title: 'Device status',
    identify: 'Identify',
    identifyHint: 'Blinks the on-board LED so you can physically locate the device.',
    consoleTitle: 'TX/RX console',
    clear: 'Clear',
    noData: 'Waiting for the first STATUS dump…',
    consoleEmpty: 'No activity yet.',
  },

  playback: {
    activate: 'Activate Playback mode',
    active: 'Playback mode active',
    autostartHint: 'v1 firmware automatically starts the full sequence when entering Playback mode.',
    files: 'Files',
    refresh: 'Refresh',
    loading: 'Loading…',
    empty: 'No recorded files.',
    play: 'Play',
    delete: 'Delete',
    confirmDeleteTitle: 'Delete file',
    confirmDeleteBody: (file: string) => `“${file}” will be deleted from the device. Continue?`,
    playAll: 'Play all',
    playAllHint: 'Not available on v1 firmware (PLAY:SEQUENCE is broken in the firmware); upgrade to firmware v2.',
    playAllHintV2: 'Play all recorded files in alphabetical order.',
    speed: 'Speed',
    progress: 'Progress',
    stop: 'Stop',
    nowPlaying: (file: string) => `Playing: ${file}`,
    nothingPlaying: 'Nothing playing.',
    listError: (err: string) => `Could not fetch the list: ${err}`,
  },
  playlist: {
    select: 'Select for playback',
    deselect: 'Remove from selection',
    selectHint: 'Select at least one file to enable playback.',
    playSelected: (n: number) => `Play selected (${n})`,
    playSelectedHint: (n: number) => `Play the ${n} selected file${n !== 1 ? 's' : ''}.`,
  },

  grabacion: {
    activate: 'Activate Record mode',
    active: 'Record mode active',
    state: 'State',
    recording: 'Recording',
    idle: 'Idle',
    elapsed: 'Elapsed',
    currentFile: 'Current file',
    controls: 'Controls',
    start: 'Start',
    stop: 'Stop',
    arm: 'Arm',
    fps: 'Recording FPS',
    fpsInvalid: 'Enter an integer between 5 and 60',
    confirmFpsTitle: 'Change recording FPS',
    confirmFpsBody:
      'The device will reboot when this change is applied and the connection will drop for a few seconds; the app will reconnect automatically.',
    startTrigger: 'Start trigger',
    startModes: ['Immediate', 'First non-zero frame', 'Channel change'],
    universe: 'Universe',
    channel: 'Channel',
    stopTrigger: 'Stop trigger',
    stopModes: ['Manual', 'All zero', 'Timer'],
    seconds: 'Seconds',
    volatileHint: 'Trigger parameters are volatile in v1 (not stored on the device).',
  },

  shared: {
    apply: 'Apply',
    cancel: 'Cancel',
    confirm: 'Confirm',
    notConnected: 'No connection to the device. Controls will be enabled once it reconnects.',
    rebooting: 'Rebooting the device, reconnecting…',
    rebootWarn: 'The device will reboot when this change is applied and the connection will be restored automatically.',
  },

  general: {
    nickname: 'Nickname',
    network: 'Network',
    staticIp: 'Static IP',
    mac: 'MAC address',
    macPlaceholder: 'AA:BB:CC:DD:EE:FF',
    macBlindNote: 'v1 firmware does not expose the current MAC; it is written blindly.',
    info: 'Device information',
    model: 'Model',
    firmware: 'Firmware',
    outputs: 'Outputs',
    maintenance: 'Maintenance',
    restart: 'Reboot device',
    restartNote:
      'The v1 protocol has no REBOOT command: this resends CONFIG:record_fps with its current value, which forces a reboot.',
    confirmIpTitle: 'Change static IP',
    confirmIpBody:
      'The device will reboot when the new IP is applied and the connection will drop for a few seconds; the app will reconnect automatically.',
    confirmMacTitle: 'Write MAC address',
    confirmMacBody:
      'The device will reboot when the new MAC is applied and the connection will drop for a few seconds; the app will reconnect automatically.',
    confirmRestartTitle: 'Reboot the device',
    confirmRestartBody: 'The connection will drop for a few seconds and will be restored automatically. Continue?',
    invalidIp: 'Enter a valid IPv4 address (e.g. 192.168.1.50)',
    invalidMac: 'Expected format: AA:BB:CC:DD:EE:FF',
  },

  leds: {
    strip: 'LED strip',
    width: 'LEDs per strip',
    widthHint: 'Valid range: 1–1020 (170 px per universe × 6 universes).',
    widthInvalid: 'Enter an integer between 1 and 1020',
    colorOrder: 'Color order',
    confirmWidthTitle: 'Change LEDs per strip',
    confirmWidthBody:
      'The device will reboot when this change is applied and the connection will drop for a few seconds; the app will reconnect automatically.',
    outputMap: 'Output map',
    colOutput: 'Output',
    colActive: 'Active',
    colStart: 'Start universe',
    colEnd: 'End universe',
    colEndChannel: 'End channel',
    colSubnet: 'Subnet:Univ',
    startInvalid: '0–255',
    universePending: 'The universe map has been saved but is inert until the device is rebooted.',
    restartNow: 'Reboot now',
    confirmRestartTitle: 'Reboot the device',
    confirmRestartBody: 'The new universe map will be applied. The connection will be restored automatically. Continue?',
  },

  artnet: {
    title: 'ArtNet mode',
    activate: 'Activate ArtNet mode',
    active: 'ArtNet mode active',
    currentMode: (mode: string) => `Current mode: ${mode}`,
    receiving: 'Receiving ArtNet',
    idle: 'No ArtNet activity',
    fpsLabel: 'ArtNet fps',
  },

  dmx: {
    title: 'DMX512 output',
    enable: 'DMX output enabled',
    universe: 'DMX universe',
    universeHint: 'Valid range: 0–32767. The DMX512 output mirrors this Art-Net universe.',
    universeInvalid: 'Enter an integer between 0 and 32767',
  },

  test: {
    pattern: 'Test pattern',
    patterns: ['RGBW cycle', 'Rainbow fade', 'Red', 'Green', 'Blue'],
    patternsV2: ['Diagnostic chase (1 pixel)', 'White 10% (load)'],
    output: 'Output',
    outputAll: 'All',
    outputN: (n: number) => `Output ${n}`,
    start: 'Start test',
    stop: 'Stop test',
    runningNote: 'Test running: ArtNet output is stopped.',
  },

  about: {
    title: 'About',
    description: 'Discovery and configuration tool for UzomaBox Art-Net LED controllers (Teensy 4.1).',
    close: 'Close',
  },

  help: {
    title: 'Help',
    items: [
      'Press “Search controllers” to discover UzomaBox devices on the selected network.',
      'Double-click (or right-click → “Open configuration”) a controller to open its configuration window.',
      'The “Status” tab shows the live state and the protocol TX/RX console.',
      'The language (ES/EN) can be changed from the selector in the top bar and is saved automatically.',
    ],
    close: 'Close',
  },

  messages: {
    identifySent: (ip: string) => `IDENTIFY sent to ${ip}`,
    identifyFailed: (ip: string, err: string) => `Could not identify ${ip}: ${err}`,
    adaptersFailed: (err: string) => `Error enumerating adapters: ${err}`,
    invalidIp: (ip: string) => `Invalid IP: ${ip}`,
    selectAdapter: 'Select a network adapter first',
    searchingFrom: (ip: string) => `Searching from ${ip}…`,
  },
};

import { create } from 'zustand';

export type ThemeName = 'uzoma-red' | 'electric-cyan' | 'amber-stage';

export const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'uzoma-red', label: 'Uzoma Red', swatch: '#E5484D' },
  { id: 'electric-cyan', label: 'Electric Cyan', swatch: '#22D3EE' },
  { id: 'amber-stage', label: 'Amber Stage', swatch: '#F5A623' },
];

export interface Device {
  model: string;
  nick: string;
  ip: string;
  fw: string;
  temp: string;
}

export interface Adapter {
  name: string;
  ip: string;
}

export type ConnState = 'disconnected' | 'connecting' | 'connected' | 'lost';

export interface LogLine {
  ts: number;
  dir: 'tx' | 'rx' | 'sys';
  text: string;
}

export type TabId = 'red' | 'leds' | 'artnet' | 'playback' | 'grabacion' | 'test' | 'estado';

export type View = { kind: 'main' } | { kind: 'device'; ip: string };

const MAX_LOG_LINES = 500;
const THEME_STORAGE_KEY = 'uzomabox-theme';

function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'uzoma-red' || saved === 'electric-cyan' || saved === 'amber-stage') return saved;
  } catch {
    // localStorage no disponible: usar el tema por defecto
  }
  return 'electric-cyan';
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
}

interface AppState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;

  devices: Record<string, Device>;
  deviceFound: (device: Device) => void;
  removeDevice: (ip: string) => void;
  setDeviceNick: (ip: string, nick: string) => void;

  adapters: Adapter[];
  setAdapters: (adapters: Adapter[]) => void;
  selectedAdapter: string;
  setSelectedAdapter: (ip: string) => void;

  discovering: boolean;
  discoveryMessage: string;
  setDiscovery: (running: boolean, message: string) => void;

  view: View;
  openDevice: (ip: string) => void;
  closeDevice: () => void;

  connState: Record<string, ConnState>;
  setConnState: (ip: string, state: ConnState) => void;

  latency: Record<string, number>;
  setLatency: (ip: string, ms: number) => void;

  status: Record<string, Record<string, string>>;
  statusUpdate: (ip: string, values: Record<string, string>) => void;

  logs: Record<string, LogLine[]>;
  logLine: (ip: string, line: LogLine) => void;
  clearLog: (ip: string) => void;

  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

const theme = initialTheme();
applyTheme(theme);

export const useAppStore = create<AppState>((set) => ({
  theme,
  setTheme: (next) => {
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignorar: la persistencia del tema es best-effort
    }
    set({ theme: next });
  },

  devices: {},
  deviceFound: (device) =>
    set((s) => ({ devices: { ...s.devices, [device.ip]: device } })),
  removeDevice: (ip) =>
    set((s) => {
      const devices = { ...s.devices };
      delete devices[ip];
      return { devices };
    }),
  setDeviceNick: (ip, nick) =>
    set((s) =>
      s.devices[ip] ? { devices: { ...s.devices, [ip]: { ...s.devices[ip], nick } } } : s,
    ),

  adapters: [],
  setAdapters: (adapters) => set({ adapters }),
  selectedAdapter: '',
  setSelectedAdapter: (ip) => set({ selectedAdapter: ip }),

  discovering: false,
  discoveryMessage: '',
  setDiscovery: (running, message) => set({ discovering: running, discoveryMessage: message }),

  view: { kind: 'main' },
  openDevice: (ip) => set({ view: { kind: 'device', ip }, activeTab: 'estado' }),
  closeDevice: () => set({ view: { kind: 'main' } }),

  connState: {},
  setConnState: (ip, state) => set((s) => ({ connState: { ...s.connState, [ip]: state } })),

  latency: {},
  setLatency: (ip, ms) => set((s) => ({ latency: { ...s.latency, [ip]: ms } })),

  status: {},
  statusUpdate: (ip, values) =>
    set((s) => ({ status: { ...s.status, [ip]: { ...s.status[ip], ...values } } })),

  logs: {},
  logLine: (ip, line) =>
    set((s) => {
      const current = s.logs[ip] ?? [];
      const next = current.length >= MAX_LOG_LINES ? current.slice(-MAX_LOG_LINES + 1) : current;
      return { logs: { ...s.logs, [ip]: [...next, line] } };
    }),
  clearLog: (ip) => set((s) => ({ logs: { ...s.logs, [ip]: [] } })),

  activeTab: 'estado',
  setActiveTab: (tab) => set({ activeTab: tab }),

  aboutOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
}));

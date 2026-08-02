import { create } from 'zustand';
import { setI18nLang, type Lang } from '../i18n';

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

export type TabId = 'general' | 'leds' | 'artnet' | 'playback' | 'grabacion' | 'test' | 'estado';

const MAX_LOG_LINES = 500;
const LANG_STORAGE_KEY = 'uzomabox-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // localStorage no disponible: usar el idioma por defecto
  }
  return 'es';
}

interface AppState {
  lang: Lang;
  setLang: (lang: Lang) => void;

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

  // Pestañas de dispositivo dentro de la ventana principal (M2.1 reemplaza
  // las ventanas OS por pestañas: crear un segundo WebView2 en Windows es
  // frágil). `activeView` es 'devices' (la tabla) o la IP de una pestaña.
  openDevices: string[];
  activeView: string;
  openDevice: (ip: string) => void;
  closeDevice: (ip: string) => void;
  setActiveView: (view: string) => void;

  aboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

const lang = initialLang();
setI18nLang(lang);

export const useAppStore = create<AppState>((set) => ({
  lang,
  setLang: (next) => {
    setI18nLang(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignorar: la persistencia del idioma es best-effort
    }
    set({ lang: next });
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

  openDevices: [],
  activeView: 'devices',
  openDevice: (ip) =>
    set((s) => ({
      openDevices: s.openDevices.includes(ip) ? s.openDevices : [...s.openDevices, ip],
      activeView: ip,
    })),
  closeDevice: (ip) =>
    set((s) => {
      const idx = s.openDevices.indexOf(ip);
      const openDevices = s.openDevices.filter((x) => x !== ip);
      let activeView = s.activeView;
      if (activeView === ip) {
        // Activa la pestaña vecina (o la tabla si no queda ninguna).
        activeView = openDevices[Math.min(idx, openDevices.length - 1)] ?? 'devices';
      }
      return { openDevices, activeView };
    }),
  setActiveView: (view) => set({ activeView: view }),

  aboutOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
}));

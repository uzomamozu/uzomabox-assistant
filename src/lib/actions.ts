import { t } from '../i18n';
import { ipc, isTauri } from './ipc';
import { useAppStore, type TabId } from '../store/appStore';

/** Recarga la lista de adaptadores de red y mantiene una selección válida. */
export async function refreshAdapters(): Promise<void> {
  const s = useAppStore.getState();
  if (!isTauri) {
    // Vista previa en navegador (sin backend): datos de demostración.
    s.setAdapters([{ name: 'en0 (demo)', ip: '192.168.1.10' }]);
    if (!s.selectedAdapter) s.setSelectedAdapter('192.168.1.10');
    return;
  }
  try {
    const adapters = await ipc.listAdapters();
    s.setAdapters(adapters);
    if (!adapters.some((a) => a.ip === s.selectedAdapter)) {
      s.setSelectedAdapter(adapters[0]?.ip ?? '');
    }
  } catch (err) {
    s.setDiscovery(false, t.messages.adaptersFailed(String(err)));
  }
}

/** Lanza una ronda de descubrimiento UDP desde el adaptador seleccionado. */
export async function runDiscovery(): Promise<void> {
  const s = useAppStore.getState();
  if (!isTauri) {
    // Vista previa en navegador: simula un dispositivo encontrado.
    s.setDiscovery(true, t.toolbar.searching);
    window.setTimeout(() => {
      const st = useAppStore.getState();
      st.deviceFound({ model: 'UzomaBox', nick: 'Simulador (demo)', ip: '192.168.1.50', fw: '2.0.0', temp: '0' });
      st.setDiscovery(false, t.statusbar.ready);
    }, 600);
    return;
  }
  if (!s.selectedAdapter) {
    s.setDiscovery(false, t.messages.selectAdapter);
    return;
  }
  // Feedback inmediato al hacer clic (el backend refinará el mensaje vía eventos).
  s.setDiscovery(true, t.messages.searchingFrom(s.selectedAdapter));
  try {
    await ipc.discover(s.selectedAdapter);
  } catch (err) {
    s.setDiscovery(false, String(err));
  }
}

/** Agrega un dispositivo por IP manual. */
export async function addManualDevice(ip: string): Promise<void> {
  const s = useAppStore.getState();
  const trimmed = ip.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    s.setDiscovery(false, t.messages.invalidIp(trimmed));
    return;
  }
  if (!isTauri) {
    s.deviceFound({ model: 'UzomaBox', nick: '', ip: trimmed, fw: '', temp: '' });
    return;
  }
  try {
    await ipc.addManualDevice(trimmed);
  } catch (err) {
    s.setDiscovery(false, String(err));
  }
}

/** IDENTIFY puntual desde el menú contextual de la tabla. */
export async function identifyDevice(ip: string): Promise<void> {
  const s = useAppStore.getState();
  if (!isTauri) {
    s.setDiscovery(false, t.messages.identifySent(ip));
    return;
  }
  try {
    await ipc.identify(ip);
    s.setDiscovery(false, t.messages.identifySent(ip));
  } catch (err) {
    s.setDiscovery(false, t.messages.identifyFailed(ip, String(err)));
  }
}

/** Quita un dispositivo de la lista (cerrando su conexión si existe). */
export async function removeDevice(ip: string): Promise<void> {
  const s = useAppStore.getState();
  if (isTauri) {
    try {
      await ipc.disconnect(ip);
    } catch {
      // si no había conexión no hay nada que cerrar
    }
  }
  s.removeDevice(ip);
}

/**
 * Abre la ventana de configuración del dispositivo (una ventana OS por
 * controlador; si ya existe, el backend la enfoca).
 */
export async function openDeviceWindow(ip: string): Promise<void> {
  const s = useAppStore.getState();
  const device = s.devices[ip];
  const name = device?.nick?.trim() || device?.model?.trim() || ip;
  if (!isTauri) {
    // Vista previa en navegador: la "ventana" es otra pestaña del navegador.
    window.open(`?device=${encodeURIComponent(ip)}`, '_blank');
    return;
  }
  try {
    await ipc.openDeviceWindow(ip, `UzomaBox — ${name}`);
  } catch (err) {
    s.setDiscovery(false, String(err));
  }
}

/** Valores STATUS de demostración para la vista previa en navegador. */
const DEMO_IP = '192.168.1.50';
const DEMO_STATUS: Record<string, string> = {
  mode: 'artnet',
  ip: DEMO_IP,
  led_width: '300',
  fps: '41',
  recording: '0',
  playing: '1',
  file: 'REC_001.BIN',
  frames: '0',
  artnet_active: '1',
  artnet_fps: '40',
  color_order: 'RGB',
  playback_speed: '1.00',
  record_fps: '30',
  record_time: '75',
  start_universe: Array.from({ length: 16 }, (_, i) => i * 2).join(','),
  file_pos: '1536',
  file_total: '5120',
  output_active: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0].join(','),
  output_count: '8',
};

/** Lista de archivos de demostración (navegador); mutable para Eliminar. */
const demoFiles = ['REC_001.BIN', 'REC_002.BIN', 'SHOW_DEMO.BIN'];

/** Pide la lista de archivos del dispositivo (LIST request/response).
 *  Peticiones concurrentes a la misma IP comparten una sola llamada
 *  (StrictMode dispara efectos dos veces en dev). */
const listInFlight = new Map<string, Promise<string[]>>();

export async function fetchFileList(ip: string): Promise<string[]> {
  if (!isTauri) return [...demoFiles];
  const existing = listInFlight.get(ip);
  if (existing) return existing;
  const promise = ipc.listFiles(ip).finally(() => listInFlight.delete(ip));
  listInFlight.set(ip, promise);
  return promise;
}

/** Reproduce un archivo (PLAY:<file>). */
export async function playFile(ip: string, file: string): Promise<void> {
  if (!isTauri) return;
  await ipc.sendCommand(ip, `PLAY:${file}`);
}

/** Elimina un archivo (DELETE:<file>); el llamador refresca la lista después. */
export async function deleteFile(ip: string, file: string): Promise<void> {
  if (!isTauri) {
    const idx = demoFiles.indexOf(file);
    if (idx >= 0) demoFiles.splice(idx, 1);
    return;
  }
  await ipc.sendCommand(ip, `DELETE:${file}`);
}

/**
 * Vista previa en navegador (sin backend Tauri): siembra un dispositivo de
 * demostración para la ventana principal.
 */
export function seedDemoIfNeeded(): void {
  if (isTauri) return;
  const s = useAppStore.getState();
  if (!s.devices[DEMO_IP]) {
    s.deviceFound({ model: 'UzomaBox', nick: 'Simulador (demo)', ip: DEMO_IP, fw: '2.0.0', temp: '0' });
  }
}

const VALID_TABS: TabId[] = ['general', 'leds', 'artnet', 'playback', 'grabacion', 'test', 'estado'];

/**
 * Vista previa en navegador de una ventana de dispositivo (`?device=<ip>`):
 * siembra dispositivo, conexión y STATUS de demostración para esa IP.
 * Con `&tab=<id>` selecciona la pestaña inicial (para capturas de pantalla).
 */
export function seedDeviceWindowDemo(ip: string): void {
  if (isTauri) return;
  const s = useAppStore.getState();
  if (!s.devices[ip]) {
    s.deviceFound({ model: 'UzomaBox', nick: 'Simulador (demo)', ip, fw: '2.0.0', temp: '0' });
  }
  s.setConnState(ip, 'connected');
  s.setLatency(ip, 3);
  s.statusUpdate(ip, DEMO_STATUS);

  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab && VALID_TABS.includes(tab as TabId)) {
    s.setActiveTab(tab as TabId);
  }
}

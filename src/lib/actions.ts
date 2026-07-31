import { t } from '../i18n/es';
import { ipc, isTauri } from './ipc';
import { useAppStore } from '../store/appStore';

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

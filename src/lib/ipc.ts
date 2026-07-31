import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore, type Adapter, type ConnState, type Device } from '../store/appStore';

/** True cuando la app corre dentro del webview de Tauri. */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const ipc = {
  listAdapters: () => invoke<Adapter[]>('list_adapters'),
  discover: (adapterIp: string) => invoke<void>('discover', { adapterIp }),
  addManualDevice: (ip: string) => invoke<void>('add_manual_device', { ip }),
  connect: (ip: string) => invoke<void>('connect', { ip }),
  disconnect: (ip: string) => invoke<void>('disconnect', { ip }),
  sendCommand: (ip: string, command: string) => invoke<void>('send_command', { ip, command }),
  identify: (ip: string) => invoke<void>('identify', { ip }),
};

let wired = false;

/** Suscribe el store a todos los eventos del backend. Idempotente. */
export async function wireEvents(): Promise<void> {
  if (!isTauri || wired) return;
  wired = true;
  const s = () => useAppStore.getState();

  try {
    await listen<Device>('device_found', (e) => s().deviceFound(e.payload));
    await listen<{ running: boolean; message: string }>('discovery_status', (e) =>
      s().setDiscovery(e.payload.running, e.payload.message),
    );
    await listen<{ ip: string; state: ConnState }>('connection_state', (e) =>
      s().setConnState(e.payload.ip, e.payload.state),
    );
    await listen<{ ip: string; ms: number }>('latency', (e) =>
      s().setLatency(e.payload.ip, e.payload.ms),
    );
    await listen<{ ip: string; values: Record<string, string> }>('status_update', (e) =>
      s().statusUpdate(e.payload.ip, e.payload.values),
    );
    await listen<{ ip: string; dir: 'tx' | 'rx' | 'sys'; text: string; ts: number }>(
      'log_line',
      (e) => s().logLine(e.payload.ip, { dir: e.payload.dir, text: e.payload.text, ts: e.payload.ts }),
    );
  } catch (err) {
    // Sin esto, un fallo de permisos deja la app muda (ver capabilities/default.json).
    console.error('[ipc] error registrando listeners de eventos:', err);
  }
}

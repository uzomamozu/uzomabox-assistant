import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';

/**
 * Valor local sincronizado con un valor remoto (STATUS poll cada 3 s):
 * mientras el usuario no haya tocado el campo (`dirty === false`), el valor
 * sigue al remoto; al editarlo se marca dirty y el poll no lo pisa.
 * Tras aplicar (comando enviado) se llama a `markClean` y el próximo STATUS
 * vuelve a imponer la verdad del dispositivo.
 */
export function useSyncedValue<T>(remote: T | undefined) {
  const [value, setValue] = useState<T | undefined>(remote);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty && remote !== undefined) setValue(remote);
  }, [remote, dirty]);

  const set = (v: T) => {
    setValue(v);
    setDirty(true);
  };
  const markClean = () => setDirty(false);

  return { value, set, dirty, markClean } as const;
}

/**
 * Vigila el ciclo de reinicio del dispositivo tras un CONFIG que provoca
 * reboot: `start()` al enviar el comando; el hook espera a que la conexión
 * caiga y vuelva (el worker reconecta solo) y entonces se desactiva.
 */
export function useRebootWatch(ip: string) {
  const conn = useAppStore((s) => s.connState[ip] ?? 'disconnected');
  const [rebooting, setRebooting] = useState(false);
  const sawDrop = useRef(false);

  useEffect(() => {
    if (!rebooting) return;
    if (conn !== 'connected') {
      sawDrop.current = true;
    } else if (sawDrop.current) {
      sawDrop.current = false;
      setRebooting(false);
    }
  }, [conn, rebooting]);

  return { rebooting, start: () => setRebooting(true) } as const;
}

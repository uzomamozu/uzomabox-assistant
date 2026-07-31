import { useEffect, type ReactNode } from 'react';
import { Info, TriangleAlert, Unplug } from 'lucide-react';
import { t } from '../i18n/es';
import { useAppStore } from '../store/appStore';

/** Tarjeta de sección dentro de una pestaña. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Campo con etiqueta, ayuda opcional y error en línea. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

/** Aviso informativo o de advertencia. */
export function Notice({ kind, children }: { kind: 'info' | 'warn'; children: ReactNode }) {
  const Icon = kind === 'warn' ? TriangleAlert : Info;
  return (
    <div
      className={`flex items-start gap-2 rounded border px-3 py-2 text-xs ${
        kind === 'warn' ? 'border-warn text-warn' : 'border-border text-muted'
      }`}
    >
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/**
 * Envoltorio de pestaña: deshabilita todos los controles cuando no hay
 * conexión con el dispositivo y muestra un aviso.
 */
export function TabShell({ ip, children }: { ip: string; children: ReactNode }) {
  const conn = useAppStore((s) => s.connState[ip] ?? 'disconnected');
  const connected = conn === 'connected';
  return (
    <div className="flex flex-col gap-4">
      {!connected && (
        <div className="flex items-center gap-2 rounded border border-warn px-3 py-2 text-xs text-warn">
          <Unplug size={14} className="shrink-0" />
          {t.shared.notConnected}
        </div>
      )}
      <fieldset disabled={!connected} className="contents">
        {children}
      </fieldset>
    </div>
  );
}

/** Diálogo de confirmación modal (mismo patrón visual que Ayuda/Acerca de). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="panel w-96 max-w-full p-5 shadow-xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="mb-2 text-base font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-muted">{body}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            {t.shared.cancel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? '!border-danger text-danger hover:!border-danger hover:text-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

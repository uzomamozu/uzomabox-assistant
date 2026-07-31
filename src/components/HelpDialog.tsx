import { useEffect } from 'react';
import { X } from 'lucide-react';
import { t } from '../i18n/es';
import { useAppStore } from '../store/appStore';

export default function HelpDialog() {
  const open = useAppStore((s) => s.helpOpen);
  const setOpen = useAppStore((s) => s.setHelpOpen);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="panel relative w-[28rem] max-w-full p-6 shadow-xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.help.title}
      >
        <button
          type="button"
          className="btn absolute right-2 top-2 !border-0 !bg-transparent !p-1.5"
          onClick={() => setOpen(false)}
          aria-label={t.help.close}
        >
          <X size={16} />
        </button>
        <h2 className="mb-3 text-base font-semibold">{t.help.title}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          {t.help.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-4 text-right">
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            {t.help.close}
          </button>
        </div>
      </div>
    </div>
  );
}

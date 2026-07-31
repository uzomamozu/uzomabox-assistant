import { useEffect } from 'react';
import { X } from 'lucide-react';
import vertLogo from '../assets/vert.png';
import { APP_VERSION, t } from '../i18n/es';
import { useAppStore } from '../store/appStore';

export default function AboutDialog() {
  const open = useAppStore((s) => s.aboutOpen);
  const setOpen = useAppStore((s) => s.setAboutOpen);

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
        className="panel relative flex w-80 flex-col items-center gap-3 p-6 text-center shadow-xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.about.title}
      >
        <button
          type="button"
          className="btn absolute right-2 top-2 !border-0 !bg-transparent !p-1.5"
          onClick={() => setOpen(false)}
          aria-label={t.about.close}
        >
          <X size={16} />
        </button>
        <img src={vertLogo} alt={t.appName} className="h-40 w-auto select-none" draggable={false} />
        <div>
          <h2 className="text-base font-semibold">{t.appName}</h2>
          <p className="text-sm text-muted">{t.statusbar.version(APP_VERSION)}</p>
        </div>
        <p className="text-sm text-muted">{t.about.description}</p>
        <button type="button" className="btn mt-1" onClick={() => setOpen(false)}>
          {t.about.close}
        </button>
      </div>
    </div>
  );
}

import { CircleHelp, Info } from 'lucide-react';
import horzLogo from '../assets/horz.png';
import { t, type Lang } from '../i18n';
import { useAppStore } from '../store/appStore';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
];

export default function Header() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const setHelpOpen = useAppStore((s) => s.setHelpOpen);
  const setAboutOpen = useAppStore((s) => s.setAboutOpen);

  return (
    <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-2">
      <img src={horzLogo} alt={t.appName} className="h-14 w-auto select-none" draggable={false} />
      <div className="flex items-center gap-3">
        <div
          className="flex overflow-hidden rounded border border-border"
          role="radiogroup"
          aria-label={t.header.langLabel}
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={lang === l.id}
              onClick={() => setLang(l.id)}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                lang === l.id ? 'bg-accent text-white' : 'text-muted hover:text-fg'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <button type="button" className="btn" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={16} />
          {t.header.help}
        </button>
        <button type="button" className="btn" onClick={() => setAboutOpen(true)}>
          <Info size={16} />
          {t.header.about}
        </button>
      </div>
    </header>
  );
}

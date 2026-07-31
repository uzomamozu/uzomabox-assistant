import { CircleHelp, Info } from 'lucide-react';
import horzLogo from '../assets/horz.png';
import { t } from '../i18n/es';
import { THEMES, useAppStore } from '../store/appStore';

export default function Header() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setHelpOpen = useAppStore((s) => s.setHelpOpen);
  const setAboutOpen = useAppStore((s) => s.setAboutOpen);

  return (
    <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-2">
      <img src={horzLogo} alt={t.appName} className="h-14 w-auto select-none" draggable={false} />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2" role="radiogroup" aria-label={t.header.themeLabel}>
          {THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              role="radio"
              aria-checked={theme === th.id}
              title={th.label}
              onClick={() => setTheme(th.id)}
              className={`h-5 w-5 rounded-full transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                theme === th.id ? 'ring-2 ring-fg ring-offset-2 ring-offset-panel' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: th.swatch }}
            />
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

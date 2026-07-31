import { APP_VERSION, t } from '../i18n/es';
import { useAppStore } from '../store/appStore';

export default function StatusBar() {
  const discoveryMessage = useAppStore((s) => s.discoveryMessage);
  const deviceCount = useAppStore((s) => Object.keys(s.devices).length);

  return (
    <footer className="flex items-center justify-between border-t border-border bg-panel px-4 py-1.5 text-xs text-muted">
      <span className="truncate">{discoveryMessage || t.statusbar.ready}</span>
      <span className="flex shrink-0 items-center gap-4">
        <span>{t.statusbar.devices(deviceCount)}</span>
        <span>{t.statusbar.version(APP_VERSION)}</span>
      </span>
    </footer>
  );
}

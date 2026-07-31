import { Construction } from 'lucide-react';
import { t } from '../../i18n/es';

/** Tarjeta marcador para las pestañas que llegan en M2/M3. */
export default function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="panel flex w-96 max-w-full flex-col items-center gap-3 p-8 text-center">
        <Construction size={28} className="text-muted" />
        <span className="rounded border border-accent px-2 py-0.5 text-xs font-semibold text-accent">
          {t.placeholder.badge}
        </span>
        <p className="text-sm text-muted">{t.placeholder.text(label)}</p>
      </div>
    </div>
  );
}

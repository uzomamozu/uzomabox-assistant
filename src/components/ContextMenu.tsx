import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  onClick: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Menú contextual flotante (clic derecho en la tabla de dispositivos). */
export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Evita que el menú se salga de la ventana.
  const style = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - items.length * 36 - 16),
  };

  return (
    <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={ref}
        className="panel fixed z-50 min-w-52 overflow-hidden py-1 shadow-lg shadow-black/40"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              item.danger ? 'text-danger' : 'text-fg'
            }`}
            onClick={() => {
              onClose();
              item.onClick();
            }}
          >
            <item.icon size={15} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

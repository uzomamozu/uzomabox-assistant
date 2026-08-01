import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, LocateFixed, Settings2, Trash2 } from 'lucide-react';
import { t } from '../i18n';
import { identifyDevice, openDeviceWindow, removeDevice } from '../lib/actions';
import { useAppStore, type Device } from '../store/appStore';
import ContextMenu from './ContextMenu';

// Nota: la temperatura no se muestra (el firmware v1 siempre envía TEMP=0);
// se sigue almacenando para cuando el firmware exponga el sensor del Teensy.
type SortKey = 'model' | 'nick' | 'ip' | 'fw';

const SORT_KEYS: SortKey[] = ['model', 'nick', 'ip', 'fw'];

function compareIp(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 4; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const cell = (value: string) => (value.trim() === '' ? t.table.unknown : value);

export default function DeviceTable() {
  const devices = useAppStore((s) => s.devices);
  const [sortKey, setSortKey] = useState<SortKey>('ip');
  const [sortAsc, setSortAsc] = useState(true);
  const [menu, setMenu] = useState<{ x: number; y: number; ip: string } | null>(null);

  // Etiquetas dentro del render: al cambiar el idioma se releen de `t`.
  const columns = SORT_KEYS.map((id) => ({ id, label: t.table[id] }));

  const rows = useMemo(() => {
    const list = Object.values(devices);
    const dir = sortAsc ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'ip') return compareIp(a.ip, b.ip) * dir;
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
    return list;
  }, [devices, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const openMenu = (e: React.MouseEvent, ip: string) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, ip });
  };

  return (
    <div className="panel h-full overflow-auto scroll-thin">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-panel">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className="cursor-pointer select-none border-b border-border px-4 py-2.5 font-medium text-muted transition-colors duration-150 hover:text-fg"
                onClick={() => handleSort(col.id)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.id &&
                    (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {t.table.empty}
              </td>
            </tr>
          )}
          {rows.map((d: Device) => (
            <tr
              key={d.ip}
              className="cursor-pointer border-b border-border transition-colors duration-150 last:border-0 hover:bg-bg"
              onDoubleClick={() => void openDeviceWindow(d.ip)}
              onContextMenu={(e) => openMenu(e, d.ip)}
            >
              <td className="px-4 py-2.5">{cell(d.model)}</td>
              <td className="px-4 py-2.5">{cell(d.nick)}</td>
              <td className="px-4 py-2.5 font-mono text-[13px]">{d.ip}</td>
              <td className="px-4 py-2.5">{cell(d.fw)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: t.menu.open,
              icon: Settings2,
              onClick: () => void openDeviceWindow(menu.ip),
            },
            {
              label: t.menu.identify,
              icon: LocateFixed,
              onClick: () => void identifyDevice(menu.ip),
            },
            {
              label: t.menu.remove,
              icon: Trash2,
              danger: true,
              onClick: () => void removeDevice(menu.ip),
            },
          ]}
        />
      )}
    </div>
  );
}

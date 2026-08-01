import { useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { t } from '../i18n';
import { addManualDevice, refreshAdapters, runDiscovery } from '../lib/actions';
import { useAppStore } from '../store/appStore';

export default function Toolbar() {
  const adapters = useAppStore((s) => s.adapters);
  const selectedAdapter = useAppStore((s) => s.selectedAdapter);
  const setSelectedAdapter = useAppStore((s) => s.setSelectedAdapter);
  const discovering = useAppStore((s) => s.discovering);
  const [manualIp, setManualIp] = useState('');

  const handleAdd = () => {
    if (!manualIp.trim()) return;
    void addManualDevice(manualIp);
    setManualIp('');
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-panel px-4 py-2.5">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void runDiscovery()}
        disabled={discovering}
      >
        <Search size={16} className={discovering ? 'animate-pulse' : undefined} />
        {discovering ? t.toolbar.searching : t.toolbar.search}
      </button>

      <label className="flex items-center gap-2 text-sm text-muted">
        {t.toolbar.adapter}
        <select
          className="input min-w-52"
          value={selectedAdapter}
          onChange={(e) => setSelectedAdapter(e.target.value)}
        >
          {adapters.length === 0 && <option value="">{t.toolbar.noAdapters}</option>}
          {adapters.map((a) => (
            <option key={`${a.name}-${a.ip}`} value={a.ip}>
              {a.name} — {a.ip}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn" onClick={() => void refreshAdapters()}>
        <RefreshCw size={16} />
        {t.toolbar.refresh}
      </button>

      <div className="ml-auto flex items-center gap-2">
        <input
          className="input w-40"
          placeholder={t.toolbar.manualPlaceholder}
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button type="button" className="btn" onClick={handleAdd}>
          <Plus size={16} />
          {t.toolbar.add}
        </button>
      </div>
    </div>
  );
}

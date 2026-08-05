import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Layers, Play, RefreshCw, Square, Trash2 } from 'lucide-react';
import { t } from '../../i18n';
import { deleteFile, fetchFileList, playFile } from '../../lib/actions';
import { useSyncedValue } from '../../lib/hooks';
import { ipc, isTauri } from '../../lib/ipc';
import { formatSize } from '../../lib/protocol';
import { useAppStore } from '../../store/appStore';
import { ConfirmDialog, Field, Notice, Section, TabShell } from '../controls';

export default function PlaybackTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);
  const conn = useAppStore((s) => s.connState[ip] ?? 'disconnected');

  // --- Lista de archivos (LIST request/response vía backend) ---
  const [files, setFiles] = useState<string[] | null>(null);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // --- Playlist (M6.1): archivos seleccionados con toggle ---
  // Persiste en SD vía PLAYLIST=<csv>; PLAY:SELECTED lee de SD.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const playlistTimer = useRef<number | undefined>(undefined);
  const playlistLoaded = useRef(false);
  useEffect(() => () => window.clearTimeout(playlistTimer.current), []);

  const isV2 = Number(status?.proto ?? 1) >= 2;

  const refresh = useCallback(() => {
    setListError('');
    fetchFileList(ip)
      .then((list) => setFiles(list))
      .catch((err) => {
        setFiles([]);
        setListError(t.playback.listError(String(err)));
      });
  }, [ip]);

  // Query playlist from firmware on first connect (proto>=2 only).
  // Best-effort: the playlist persists on SD; checkboxes are cosmetic.
  useEffect(() => {
    if (!isV2 || !isTauri || conn !== 'connected' || playlistLoaded.current) return;
    playlistLoaded.current = true;
    // We send PLAYLIST? and the response arrives as rx log lines.
    // For now, checkboxes start empty — the SD copy is authoritative.
    void ipc.sendCommand(ip, 'PLAYLIST?').catch(() => undefined);
  }, [ip, isV2, conn]);

  // Carga al entrar (y al recuperar la conexión).
  useEffect(() => {
    if (conn === 'connected') refresh();
  }, [conn, refresh]);

  // --- Velocidad (live, con debounce; dirty flag contra el poll STATUS) ---
  const speedRemote = status?.playback_speed !== undefined ? Number(status.playback_speed) : undefined;
  const speed = useSyncedValue(speedRemote);
  const speedTimer = useRef<number | undefined>(undefined);
  const applySpeed = (value: number) => {
    speed.set(value);
    window.clearTimeout(speedTimer.current);
    speedTimer.current = window.setTimeout(() => {
      if (isTauri) void ipc.sendCommand(ip, `SPEED:${value.toFixed(2)}`).catch(() => undefined);
    }, 300);
  };
  useEffect(() => () => window.clearTimeout(speedTimer.current), []);

  const send = (cmd: string) => {
    if (isTauri) void ipc.sendCommand(ip, cmd).catch(() => undefined);
  };

  const mode = status?.mode ?? '';
  const isPlayback = mode === 'playback';
  const playingFile = status?.file ?? '';
  const playing = status?.playing === '1';
  const pos = Number(status?.file_pos ?? 0);
  const total = Number(status?.file_total ?? 0);
  const pct = total > 0 ? Math.min(100, (pos / total) * 100) : 0;

  const handleDelete = () => {
    if (!confirmDelete) return;
    const file = confirmDelete;
    setConfirmDelete(null);
    void deleteFile(ip, file)
      .catch(() => undefined)
      .then(() => {
        setChecked((prev) => {
          const next = new Set(prev);
          next.delete(file);
          sendPlaylistNow(next);
          return next;
        });
        if (selected === file) setSelected(null);
        refresh();
      });
  };

  // Send full playlist CSV to firmware (debounced 500ms).
  const sendPlaylistNow = (set_: Set<string>) => {
    const csv = [...set_].join(',');
    if (csv.length > 0 && csv.length <= 240) {
      send(`PLAYLIST=${csv}`);
    } else if (set_.size === 0) {
      send('PLAYLIST:CLEAR');
    }
  };

  const sendPlaylist = (set_: Set<string>) => {
    window.clearTimeout(playlistTimer.current);
    playlistTimer.current = window.setTimeout(() => sendPlaylistNow(set_), 500);
  };

  const toggleFile = (file: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      sendPlaylist(next);
      return next;
    });
  };

  const checkedCount = checked.size;
  const checkedList = [...checked].join(',');

  return (
    <TabShell ip={ip}>
      {/* Modo */}
      <Section title={t.device.tabs.playback}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`btn ${isPlayback ? '' : 'btn-primary'}`}
            onClick={() => send('MODE:playback')}
            disabled={isPlayback}
          >
            <Layers size={15} />
            {isPlayback ? t.playback.active : t.playback.activate}
          </button>
          <span className="text-xs text-muted">{t.playback.autostartHint}</span>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Archivos */}
        <Section title={t.playback.files}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted">
              {files === null ? t.playback.loading : `${files.length} ${t.playback.files.toLowerCase()}`}
            </span>
            <button type="button" className="btn" onClick={refresh}>
              <RefreshCw size={14} />
              {t.playback.refresh}
            </button>
          </div>
          {listError && <Notice kind="warn">{listError}</Notice>}
          <div className="mt-2 overflow-hidden rounded border border-border">
            {files !== null && files.length === 0 && !listError && (
              <p className="px-3 py-4 text-center text-sm text-muted">{t.playback.empty}</p>
            )}
            {(files ?? []).map((file) => (
              <div
                key={file}
                className={`flex items-center gap-2 border-b border-border px-3 py-1.5 last:border-0 transition-colors duration-150 cursor-pointer ${
                  selected === file ? 'bg-bg outline outline-1 outline-inset outline-accent' : 'hover:bg-bg'
                }`}
                onClick={() => setSelected(file)}
              >
                {/* M6.1: checkbox for playlist selection (proto>=2) */}
                {isV2 && (
                  <button
                    type="button"
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      checked.has(file)
                        ? 'border-accent bg-accent text-white'
                        : 'border-muted hover:border-accent'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFile(file);
                    }}
                    title={checked.has(file) ? t.playlist.deselect : t.playlist.select}
                  >
                    {checked.has(file) && <Check size={12} strokeWidth={3} />}
                  </button>
                )}
                <span className="flex-1 truncate font-mono text-xs">{file}</span>
                <button
                  type="button"
                  className="btn !px-2 !py-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    void playFile(ip, file).catch(() => undefined);
                  }}
                >
                  <Play size={13} />
                  {t.playback.play}
                </button>
                <button
                  type="button"
                  className="btn !px-2 !py-1 text-xs !border-danger text-danger hover:!border-danger hover:text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(file);
                  }}
                >
                  <Trash2 size={13} />
                  {t.playback.delete}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {/* Play Selected (proto>=2) */}
            {isV2 && (
              <button
                type="button"
                className="btn w-full justify-center"
                disabled={checkedCount === 0 || checkedList.length > 240}
                onClick={() => send('PLAY:SELECTED')}
                title={
                  checkedCount === 0
                    ? t.playlist.selectHint
                    : t.playlist.playSelectedHint(checkedCount)
                }
              >
                <Check size={15} />
                {t.playlist.playSelected(checkedCount)}
              </button>
            )}
            {/* Play All (proto>=2: enabled; v1: disabled with hint) */}
            <button
              type="button"
              className="btn w-full justify-center"
              disabled={!isV2 || (files?.length ?? 0) === 0}
              onClick={() => send('PLAY:SEQUENCE')}
              title={isV2 ? t.playback.playAllHintV2 : t.playback.playAllHint}
            >
              {t.playback.playAll}
            </button>
            {!isV2 && <p className="mt-1 text-xs text-muted">{t.playback.playAllHint}</p>}
          </div>
        </Section>

        <div className="flex flex-col gap-4">
          {/* Velocidad */}
          <Section title={t.playback.speed}>
            <Field label={t.playback.speed}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.05}
                  max={5}
                  step={0.05}
                  className="flex-1 accent-[var(--color-accent)]"
                  value={speed.value ?? 1}
                  onChange={(e) => applySpeed(Number(e.target.value))}
                />
                <span className="w-16 text-right font-mono text-sm tabular-nums">
                  {(speed.value ?? 1).toFixed(2)}×
                </span>
              </div>
            </Field>
          </Section>

          {/* Progreso */}
          <Section title={t.playback.progress}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`flex items-center gap-2 text-sm ${playing ? 'text-ok' : 'text-muted'}`}>
                <span className={`h-2 w-2 rounded-full ${playing ? 'bg-ok animate-pulse' : 'bg-muted'}`} aria-hidden="true" />
                {playing && playingFile ? t.playback.nowPlaying(playingFile) : t.playback.nothingPlaying}
              </span>
              <button type="button" className="btn" onClick={() => send('STOP')}>
                <Square size={14} />
                {t.playback.stop}
              </button>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-xs text-muted">
              <span>
                {formatSize(pos)} / {formatSize(total)}
              </span>
              <span>{pct.toFixed(0)}%</span>
            </div>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={t.playback.confirmDeleteTitle}
        body={t.playback.confirmDeleteBody(confirmDelete ?? '')}
        confirmLabel={t.playback.delete}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </TabShell>
  );
}

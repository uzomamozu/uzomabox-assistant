import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { t } from '../../i18n/es';
import { ipc, isTauri } from '../../lib/ipc';
import { clampTestOutput, TEST_OUTPUT_ALL } from '../../lib/protocol';
import { useAppStore } from '../../store/appStore';
import { Field, Notice, Section, TabShell } from '../controls';

export default function TestTab({ ip }: { ip: string }) {
  const status = useAppStore((s) => s.status[ip]);

  const [pattern, setPattern] = useState(0);
  const [output, setOutput] = useState<number>(TEST_OUTPUT_ALL);

  // output_count viene del STATUS; el selector nunca expone un índice mayor
  // (el firmware v1 se desborda con índices >= output_count).
  const outputCount = Math.max(1, Number(status?.output_count ?? 8) || 8);
  const running = status?.mode === 'test';

  const send = (cmd: string) => {
    if (isTauri) void ipc.sendCommand(ip, cmd).catch(() => undefined);
  };

  const selectPattern = (n: number) => {
    setPattern(n);
    send(`COMMAND:TEST_PATTERN=${n}`);
  };

  const selectOutput = (n: number) => {
    const clamped = clampTestOutput(n, outputCount);
    setOutput(clamped);
    send(`COMMAND:TEST_OUTPUT=${clamped}`);
  };

  const toggle = () => {
    send(running ? 'MODE:artnet' : 'MODE:test');
  };

  return (
    <TabShell ip={ip}>
      {running && <Notice kind="info">{t.test.runningNote}</Notice>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title={t.test.pattern}>
          <div className="flex flex-col gap-2">
            {t.test.patterns.map((label, n) => (
              <label key={label} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="test-pattern"
                  className="h-4 w-4 accent-[var(--color-accent)]"
                  checked={pattern === n}
                  onChange={() => selectPattern(n)}
                />
                {label}
              </label>
            ))}
          </div>
        </Section>

        <div className="flex flex-col gap-4">
          <Section title={t.test.output}>
            <Field label={t.test.output}>
              <select
                className="input w-full"
                value={output}
                onChange={(e) => selectOutput(Number(e.target.value))}
              >
                <option value={TEST_OUTPUT_ALL}>{t.test.outputAll}</option>
                {Array.from({ length: outputCount }, (_, i) => (
                  <option key={i} value={i}>
                    {t.test.outputN(i + 1)}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <button
            type="button"
            className={`btn w-full justify-center py-2.5 ${running ? '!border-danger text-danger hover:!border-danger hover:text-danger' : 'btn-primary'}`}
            onClick={toggle}
          >
            {running ? <Square size={16} /> : <Play size={16} />}
            {running ? t.test.stop : t.test.start}
          </button>
        </div>
      </div>
    </TabShell>
  );
}

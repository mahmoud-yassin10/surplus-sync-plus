import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, Database, History, X } from "lucide-react";
import { useStore } from "../../lib/store";
import { formatFocusDateShort } from "../../lib/demo-date";

export function EvidenceTrigger({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`text-[12px] px-3 py-1.5 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)] flex items-center gap-1.5 ${className}`}
      >
        <BookOpen size={12} /> Why this prediction?
      </button>
      {open && <EvidenceDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function EvidenceDrawer({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const f = state.forecast;
  const maxMag = Math.max(1, ...f.influences.map((i) => i.magnitude));

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative ml-auto w-full sm:w-[520px] h-full bg-[var(--color-surface)] border-l border-[var(--color-line)] overflow-y-auto">
        <header className="px-5 py-4 border-b border-[var(--color-line)] flex items-start gap-3">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-text-faint)]">
              AI evidence
            </div>
            <h2 className="text-[15px] font-semibold tracking-tight mt-0.5">
              Why {formatFocusDateShort()} is predicted at {f.expectedAttendance} students
            </h2>
            <p className="text-[11.5px] text-[var(--color-text-soft)] mt-1">
              Influential inputs — not causes. Ordered by historical correlation magnitude.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-[var(--color-text-faint)]">
            <X size={16} />
          </button>
        </header>

        <section className="px-5 py-4 border-b border-[var(--color-line)] grid grid-cols-3 gap-3">
          <Stat label="Expected" value={`${f.expectedAttendance}`} sub="students" />
          <Stat label="80% interval" value={`${f.intervalLow}–${f.intervalHigh}`} sub="students" />
          <Stat label="Data quality" value="High" sub="3 of 3 sources" />
        </section>

        <section className="px-5 py-4 border-b border-[var(--color-line)]">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mb-3">
            Influential inputs
          </div>
          <ul className="space-y-2.5">
            {f.influences.map((inf) => (
              <li key={inf.factor} className="grid grid-cols-[18px_1fr_auto] gap-2 items-start">
                {inf.direction === "down" ? (
                  <ArrowDown size={14} className="text-[var(--color-critical)] mt-0.5" />
                ) : (
                  <ArrowUp size={14} className="text-[var(--color-success)] mt-0.5" />
                )}
                <div>
                  <div className="text-[12.5px] text-[var(--color-text)]">{inf.factor}</div>
                  <div className="text-[11px] text-[var(--color-text-faint)]">{inf.note}</div>
                  <div className="mt-1 h-1 rounded-full bg-[var(--color-line)]">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${(inf.magnitude / maxMag) * 100}%`,
                        background:
                          inf.direction === "down"
                            ? "var(--color-critical)"
                            : "var(--color-success)",
                      }}
                    />
                  </div>
                </div>
                <span className="text-[11px] tnum text-[var(--color-text-soft)] mt-0.5">
                  {inf.direction === "down" ? "−" : "+"}
                  {inf.magnitude}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-5 py-4 border-b border-[var(--color-line)]">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mb-2 flex items-center gap-1.5">
            <History size={11} /> Similar historical days
          </div>
          <table className="w-full text-[12px]">
            <tbody>
              {f.similarDays.map((d) => (
                <tr key={d.date} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="py-1.5 text-[var(--color-text-soft)] tnum">{d.date}</td>
                  <td className="py-1.5 text-right tnum font-medium">{d.attendance}</td>
                  <td className="py-1.5 pl-3 text-[var(--color-text-faint)]">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="px-5 py-4 border-b border-[var(--color-line)]">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mb-2 flex items-center gap-1.5">
            <Database size={11} /> Provenance
          </div>
          <ul className="text-[11.5px] text-[var(--color-text-soft)] space-y-1">
            <li>· District attendance system · updated 06:00 daily</li>
            <li>· School calendar feed · synced 04:00 daily</li>
            <li>· NWS weather API · forecast retrieved 05:30</li>
            <li>· Menu participation history · last 180 service days</li>
          </ul>
        </section>

        <section className="px-5 py-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mb-2">
            Limitations
          </div>
          <p className="text-[12px] text-[var(--color-text-soft)] leading-relaxed">
            The model cannot anticipate unannounced events (e.g. last-minute cancellations). It does
            not certify food safety. Estimates carry an 80% interval — actual attendance can fall
            outside it. Human review is required before any consequential action.
          </p>
          <div className="mt-3 flex items-center justify-between text-[10.5px] text-[var(--color-text-faint)]">
            <span>Model · {f.modelVersion}</span>
            <button className="hover:text-[var(--color-text-soft)]">Report incorrect output</button>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">
        {label}
      </div>
      <div className="text-[16px] font-semibold tnum mt-0.5">{value}</div>
      <div className="text-[10.5px] text-[var(--color-text-faint)]">{sub}</div>
    </div>
  );
}

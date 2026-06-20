import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "../../lib/store";
import { buildCopilotReply, forecastViewFromState } from "../../lib/forecast";
import { canPerform } from "../../lib/permissions";

const PROMPTS = [
  "Why is Thursday high risk?",
  "What happens if attendance is 540?",
  "Which inputs influenced the prediction?",
  "Compare this with similar exam days.",
  "Which partners accept packaged meals?",
  "Draft a provisional partner alert.",
  "Explain prevented vs recoverable surplus.",
];

export function CopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [thread, setThread] = useState<{ q: string; r: ReturnType<typeof buildCopilotReply> }[]>([]);
  const [input, setInput] = useState("");

  function send(prompt: string) {
    const view = forecastViewFromState(state);
    const r = buildCopilotReply(prompt, view);
    setThread((t) => [...t, { q: prompt, r }]);
    setInput("");
    dispatch({ type: "AUDIT", event: { actor: "AI Copilot", actorType: "ai", action: `Answered: "${prompt}"`, reversible: false } });
  }

  if (!open) return null;

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-[var(--color-surface)] border-l border-[var(--color-line)] z-40 flex flex-col shadow-2xl">
      <header className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
        <Sparkles size={15} className="text-[var(--color-ai)]" />
        <div>
          <div className="text-[13px] font-semibold">AI Operations Copilot</div>
          <div className="text-[11px] text-[var(--color-text-faint)]">Proposes actions · cannot mutate state without approval</div>
        </div>
        <button onClick={onClose} className="ml-auto text-[var(--color-text-faint)] hover:text-[var(--color-text)]"><X size={16} /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {thread.length === 0 && (
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--color-text-soft)] leading-relaxed">
              Ask about Thursday's forecast, simulate changes, or draft an action. The Copilot will explain its evidence and request approval for anything consequential.
            </p>
            <div className="space-y-1.5">
              {PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} className="w-full text-left text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] hover:border-[var(--color-ai)]/40 hover:bg-[var(--color-ai-soft)]/40 transition flex items-center gap-2">
                  <ArrowRight size={11} className="text-[var(--color-text-faint)]" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {thread.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="text-[12px] text-right">
              <span className="inline-block max-w-[80%] px-3 py-1.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text)]">{t.q}</span>
            </div>
            <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-ai-soft)] text-[var(--color-ai)]">{t.r.kind}</span>
              </div>
              <div className="text-[12.5px] font-medium text-[var(--color-text)] mb-1.5">{t.r.title}</div>
              <p className="text-[12px] text-[var(--color-text-soft)] leading-relaxed">{t.r.body}</p>
              {t.r.evidence && (
                <ul className="mt-2.5 space-y-1">
                  {t.r.evidence.map((e) => (
                    <li key={e} className="text-[11.5px] text-[var(--color-text-soft)] flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 rounded-full bg-[var(--color-text-faint)]" /> {e}
                    </li>
                  ))}
                </ul>
              )}
              {t.r.proposal && (
                <div className="mt-3 rounded-md border border-[var(--color-ai)]/30 bg-[var(--color-ai-soft)]/40 p-2.5 text-[11.5px]">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">Before</div>
                      <div>{t.r.proposal.before}</div>
                    </div>
                    <div>
                      <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">After</div>
                      <div>{t.r.proposal.after}</div>
                    </div>
                  </div>
                  <div className="text-[var(--color-text-soft)] mb-2">{t.r.proposal.consequences}</div>
                  <div className="flex gap-2">
                    <button
                      disabled={!canPerform(state.role, "SEND_PROVISIONAL_ALERTS")}
                      onClick={() => {
                        dispatch({ type: "SEND_PROVISIONAL_ALERTS" });
                        setThread((th) => th.map((x, j) => (i === j ? { ...x, r: { ...x.r, proposal: undefined, body: x.r.body + " — Approved." } } : x)));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded bg-[var(--color-success)] text-white flex items-center gap-1 disabled:opacity-40"
                    >
                      <CheckCircle2 size={11} /> Approve
                    </button>
                    <button className="text-[11px] px-2.5 py-1 rounded border border-[var(--color-line)]">Edit</button>
                    <button className="text-[11px] px-2.5 py-1 rounded border border-[var(--color-line)] text-[var(--color-critical)]">Reject</button>
                  </div>
                </div>
              )}
              <div className="mt-3 pt-2 border-t border-[var(--color-line)] flex items-center justify-between text-[10px] text-[var(--color-text-faint)]">
                <span>Model · ssp-forecast-1.0 · simulated response</span>
                <button className="hover:text-[var(--color-text-soft)]">Report incorrect</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(input.trim()); }} className="px-3 py-3 border-t border-[var(--color-line)] flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask, explain, simulate, or draft…" className="flex-1 text-[12.5px] px-3 py-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-ai)]" />
        <button className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-ai)] text-white">Send</button>
      </form>
    </aside>
  );
}

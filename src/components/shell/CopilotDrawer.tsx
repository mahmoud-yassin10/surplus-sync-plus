import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "../../lib/store";

const PROMPTS = [
  "Why is Thursday high risk?",
  "What happens if attendance is 540?",
  "Which inputs influenced the prediction?",
  "Compare this with similar exam days.",
  "Which partners accept packaged meals?",
  "Draft a provisional partner alert.",
  "Explain prevented vs recoverable surplus.",
];

type Reply = {
  kind: "fact" | "prediction" | "explanation" | "simulation" | "action";
  title: string;
  body: string;
  evidence?: string[];
  proposal?: { before: string; after: string; consequences: string; reversible: boolean; action: () => void };
};

function reply(prompt: string, dispatch: any): Reply {
  if (prompt.startsWith("Why")) {
    return {
      kind: "explanation",
      title: "Thursday Mar 12 is High risk because four downward inputs stack on one popular menu",
      body: "Combined predicted attendance drop of −226 students from baseline. Confidence is high — three similar exam days in the last six months show comparable swings.",
      evidence: [
        "Grade 10 field trip · −112 students",
        "Early dismissal 12:45 · −64 students",
        "Midterms grades 11–12 · −38 students",
        "Heavy rain (NWS 78%) · −22 students",
        "Popular menu · +14 students",
      ],
    };
  }
  if (prompt.includes("540")) {
    return {
      kind: "simulation",
      title: "Simulating attendance = 540 (no records changed)",
      body: "Recommended preparation shifts to 575 meals. Shortage probability stays under 2.0%. Preventable surplus drops from 168 to 155 meals.",
      evidence: ["Safety floor 540 still respected", "Menu mix unchanged", "Cost saving ≈ $527"],
    };
  }
  if (prompt.startsWith("Which inputs")) {
    return {
      kind: "explanation",
      title: "Top influential inputs for Thursday",
      body: "Ordered by magnitude. These are influential inputs, not causes — the model reports correlation strength with historical attendance drops.",
      evidence: [
        "Field trip 92 · downward",
        "Early dismissal 64 · downward",
        "Midterms 38 · downward",
        "Heavy rain 22 · downward",
        "Popular menu 14 · upward",
      ],
    };
  }
  if (prompt.startsWith("Compare")) {
    return {
      kind: "fact",
      title: "Three similar days in the last six months",
      body: "All combined exams with another large attendance event. Actual attendance fell within the predicted interval each time.",
      evidence: ["2025-10-23 · 541 actual", "2025-12-04 · 519 actual", "2026-01-29 · 552 actual"],
    };
  }
  if (prompt.toLowerCase().includes("packaged")) {
    return {
      kind: "fact",
      title: "Partners accepting packaged meals on 03/12",
      body: "Filtered by accepted food category, distance, and current availability.",
      evidence: [
        "Metro Community Food Bank · 120 meals · refrigerated van",
        "Harbor Family Shelter · 70 meals · no vehicle",
        "Neighborhood Community Kitchen · 180 meals · refrigerated storage",
        "Westside Senior Center · 40 meals · volunteer driver (limited)",
      ],
    };
  }
  if (prompt.toLowerCase().includes("draft")) {
    return {
      kind: "action",
      title: "Proposed action: send provisional surplus alert",
      body: "Sends a provisional alert (not a confirmed donation) to all available partners that accept packaged meals.",
      proposal: {
        before: "0 alerts sent",
        after: "3 partners notified",
        consequences: "Partners may reserve tentative capacity. No commitment until you confirm actual surplus after service.",
        reversible: true,
        action: () => dispatch({ type: "SEND_PROVISIONAL_ALERTS" }),
      },
    };
  }
  return {
    kind: "explanation",
    title: "Prevented vs recoverable vs nonrecoverable",
    body: "Prevented = meals never prepared because the plan changed before service. Recoverable = safe untouched meals after service. Nonrecoverable = food that cannot be redistributed. The same quantity is never counted twice.",
  };
}

export function CopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useStore();
  const [thread, setThread] = useState<{ q: string; r: Reply }[]>([]);
  const [input, setInput] = useState("");

  function send(prompt: string) {
    const r = reply(prompt, dispatch);
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
                      onClick={() => {
                        t.r.proposal!.action();
                        setThread((th) => th.map((x, j) => (i === j ? { ...x, r: { ...x.r, proposal: undefined, body: x.r.body + " — Approved." } } : x)));
                      }}
                      className="text-[11px] px-2.5 py-1 rounded bg-[var(--color-success)] text-white flex items-center gap-1"
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
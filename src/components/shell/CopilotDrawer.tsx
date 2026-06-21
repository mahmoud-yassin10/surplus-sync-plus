import { ArrowRight, CheckCircle2, Loader2, Sparkles, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  answerTypeLabel,
  mlSourceLabel,
  modeLabel,
  type CopilotMessageResponse,
  type CopilotProposal,
} from "../../lib/copilot-contracts";
import {
  buildActionsAfterExecutedProposal,
  buildDeterministicFallbackReply,
  parseCopilotProposal,
  prepareAttendanceApproval,
  validateProposalPrerequisites,
} from "../../lib/copilot-action-adapter";
import {
  approveCopilotProposal,
  onCopilotReset,
  rejectCopilotProposal,
  sendCopilotMessage,
  type CopilotClientError,
} from "../../lib/copilot-client";
import { buildReconciliationSnapshot } from "../../lib/copilot-snapshot";
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

type ThreadEntry = {
  question: string;
  response: CopilotMessageResponse;
  error?: string;
  proposals: CopilotProposal[];
};

function formatRecord(value: Record<string, unknown>): string {
  return Object.entries(value)
    .map(([key, val]) => `${key}: ${String(val)}`)
    .join(" · ");
}

export function CopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [proposalBusy, setProposalBusy] = useState<Record<string, "approve" | "reject" | null>>({});
  const sendInFlight = useRef(false);

  const clearThread = useCallback(() => {
    setThread([]);
    setInput("");
    setLastFailedPrompt(null);
    setProposalBusy({});
  }, []);

  useEffect(() => onCopilotReset(clearThread), [clearThread]);

  const updateProposalInThread = useCallback((proposalId: string, proposal: CopilotProposal) => {
    setThread((entries) =>
      entries.map((entry) => ({
        ...entry,
        proposals: entry.proposals.map((p) => (p.proposalId === proposalId ? proposal : p)),
        response: {
          ...entry.response,
          response: {
            ...entry.response.response,
            proposedActions: entry.response.response.proposedActions.map((p) =>
              p.proposalId === proposalId ? proposal : p,
            ),
          },
        },
      })),
    );
  }, []);

  const send = useCallback(
    async (prompt: string) => {
      if (sendInFlight.current || loading) return;
      sendInFlight.current = true;
      setLoading(true);
      setLastFailedPrompt(null);
      const snapshot = buildReconciliationSnapshot(state);

      try {
        const result = await sendCopilotMessage(prompt, snapshot);
        const proposals = result.response.proposedActions.map((p) => parseCopilotProposal(p)).filter(Boolean) as CopilotProposal[];
        setThread((t) => [
          ...t,
          {
            question: prompt,
            response: result,
            proposals,
          },
        ]);
        setInput("");
        dispatch({
          type: "AUDIT",
          event: {
            actor: "AI Assistant",
            actorType: "ai",
            action: `Answered: "${prompt}"`,
            reversible: false,
          },
        });
      } catch (error) {
        const clientError = error as CopilotClientError;
        if (clientError.code === "COPILOT_UNAVAILABLE" || clientError.status >= 500) {
          const fallback = buildDeterministicFallbackReply(prompt, state);
          setThread((t) => [
            ...t,
            {
              question: prompt,
              response: {
                response: fallback,
                mode: "MOCK_FALLBACK",
                mlSource: "canonical-fallback",
              },
              error: clientError.message,
              proposals: [],
            },
          ]);
          setInput("");
        } else {
          setLastFailedPrompt(prompt);
        }
      } finally {
        setLoading(false);
        sendInFlight.current = false;
      }
    },
    [dispatch, loading, state],
  );

  const handleApprove = useCallback(
    async (entryIndex: number, proposal: CopilotProposal) => {
      if (proposalBusy[proposal.proposalId]) return;
      if (proposal.status !== "PENDING_APPROVAL") return;

      const prereq = validateProposalPrerequisites(state, proposal);
      if (!prereq.ok) return;

      setProposalBusy((busy) => ({ ...busy, [proposal.proposalId]: "approve" }));
      const snapshot = buildReconciliationSnapshot(state);

      try {
        let attendanceForecast: Awaited<ReturnType<typeof prepareAttendanceApproval>> | undefined;
        if (proposal.actionType === "ATTENDANCE_UPDATE") {
          attendanceForecast = await prepareAttendanceApproval();
          if (!attendanceForecast) {
            return;
          }
        }

        const { proposal: approved } = await approveCopilotProposal(
          proposal.proposalId,
          snapshot,
        );
        updateProposalInThread(proposal.proposalId, approved);

        if (approved.status !== "EXECUTED") return;

        const dispatchPlan = await buildActionsAfterExecutedProposal(
          state,
          approved,
          attendanceForecast ?? undefined,
        );
        if (!dispatchPlan.ok) return;
        for (const action of dispatchPlan.actions) {
          dispatch(action);
        }
      } finally {
        setProposalBusy((busy) => ({ ...busy, [proposal.proposalId]: null }));
      }
    },
    [dispatch, proposalBusy, state, updateProposalInThread],
  );

  const handleReject = useCallback(
    async (proposal: CopilotProposal) => {
      if (proposalBusy[proposal.proposalId]) return;
      if (proposal.status !== "PENDING_APPROVAL") return;

      setProposalBusy((busy) => ({ ...busy, [proposal.proposalId]: "reject" }));
      const snapshot = buildReconciliationSnapshot(state);
      try {
        const { proposal: rejected } = await rejectCopilotProposal(
          proposal.proposalId,
          snapshot,
        );
        updateProposalInThread(proposal.proposalId, rejected);
      } finally {
        setProposalBusy((busy) => ({ ...busy, [proposal.proposalId]: null }));
      }
    },
    [proposalBusy, state, updateProposalInThread],
  );

  if (!open) return null;

  return (
    <aside className="animate-drawer-right fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-[var(--color-surface)] border-l border-[var(--color-line)] z-[var(--z-drawer)] flex flex-col shadow-2xl">
      <header className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
        <Sparkles size={15} className="text-[var(--color-ai)]" />
        <div>
          <div className="text-[13px] font-semibold">AI Operations Assistant</div>
          <div className="text-[11px] text-[var(--color-text-faint)]">
            Proposes actions · cannot mutate state without approval
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {thread.length === 0 && (
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--color-text-soft)] leading-relaxed">
              Ask about Thursday's forecast, simulate changes, or draft an action. The AI assistant will
              explain its evidence and request approval for anything consequential.
            </p>
            <div className="space-y-1.5">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  disabled={loading}
                  onClick={() => void send(p)}
                  className="w-full text-left text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] hover:border-[var(--color-ai)]/40 hover:bg-[var(--color-ai-soft)]/40 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <ArrowRight size={11} className="text-[var(--color-text-faint)]" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {lastFailedPrompt && (
          <div className="rounded-md border border-[var(--color-critical)]/30 bg-[var(--color-critical)]/5 p-3 text-[12px]">
            <p className="text-[var(--color-text-soft)] mb-2">
              AI assistant could not complete that request. You can retry safely.
            </p>
            <button
              onClick={() => void send(lastFailedPrompt)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1 rounded border border-[var(--color-line)]"
            >
              Retry
            </button>
          </div>
        )}

        {thread.map((entry, i) => {
          const { response: payload } = entry.response;
          return (
            <div key={i} className="space-y-2">
              <div className="text-[12px] text-right">
                <span className="inline-block max-w-[80%] px-3 py-1.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text)]">
                  {entry.question}
                </span>
              </div>
              <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-ai-soft)] text-[var(--color-ai)]">
                    {answerTypeLabel(payload.answerType)}
                  </span>
                  <span className="text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-faint)]">
                    {modeLabel(entry.response.mode, entry.response.mlSource)}
                  </span>
                  <span className="text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-faint)]">
                    {mlSourceLabel(entry.response.mlSource)}
                  </span>
                </div>
                {entry.error && entry.response.mode === "MOCK_FALLBACK" && (
                  <p className="text-[11px] text-[var(--color-text-faint)] mb-2">{entry.error}</p>
                )}
                <p className="text-[12px] text-[var(--color-text-soft)] leading-relaxed whitespace-pre-wrap">
                  {payload.answer}
                </p>
                {payload.evidence.length > 0 && (
                  <ul className="mt-2.5 space-y-1">
                    {payload.evidence.map((e, idx) => (
                      <li
                        key={`${e.label}-${idx}`}
                        className="text-[11.5px] text-[var(--color-text-soft)] flex items-start gap-1.5"
                      >
                        <span className="mt-1 h-1 w-1 rounded-full bg-[var(--color-text-faint)] shrink-0" />
                        <span>
                          <span className="text-[var(--color-text-faint)]">{e.label}: </span>
                          {e.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {payload.provenance.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {payload.provenance.map((p, idx) => (
                      <li key={`${p.source}-${idx}`} className="text-[11px] text-[var(--color-text-faint)]">
                        {p.source} · {p.status.toLowerCase().replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-[var(--color-text-faint)]">
                  Uncertainty ({payload.uncertainty.level.toLowerCase()}): {payload.uncertainty.explanation}
                </p>
                {payload.limitations.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {payload.limitations.map((limitation, idx) => (
                      <li key={idx} className="text-[11px] text-[var(--color-text-faint)]">
                        {limitation}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.proposals.map((proposal) => {
                  const busy = proposalBusy[proposal.proposalId];
                  const prereq = validateProposalPrerequisites(state, proposal);
                  const canApprove = prereq.ok && proposal.status === "PENDING_APPROVAL";
                  return (
                    <div
                      key={proposal.proposalId}
                      className="mt-3 rounded-md border border-[var(--color-ai)]/30 bg-[var(--color-ai-soft)]/40 p-2.5 text-[11.5px]"
                    >
                      <div className="font-medium text-[var(--color-text)] mb-1">{proposal.title}</div>
                      <p className="text-[var(--color-text-soft)] mb-2">{proposal.summary}</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
                            Before
                          </div>
                          <div>{formatRecord(proposal.before)}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
                            After
                          </div>
                          <div>{formatRecord(proposal.after)}</div>
                        </div>
                      </div>
                      <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1">
                        Status · {proposal.status.replace(/_/g, " ").toLowerCase()}
                      </div>
                      {!prereq.ok && proposal.status === "PENDING_APPROVAL" && (
                        <p className="text-[11px] text-[var(--color-critical)] mb-2">{prereq.reason}</p>
                      )}
                      {proposal.status === "PENDING_APPROVAL" && (
                        <div className="flex gap-2">
                          <button
                            disabled={!canApprove || !!busy}
                            onClick={() => void handleApprove(i, proposal)}
                            className="text-[11px] px-2.5 py-1 rounded bg-[var(--color-success)] text-white flex items-center gap-1 disabled:opacity-40"
                          >
                            {busy === "approve" ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={11} />
                            )}{" "}
                            Approve
                          </button>
                          <button
                            disabled={!!busy}
                            onClick={() => void handleReject(proposal)}
                            className="text-[11px] px-2.5 py-1 rounded border border-[var(--color-line)] text-[var(--color-critical)] flex items-center gap-1 disabled:opacity-40"
                          >
                            {busy === "reject" ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <XCircle size={11} />
                            )}{" "}
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="mt-3 pt-2 border-t border-[var(--color-line)] flex items-center justify-between text-[10px] text-[var(--color-text-faint)]">
                  <span>
                    Model · ssp-forecast-1.0 · {modeLabel(entry.response.mode, entry.response.mlSource)} ·{" "}
                    {mlSourceLabel(entry.response.mlSource)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !loading) void send(input.trim());
        }}
        className="px-3 py-3 border-t border-[var(--color-line)] flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ask, explain, simulate, or draft…"
          className="flex-1 text-[12.5px] px-3 py-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-ai)] disabled:opacity-50"
        />
        <button
          disabled={loading || !input.trim()}
          className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-ai)] text-white disabled:opacity-50 flex items-center gap-1"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          Send
        </button>
      </form>
    </aside>
  );
}

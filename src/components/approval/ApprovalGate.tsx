import { CheckCircle2, ShieldAlert, Undo2 } from "lucide-react";
import type { ReactNode } from "react";

export function ApprovalGate({
  title,
  who,
  before,
  after,
  consequences,
  risks,
  reversible,
  status,
  onApprove,
  onReject,
  onUndo,
  allowed = true,
  extra,
}: {
  title: string;
  who: string;
  before: string;
  after: string;
  consequences: string;
  risks?: string;
  reversible: boolean;
  status?: "pending" | "approved";
  onApprove?: () => void;
  onReject?: () => void;
  onUndo?: () => void;
  allowed?: boolean;
  extra?: ReactNode;
}) {
  const approved = status === "approved";
  return (
    <div
      className={`rounded-md border p-4 ${approved ? "border-[var(--color-success)]/30 bg-[var(--color-success-soft)]/30" : "border-[var(--color-ai)]/30 bg-[var(--color-ai-soft)]/40"}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${approved ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-ai)] text-white"}`}
        >
          {approved ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
            Human approval gate
          </div>
          <div className="text-[14px] font-semibold mt-0.5">{title}</div>
          <div className="text-[11.5px] text-[var(--color-text-soft)] mt-0.5">
            Required role: <span className="text-[var(--color-text)]">{who}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
            <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
              <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
                Before
              </div>
              <div className="mt-0.5 text-[var(--color-text)]">{before}</div>
            </div>
            <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
              <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
                After
              </div>
              <div className="mt-0.5 text-[var(--color-text)]">{after}</div>
            </div>
          </div>

          <p className="text-[11.5px] text-[var(--color-text-soft)] mt-3">{consequences}</p>
          {risks && <p className="text-[11.5px] text-[var(--color-critical)] mt-1.5">{risks}</p>}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {!approved && (
              <>
                <button
                  onClick={onApprove}
                  disabled={!allowed}
                  className="text-[11.5px] px-3 py-1.5 rounded-md bg-[var(--color-success)] text-white flex items-center gap-1 disabled:opacity-40"
                >
                  <CheckCircle2 size={12} /> Approve
                </button>
                <button
                  onClick={onReject}
                  className="text-[11.5px] px-3 py-1.5 rounded-md border border-[var(--color-line)]"
                >
                  Reject
                </button>
                <button className="text-[11.5px] px-3 py-1.5 rounded-md border border-[var(--color-line)]">
                  Modify
                </button>
              </>
            )}
            {approved && reversible && onUndo && (
              <button
                onClick={onUndo}
                className="text-[11.5px] px-3 py-1.5 rounded-md border border-[var(--color-line)] flex items-center gap-1"
              >
                <Undo2 size={12} /> Undo
              </button>
            )}
            <span className="ml-auto text-[10.5px] text-[var(--color-text-faint)]">
              {reversible ? "Reversible action" : "Permanent action"}
            </span>
          </div>

          {extra}
        </div>
      </div>
    </div>
  );
}

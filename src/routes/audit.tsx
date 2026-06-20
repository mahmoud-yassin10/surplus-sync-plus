import { createFileRoute } from "@tanstack/react-router";
import { Bot, ClipboardCheck, Sparkles, User2, Wrench } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit storyline — SurplusSync Plus" }] }),
  component: Audit,
});

const ACTOR_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  ai: { icon: Sparkles, color: "var(--color-ai)", bg: "var(--color-ai-soft)" },
  human: { icon: User2, color: "var(--color-text)", bg: "var(--color-surface-2)" },
  system: { icon: Wrench, color: "var(--color-manual)", bg: "var(--color-surface-2)" },
  partner: { icon: ClipboardCheck, color: "var(--color-success)", bg: "var(--color-success-soft)" },
};

function Audit() {
  const { state } = useStore();
  return (
    <Page kicker="Audit storyline" title="Decision trail">
      <Section title="Events" hint="Every consequential AI and human action is recorded · cannot be deleted">
        <ol className="relative">
          <span className="absolute left-[34px] top-2 bottom-2 w-px bg-[var(--color-line)]" aria-hidden />
          {state.audit.map((a) => {
            const meta = ACTOR_STYLE[a.actorType];
            const Icon = meta.icon;
            return (
              <li key={a.id} className="relative pl-16 pr-4 py-3 border-b border-[var(--color-line)] last:border-0">
                <div className="absolute left-4 top-3.5 h-7 w-7 rounded-full flex items-center justify-center" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={12} />
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[12.5px] font-medium text-[var(--color-text)]">{a.action}</span>
                  <span className="text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{a.actorType}</span>
                  <span className="ml-auto text-[10.5px] text-[var(--color-text-faint)] tnum">{new Date(a.ts).toLocaleString()}</span>
                </div>
                <div className="text-[11.5px] text-[var(--color-text-soft)] mt-0.5">{a.actor}{a.reason ? ` · ${a.reason}` : ""}</div>
                {(a.before || a.after) && (
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] tnum">
                    {a.before && <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-soft)]">Before · {a.before}</span>}
                    {a.after && <span className="px-1.5 py-0.5 rounded bg-[var(--color-success-soft)] text-[var(--color-success)]">After · {a.after}</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Section>
    </Page>
  );
}

const _ = Bot;
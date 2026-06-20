import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — SurplusSync Plus" }] }),
  component: Messages,
});

function Messages() {
  const { state, dispatch } = useStore();
  const partners = state.partners.filter((p) => p.status !== "closed");
  const [active, setActive] = useState(partners[0]?.id);
  const partner = partners.find((p) => p.id === active);
  const thread = state.messages.filter((m) => m.threadId === `t-${active}`);

  return (
    <Page kicker="Communication center" title="Operational messages">
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        <Section title="Threads">
          <ul className="divide-y divide-[var(--color-line)] stagger-fast">
            {partners.map((p) => {
              const last = state.messages.filter((m) => m.threadId === `t-${p.id}`).at(-1);
              const isActive = active === p.id;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setActive(p.id)}
                    className={`relative w-full text-left px-4 py-3 transition-colors ${isActive ? "bg-[var(--color-ai-soft)]/30" : "hover:bg-[var(--color-surface-2)]/60"}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-[var(--color-ai)]" />
                    )}
                    <div className="text-[12.5px] font-medium truncate">{p.name}</div>
                    <div className="text-[10.5px] text-[var(--color-text-faint)] truncate mt-0.5">{last?.body ?? "No messages yet"}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title={partner?.name ?? "Select a thread"}>
          <div className="p-4 space-y-3 min-h-[420px]">
            {thread.length === 0 && (
              <div className="animate-fade text-center py-12 text-[12.5px] text-[var(--color-text-faint)]">
                <MessageSquare size={20} className="mx-auto mb-2 opacity-50" />
                No messages yet — send a provisional surplus alert from Recovery Network.
              </div>
            )}
            <div className="space-y-3 stagger-fast" key={active}>
              {thread.map((m) => (
                <MessageCard key={m.id} message={m} />
              ))}
            </div>

            {partner && thread.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-line)]">
                <button onClick={() => dispatch({ type: "PARTNER_RESERVE", partnerId: partner.id, meals: 95 })} className="press text-[11.5px] px-2.5 py-1.5 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)]">Simulate partner reserves 95</button>
                <button onClick={() => dispatch({ type: "MESSAGE", message: { threadId: `t-${partner.id}`, fromRole: "manager", fromName: "Lincoln Heights HS", kind: "text", body: "Thanks — we will confirm actual surplus right after service." } })} className="press text-[11.5px] px-2.5 py-1.5 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)] flex items-center gap-1"><Send size={11} /> Reply</button>
              </div>
            )}
          </div>
        </Section>
      </div>
    </Page>
  );
}

function MessageCard({ message }: { message: any }) {
  const isPartner = message.fromRole === "partner";
  const icon = message.kind === "alert" ? AlertCircle : message.kind === "reservation" ? CheckCircle2 : MessageSquare;
  const Icon = icon;
  const tone = message.kind === "alert" ? "ai" : message.kind === "reservation" ? "success" : "default";
  const bgC = tone === "ai" ? "bg-[var(--color-ai-soft)]/40 border-[var(--color-ai)]/20" : tone === "success" ? "bg-[var(--color-success-soft)]/40 border-[var(--color-success)]/20" : "bg-[var(--color-surface-2)]/50 border-[var(--color-line)]";
  const accentC = tone === "ai" ? "text-[var(--color-ai)]" : tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-text-soft)]";
  return (
    <div className={`hover-lift rounded-md border p-3 ${bgC} ${isPartner ? "" : "ml-8"}`}>
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider mb-1">
        <Icon size={11} className={accentC} />
        <span className={accentC}>{message.kind}</span>
        <span className="ml-auto text-[var(--color-text-faint)] tnum">{message.fromName}</span>
      </div>
      <p className="text-[12.5px] text-[var(--color-text)] leading-relaxed">{message.body}</p>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { Bus, Cloud, FlaskConical, Sun, Users2, Utensils } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { CALENDAR_EVENTS, FOCUS_DATE } from "../lib/mock";
import { formatFocusDateShort } from "../lib/demo-date";

const ICON: Record<string, any> = {
  exam: FlaskConical,
  trip: Bus,
  "early-dismissal": Sun,
  weather: Cloud,
  "popular-menu": Utensils,
  assembly: Users2,
};

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — SurplusSync Plus" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  // build month grid for March 2026
  const month = 2;
  const year = 2026;
  const first = new Date(Date.UTC(year, month, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = 31;
  const cells: ({ date: string; day: number } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `2026-03-${String(d).padStart(2, "0")}`, day: d });
  }

  return (
    <Page kicker="School calendar" title="March 2026">
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">
        <Section
          title="Month view"
          hint="Days with risk overlays are calendar inputs to the forecast"
        >
          <div className="p-4">
            <div className="grid grid-cols-7 text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c, i) => {
                if (!c) return <div key={i} className="aspect-square" />;
                const events = CALENDAR_EVENTS.filter((e) => e.date === c.date);
                const isFocus = c.date === FOCUS_DATE;
                const weekday = new Date(c.date + "T12:00:00Z").getUTCDay();
                const isWeekend = weekday === 0 || weekday === 6;
                return (
                  <div
                    key={c.date}
                    className={`aspect-square rounded border p-1.5 text-[10.5px] flex flex-col transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 ${
                      isFocus
                        ? "border-[var(--color-critical)] bg-[var(--color-critical-soft)]/30"
                        : isWeekend
                          ? "border-[var(--color-line)] bg-[var(--color-surface-2)]/40 text-[var(--color-text-faint)]"
                          : events.length > 0
                            ? "border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)]/30 hover:border-[var(--color-warning)]"
                            : "border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)]/50"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="tnum font-medium text-[11px]">{c.day}</span>
                      {isFocus && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-critical)] pulse-dot" />
                      )}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-0.5">
                      {events.slice(0, 3).map((e) => {
                        const I = ICON[e.kind];
                        return I ? (
                          <I key={e.id} size={9} className="text-[var(--color-text-soft)]" />
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title={`${formatFocusDateShort()} events`} hint="All inputs feeding the forecast">
          <ul className="divide-y divide-[var(--color-line)] stagger-fast">
            {CALENDAR_EVENTS.filter((e) => e.date === FOCUS_DATE).map((e) => {
              const I = ICON[e.kind] || FlaskConical;
              return (
                <li
                  key={e.id}
                  className="px-4 py-3 flex gap-3 transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <I size={14} className="text-[var(--color-ai)] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-[var(--color-text)]">{e.title}</div>
                    <div className="text-[10.5px] text-[var(--color-text-faint)] mt-0.5">
                      {e.grades ? `Grades ${e.grades.join(", ")} · ` : ""}
                      {e.confidence} confidence
                    </div>
                    {e.notes && (
                      <div className="text-[11px] text-[var(--color-text-soft)] mt-1">
                        {e.notes}
                      </div>
                    )}
                  </div>
                  <span
                    className={`tnum text-[11.5px] font-medium ${e.attendanceDelta < 0 ? "text-[var(--color-critical)]" : "text-[var(--color-success)]"}`}
                  >
                    {e.attendanceDelta > 0 ? "+" : ""}
                    {e.attendanceDelta}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </Page>
  );
}

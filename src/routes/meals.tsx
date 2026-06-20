import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page, Section } from "../components/shell/AppShell";
import { MEAL_HISTORY } from "../lib/mock";

export const Route = createFileRoute("/meals")({
  head: () => ({ meta: [{ title: "Meal history — SurplusSync Plus" }] }),
  component: Meals,
});

function Meals() {
  const chartData = MEAL_HISTORY.slice(-12).map((m) => ({
    date: m.date.slice(5),
    prepared: m.prepared,
    served: m.served,
    recoverable: m.recoverable,
    nonrecoverable: m.nonrecoverable,
  }));

  return (
    <Page kicker="Meal history" title="Preparation vs consumption">
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Section title="Last 12 service days" hint="Meals prepared, served, and remainder by category">
          <div className="p-4" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={1}>
                <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-faint)" }} stroke="var(--color-line)" />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-faint)" }} stroke="var(--color-line)" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--color-line)" }} />
                <Bar dataKey="served" stackId="a" fill="var(--color-success)" radius={[0,0,0,0]} />
                <Bar dataKey="recoverable" stackId="a" fill="var(--color-warning)" />
                <Bar dataKey="nonrecoverable" stackId="a" fill="var(--color-critical)" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="px-4 pb-3 flex items-center gap-4 text-[10.5px] text-[var(--color-text-soft)]">
            <Legend color="var(--color-success)" label="Served" />
            <Legend color="var(--color-warning)" label="Recoverable" />
            <Legend color="var(--color-critical)" label="Nonrecoverable" />
          </div>
        </Section>

        <Section title="Recent records">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[420px]">
              <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Menu</th>
                  <th className="text-right px-3 py-2 font-medium">Prep</th>
                  <th className="text-right px-3 py-2 font-medium">Served</th>
                  <th className="text-right px-3 py-2 font-medium">Recov.</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {MEAL_HISTORY.slice(-10).reverse().map((m) => (
                  <tr
                    key={m.date}
                    className="border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    <td className="px-3 py-2 text-[var(--color-text-soft)]">{m.date.slice(5)}</td>
                    <td className="px-3 py-2 text-[var(--color-text)]">{m.menu}</td>
                    <td className="px-3 py-2 text-right">{m.prepared}</td>
                    <td className="px-3 py-2 text-right">{m.served}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-warning)]">{m.recoverable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </Page>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: color }} /> {label}</span>;
}

const _unused = Cell;
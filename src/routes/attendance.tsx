import { createFileRoute } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Page, Section } from "../components/shell/AppShell";
import { ApprovalGate } from "../components/approval/ApprovalGate";
import { ATTENDANCE_HISTORY } from "../lib/mock";
import { useStore } from "../lib/store";
import { canPerform } from "../lib/permissions";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — SurplusSync Plus" }] }),
  component: Attendance,
});

function Attendance() {
  const { state, dispatch } = useStore();
  const data = ATTENDANCE_HISTORY.map((a) => ({
    date: a.date.slice(5),
    expected: a.expected,
    actual: a.actual,
  }));

  return (
    <Page kicker="Students & attendance" title="Attendance trend">
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        <Section title="28-day attendance" hint="Expected vs actual · used by the forecast model">
          <div className="p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-text-faint)" }}
                  stroke="var(--color-line)"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-text-faint)" }}
                  stroke="var(--color-line)"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 6,
                    border: "1px solid var(--color-line)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="var(--color-ai)"
                  strokeWidth={1.6}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-success)"
                  strokeWidth={1.6}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Roster snapshot">
          <div className="p-4 grid grid-cols-2 gap-3 text-[12.5px]">
            <Stat label="Enrolled" value={820} />
            <Stat label="Meal-eligible" value={760} />
            <Stat label="Trailing avg" value={702} />
            <Stat label="Exam-day avg" value={544} />
          </div>
        </Section>

        <div className="lg:col-span-2">
          <ApprovalGate
            title="Attendance correction — Grade 10 field trip cancelled"
            who="School Administrator"
            before={`Expected ${state.forecast.expectedAttendance} students (model baseline)`}
            after="Expected 540 students (trip cancelled)"
            consequences={`Recalculates Thursday forecast: recommended prep ${state.attendanceCorrected ? 575 : state.forecast.recommendedPrep} → 575 meals. Attendance records updated.`}
            risks={
              state.attendanceCorrected
                ? undefined
                : "Reverses if district reinstates the trip before service."
            }
            reversible
            status={state.attendanceCorrected ? "approved" : "pending"}
            onApprove={() => dispatch({ type: "CORRECT_ATTENDANCE" })}
            allowed={canPerform(state.role, "CORRECT_ATTENDANCE")}
          />
        </div>
      </div>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
        {label}
      </div>
      <div className="text-[18px] font-semibold tnum mt-0.5">{value}</div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Page, Section } from "../components/shell/AppShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Network admin — SurplusSync Plus" }] }),
  component: Admin,
});

function Admin() {
  return (
    <Page kicker="Network administration" title="Platform overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 stagger-fast">
        <Metric label="Forecast accuracy (30d)" value="91.2%" />
        <Metric label="Interval coverage" value="82.0%" />
        <Metric label="Override frequency" value="11.4%" />
        <Metric label="Open incidents" value="0" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Model monitoring">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[420px]">
              <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
                <tr><th className="text-left px-4 py-2 font-medium">Model</th><th className="text-left px-4 py-2 font-medium">Stage</th><th className="text-right px-4 py-2 font-medium">MAPE</th></tr>
              </thead>
              <tbody className="tnum">
                <Tr a="ssp-forecast-1.0" b="Production" c="8.8%" />
                <Tr a="ssp-forecast-0.9" b="Shadow" c="9.7%" />
                <Tr a="ssp-forecast-1.1-rc" b="Canary (3 schools)" c="7.9%" />
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Organization verification">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[420px]">
              <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
                <tr><th className="text-left px-4 py-2 font-medium">Organization</th><th className="text-left px-4 py-2 font-medium">Type</th><th className="text-left px-4 py-2 font-medium">Status</th></tr>
              </thead>
              <tbody>
                <Tr a="Lincoln Heights Public HS" b="School" c="Verified" status />
                <Tr a="Metro Community Food Bank" b="Recovery partner" c="Verified" status />
                <Tr a="Harbor Family Shelter" b="Recovery partner" c="Verified" status />
                <Tr a="Westside Senior Center" b="Recovery partner" c="Pending docs" status />
              </tbody>
            </table>
          </div>
        </Section>
        <div className="lg:col-span-2">
          <Section title="Safety incidents" hint="Audit history cannot be deleted by administrators">
            <div className="p-8 text-center text-[12.5px] text-[var(--color-text-faint)]">No safety incidents recorded in this prototype.</div>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hover-lift rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">{label}</div>
      <div className="font-display text-[20px] font-semibold tnum mt-0.5">{value}</div>
    </div>
  );
}

function Tr({ a, b, c, status }: { a: string; b: string; c: string; status?: boolean }) {
  const verified = c.toLowerCase() === "verified";
  return (
    <tr className="border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-surface-2)]">
      <td className="px-4 py-2.5 text-[var(--color-text)]">{a}</td>
      <td className="px-4 py-2.5 text-[var(--color-text-soft)]">{b}</td>
      <td className="px-4 py-2.5">
        {status ? (
          <span
            className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded ${
              verified
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${verified ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)] pulse-dot"}`} />
            {c}
          </span>
        ) : (
          c
        )}
      </td>
    </tr>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { Page, Section } from "../components/shell/AppShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Network admin — SurplusSync Plus" }] }),
  component: Admin,
});

function Admin() {
  return (
    <Page kicker="Network administration" title="Platform overview">
      <div className="grid md:grid-cols-4 gap-4 mb-5">
        <Metric label="Forecast accuracy (30d)" value="91.2%" />
        <Metric label="Interval coverage" value="82.0%" />
        <Metric label="Override frequency" value="11.4%" />
        <Metric label="Open incidents" value="0" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Model monitoring">
          <table className="w-full text-[12.5px]">
            <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
              <tr><th className="text-left px-4 py-2 font-medium">Model</th><th className="text-left px-4 py-2 font-medium">Stage</th><th className="text-right px-4 py-2 font-medium">MAPE</th></tr>
            </thead>
            <tbody className="tnum">
              <Tr a="ssp-forecast-1.0" b="Production" c="8.8%" />
              <Tr a="ssp-forecast-0.9" b="Shadow" c="9.7%" />
              <Tr a="ssp-forecast-1.1-rc" b="Canary (3 schools)" c="7.9%" />
            </tbody>
          </table>
        </Section>
        <Section title="Organization verification">
          <table className="w-full text-[12.5px]">
            <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
              <tr><th className="text-left px-4 py-2 font-medium">Organization</th><th className="text-left px-4 py-2 font-medium">Type</th><th className="text-left px-4 py-2 font-medium">Status</th></tr>
            </thead>
            <tbody>
              <Tr a="Lincoln Heights Public HS" b="School" c="Verified" />
              <Tr a="Metro Community Food Bank" b="Recovery partner" c="Verified" />
              <Tr a="Harbor Family Shelter" b="Recovery partner" c="Verified" />
              <Tr a="Westside Senior Center" b="Recovery partner" c="Pending docs" />
            </tbody>
          </table>
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
    <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">{label}</div>
      <div className="text-[20px] font-semibold tnum mt-0.5">{value}</div>
    </div>
  );
}

function Tr({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <tr className="border-b border-[var(--color-line)] last:border-0">
      <td className="px-4 py-2.5 text-[var(--color-text)]">{a}</td>
      <td className="px-4 py-2.5 text-[var(--color-text-soft)]">{b}</td>
      <td className="px-4 py-2.5">{c}</td>
    </tr>
  );
}
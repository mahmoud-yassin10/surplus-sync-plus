import { createFileRoute } from "@tanstack/react-router";
import { Page, Section } from "../components/shell/AppShell";
import { SurplusRadar } from "../components/forecast/SurplusRadar";
import { HorizonRibbon } from "../components/forecast/HorizonRibbon";

export const Route = createFileRoute("/radar")({
  head: () => ({ meta: [{ title: "Surplus Radar — SurplusSync Plus" }] }),
  component: Radar,
});

function Radar() {
  return (
    <Page kicker="Surplus radar" title="Forecast horizon · 14 days">
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Risk by horizon ring" hint="Pulsing markers indicate high-risk events; outer ring shows partner capacity">
          <SurplusRadar />
        </Section>
        <Section title="Day-by-day ribbon">
          <HorizonRibbon />
        </Section>
      </div>
    </Page>
  );
}
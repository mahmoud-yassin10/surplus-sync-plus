import { createFileRoute } from "@tanstack/react-router";
import { Page, Section } from "../components/shell/AppShell";
import { DecisionCanvas } from "../components/forecast/DecisionCanvas";

export const Route = createFileRoute("/decision")({
  head: () => ({ meta: [{ title: "Decision Canvas — SurplusSync Plus" }] }),
  component: Decision,
});

function Decision() {
  return (
    <Page kicker="Preparation decision" title="Decision Canvas — Thursday Mar 12">
      <Section title="Compare plans" hint="Drag the slider to see shortage and overproduction shift. The 540-meal safety floor blocks unsafe values.">
        <DecisionCanvas />
      </Section>
    </Page>
  );
}
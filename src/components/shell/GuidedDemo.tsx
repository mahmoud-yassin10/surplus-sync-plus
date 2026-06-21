import { Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "../../lib/store";

const STEPS: {
  title: string;
  description: string;
  to: string;
  action?: (dispatch: ReturnType<typeof useStore>["dispatch"]) => void;
}[] = [
  {
    title: "Open the Command Center",
    description: "Thursday is flagged as High risk surplus event.",
    to: "/",
  },
  {
    title: "Inspect the daily forecast",
    description: "Predicted 528 students vs 730 meals planned.",
    to: "/forecast",
  },
  {
    title: "Open Decision Canvas",
    description: "Compare plans and adjust under a 540 safety floor.",
    to: "/decision",
  },
  {
    title: "Correct attendance",
    description: "Field trip cancelled - approve the human correction.",
    to: "/attendance",
    action: (d) => d({ type: "CORRECT_ATTENDANCE" }),
  },
  {
    title: "Send provisional alerts",
    description: "Notify available recovery partners, not a confirmed donation.",
    to: "/recovery",
    action: (d) => d({ type: "SEND_PROVISIONAL_ALERTS" }),
  },
  {
    title: "Reserve partner capacity",
    description: "Metro Community Food Bank reserves 95 packaged meals.",
    to: "/messages",
    action: (d) => d({ type: "PARTNER_RESERVE", partnerId: "p1", meals: 95 }),
  },
  {
    title: "Confirm same-day surplus",
    description: "Manager records 64 untouched packaged meals.",
    to: "/pickups",
    action: (d) => {
      d({ type: "CONFIRM_SURPLUS", meals: 64 });
      d({ type: "COMPLETE_CHECKLIST" });
      d({ type: "SELECT_PARTNER", partnerId: "p1", meals: 64 });
    },
  },
  {
    title: "Complete the pickup",
    description: "Partner advances through driver, en-route, delivered.",
    to: "/pickups",
  },
  {
    title: "Review impact and audit",
    description: "Numbers stay separated: prevented, recovered, wasted.",
    to: "/impact",
  },
];

export function GuidedDemo() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const active = state.guidedStep > 0;
  const step = STEPS[state.guidedStep - 1];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (active && step) navigate({ to: step.to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.guidedStep]);

  const guideCard =
    mounted && active && step
      ? createPortal(
          <div
            key={state.guidedStep}
            className="animate-rise fixed right-4 sm:right-5 z-[var(--z-toast)] w-[340px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xl overflow-hidden flex flex-col"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
          >
            <div className="px-4 py-2.5 border-b border-[var(--color-line)] flex items-center bg-[var(--color-ink)] text-white shrink-0">
              <div className="text-[10.5px] uppercase tracking-[0.16em] opacity-70">
                Guided demo - step {state.guidedStep} of {STEPS.length}
              </div>
              <button
                onClick={() => dispatch({ type: "GUIDED_STEP", step: 0 })}
                className="ml-auto opacity-70 hover:opacity-100"
                aria-label="Close guided demo"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-3.5 overflow-y-auto">
              <div className="text-[13.5px] font-semibold mb-1">{step.title}</div>
              <p className="text-[12px] text-[var(--color-text-soft)] leading-relaxed">
                {step.description}
              </p>
            </div>
            <div className="px-4 py-3 border-t border-[var(--color-line)] flex gap-2 bg-[var(--color-surface)] shrink-0">
              <button
                onClick={() =>
                  dispatch({ type: "GUIDED_STEP", step: Math.max(1, state.guidedStep - 1) })
                }
                className="text-[11.5px] px-2.5 py-1.5 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)]"
              >
                Back
              </button>
              <button
                onClick={() => {
                  step.action?.(dispatch);
                  dispatch({
                    type: "GUIDED_STEP",
                    step: state.guidedStep < STEPS.length ? state.guidedStep + 1 : 0,
                  });
                }}
                className="ml-auto text-[11.5px] px-3 py-1.5 rounded-md bg-[var(--color-ai)] text-white"
              >
                {state.guidedStep === STEPS.length ? "Finish" : step.action ? "Run step" : "Continue"}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        onClick={() => dispatch({ type: "GUIDED_STEP", step: 1 })}
        className="press text-[11px] flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-ink)] text-white hover:opacity-90"
      >
        <Play size={11} /> Start guided demo
      </button>
      {guideCard}
    </>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Calendar,
  ClipboardList,
  Compass,
  Database,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Network,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { useStore } from "../../lib/store";
import { CopilotDrawer } from "./CopilotDrawer";
import { GuidedDemo } from "./GuidedDemo";
import { resetCopilotIntegration } from "../../lib/copilot-client";
import type { Role } from "../../lib/types";
import { formatFocusDateLong } from "../../lib/demo-date";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Command Center", icon: LayoutDashboard, roles: ["manager", "admin"] },
  { to: "/forecast", label: "Daily Forecast", icon: Gauge, roles: ["manager", "admin"] },
  { to: "/radar", label: "Surplus Radar", icon: Radar, roles: ["manager", "admin"] },
  { to: "/decision", label: "Decision Canvas", icon: Compass, roles: ["manager", "admin"] },
  { to: "/calendar", label: "Calendar", icon: Calendar, roles: ["manager", "admin"] },
  { to: "/attendance", label: "Attendance", icon: Users, roles: ["manager", "admin"] },
  { to: "/meals", label: "Meal History", icon: Utensils, roles: ["manager", "admin"] },
  { to: "/recovery", label: "Recovery Network", icon: Network, roles: ["manager", "admin"] },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageSquare,
    roles: ["manager", "admin", "partner"],
  },
  { to: "/pickups", label: "Pickups", icon: Truck, roles: ["manager", "admin", "partner"] },
  {
    to: "/impact",
    label: "Impact Ledger",
    icon: Activity,
    roles: ["manager", "admin", "platform"],
  },
  { to: "/audit", label: "Audit", icon: History, roles: ["manager", "admin", "platform"] },
  { to: "/partner", label: "Partner Portal", icon: ClipboardList, roles: ["partner"] },
  { to: "/admin", label: "Network Admin", icon: ShieldCheck, roles: ["platform"] },
];

const ROLES: { id: Role; label: string }[] = [
  { id: "manager", label: "Cafeteria Manager" },
  { id: "admin", label: "School Administrator" },
  { id: "partner", label: "Recovery Partner" },
  { id: "platform", label: "Platform Admin" },
];

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto stagger-fast">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] press transition-[background-color,color] duration-200 ${
              active
                ? "bg-white/10 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-[var(--color-ai)]" />
            )}
            <Icon
              size={15}
              strokeWidth={1.8}
              className="transition-transform duration-200 group-hover:scale-110"
            />
            <span>{item.label}</span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-ai)] pulse-dot" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(state.role));

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-[var(--color-canvas)] text-[var(--color-text)]">
      <aside className="hidden md:flex w-[232px] shrink-0 flex-col bg-[var(--color-ink)] text-[var(--color-sidebar-foreground)] border-r border-[var(--color-sidebar-border)]">
        <div className="px-5 py-5 border-b border-white/5 flex items-center gap-2">
          <Logo size={26} />
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold tracking-tight font-display">
              SurplusSync<span className="text-[var(--color-ai)]"> Plus</span>
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/45">
              Predict · Prevent · Recover
            </div>
          </div>
        </div>
        <SidebarNav items={items} pathname={pathname} />
        <div className="px-3 py-3 border-t border-white/5">
          <div className="rounded-md bg-white/5 p-2.5 text-[11px] text-white/70">
            <div className="flex items-center gap-1.5 text-white/55 uppercase tracking-wider text-[9.5px] mb-1">
              <Database size={11} /> Prototype demo data
            </div>
            Lincoln Heights HS · Chicago, IL
          </div>
        </div>
      </aside>

      {/* Mobile slide-in navigation */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-[var(--z-drawer)]">
          <button
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade"
          />
          <aside className="animate-drawer absolute left-0 top-0 bottom-0 w-[264px] flex flex-col bg-[var(--color-ink)] text-[var(--color-sidebar-foreground)] shadow-2xl">
            <div className="px-5 py-5 border-b border-white/5 flex items-center gap-2">
              <Logo size={26} />
              <div className="leading-tight">
                <div className="text-[13.5px] font-semibold tracking-tight font-display">
                  SurplusSync<span className="text-[var(--color-ai)]"> Plus</span>
                </div>
                <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/45">
                  Predict · Prevent · Recover
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="ml-auto text-white/60 hover:text-white press"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarNav
              items={items}
              pathname={pathname}
              onNavigate={() => setMobileNavOpen(false)}
            />
            <div className="px-3 py-3 border-t border-white/5 flex items-center gap-2">
              <select
                value={state.role}
                onChange={(e) => dispatch({ type: "SET_ROLE", role: e.target.value as Role })}
                className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-white/15 bg-white/5 text-white"
                aria-label="Active role"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id} className="text-black">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-[var(--color-line)] bg-[var(--color-surface)]/80 backdrop-blur-md px-4 md:px-6 flex items-center gap-3 sticky top-0 z-[var(--z-sticky)]">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden -ml-1 p-1.5 rounded-md text-[var(--color-text-soft)] hover:bg-[var(--color-surface-2)] press"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 text-[13px] min-w-0">
            <span className="font-medium text-[var(--color-text)] truncate">
              Lincoln Heights HS
            </span>
            <span className="text-[var(--color-text-faint)] hidden sm:inline">·</span>
            <span className="text-[var(--color-text-soft)] truncate hidden sm:inline">
              {formatFocusDateLong()}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex text-[11px] px-2 py-1 rounded-md border tnum items-center gap-1.5 transition-colors duration-300 ${
                state.aiMode
                  ? "border-[var(--color-ai)]/25 bg-[var(--color-ai-soft)] text-[var(--color-ai)]"
                  : "border-[var(--color-manual)]/30 bg-[var(--color-surface-2)] text-[var(--color-manual)]"
              }`}
            >
              {state.aiMode ? (
                <>
                  <Sparkles size={11} className={state.aiMode ? "pulse-dot" : ""} /> AI assist on
                </>
              ) : (
                <>
                  <AlertCircle size={11} /> Manual mode
                </>
              )}
            </span>
            <button
              onClick={() => dispatch({ type: "TOGGLE_AI" })}
              className="hidden sm:inline-flex text-[11px] px-2 py-1 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-soft)] press"
            >
              Toggle
            </button>

            <select
              value={state.role}
              onChange={(e) => dispatch({ type: "SET_ROLE", role: e.target.value as Role })}
              className="hidden md:block text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:border-[var(--color-line-strong)]"
              aria-label="Active role"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <div className="hidden lg:block">
              <GuidedDemo />
            </div>

            <button
              onClick={() => {
                void resetCopilotIntegration();
                dispatch({ type: "RESET" });
              }}
              className="hidden sm:flex text-[11px] items-center gap-1 px-2 py-1 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-soft)] press"
            >
              <RefreshCw size={11} /> Reset demo
            </button>

            <button
              onClick={() => setCopilotOpen((o) => !o)}
              className="group text-[12px] flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full bg-[var(--color-ai)] text-white press shadow-[0_4px_14px_-6px_var(--color-ai)] hover:shadow-[0_6px_20px_-6px_var(--color-ai)] transition-shadow duration-300"
            >
              <Sparkles size={13} className="transition-transform duration-300 group-hover:rotate-12" />
              <span className="hidden sm:inline">AI</span>
              <span className="h-1.5 w-1.5 rounded-full bg-white/80 pulse-dot" />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <div key={pathname} className="animate-fade">
            {children}
          </div>
        </main>
      </div>

      <CopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}

export function Page({
  title,
  kicker,
  actions,
  children,
}: {
  title: string;
  kicker?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8">
      <div className="flex flex-wrap items-end gap-4 mb-6 animate-rise">
        <div className="min-w-0">
          {kicker && (
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ai)]/80 mb-1.5">
              {kicker}
            </div>
          )}
          <h1
            className="font-display text-[24px] md:text-[26px] font-semibold tracking-tight text-[var(--color-text)] text-balance"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
        </div>
        {actions && (
          <div className="ml-auto flex items-center gap-2 animate-fade" style={{ animationDelay: "120ms" }}>
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function Section({
  title,
  hint,
  right,
  children,
  className = "",
  padded = false,
  animate = true,
}: {
  title?: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  animate?: boolean;
}) {
  return (
    <section
      className={`rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] transition-shadow duration-300 hover:shadow-[0_2px_16px_-10px_oklch(0.21_0.03_250/0.25)] ${
        animate ? "animate-rise" : ""
      } ${className}`}
    >
      {(title || right) && (
        <header className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-text)]">
                {title}
              </h2>
            )}
            {hint && <p className="text-[11.5px] text-[var(--color-text-faint)] mt-0.5">{hint}</p>}
          </div>
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function RiskPill({ level }: { level: "low" | "moderate" | "high" | "critical" }) {
  const map = {
    low: ["bg-[var(--color-success-soft)]", "text-[var(--color-success)]", "Low"],
    moderate: ["bg-[var(--color-warning-soft)]", "text-[var(--color-warning)]", "Moderate"],
    high: ["bg-[var(--color-critical-soft)]", "text-[var(--color-critical)]", "High"],
    critical: ["bg-[var(--color-critical-soft)]", "text-[var(--color-critical)]", "Critical"],
  } as const;
  const [bg, fg, label] = map[level];
  const alert = level === "high" || level === "critical";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${bg} ${fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${alert ? "pulse-dot" : ""}`} />
      {label} risk
    </span>
  );
}

export function StatLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
      {children}
    </div>
  );
}

export function StatValue({
  children,
  unit,
  tone,
}: {
  children: ReactNode;
  unit?: string;
  tone?: "ai" | "critical" | "success" | "warning";
}) {
  const color =
    tone === "ai"
      ? "text-[var(--color-ai)]"
      : tone === "critical"
        ? "text-[var(--color-critical)]"
        : tone === "success"
          ? "text-[var(--color-success)]"
          : tone === "warning"
            ? "text-[var(--color-warning)]"
            : "";
  return (
    <div className="flex items-baseline gap-1 tnum">
      <span className={`font-display text-[22px] font-semibold tracking-tight ${color}`}>
        {children}
      </span>
      {unit && <span className="text-[11px] text-[var(--color-text-faint)]">{unit}</span>}
    </div>
  );
}

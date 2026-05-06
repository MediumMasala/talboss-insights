import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ALL_CHATS,
  BOSSES,
  NEGATIVE_CLOSE,
  OWNERS,
  POSITIVE_CLOSE,
  STAGES,
  bossById,
  type Boss,
  type CandidateChat,
  type ChatStatus,
  type CloseReason,
  type OpenRole,
  type Sentiment,
  type Stage,
} from "@/lib/talboss-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "TalBoss Ops · Internal Dashboard" },
      {
        name: "description",
        content:
          "Internal ops dashboard for TalBoss — monitor boss chats, stages, and alerts across the matchmaking funnel.",
      },
    ],
  }),
});

type View = "all" | "mine";
type SearchScope = "all" | "name" | "company" | "id" | "location" | "owner";

const statusMeta: Record<ChatStatus, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-flow shadow-[0_0_8px_var(--color-flow)]", text: "text-flow" },
  idle: { label: "Idle", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  no_reply: { label: "No reply", dot: "bg-warn", text: "text-warn" },
  closed: { label: "Closed", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

const sentimentMeta: Record<Sentiment, { label: string; cls: string }> = {
  happy: { label: "Happy", cls: "text-flow" },
  neutral: { label: "Neutral", cls: "text-muted-foreground" },
  unhappy: { label: "Unhappy", cls: "text-warn" },
};

type Section = "overview" | "tracker" | "chats";
type Severity = "critical" | "warning" | "nudge" | "healthy";

/* ---------- Health + severity helpers ---------- */
function parseDays(s: string): number {
  if (!s) return 0;
  const lower = s.toLowerCase();
  if (lower.includes("just now") || lower.includes("min")) return 0;
  if (/^\d+m\b/.test(lower)) return 0;
  if (/^\d+h\b/.test(lower)) {
    const h = parseInt(lower);
    return h / 24;
  }
  if (/^\d+d\b/.test(lower)) return parseInt(lower);
  if (lower.includes("yesterday") || lower.includes("yest")) return 1;
  if (lower.includes("week") || lower.includes("1w")) return 7;
  if (lower.includes("mon") || lower.includes("fri")) return 3;
  return 0.5;
}

function healthScore(b: Boss): number {
  const respRate = b.swipedToDM ? b.dmAccepted / b.swipedToDM : 0.5;
  const days = parseDays(b.lastActivity);
  const activity = Math.max(0, 1 - days / 7);
  const pipe = STAGES.indexOf(b.stage) / (STAGES.length - 1);
  const sent = b.sentiment === "happy" ? 1 : b.sentiment === "neutral" ? 0.55 : 0.1;
  const status = b.status === "active" ? 1 : b.status === "idle" ? 0.5 : b.status === "no_reply" ? 0.15 : 0.4;
  const score = respRate * 0.22 + activity * 0.22 + pipe * 0.16 + sent * 0.2 + status * 0.2;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

function healthTone(score: number): { cls: string; bg: string; label: string } {
  if (score >= 70) return { cls: "text-flow", bg: "bg-flow/10 border-flow/30", label: "Healthy" };
  if (score >= 40) return { cls: "text-warn", bg: "bg-warn/10 border-warn/30", label: "Watch" };
  return { cls: "text-destructive", bg: "bg-destructive/10 border-destructive/30", label: "Critical" };
}

function severityOf(b: Boss): Severity {
  const days = parseDays(b.lastActivity);
  if (b.alert) {
    if (/ghost|lost|withdrew|fail|down|broke/i.test(b.alert)) return "critical";
    if (b.sentiment === "unhappy" || days >= 2) return "critical";
    return "warning";
  }
  if (b.sentiment === "unhappy" && days >= 1) return "critical";
  if (b.status === "no_reply" && days >= 2) return "critical";
  if (b.status === "no_reply" || days >= 3) return "warning";
  if (b.status === "idle" && days >= 1) return "nudge";
  if (days >= 5) return "nudge";
  return "healthy";
}

function bossOneLine(b: Boss): string {
  const days = parseDays(b.lastActivity);
  const lastTxt = days >= 1 ? `${Math.round(days)}d ago` : b.lastActivity;
  const total = b.chatsOpen + b.chatsClosed;
  const progressing = b.chatsOpen;
  return `${b.stage} · ${progressing} of ${total || progressing} progressing · last reply ${lastTxt}`;
}

function ctaForBoss(b: Boss): { label: string; tone: "primary" | "warn" | "destructive" } {
  if (b.status === "no_reply" || (b.alert && /no reply|ghost/i.test(b.alert))) {
    return { label: "Send nudge", tone: "destructive" };
  }
  if (b.sentiment === "unhappy") return { label: "Call boss", tone: "warn" };
  if (parseDays(b.lastActivity) >= 5) return { label: "Reassign", tone: "warn" };
  return { label: "Send nudge", tone: "primary" };
}

/* ---------- Sparkline ---------- */
function seedSeries(seed: string, n = 14, base = 50): number[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v = Math.max(2, Math.min(100, v + ((s % 21) - 10)));
    out.push(v);
  }
  return out;
}

function Sparkline({ data, tone }: { data: number[]; tone?: "flow" | "warn" }) {
  const w = 80, h = 22;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const span = Math.max(1, max - min);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * h}`)
    .join(" ");
  const stroke = tone === "warn" ? "var(--color-warn)" : tone === "flow" ? "var(--color-flow)" : "var(--color-primary)";
  const last = data[data.length - 1];
  const first = data[0];
  const up = last >= first;
  return (
    <div className="flex items-center gap-1.5">
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-[9px] font-mono font-bold ${up ? "text-flow" : "text-warn"}`}>
        {up ? "▲" : "▼"} {Math.abs(last - first)}
      </span>
    </div>
  );
}

/* ---------- 5-dot chat journey ---------- */
const CHAT_JOURNEY = ["Matched", "Talking", "Interview", "Offer", "Closed"] as const;
function chatJourneyIndex(c: CandidateChat): number {
  if (c.status === "closed") return 4;
  const msgs = c.messages?.length ?? 0;
  if (msgs >= 8) return 3;
  if (msgs >= 5) return 2;
  if (msgs >= 2) return 1;
  return 0;
}

function Dashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [view, setView] = useState<View>("all");
  const [me, setMe] = useState<string>("YS");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ChatStatus | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [interviewChannel, setInterviewChannel] = useState<"all" | "app" | "external">("all");
  const [selected, setSelected] = useState<Boss | null>(null);
  const [trackerDrill, setTrackerDrill] = useState<{ title: string; bosses: Boss[] } | null>(null);
  const [chatDrill, setChatDrill] = useState<{ title: string; chats: CandidateChat[] } | null>(null);

  const filtered = useMemo(() => {
    return BOSSES.filter((b) => {
      if (view === "mine" && b.ownerInitials !== me) return false;
      if (teamFilter !== "all" && b.ownerInitials !== teamFilter) return false;
      if (stageFilter !== "all" && b.stage !== stageFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (sentimentFilter !== "all" && b.sentiment !== sentimentFilter) return false;
      if (verifiedOnly && !b.verified) return false;
      if (search) {
        const q = search.toLowerCase();
        const fields: Record<SearchScope, string[]> = {
          all: [b.name, b.company, b.id, b.location, b.ownerInitials, b.role],
          name: [b.name],
          company: [b.company],
          id: [b.id],
          location: [b.location],
          owner: [b.ownerInitials, OWNERS.find((o) => o.initials === b.ownerInitials)?.name ?? ""],
        };
        if (!fields[scope].some((f) => f.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [view, me, search, scope, stageFilter, statusFilter, sentimentFilter, teamFilter, verifiedOnly]);

  const alertBosses = filtered.filter((b) => b.alert);
  const alerts = alertBosses.length;

  const interviewFiltered = useMemo(() => {
    if (stageFilter !== "Interview" || interviewChannel === "all") return filtered;
    return filtered.filter((b) =>
      b.candidateChats.some((c) => c.interviewChannel === interviewChannel),
    );
  }, [filtered, stageFilter, interviewChannel]);

  const sectionTitle: Record<Section, string> = {
    overview: view === "all" ? "All bosses" : `My bosses · ${me}`,
    tracker: "Trackers · live analytics",
    chats: "Chats · grouped by boss",
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      <SideNav
        section={section}
        setSection={setSection}
        alerts={alerts}
        bossCount={filtered.length}
        chatCount={filtered.flatMap((b) => b.candidateChats).length}
      />

      <div className="flex-1 min-w-0">
        <Header
          view={view}
          setView={setView}
          me={me}
          setMe={setMe}
          search={search}
          setSearch={setSearch}
          scope={scope}
          setScope={setScope}
          alerts={alerts}
          onAlertsClick={() => setSection("overview")}
        />

        <FilterBar
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sentimentFilter={sentimentFilter}
          setSentimentFilter={setSentimentFilter}
          teamFilter={teamFilter}
          setTeamFilter={setTeamFilter}
          verifiedOnly={verifiedOnly}
          setVerifiedOnly={setVerifiedOnly}
          count={interviewFiltered.length}
        />

        <ActivityTicker bosses={BOSSES} />

        <main className="px-6 py-6 max-w-[1600px] mx-auto space-y-5">
          <SectionHeader
            title={sectionTitle[section]}
            subtitle={
              section === "chats"
                ? `${interviewFiltered.flatMap((b) => b.candidateChats).length} chats across ${interviewFiltered.length} bosses`
                : `${interviewFiltered.length} bosses in scope · ${alertBosses.length} need attention`
            }
          />

          {stageFilter === "Interview" && (section === "overview" || section === "chats") && (
            <InterviewChannelTabs value={interviewChannel} onChange={setInterviewChannel} bosses={filtered} />
          )}

          {section === "overview" && (
            <OverviewZones bosses={interviewFiltered} onOpen={setSelected} />
          )}
          {section === "tracker" && (
            <TrackerPanel bosses={interviewFiltered} onDrill={setTrackerDrill} />
          )}
          {section === "chats" && (
            <ChatStream bosses={interviewFiltered} onOpenBoss={setSelected} />
          )}
        </main>
      </div>

      {selected && <BossDrawer boss={selected} onClose={() => setSelected(null)} />}
      {trackerDrill && (
        <DrillModal
          title={trackerDrill.title}
          bosses={trackerDrill.bosses}
          onClose={() => setTrackerDrill(null)}
          onOpenBoss={(b) => {
            setTrackerDrill(null);
            setSelected(b);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Sidebar nav ---------- */
function SideNav({
  section,
  setSection,
  alerts,
  bossCount,
  chatCount,
}: {
  section: Section;
  setSection: (s: Section) => void;
  alerts: number;
  bossCount: number;
  chatCount: number;
}) {
  const items: { key: Section; label: string; badge?: number; tone?: "warn"; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      badge: bossCount,
      icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>),
    },
    {
      key: "tracker",
      label: "Trackers",
      icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/></svg>),
    },
    {
      key: "chats",
      label: "Chats",
      badge: chatCount,
      icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
    },
  ];

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface sticky top-0 h-dvh">
      <div className="px-4 h-16 flex items-center gap-2 border-b border-border">
        <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">T</div>
        <div>
          <div className="font-bold text-sm leading-none">TalBoss</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Ops Admin</div>
        </div>
      </div>
      <nav className="p-2 space-y-0.5">
        {items.map((it) => {
          const active = section === it.key;
          const isAlertWarn = it.tone === "warn" && (it.badge ?? 0) > 0;
          return (
            <button
              key={it.key}
              onClick={() => setSection(it.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              <span className={isAlertWarn && !active ? "text-warn" : ""}>{it.icon}</span>
              <span className="flex-1 text-left">{it.label}</span>
              {typeof it.badge === "number" && it.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isAlertWarn ? "bg-warn/15 text-warn" : active ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground border border-border"
                }`}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3 text-[10px] text-muted-foreground border-t border-border">
        Grapevine internal · v0.4
      </div>
    </aside>
  );
}

/* ---------- Interview channel tabs ---------- */
function InterviewChannelTabs({
  value,
  onChange,
  bosses,
}: {
  value: "all" | "app" | "external";
  onChange: (v: "all" | "app" | "external") => void;
  bosses: Boss[];
}) {
  const all = bosses.flatMap((b) => b.candidateChats);
  const app = all.filter((c) => c.interviewChannel === "app").length;
  const ext = all.filter((c) => c.interviewChannel === "external").length;
  const opts: { k: "all" | "app" | "external"; label: string; count: number }[] = [
    { k: "all", label: "All interviews", count: app + ext },
    { k: "app", label: "On TalBoss app", count: app },
    { k: "external", label: "External (Meet · Zoom)", count: ext },
  ];
  return (
    <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-lg w-fit">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`px-3 py-1 rounded-md text-xs font-semibold ${
            value === o.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label} <span className="font-mono opacity-70">· {o.count}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Tracker Panel (inline analytics) ---------- */
function TrackerPanel({
  bosses,
  onDrill,
}: {
  bosses: Boss[];
  onDrill: (d: { title: string; bosses: Boss[] }) => void;
}) {
  const total = bosses.length || 1;
  const byStage = STAGES.map((s) => ({ stage: s, bosses: bosses.filter((b) => b.stage === s) }));
  const maxStageCount = Math.max(1, ...byStage.map((s) => s.bosses.length));
  const happy = bosses.filter((b) => b.sentiment === "happy");
  const neutral = bosses.filter((b) => b.sentiment === "neutral");
  const unhappy = bosses.filter((b) => b.sentiment === "unhappy");
  const active = bosses.filter((b) => b.status === "active");
  const idle = bosses.filter((b) => b.status === "idle");
  const noReply = bosses.filter((b) => b.status === "no_reply");
  const onboarded = bosses.filter((b) => b.stage !== "Onboarding");
  const verified = bosses.filter((b) => b.verified);
  const allChats = bosses.flatMap((b) => b.candidateChats);
  const closedChats = allChats.filter((c) => c.status === "closed");
  const positiveClosed = closedChats.filter((c) => c.closeReason && POSITIVE_CLOSE.includes(c.closeReason));
  const negativeClosed = closedChats.filter((c) => c.closeReason && NEGATIVE_CLOSE.includes(c.closeReason));
  const negByReason: Record<string, number> = {};
  negativeClosed.forEach((c) => {
    if (c.closeReason) negByReason[c.closeReason] = (negByReason[c.closeReason] ?? 0) + 1;
  });
  const posByReason: Record<string, number> = {};
  positiveClosed.forEach((c) => {
    if (c.closeReason) posByReason[c.closeReason] = (posByReason[c.closeReason] ?? 0) + 1;
  });
  const swipes = bosses.reduce((s, b) => s + b.swipedToDM, 0);
  const dms = bosses.reduce((s, b) => s + b.dmAccepted, 0);
  const swipeToDM = swipes ? Math.round((dms / swipes) * 100) : 0;
  const totalRoles = bosses.reduce((s, b) => s + b.rolesOpen, 0);
  const totalHired = bosses.reduce((s, b) => s + b.hired, 0);
  const totalNotHired = bosses.reduce((s, b) => s + b.notHired, 0);
  const totalOpenChats = bosses.reduce((s, b) => s + b.chatsOpen, 0);
  const totalClosedChats = bosses.reduce((s, b) => s + b.chatsClosed, 0);
  const avgIntent = Math.round(bosses.reduce((s, b) => s + b.hiringIntent, 0) / (bosses.length || 1));
  const dmAcceptRate = swipes ? Math.round((dms / swipes) * 100) : 0;
  const hireRate = totalHired + totalNotHired ? Math.round((totalHired / (totalHired + totalNotHired)) * 100) : 0;
  const interviewApp = allChats.filter((c) => c.interviewChannel === "app").length;
  const interviewExt = allChats.filter((c) => c.interviewChannel === "external").length;

  const bossesWithPositive = bosses.filter((b) =>
    b.candidateChats.some((c) => c.closeReason && POSITIVE_CLOSE.includes(c.closeReason)),
  );
  const bossesWithNegative = bosses.filter((b) =>
    b.candidateChats.some((c) => c.closeReason && NEGATIVE_CLOSE.includes(c.closeReason)),
  );

  // What changed today (synthetic from data + seeded series)
  const changes = [
    `${active.length} bosses active in the last hour (▲ ${Math.max(1, Math.round(active.length * 0.3))} vs yesterday)`,
    `${noReply.length} bosses now in no-reply (▲ ${Math.max(0, noReply.length - 1)} since yesterday)`,
    `${positiveClosed.length} positive closes this week · ${negativeClosed.length} negative`,
    `${interviewApp} interviews on app · ${interviewExt} external (${pct(interviewApp, interviewApp + interviewExt || 1)}% on-app)`,
    `Avg intent ${avgIntent}% across ${bosses.length} bosses · ${verified.length} verified`,
  ];

  // Stage movements (synthetic, deterministic)
  const moves: { from: Stage; to: Stage; n: number }[] = [];
  for (let i = 0; i < STAGES.length - 1; i++) {
    const seed = seedSeries(STAGES[i] + STAGES[i + 1], 1, 3)[0];
    const n = Math.max(1, seed % 4);
    moves.push({ from: STAGES[i], to: STAGES[i + 1], n });
  }

  type TrackerTab = "today" | "pipeline" | "outcomes" | "team";
  const [tab, setTab] = useState<TrackerTab>("today");

  const tabs: { k: TrackerTab; label: string; hint: string }[] = [
    { k: "today", label: "Today", hint: "What changed in the last 24h" },
    { k: "pipeline", label: "Pipeline", hint: "Stages, funnel, movement" },
    { k: "outcomes", label: "Outcomes", hint: "Hires, closes, conversion" },
    { k: "team", label: "Team", hint: "Owner load + channels" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-2 text-[11px] text-muted-foreground hidden md:inline">
          · {tabs.find((x) => x.k === tab)?.hint}
        </span>
      </div>

      {/* TODAY */}
      {tab === "today" && (
        <div className="space-y-4">
          <SectionPanel title="What changed today" hint="5-bullet snapshot of day-over-day movement">
            <ul className="space-y-1.5">
              {changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/90">
                  <span className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </SectionPanel>

          <SectionPanel title="Headline metrics" hint="14-day trend per metric · click sparkline shows direction">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <KPI label="Bosses" value={bosses.length} series={seedSeries("bosses", 14, bosses.length)} />
              <KPI label="Active now" value={active.length} tone="flow" series={seedSeries("active", 14, active.length * 6)} />
              <KPI label="No reply" value={noReply.length} tone="warn" series={seedSeries("noreply", 14, noReply.length * 6)} />
              <KPI label="Avg intent" value={`${avgIntent}%`} series={seedSeries("intent", 14, avgIntent)} />
              <KPI label="Verified" value={verified.length} sub={`${pct(verified.length, total)}%`} tone="flow" series={seedSeries("verified", 14, verified.length * 5)} />
              <KPI label="Onboarded" value={onboarded.length} sub={`${pct(onboarded.length, total)}%`} series={seedSeries("onboarded", 14, onboarded.length * 5)} />
              <KPI label="Open chats" value={totalOpenChats} series={seedSeries("openchats", 14, totalOpenChats * 3)} />
              <KPI label="Hired" value={totalHired} tone="flow" sub={`${hireRate}% rate`} series={seedSeries("hired", 14, totalHired * 8)} />
            </div>
          </SectionPanel>
        </div>
      )}

      {/* PIPELINE */}
      {tab === "pipeline" && (
        <div className="space-y-4">
          <SectionPanel title="Stage movement · this week" hint="Bosses that advanced from one stage to the next">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {moves.map((m) => (
                <div key={`${m.from}-${m.to}`} className="flex items-center gap-2 text-[12px] p-2 rounded-md bg-surface border border-border">
                  <span className="font-mono font-bold text-primary text-base">{m.n}</span>
                  <span className="text-muted-foreground">moved</span>
                  <span className="font-semibold truncate">{m.from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold truncate">{m.to}</span>
                </div>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Pipeline funnel" hint={`Distribution across ${total} bosses · click a row to drill in`}>
            <div className="space-y-1.5">
              {byStage.map((s) => {
                const p = Math.round((s.bosses.length / total) * 100);
                const w = (s.bosses.length / maxStageCount) * 100;
                return (
                  <button
                    key={s.stage}
                    onClick={() => onDrill({ title: `Stage · ${s.stage}`, bosses: s.bosses })}
                    className="w-full flex items-center gap-3 text-left group"
                    disabled={s.bosses.length === 0}
                  >
                    <span className="w-24 text-[11px] font-semibold text-foreground/80 shrink-0 truncate">{s.stage}</span>
                    <div className="flex-1 h-6 bg-surface rounded-md overflow-hidden border border-border relative">
                      <div className="h-full bg-primary/80 group-hover:bg-primary transition-all" style={{ width: `${w}%` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-mono font-bold text-foreground">{s.bosses.length}</span>
                    </div>
                    <span className="w-12 text-right text-[11px] font-mono text-muted-foreground shrink-0">{p}%</span>
                  </button>
                );
              })}
            </div>
          </SectionPanel>
        </div>
      )}

      {/* OUTCOMES */}
      {tab === "outcomes" && (
        <div className="space-y-4">
          <SectionPanel title="Conversion" hint="Top of funnel → committed conversation">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Swipe → DM</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-bold">{swipeToDM}%</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{dms} / {swipes}</span>
                </div>
                <div className="mt-2 h-2 bg-background rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-primary" style={{ width: `${swipeToDM}%` }} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">DM accept</div>
                <div className="text-2xl font-mono font-bold">{dmAcceptRate}%</div>
                <div className="text-[11px] text-muted-foreground">Bosses who replied to a DM</div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Hire rate</div>
                <div className="text-2xl font-mono font-bold text-flow">{hireRate}%</div>
                <div className="text-[11px] text-muted-foreground">{totalHired} hired · {totalNotHired} not</div>
              </div>
            </div>
          </SectionPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionPanel title="Positive closes" hint={`${positiveClosed.length} across ${bossesWithPositive.length} bosses`}>
              <button onClick={() => onDrill({ title: "Bosses with positive closes", bosses: bossesWithPositive })} className="w-full text-left">
                <div className="space-y-1">
                  {Object.entries(posByReason).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                    <div key={r} className="flex items-center gap-2 text-[12px] p-1.5 rounded hover:bg-surface">
                      <span className="flex-1 truncate">{r}</span>
                      <span className="font-mono font-bold text-flow">{n}</span>
                    </div>
                  ))}
                  {positiveClosed.length === 0 && <div className="text-[11px] text-muted-foreground">None yet.</div>}
                </div>
              </button>
            </SectionPanel>

            <SectionPanel title="Negative closes" hint={`${negativeClosed.length} across ${bossesWithNegative.length} bosses`}>
              <button onClick={() => onDrill({ title: "Bosses with negative closes", bosses: bossesWithNegative })} className="w-full text-left">
                <div className="space-y-1">
                  {Object.entries(negByReason).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                    <div key={r} className="flex items-center gap-2 text-[12px] p-1.5 rounded hover:bg-surface">
                      <span className="flex-1 truncate">{r}</span>
                      <span className="font-mono font-bold text-warn">{n}</span>
                    </div>
                  ))}
                  {negativeClosed.length === 0 && <div className="text-[11px] text-muted-foreground">None.</div>}
                </div>
              </button>
            </SectionPanel>
          </div>

          <SectionPanel title="Sentiment split" hint="Click a tile to filter the list">
            <div className="grid grid-cols-3 gap-2">
              <MetricTile label="Happy" value={`${pct(happy.length, total)}%`} sub={`${happy.length} bosses`} tone="flow" onClick={() => onDrill({ title: "Happy bosses", bosses: happy })} />
              <MetricTile label="Neutral" value={`${pct(neutral.length, total)}%`} sub={`${neutral.length} bosses`} onClick={() => onDrill({ title: "Neutral bosses", bosses: neutral })} />
              <MetricTile label="Unhappy" value={`${pct(unhappy.length, total)}%`} sub={`${unhappy.length} bosses`} tone="warn" onClick={() => onDrill({ title: "Unhappy bosses", bosses: unhappy })} />
            </div>
          </SectionPanel>
        </div>
      )}

      {/* TEAM */}
      {tab === "team" && (
        <div className="space-y-4">
          <SectionPanel title="Owner load" hint="Bosses currently owned by each ops member">
            <div className="space-y-1.5">
              {OWNERS.map((o) => {
                const owned = bosses.filter((b) => b.ownerInitials === o.initials);
                const w = (owned.length / Math.max(1, bosses.length)) * 100;
                return (
                  <button key={o.initials} onClick={() => onDrill({ title: `Owner · ${o.name}`, bosses: owned })} className="w-full text-left flex items-center gap-3">
                    <span className="w-32 text-[11px] font-semibold truncate">{o.name}</span>
                    <div className="flex-1 h-5 bg-surface rounded-md overflow-hidden border border-border relative">
                      <div className="h-full bg-primary/70" style={{ width: `${w}%` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-mono font-bold">{owned.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionPanel>

          <SectionPanel title="Interview channels" hint="Where interviews are happening">
            <ChannelBar label="On TalBoss app" value={interviewApp} total={interviewApp + interviewExt || 1} tone="flow" />
            <div className="h-2" />
            <ChannelBar label="External (Meet · Zoom)" value={interviewExt} total={interviewApp + interviewExt || 1} />
            <div className="text-[10px] text-muted-foreground mt-3">
              Use the <span className="font-semibold text-foreground">Stage = Interview</span> filter to drill in.
            </div>
          </SectionPanel>
        </div>
      )}
    </div>
  );
}

function SectionPanel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="px-4 pt-3 pb-2 border-b border-border/60">
        <div className="text-[11px] font-bold uppercase tracking-widest text-foreground">{title}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ChannelBar({ label, value, total, tone }: { label: string; value: number; total: number; tone?: "flow" }) {
  const w = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-foreground/80 font-semibold">{label}</span>
        <span className="font-mono text-muted-foreground">{value} · {w}%</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden border border-border">
        <div className={`h-full ${tone === "flow" ? "bg-flow" : "bg-primary"}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}


function KPI({ label, value, sub, tone, series }: { label: string; value: number | string; sub?: string; tone?: "flow" | "warn"; series?: number[] }) {
  const cls = tone === "flow" ? "text-flow" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className={`text-base font-mono font-bold ${cls}`}>{value}</div>
        {series && <Sparkline data={series} tone={tone} />}
      </div>
      {sub && <div className="text-[9px] text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}

function TrackerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "flow" | "warn";
  onClick?: () => void;
}) {
  const valCls = tone === "flow" ? "text-flow" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <button
      onClick={onClick}
      className="text-left bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
    >
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`text-lg font-mono font-bold mt-0.5 ${valCls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

/* ---------- Drill modal (tracker → list of bosses) ---------- */
function DrillModal({
  title,
  bosses,
  onClose,
  onOpenBoss,
}: {
  title: string;
  bosses: Boss[];
  onClose: () => void;
  onOpenBoss: (b: Boss) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[80dvh] bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{bosses.length} bosses</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-md border border-border hover:bg-surface-elevated text-muted-foreground">✕</button>
        </div>
        <div className="overflow-y-auto divide-y divide-border">
          {bosses.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No bosses in this segment.</div>
          )}
          {bosses.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpenBoss(b)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-elevated transition-colors"
            >
              <div className="size-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                {initials(b.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{b.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {b.company} · {b.role} · {b.stage}
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{b.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Header ---------- */
function Header({
  view,
  setView,
  me,
  setMe,
  search,
  setSearch,
  scope,
  setScope,
  alerts,
  onAlertsClick,
}: {
  view: View;
  setView: (v: View) => void;
  me: string;
  setMe: (m: string) => void;
  search: string;
  setSearch: (s: string) => void;
  scope: SearchScope;
  setScope: (s: SearchScope) => void;
  alerts: number;
  onAlertsClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const current = OWNERS.find((o) => o.initials === me)!;

  const scopeLabel: Record<SearchScope, string> = {
    all: "All",
    name: "Boss",
    company: "Company",
    id: "Boss ID",
    location: "Location",
    owner: "Owner",
  };
  const scopeHint: Record<SearchScope, string> = {
    all: "Name, company, ID, location, owner",
    name: "e.g. Marcus Thorne",
    company: "e.g. Vento Systems",
    id: "e.g. GR-99421",
    location: "e.g. Bengaluru",
    owner: "e.g. GJ or Gaurika",
  };
  const scopePlaceholder: Record<SearchScope, string> = {
    all: "Search anything…",
    name: "Search boss name…",
    company: "Search company…",
    id: "Search boss ID…",
    location: "Search location…",
    owner: "Search owner / team…",
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/85 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            T
          </div>
          <div>
            <div className="font-bold tracking-tight text-sm leading-none">
              TalBoss <span className="text-muted-foreground font-medium">/ Ops</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              Grapevine internal
            </div>
          </div>
        </div>

        <nav className="flex p-1 bg-surface rounded-full border border-border" aria-label="View">
          {(["all", "mine"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                view === v
                  ? "bg-surface-elevated text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "all" ? "All view" : `My view · ${me}`}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Scoped search */}
        <div className="relative flex items-center bg-surface border border-border rounded-lg focus-within:ring-1 focus-within:ring-ring">
          <button
            onClick={() => setScopeOpen((o) => !o)}
            className="flex items-center gap-1 pl-2.5 pr-2 h-9 text-[11px] font-semibold text-primary hover:text-primary/80 border-r border-border rounded-l-lg"
            title="Choose what to search by"
          >
            <span className="uppercase tracking-wider">{scopeLabel[scope]}</span>
            <svg className={`size-3 transition-transform ${scopeOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <svg
            className="ml-2.5 size-4 text-muted-foreground pointer-events-none shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder={scopePlaceholder[scope]}
            className="w-72 bg-transparent py-2 pl-2 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {scopeOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setScopeOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-40 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border bg-surface-elevated/40">
                  Search by…
                </div>
                {(Object.keys(scopeLabel) as SearchScope[]).map((k) => {
                  const active = scope === k;
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setScope(k);
                        setScopeOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-surface-elevated flex items-center justify-between gap-2 ${
                        active ? "bg-surface-elevated" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                          {scopeLabel[k]}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{scopeHint[k]}</div>
                      </div>
                      {active && <span className="text-primary text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {alerts > 0 && (
          <button
            onClick={onAlertsClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-warn/30 bg-warn/10 hover:bg-warn/15 transition-colors"
          >
            <span className="size-1.5 rounded-full bg-warn pulse-dot" />
            <span className="text-xs font-semibold text-warn">{alerts} alerts</span>
          </button>
        )}

        {/* Owner switcher */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border bg-surface hover:border-primary/40 transition-colors"
            title={`Acting as ${current.name}`}
          >
            <span className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
              {me}
            </span>
            <span className="text-xs font-semibold">{current.name.split(" ")[0]}</span>
            <svg className="size-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-60 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-40">
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                  Switch ops handler
                </div>
                {OWNERS.map((o) => {
                  const handles = BOSSES.filter((b) => b.ownerInitials === o.initials).length;
                  return (
                    <button
                      key={o.initials}
                      onClick={() => {
                        setMe(o.initials);
                        setOpen(false);
                        setView("mine");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-elevated transition-colors ${
                        o.initials === me ? "bg-surface-elevated" : ""
                      }`}
                    >
                      <span className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold">
                        {o.initials}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{o.name}</div>
                        <div className="text-[10px] text-muted-foreground">{o.role}</div>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{handles}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- Filter Bar ---------- */
function FilterBar(props: {
  stageFilter: Stage | "all";
  setStageFilter: (s: Stage | "all") => void;
  statusFilter: ChatStatus | "all";
  setStatusFilter: (s: ChatStatus | "all") => void;
  sentimentFilter: Sentiment | "all";
  setSentimentFilter: (s: Sentiment | "all") => void;
  teamFilter: string;
  setTeamFilter: (s: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  count: number;
}) {
  const {
    stageFilter, setStageFilter,
    statusFilter, setStatusFilter,
    sentimentFilter, setSentimentFilter,
    teamFilter, setTeamFilter,
    verifiedOnly, setVerifiedOnly,
    count,
  } = props;
  const [open, setOpen] = useState(false);

  const activeCount =
    (stageFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (sentimentFilter !== "all" ? 1 : 0) +
    (teamFilter !== "all" ? 1 : 0) +
    (verifiedOnly ? 1 : 0);

  const teamName = teamFilter === "all" ? null : OWNERS.find((o) => o.initials === teamFilter)?.name;

  const summary = [
    stageFilter !== "all" ? stageFilter : null,
    statusFilter !== "all" ? (statusFilter === "no_reply" ? "No reply" : statusFilter[0].toUpperCase() + statusFilter.slice(1)) : null,
    sentimentFilter !== "all" ? sentimentFilter : null,
    teamName ? `Team: ${teamName.split(" ")[0]}` : null,
    verifiedOnly ? "Verified" : null,
  ].filter(Boolean) as string[];

  const reset = () => {
    setStageFilter("all");
    setStatusFilter("all");
    setSentimentFilter("all");
    setTeamFilter("all");
    setVerifiedOnly(false);
  };

  return (
    <div className="px-6 py-2.5 border-b border-border bg-surface/40 flex items-center gap-2 relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-primary/40 transition-colors text-xs font-semibold"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M6 12h12M10 18h4" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {summary.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto">
          {summary.map((s) => (
            <span
              key={s}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 capitalize whitespace-nowrap"
            >
              {s}
            </span>
          ))}
          <button onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">
            Clear
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">{count} bosses</span>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-6 mt-2 z-40 w-[460px] bg-surface border border-border rounded-xl shadow-xl p-4 space-y-3 animate-fade-in">
            <Group label="Stage">
              <Pill active={stageFilter === "all"} onClick={() => setStageFilter("all")}>All</Pill>
              {STAGES.map((s) => (
                <Pill key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>{s}</Pill>
              ))}
            </Group>
            <Group label="Status">
              {(["all", "active", "idle", "no_reply", "closed"] as const).map((s) => (
                <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {s === "all" ? "Any" : s === "no_reply" ? "No reply" : s[0].toUpperCase() + s.slice(1)}
                </Pill>
              ))}
            </Group>
            <Group label="Vibe">
              {(["all", "happy", "neutral", "unhappy"] as const).map((s) => (
                <Pill key={s} active={sentimentFilter === s} onClick={() => setSentimentFilter(s)}>
                  {s === "all" ? "Any" : s[0].toUpperCase() + s.slice(1)}
                </Pill>
              ))}
            </Group>
            <Group label="Team">
              <Pill active={teamFilter === "all"} onClick={() => setTeamFilter("all")}>All</Pill>
              {OWNERS.map((o) => (
                <Pill key={o.initials} active={teamFilter === o.initials} onClick={() => setTeamFilter(o.initials)}>
                  {o.initials} · {o.name.split(" ")[0]}
                </Pill>
              ))}
            </Group>
            <Group label="More">
              <Pill active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>
                Verified only
              </Pill>
            </Group>
            <div className="flex justify-between pt-2 border-t border-border">
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                Reset all
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-semibold px-3 py-1 rounded-md bg-primary text-primary-foreground"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1 w-12 shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <span className="text-xs text-muted-foreground font-mono">{subtitle}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/* ---------- Activity Ticker ---------- */
function ActivityTicker({ bosses }: { bosses: Boss[] }) {
  const events = useMemo(() => {
    const evs: { text: string; time: string; ts: number; tone?: "flow" | "warn" }[] = [];
    bosses.forEach((b) => {
      const days = parseDays(b.lastActivity);
      if (days < 1) {
        evs.push({ text: `${b.name} · ${b.status === "active" ? "replied" : "active"}`, time: b.lastActivity, ts: Date.now() - days * 86400000, tone: "flow" });
      }
      b.candidateChats.slice(0, 1).forEach((c) => {
        evs.push({
          text: `${c.candidateName} · ${c.status === "closed" ? c.closeReason ?? "closed" : "messaged"}`,
          time: c.lastTime,
          ts: c.lastTs,
          tone: c.chatStatus === "no_reply" ? "warn" : undefined,
        });
      });
    });
    return evs.sort((a, b) => b.ts - a.ts).slice(0, 12);
  }, [bosses]);

  const [idx, setIdx] = useState(0);
  const visible = 5;
  // rotate
  useMemo(() => {
    const id = typeof window !== "undefined" ? window.setInterval(() => setIdx((i) => (i + 1) % Math.max(1, events.length)), 3500) : null;
    return () => { if (id) window.clearInterval(id); };
  }, [events.length]);

  const view = events.length ? Array.from({ length: visible }, (_, i) => events[(idx + i) % events.length]) : [];

  return (
    <div className="px-6 py-1.5 border-b border-border bg-surface/30 flex items-center gap-3 overflow-hidden">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-flow shrink-0">
        <span className="size-1.5 rounded-full bg-flow pulse-dot" />
        Live
      </span>
      <div className="flex items-center gap-4 overflow-hidden flex-1">
        {view.map((e, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] whitespace-nowrap animate-fade-in ${i === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            <span className={`size-1 rounded-full ${e.tone === "warn" ? "bg-warn" : e.tone === "flow" ? "bg-flow" : "bg-primary"}`} />
            <span className="truncate max-w-[260px]">{e.text}</span>
            <span className="font-mono opacity-60">· {e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Severity-tiered Alerts ---------- */
function AlertsPanel({ bosses, onOpen }: { bosses: Boss[]; onOpen: (b: Boss) => void }) {
  const tagged = bosses.map((b) => ({ b, sev: severityOf(b) }));
  const critical = tagged.filter((t) => t.sev === "critical");
  const warning = tagged.filter((t) => t.sev === "warning");
  const nudge = tagged.filter((t) => t.sev === "nudge");

  if (critical.length + warning.length + nudge.length === 0)
    return <EmptyHint text="No active alerts. All boss conversations are healthy." />;

  return (
    <div className="space-y-5">
      {critical.length > 0 && (
        <div>
          <ZoneHeader tone="critical" label="Critical" count={critical.length} hint="Ghosted, lost hire, unhappy + stalled" />
          <div className="space-y-2">
            {critical.map(({ b }) => <AlertRow key={b.id} boss={b} sev="critical" onOpen={onOpen} />)}
          </div>
        </div>
      )}
      {warning.length > 0 && (
        <div>
          <ZoneHeader tone="warning" label="Warning" count={warning.length} hint="No reply 3d, stalled" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {warning.map(({ b }) => <AlertRow key={b.id} boss={b} sev="warning" onOpen={onOpen} />)}
          </div>
        </div>
      )}
      {nudge.length > 0 && (
        <div>
          <ZoneHeader tone="nudge" label="Nudge" count={nudge.length} hint="Hasn't logged in 5d" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {nudge.map(({ b }) => <AlertRow key={b.id} boss={b} sev="nudge" onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneHeader({ tone, label, count, hint }: { tone: "critical" | "warning" | "nudge" | "healthy"; label: string; count: number; hint?: string }) {
  const map = {
    critical: { dot: "bg-destructive", txt: "text-destructive" },
    warning: { dot: "bg-warn", txt: "text-warn" },
    nudge: { dot: "bg-yellow-500", txt: "text-yellow-600" },
    healthy: { dot: "bg-flow", txt: "text-flow" },
  } as const;
  const t = map[tone];
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`size-2 rounded-full ${t.dot}`} />
      <span className={`text-[11px] font-bold uppercase tracking-widest ${t.txt}`}>{label} · {count}</span>
      {hint && <span className="text-[10px] text-muted-foreground">· {hint}</span>}
    </div>
  );
}

function AlertRow({ boss, sev, onOpen }: { boss: Boss; sev: Severity; onOpen: (b: Boss) => void }) {
  const cta = ctaForBoss(boss);
  const toneBg =
    sev === "critical" ? "border-destructive/30 bg-destructive/5"
      : sev === "warning" ? "border-warn/30 bg-warn/5"
      : "border-yellow-500/30 bg-yellow-500/5";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${toneBg}`}>
      <button onClick={() => onOpen(boss)} className="size-10 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold shrink-0">
        {initials(boss.name)}
      </button>
      <button onClick={() => onOpen(boss)} className="flex-1 min-w-0 text-left">
        <div className="font-semibold text-sm truncate">{boss.name} <span className="text-muted-foreground font-normal">· {boss.company}</span></div>
        <div className="text-[11px] text-muted-foreground truncate">{boss.alert ?? bossOneLine(boss)}</div>
      </button>
      {sev !== "nudge" && (
        <button
          className={`text-[11px] font-bold px-3 py-1.5 rounded-md shrink-0 ${
            cta.tone === "destructive" ? "bg-destructive text-destructive-foreground"
              : cta.tone === "warn" ? "bg-warn text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

/* ---------- Overview zones ---------- */
function OverviewZones({ bosses, onOpen }: { bosses: Boss[]; onOpen: (b: Boss) => void }) {
  const sorted = [...bosses].sort((a, b) => healthScore(a) - healthScore(b));
  const tagged = sorted.map((b) => ({ b, sev: severityOf(b), score: healthScore(b) }));
  const critical = tagged.filter((t) => t.sev === "critical");
  const watch = tagged.filter((t) => t.sev === "warning" || t.sev === "nudge");
  const healthy = tagged.filter((t) => t.sev === "healthy");
  const [healthyOpen, setHealthyOpen] = useState(false);

  if (bosses.length === 0) return <EmptyHint text="No bosses match the current filters." />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <ZoneSummary tone="critical" label="Needs you now" count={critical.length} hint="Act today" />
        <ZoneSummary tone="warning" label="Watch" count={watch.length} hint="Check this week" />
        <ZoneSummary tone="healthy" label="Healthy" count={healthy.length} hint="On track" />
      </div>

      <section className="rounded-2xl border border-destructive/25 bg-destructive/[0.02] p-4">
        <ZoneHeader tone="critical" label="Needs you now" count={critical.length} hint="Critical issues — one CTA per card" />
        <div className="mt-3">
          {critical.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic">Nothing critical right now. 🎉</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {critical.map(({ b, score }) => <BossCard key={b.id} boss={b} score={score} sev="critical" onOpen={onOpen} />)}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-warn/25 bg-warn/[0.02] p-4">
        <ZoneHeader tone="warning" label="Watch" count={watch.length} hint="Concerning but not critical · top 6 shown" />
        <div className="mt-3">
          {watch.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic">Nothing to watch.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {watch.slice(0, 6).map(({ b, score }) => <BossCard key={b.id} boss={b} score={score} sev="warning" onOpen={onOpen} compact />)}
            </div>
          )}
        </div>
      </section>

      <section>
        <button
          onClick={() => setHealthyOpen((o) => !o)}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-flow/30 bg-flow/5 hover:bg-flow/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-flow" />
            <span className="text-sm font-semibold text-flow">{healthy.length} bosses healthy. All on track.</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{healthyOpen ? "Hide" : "Show"}</span>
        </button>
        {healthyOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {healthy.map(({ b, score }) => <BossCard key={b.id} boss={b} score={score} sev="healthy" onOpen={onOpen} compact />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ZoneSummary({
  tone, label, count, hint,
}: { tone: "critical" | "warning" | "healthy"; label: string; count: number; hint: string }) {
  const map = {
    critical: { border: "border-destructive/30", bg: "bg-destructive/5", txt: "text-destructive", dot: "bg-destructive" },
    warning: { border: "border-warn/30", bg: "bg-warn/5", txt: "text-warn", dot: "bg-warn" },
    healthy: { border: "border-flow/30", bg: "bg-flow/5", txt: "text-flow", dot: "bg-flow" },
  } as const;
  const t = map[tone];
  return (
    <div className={`p-3 rounded-xl border ${t.border} ${t.bg}`}>
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${t.dot}`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${t.txt}`}>{label}</span>
      </div>
      <div className={`text-2xl font-mono font-bold mt-1 ${t.txt}`}>{count}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

/* ---------- Boss card (slim) ---------- */
function BossCard({
  boss,
  score,
  sev,
  onOpen,
  compact,
}: {
  boss: Boss;
  score?: number;
  sev?: Severity;
  onOpen: (b: Boss) => void;
  compact?: boolean;
}) {
  const s = statusMeta[boss.status];
  const sc = score ?? healthScore(boss);
  const ht = healthTone(sc);
  const cta = ctaForBoss(boss);
  const borderCls =
    sev === "critical" ? "border-destructive/40"
      : sev === "warning" ? "border-warn/30"
      : sev === "healthy" ? "border-border"
      : "border-border";
  return (
    <div className={`bg-surface border rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md animate-fade-in ${borderCls}`}>
      <button onClick={() => onOpen(boss)} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center font-bold text-sm shrink-0">
            {initials(boss.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground leading-tight truncate">{boss.name}</h3>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${ht.bg} shrink-0`}>
                <span className={`text-xs font-mono font-bold ${ht.cls}`}>{sc}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground truncate">{boss.company} · {boss.role}</p>
          </div>
        </div>

        <p className="text-[12px] text-foreground/80 mt-3 leading-snug">
          {bossOneLine(boss)}
        </p>

        <div className="flex items-center justify-between mt-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            <span className={`font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
            <span className="text-muted-foreground ml-2">{boss.ownerInitials}</span>
          </div>
          <span className="text-muted-foreground font-mono">{boss.lastActivity}</span>
        </div>
      </button>

      {!compact && sev === "critical" && (
        <button
          className={`mt-3 w-full text-xs font-bold px-3 py-2 rounded-md ${
            cta.tone === "destructive" ? "bg-destructive text-destructive-foreground"
              : cta.tone === "warn" ? "bg-warn text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
        muted
          ? "bg-surface-elevated text-muted-foreground border-border"
          : "bg-primary/10 text-primary border-primary/20"
      }`}
    >
      {children}
    </span>
  );
}


/* ---------- Chat stream (chat-wise, recency-sorted) ---------- */
function ChatStream({
  bosses,
  onOpenBoss,
}: {
  bosses: Boss[];
  onOpenBoss: (b: Boss) => void;
}) {
  const [seg, setSeg] = useState<"all" | "open" | "closed">("all");
  const [selectedChat, setSelectedChat] = useState<CandidateChat | null>(null);
  const [expandedBoss, setExpandedBoss] = useState<string | null>(null);

  const inScopeIds = new Set(bosses.map((b) => b.id));
  const allChats = useMemo(
    () => ALL_CHATS.filter((c) => inScopeIds.has(c.bossId)).sort((a, b) => b.lastTs - a.lastTs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bosses],
  );
  const filteredChats = seg === "all" ? allChats : allChats.filter((c) => c.status === seg);

  // Group chats by boss, sort bosses by most recent chat in scope
  const grouped = useMemo(() => {
    const m = new Map<string, CandidateChat[]>();
    filteredChats.forEach((c) => {
      const arr = m.get(c.bossId) ?? [];
      arr.push(c);
      m.set(c.bossId, arr);
    });
    const entries: { boss: Boss; chats: CandidateChat[]; lastTs: number }[] = [];
    m.forEach((chats, bossId) => {
      const boss = bossById(bossId);
      if (!boss) return;
      entries.push({ boss, chats, lastTs: chats[0]?.lastTs ?? 0 });
    });
    entries.sort((a, b) => b.lastTs - a.lastTs);
    return entries;
  }, [filteredChats]);

  const active = selectedChat && filteredChats.find((c) => c.id === selectedChat.id) ? selectedChat : filteredChats[0] ?? null;
  const activeBoss = active ? bossById(active.bossId) : null;
  const effectiveExpanded = expandedBoss ?? active?.bossId ?? grouped[0]?.boss.id ?? null;

  return (
    <div className="grid grid-cols-12 gap-0 h-[calc(100dvh-340px)] min-h-[600px] border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      <aside className="col-span-5 border-r border-border overflow-hidden flex flex-col bg-surface">
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(["all", "open", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeg(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                  seg === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s} · {s === "all" ? allChats.length : allChats.filter((c) => c.status === s).length}
              </button>
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            {grouped.length} bosses
          </span>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {grouped.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground">No chats in scope.</li>
          )}
          {grouped.map(({ boss, chats }) => {
            const expanded = effectiveExpanded === boss.id;
            const ss = statusMeta[boss.status];
            const unread = chats.reduce((s, c) => s + (c.unread ?? 0), 0);
            return (
              <li key={boss.id}>
                <button
                  onClick={() => setExpandedBoss(expanded ? null : boss.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-surface-elevated transition-colors ${
                    expanded ? "bg-surface-elevated" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {initials(boss.name)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${ss.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{boss.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{chats[0]?.lastTime}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {boss.company} · {boss.role}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {chats.length} chats
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-surface ${ss.text} border-border`}>
                        {ss.label}
                      </span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                        {boss.ownerInitials}
                      </span>
                      {unread > 0 && (
                        <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                          {unread} new
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                {expanded && (
                  <ul className="bg-background/50 border-t border-border">
                    {chats.map((c) => {
                      const cs = statusMeta[c.chatStatus];
                      const isActive = active?.id === c.id;
                      return (
                        <li key={c.id}>
                          <button
                            onClick={() => setSelectedChat(c)}
                            className={`w-full text-left flex items-start gap-3 pl-6 pr-3 py-2.5 hover:bg-surface-elevated/60 transition-colors border-l-2 ${
                              isActive ? "border-primary bg-surface-elevated/60" : "border-transparent"
                            }`}
                          >
                            <div className="relative shrink-0">
                              <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold border border-primary/20">
                                {initials(c.candidateName)}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${cs.dot}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[12px] truncate">{c.candidateName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono shrink-0">{c.lastTime}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">{c.forRole}</div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {c.status === "closed" && c.closeReason ? (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                    POSITIVE_CLOSE.includes(c.closeReason)
                                      ? "bg-flow/10 text-flow border-flow/20"
                                      : "bg-warn/10 text-warn border-warn/20"
                                  }`}>{c.closeReason}</span>
                                ) : (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border bg-surface ${cs.text} border-border`}>{cs.label}</span>
                                )}
                                {c.interviewChannel && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                                    {c.interviewChannel === "app" ? "📱 App" : "🔗 External"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="col-span-7 overflow-y-auto bg-background">
        {active && activeBoss ? (
          <ChatDetail chat={active} boss={activeBoss} onOpenBoss={onOpenBoss} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Select a chat to view
          </div>
        )}
      </section>
    </div>
  );
}

function ChatDetail({
  chat,
  boss,
  onOpenBoss,
}: {
  chat: CandidateChat;
  boss: Boss;
  onOpenBoss: (b: Boss) => void;
}) {
  const cs = statusMeta[chat.chatStatus];
  return (
    <div>
      <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
            {initials(chat.candidateName)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">{chat.candidateName}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {chat.candidateRole} · for {chat.forRole}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${cs.dot} ${chat.chatStatus === "active" ? "pulse-dot" : ""}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cs.text}`}>{cs.label}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 5-dot journey */}
        <ChatJourney chat={chat} />

        {/* Two profile strips: candidate + boss */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CandidateProfileCard chat={chat} />

          <button
            onClick={() => onOpenBoss(boss)}
            className="text-left p-3 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {initials(boss.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Boss · click to open</div>
                <div className="font-semibold text-sm truncate">{boss.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{boss.company} · {boss.role}</div>
              </div>
              <span className="text-[10px] text-muted-foreground">→</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <ProfRow k="Loc" v={boss.location} />
              <ProfRow k="Stage" v={boss.stage} />
              <ProfRow k="ID" v={boss.id} mono />
              <ProfRow k="Owner" v={boss.ownerInitials} />
            </div>
          </button>
        </div>

        {chat.status === "closed" && chat.closeReason && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 ${
            POSITIVE_CLOSE.includes(chat.closeReason)
              ? "bg-flow/5 border-flow/30 text-flow"
              : "bg-warn/5 border-warn/30 text-warn"
          }`}>
            <span className="text-[10px] uppercase tracking-widest font-bold">Closed</span>
            <span className="text-xs font-semibold">{chat.closeReason}</span>
          </div>
        )}

        {/* Full conversation thread */}
        <div>
          <Label>Full conversation · {chat.messages?.length ?? 0} messages</Label>
          <div className="space-y-3">
            {chat.messages?.map((m, i) => {
              const align =
                m.from === "system" ? "items-center"
                  : m.from === "ops" ? "items-end"
                  : m.from === "boss" ? "items-end"
                  : "items-start";
              const bubble =
                m.from === "system"
                  ? "bg-transparent border border-dashed border-border text-muted-foreground text-xs px-3 py-1.5 rounded-md"
                  : m.from === "ops"
                  ? "bg-primary text-primary-foreground rounded-tr-none px-3 py-2 rounded-lg text-sm"
                  : m.from === "boss"
                  ? "bg-flow/15 text-foreground border border-flow/30 rounded-tr-none px-3 py-2 rounded-lg text-sm"
                  : "bg-surface-elevated border border-border rounded-tl-none px-3 py-2 rounded-lg text-sm";
              const who =
                m.from === "ops" ? "Ops"
                  : m.from === "boss" ? boss.name
                  : m.from === "candidate" ? chat.candidateName
                  : "System";
              return (
                <div key={i} className={`flex flex-col gap-1 ${align}`}>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                    {who} · {m.time}
                  </span>
                  <div className={`max-w-[85%] ${bubble}`}>{m.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold shrink-0 w-12">{k}</span>
      <span className={`text-[11px] truncate ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

/* ---------- Chat journey 5-dot ---------- */
function ChatJourney({ chat }: { chat: CandidateChat }) {
  const idx = chatJourneyIndex(chat);
  return (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Journey</span>
        <span className="text-[10px] font-mono text-muted-foreground">{CHAT_JOURNEY[idx]}</span>
      </div>
      <div className="flex items-center gap-1">
        {CHAT_JOURNEY.map((s, i) => {
          const done = i <= idx;
          return (
            <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className={`size-3 rounded-full border-2 ${done ? "bg-primary border-primary" : "bg-transparent border-border"}`} />
                <span className={`text-[9px] font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < CHAT_JOURNEY.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < idx ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Candidate profile card (richer like boss) ---------- */
function CandidateProfileCard({ chat }: { chat: CandidateChat }) {
  const [open, setOpen] = useState(false);
  const p = chat.candidateProfile;
  return (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 text-left">
        <div className="size-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
          {initials(chat.candidateName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Candidate · click for more</div>
          <div className="font-semibold text-sm truncate">{chat.candidateName}</div>
          <div className="text-[11px] text-muted-foreground truncate">{chat.candidateRole} · for {chat.forRole}</div>
        </div>
        <span className={`text-[10px] text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {p && (
        <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-3">
          <ProfRow k="Exp" v={p.experience} />
          <ProfRow k="Loc" v={p.location} />
          <ProfRow k="Now" v={p.currentCompany} />
          <ProfRow k="Expects" v={p.expectedComp} />
        </div>
      )}
      {open && p && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="grid grid-cols-1 gap-1.5 text-[11px]">
            <ProfRow k="Email" v={p.email} mono />
            <ProfRow k="Phone" v={p.phone} mono />
            <ProfRow k="Role" v={chat.forRole} />
            <ProfRow k="Status" v={chat.status === "closed" ? (chat.closeReason ?? "Closed") : statusMeta[chat.chatStatus].label} />
            <ProfRow k="Channel" v={chat.interviewChannel === "app" ? "TalBoss app" : chat.interviewChannel === "external" ? "External (Meet/Zoom)" : "—"} />
          </div>
          <div className="flex gap-1.5 pt-1">
            <button className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded bg-primary text-primary-foreground">Message</button>
            <button className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded bg-surface-elevated border border-border">Schedule</button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------- Drawer ---------- */
type DrawerTab = "overview" | "roles" | "chats";

function BossDrawer({ boss, onClose }: { boss: Boss; onClose: () => void }) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [openRole, setOpenRole] = useState<OpenRole | null>(null);
  const [chatRoleFilter, setChatRoleFilter] = useState<string>("all");
  const s = statusMeta[boss.status];
  const owner = OWNERS.find((o) => o.initials === boss.ownerInitials);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal>
      <div className="flex-1 bg-background/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="w-full max-w-2xl bg-surface border-l border-border overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-border p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center font-bold">
              {initials(boss.name)}
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{boss.name}</h3>
              <p className="text-xs text-muted-foreground">
                {boss.company} · {boss.role}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-md border border-border hover:bg-surface-elevated transition-colors flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4 flex gap-1 border-b border-border bg-surface/60 sticky top-[81px] z-10">
          {([
            ["overview", "Overview"],
            ["roles", `Roles · ${boss.openRoles.length}`],
            ["chats", `Chats · ${boss.candidateChats.length}`],
          ] as [DrawerTab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setOpenRole(null);
                setChatRoleFilter("all");
              }}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                tab === k
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-6">
          {tab === "overview" && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{boss.id}</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${sentimentMeta[boss.sentiment].cls}`}>
                  {sentimentMeta[boss.sentiment].label}
                </span>
              </div>

              <div>
                <Label>Outcomes</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Field label="Hired" value={String(boss.hired)} />
                  <Field label="Not hired" value={String(boss.notHired)} />
                  <Field label="Open chats" value={String(boss.chatsOpen)} />
                  <Field label="Closed chats" value={String(boss.chatsClosed)} />
                </div>
              </div>

              <div>
                <Label>Boss profile</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email" value={boss.email} mono />
                  <Field label="Phone" value={boss.phone} mono />
                  <Field label="Location" value={boss.location} />
                  <Field label="Owner" value={owner ? `${owner.initials} · ${owner.name}` : boss.ownerInitials} />
                </div>
              </div>

              <div>
                <Label>Hiring intent</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden border border-border">
                    <div className="h-full bg-primary" style={{ width: `${boss.hiringIntent}%` }} />
                  </div>
                  <span className="text-sm font-mono font-bold">{boss.hiringIntent}%</span>
                </div>
              </div>

              <div>
                <Label>Stage</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((stg) => {
                    const idx = STAGES.indexOf(boss.stage);
                    const i = STAGES.indexOf(stg);
                    const passed = i < idx;
                    const current = i === idx;
                    return (
                      <span
                        key={stg}
                        className={`text-[10px] font-semibold px-2 py-1 rounded border ${
                          current
                            ? "bg-primary text-primary-foreground border-primary"
                            : passed
                            ? "bg-surface-elevated text-foreground border-border"
                            : "bg-transparent text-muted-foreground border-border/60"
                        }`}
                      >
                        {stg}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Chat summary</Label>
                <p className="text-sm leading-relaxed text-foreground/90 p-3 rounded-lg bg-surface-elevated border-l-2 border-primary">
                  {boss.summary}
                </p>
              </div>

              <div>
                <Label>Recent ops conversation</Label>
                <div className="space-y-3">
                  {boss.conversation.map((m, i) => (
                    <div
                      key={i}
                      className={`flex flex-col gap-1 ${
                        m.from === "ops" ? "items-end" : m.from === "system" ? "items-center" : "items-start"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                        {m.from === "ops" ? "Ops" : m.from === "boss" ? boss.name : "System"} · {m.time}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                          m.from === "system"
                            ? "bg-transparent border border-dashed border-border text-muted-foreground text-xs"
                            : m.from === "ops"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-surface-elevated border border-border rounded-tl-none"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "roles" && (
            <RolesTab
              boss={boss}
              roles={boss.openRoles}
              openRole={openRole}
              setOpenRole={setOpenRole}
              onShowChats={(roleTitle) => {
                setChatRoleFilter(roleTitle);
                setTab("chats");
              }}
            />
          )}

          {tab === "chats" && (
            <ChatsTab
              chats={boss.candidateChats}
              roleFilter={chatRoleFilter}
              setRoleFilter={setChatRoleFilter}
              roles={boss.openRoles.map((r) => r.title)}
            />
          )}

          <div className="flex gap-2 pt-2 border-t border-border">
            <button className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              Open full chat
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ---------- Roles tab ---------- */
function RolesTab({
  boss,
  roles,
  openRole,
  setOpenRole,
  onShowChats,
}: {
  boss: Boss;
  roles: OpenRole[];
  openRole: OpenRole | null;
  setOpenRole: (r: OpenRole | null) => void;
  onShowChats: (roleTitle: string) => void;
}) {
  if (roles.length === 0) {
    return <EmptyHint text="No open roles for this boss." />;
  }
  if (openRole) {
    const chatsForRole = boss.candidateChats.filter((c) => c.forRole === openRole.title);
    const openChats = chatsForRole.filter((c) => c.status === "open").length;
    return (
      <div>
        <button
          onClick={() => setOpenRole(null)}
          className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
        >
          ← All roles
        </button>
        <div className="bg-surface-elevated border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold text-base">{openRole.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Posted {openRole.postedAgo} · {openRole.type}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
              {openRole.candidates} candidates
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Compensation" value={openRole.compensation} />
            <Field label="Experience" value={openRole.experience} />
            <Field label="Location" value={openRole.location} />
            <Field label="Type" value={openRole.type} />
            <Field label="Hired" value={String(openRole.hired)} />
            <Field label="Not hired" value={String(openRole.notHired)} />
          </div>
          <button
            onClick={() => onShowChats(openRole.title)}
            className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            View {openChats} open chats for this role →
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>Open roles · {roles.length}</Label>
      <div className="grid gap-2">
        {roles.map((r) => {
          const chatsForRole = boss.candidateChats.filter((c) => c.forRole === r.title);
          const openChats = chatsForRole.filter((c) => c.status === "open").length;
          return (
            <button
              key={r.id}
              onClick={() => setOpenRole(r)}
              className="text-left p-4 rounded-xl bg-surface-elevated border border-border hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {r.compensation} · {r.experience} · {r.location}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-flow/10 text-flow border border-flow/20">
                      Hired {r.hired}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warn/10 text-warn border border-warn/20">
                      Not {r.notHired}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {openChats} open chats
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-surface text-muted-foreground border border-border">
                  {r.candidates} cand
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Chats tab ---------- */
function ChatsTab({
  chats,
  roleFilter,
  setRoleFilter,
  roles,
}: {
  chats: CandidateChat[];
  roleFilter: string;
  setRoleFilter: (r: string) => void;
  roles: string[];
}) {
  const [seg, setSeg] = useState<"open" | "closed">("open");
  const filtered = chats.filter((c) => roleFilter === "all" || c.forRole === roleFilter);
  const open = filtered.filter((c) => c.status === "open");
  const closed = filtered.filter((c) => c.status === "closed");
  const list = seg === "open" ? open : closed;

  const grouped = useMemo(() => {
    if (seg !== "closed") return null;
    const m: Record<string, CandidateChat[]> = {};
    closed.forEach((c) => {
      const k = c.closeReason || "Other";
      (m[k] ||= []).push(c);
    });
    return m;
  }, [seg, closed]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Pill active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>All roles</Pill>
        {roles.map((r) => (
          <Pill key={r} active={roleFilter === r} onClick={() => setRoleFilter(r)}>{r}</Pill>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 bg-surface-elevated border border-border rounded-full w-fit mb-4">
        <SegBtn active={seg === "open"} onClick={() => setSeg("open")}>
          Open · {open.length}
        </SegBtn>
        <SegBtn active={seg === "closed"} onClick={() => setSeg("closed")}>
          Closed · {closed.length}
        </SegBtn>
      </div>

      {list.length === 0 ? (
        <EmptyHint text={`No ${seg} chats.`} />
      ) : seg === "open" ? (
        <div className="bg-surface-elevated border border-border rounded-xl divide-y divide-border overflow-hidden">
          {list.map((c) => (
            <ChatRow key={c.id} chat={c} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped &&
            Object.entries(grouped).map(([reason, items]) => (
              <div key={reason}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  {reason} · {items.length}
                </div>
                <div className="bg-surface-elevated border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {items.map((c) => (
                    <ChatRow key={c.id} chat={c} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ChatRow({ chat }: { chat: CandidateChat }) {
  const isClosed = chat.status === "closed";
  const positive = chat.closeReason && (POSITIVE_CLOSE as CloseReason[]).includes(chat.closeReason);
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-surface transition-colors">
      <div
        className={`size-10 rounded-full flex items-center justify-center text-xs font-bold border ${
          isClosed
            ? "bg-surface text-muted-foreground border-border"
            : "bg-primary/15 text-primary border-primary/20"
        }`}
      >
        {initials(chat.candidateName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate">{chat.candidateName}</span>
            {chat.pinned && <span className="text-[10px] text-muted-foreground">📌</span>}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">{chat.lastTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
          {chat.unread ? (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full size-4 flex items-center justify-center shrink-0">
              {chat.unread}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">
            {chat.forRole}
          </span>
          {isClosed && chat.closeReason && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                positive
                  ? "bg-flow/10 text-flow border-flow/20"
                  : "bg-warn/10 text-warn border-warn/20"
              }`}
            >
              {chat.closeReason}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-surface-elevated border border-border">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
        {label}
      </div>
      <div className={`text-sm ${mono ? "font-mono" : ""} truncate`}>{value}</div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

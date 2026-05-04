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

function Dashboard() {
  const [view, setView] = useState<View>("all");
  const [layout, setLayout] = useState<"grid" | "chat">("grid");
  const [me, setMe] = useState<string>("YS");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ChatStatus | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all"); // owner initials
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selected, setSelected] = useState<Boss | null>(null);
  const [trackerDrill, setTrackerDrill] = useState<{ title: string; bosses: Boss[] } | null>(null);

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

  const alerts = filtered.filter((b) => b.alert).length;

  return (
    <div className="min-h-dvh bg-background text-foreground">
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
        count={filtered.length}
      />

      <main className="px-6 py-6 max-w-[1600px] mx-auto space-y-6">
        <Tracker bosses={filtered} onDrill={setTrackerDrill} />

        <div className="flex items-center justify-between">
          <SectionHeader
            title={view === "all" ? (layout === "chat" ? "All chats" : "All bosses") : `My ${layout === "chat" ? "chats" : "bosses"} · ${me}`}
            subtitle={layout === "chat" ? `${filtered.flatMap((b) => b.candidateChats).length} chats` : `${filtered.length} matches`}
          />
          <LayoutToggle layout={layout} setLayout={setLayout} />
        </div>

        {layout === "grid" ? (
          <BossGrid bosses={filtered} onOpen={setSelected} />
        ) : (
          <ChatStream bosses={filtered} onOpenBoss={setSelected} />
        )}
      </main>

      {selected && (
        <BossDrawer boss={selected} onClose={() => setSelected(null)} />
      )}
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

/* ---------- Layout toggle ---------- */
function LayoutToggle({
  layout,
  setLayout,
}: {
  layout: "grid" | "chat";
  setLayout: (l: "grid" | "chat") => void;
}) {
  return (
    <div className="flex p-1 bg-surface rounded-lg border border-border">
      {(["grid", "chat"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLayout(l)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
            layout === l
              ? "bg-surface-elevated text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l === "grid" ? "Bosses" : "Chats"}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tracker (real-time analytics) ---------- */
function Tracker({
  bosses,
  onDrill,
}: {
  bosses: Boss[];
  onDrill: (d: { title: string; bosses: Boss[] }) => void;
}) {
  const total = bosses.length || 1;

  // Funnel by stage
  const byStage = STAGES.map((s) => ({
    stage: s,
    bosses: bosses.filter((b) => b.stage === s),
  }));
  const maxStageCount = Math.max(1, ...byStage.map((s) => s.bosses.length));

  // Sentiment
  const happy = bosses.filter((b) => b.sentiment === "happy");
  const neutral = bosses.filter((b) => b.sentiment === "neutral");
  const unhappy = bosses.filter((b) => b.sentiment === "unhappy");

  // Status
  const active = bosses.filter((b) => b.status === "active");
  const idle = bosses.filter((b) => b.status === "idle");
  const noReply = bosses.filter((b) => b.status === "no_reply");

  // Onboarded = past Onboarding stage (i.e., verified + has roles)
  const onboarded = bosses.filter((b) => b.stage !== "Onboarding");

  // Closed chats positive vs negative across all bosses
  const allChats = bosses.flatMap((b) => b.candidateChats);
  const closedChats = allChats.filter((c) => c.status === "closed");
  const positiveClosed = closedChats.filter(
    (c) => c.closeReason && POSITIVE_CLOSE.includes(c.closeReason),
  );
  const negativeClosed = closedChats.filter(
    (c) => c.closeReason && NEGATIVE_CLOSE.includes(c.closeReason),
  );
  const negByReason: Record<string, number> = {};
  negativeClosed.forEach((c) => {
    if (c.closeReason) negByReason[c.closeReason] = (negByReason[c.closeReason] ?? 0) + 1;
  });

  // Swipe → DM
  const swipes = bosses.reduce((s, b) => s + b.swipedToDM, 0);
  const dms = bosses.reduce((s, b) => s + b.dmAccepted, 0);
  const swipeToDM = swipes ? Math.round((dms / swipes) * 100) : 0;

  // Bosses with chats closed positively / negatively (for drill-down)
  const bossesWithPositive = bosses.filter((b) =>
    b.candidateChats.some((c) => c.closeReason && POSITIVE_CLOSE.includes(c.closeReason)),
  );
  const bossesWithNegative = bosses.filter((b) =>
    b.candidateChats.some((c) => c.closeReason && NEGATIVE_CLOSE.includes(c.closeReason)),
  );

  return (
    <section className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-flow pulse-dot" />
          <h2 className="text-sm font-bold tracking-tight">Tracker</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            real-time
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{bosses.length} bosses in scope</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stage funnel */}
        <div className="lg:col-span-2 bg-background border border-border rounded-xl p-4">
          <TrackerLabel>Drop-off funnel · by stage</TrackerLabel>
          <div className="space-y-1.5">
            {byStage.map((s) => {
              const pct = Math.round((s.bosses.length / total) * 100);
              const w = (s.bosses.length / maxStageCount) * 100;
              return (
                <button
                  key={s.stage}
                  onClick={() => onDrill({ title: `Stage · ${s.stage}`, bosses: s.bosses })}
                  className="w-full flex items-center gap-3 text-left group"
                  disabled={s.bosses.length === 0}
                >
                  <span className="w-24 text-[11px] font-medium text-muted-foreground shrink-0 truncate">
                    {s.stage}
                  </span>
                  <div className="flex-1 h-5 bg-surface rounded-md overflow-hidden border border-border relative">
                    <div
                      className="h-full bg-primary/70 group-hover:bg-primary transition-all"
                      style={{ width: `${w}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-mono font-bold">
                      {s.bosses.length}
                    </span>
                  </div>
                  <span className="w-10 text-right text-[11px] font-mono text-muted-foreground shrink-0">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sentiment + status + onboarded */}
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Happy"
            value={`${pct(happy.length, total)}%`}
            sub={`${happy.length} bosses`}
            tone="flow"
            onClick={() => onDrill({ title: "Happy bosses", bosses: happy })}
          />
          <MetricTile
            label="Unhappy"
            value={`${pct(unhappy.length, total)}%`}
            sub={`${unhappy.length} bosses`}
            tone="warn"
            onClick={() => onDrill({ title: "Unhappy bosses", bosses: unhappy })}
          />
          <MetricTile
            label="Active now"
            value={`${active.length}`}
            sub={`${pct(active.length, total)}%`}
            tone="flow"
            onClick={() => onDrill({ title: "Active bosses", bosses: active })}
          />
          <MetricTile
            label="No reply"
            value={`${noReply.length}`}
            sub={`${pct(noReply.length, total)}%`}
            tone="warn"
            onClick={() => onDrill({ title: "No-reply bosses", bosses: noReply })}
          />
          <MetricTile
            label="Idle"
            value={`${idle.length}`}
            sub={`${pct(idle.length, total)}%`}
            onClick={() => onDrill({ title: "Idle bosses", bosses: idle })}
          />
          <MetricTile
            label="Onboarded"
            value={`${onboarded.length}`}
            sub={`${pct(onboarded.length, total)}%`}
            onClick={() => onDrill({ title: "Onboarded bosses", bosses: onboarded })}
          />
        </div>
      </div>

      {/* Bottom row: swipe→dm, closed outcomes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <TrackerLabel>Swipe → DM ratio</TrackerLabel>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold">{swipeToDM}%</span>
            <span className="text-[11px] text-muted-foreground">{dms}/{swipes}</span>
          </div>
          <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden border border-border">
            <div className="h-full bg-primary" style={{ width: `${swipeToDM}%` }} />
          </div>
        </div>

        <button
          onClick={() => onDrill({ title: "Bosses with positive closes", bosses: bossesWithPositive })}
          className="bg-background border border-border rounded-xl p-4 text-left hover:border-flow/40 transition-colors"
        >
          <TrackerLabel>Positive closes</TrackerLabel>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-flow">{positiveClosed.length}</span>
            <span className="text-[11px] text-muted-foreground">hired · accepted</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Across {bossesWithPositive.length} bosses
          </div>
        </button>

        <button
          onClick={() => onDrill({ title: "Bosses with negative closes", bosses: bossesWithNegative })}
          className="bg-background border border-border rounded-xl p-4 text-left hover:border-warn/40 transition-colors"
        >
          <TrackerLabel>Negative closes</TrackerLabel>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-warn">{negativeClosed.length}</span>
            <span className="text-[11px] text-muted-foreground">unmatched</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(negByReason).slice(0, 4).map(([r, n]) => (
              <span
                key={r}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-warn/10 text-warn border border-warn/20"
              >
                {r} {n}
              </span>
            ))}
          </div>
        </button>
      </div>
    </section>
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
        <div className="relative flex items-center bg-surface border border-border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-ring">
          <button
            onClick={() => setScopeOpen((o) => !o)}
            className="flex items-center gap-1 pl-2 pr-2 h-9 text-[11px] font-semibold text-muted-foreground hover:text-foreground border-r border-border"
            title="Search scope"
          >
            <span className="uppercase tracking-wider">{scopeLabel[scope]}</span>
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <svg
            className="absolute left-[78px] top-2.5 size-4 text-muted-foreground pointer-events-none"
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
            placeholder={`Search by ${scopeLabel[scope].toLowerCase()}…`}
            className="w-72 bg-transparent py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {scopeOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setScopeOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-40 w-40 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                {(Object.keys(scopeLabel) as SearchScope[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setScope(k);
                      setScopeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-elevated ${
                      scope === k ? "bg-surface-elevated text-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {scopeLabel[k]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {alerts > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-warn/30 bg-warn/10">
            <span className="size-1.5 rounded-full bg-warn pulse-dot" />
            <span className="text-xs font-semibold text-warn">{alerts} alerts</span>
          </div>
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

      <span className="ml-auto text-xs text-muted-foreground font-mono">{count} bosses</span>

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

/* ---------- Boss Grid + Card ---------- */
function BossGrid({ bosses, onOpen }: { bosses: Boss[]; onOpen: (b: Boss) => void }) {
  if (bosses.length === 0) return <EmptyHint text="No bosses match the current filters." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {bosses.map((b) => (
        <BossCard key={b.id} boss={b} onOpen={onOpen} />
      ))}
    </div>
  );
}

function BossCard({ boss, onOpen }: { boss: Boss; onOpen: (b: Boss) => void }) {
  const s = statusMeta[boss.status];
  const owner = OWNERS.find((o) => o.initials === boss.ownerInitials);
  const isAlert = !!boss.alert;
  return (
    <button
      onClick={() => onOpen(boss)}
      className={`text-left bg-surface border rounded-2xl p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 animate-fade-in ${
        isAlert ? "border-warn/30" : "border-border"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 min-w-0">
          <div className="size-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center font-bold text-sm shrink-0">
            {initials(boss.name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground leading-tight truncate">{boss.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {boss.company} · {boss.role}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{boss.id}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`size-2.5 rounded-full ${s.dot} ${boss.status === "active" ? "pulse-dot" : ""}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        <Tag>{boss.stage}</Tag>
        {boss.verified ? <Tag>Verified</Tag> : <Tag muted>Unverified</Tag>}
        <Tag muted>{boss.location}</Tag>
      </div>

      <div className="grid grid-cols-4 gap-2 py-3 border-y border-border/60">
        <Stat label="Roles" value={boss.rolesOpen} accent />
        <Stat label="Open" value={boss.chatsOpen} />
        <Stat label="Hired" value={boss.hired} />
        <Stat label="Not" value={boss.notHired} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            title={owner?.name}
            className="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20"
          >
            {boss.ownerInitials}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">{boss.lastActivity}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${sentimentMeta[boss.sentiment].cls}`}>
          {sentimentMeta[boss.sentiment].label}
        </span>
      </div>

      {isAlert && (
        <div className="mt-3 p-2 rounded-md bg-warn/5 border border-warn/20 text-[11px] text-warn flex items-start gap-2">
          <span className="size-1.5 rounded-full bg-warn mt-1.5 shrink-0" />
          <span>{boss.alert}</span>
        </div>
      )}
    </button>
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

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{label}</p>
      <p className={`text-base font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
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

  const inScopeIds = new Set(bosses.map((b) => b.id));
  const all = useMemo(
    () =>
      ALL_CHATS.filter((c) => inScopeIds.has(c.bossId)).sort((a, b) => b.lastTs - a.lastTs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bosses],
  );
  const list = seg === "all" ? all : all.filter((c) => c.status === seg);

  const active = selectedChat && list.find((c) => c.id === selectedChat.id) ? selectedChat : list[0] ?? null;
  const activeBoss = active ? bossById(active.bossId) : null;

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100dvh-360px)] min-h-[560px] border border-border rounded-2xl overflow-hidden bg-surface">
      <aside className="col-span-5 border-r border-border overflow-hidden flex flex-col bg-surface">
        <div className="p-3 border-b border-border flex items-center gap-1">
          {(["all", "open", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeg(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize ${
                seg === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s} · {s === "all" ? all.length : all.filter((c) => c.status === s).length}
            </button>
          ))}
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {list.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground">No chats in scope.</li>
          )}
          {list.map((c) => {
            const boss = bossById(c.bossId);
            const cs = statusMeta[c.chatStatus];
            const isActive = active?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedChat(c)}
                  className={`w-full text-left flex items-start gap-3 p-3 hover:bg-surface-elevated transition-colors ${
                    isActive ? "bg-surface-elevated" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
                      {initials(c.candidateName)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${cs.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{c.candidateName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{c.lastTime}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {c.forRole} · {boss?.company}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                      {c.unread ? (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full size-4 flex items-center justify-center shrink-0">
                          {c.unread}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {c.status === "closed" && c.closeReason ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          POSITIVE_CLOSE.includes(c.closeReason)
                            ? "bg-flow/10 text-flow border-flow/20"
                            : "bg-warn/10 text-warn border-warn/20"
                        }`}>
                          {c.closeReason}
                        </span>
                      ) : (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border bg-surface ${cs.text} border-border`}>
                          {cs.label}
                        </span>
                      )}
                      {boss && (
                        <span
                          title={`Owner: ${boss.ownerInitials}`}
                          className="text-[9px] px-1 py-0.5 rounded bg-surface border border-border text-muted-foreground"
                        >
                          {boss.ownerInitials}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
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
        {/* Boss strip — click to open profile */}
        <button
          onClick={() => onOpenBoss(boss)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors text-left"
        >
          <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {initials(boss.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Boss</div>
            <div className="font-semibold text-sm truncate">{boss.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{boss.company} · {boss.role}</div>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{boss.id}</span>
          <span className="text-[10px] text-muted-foreground">→</span>
        </button>

        <div>
          <Label>Recent messages</Label>
          <p className="text-sm leading-relaxed p-3 rounded-lg bg-surface border-l-2 border-primary">
            {chat.lastMessage}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">{chat.lastTime} ago</p>
        </div>

        {chat.status === "closed" && chat.closeReason && (
          <div>
            <Label>Close outcome</Label>
            <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              POSITIVE_CLOSE.includes(chat.closeReason)
                ? "bg-flow/10 text-flow border-flow/30"
                : "bg-warn/10 text-warn border-warn/30"
            }`}>
              {chat.closeReason}
            </span>
          </div>
        )}
      </div>
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

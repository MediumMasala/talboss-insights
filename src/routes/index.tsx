import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BOSSES,
  OWNERS,
  STAGES,
  type Boss,
  type CandidateChat,
  type ChatStatus,
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
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ChatStatus | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selected, setSelected] = useState<Boss | null>(null);

  const filtered = useMemo(() => {
    return BOSSES.filter((b) => {
      if (view === "mine" && b.ownerInitials !== me) return false;
      if (stageFilter !== "all" && b.stage !== stageFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (sentimentFilter !== "all" && b.sentiment !== sentimentFilter) return false;
      if (verifiedOnly && !b.verified) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !b.name.toLowerCase().includes(q) &&
          !b.company.toLowerCase().includes(q) &&
          !b.id.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [view, me, search, stageFilter, statusFilter, sentimentFilter, verifiedOnly]);

  const stageStats = useMemo(() => {
    const map: Record<Stage, number> = {
      "Job Creation": 0,
      Verification: 0,
      Talking: 0,
      Interview: 0,
      Hiring: 0,
      Closing: 0,
    };
    filtered.forEach((b) => (map[b.stage] += 1));
    return map;
  }, [filtered]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((b) => b.status === "active").length;
    const stalled = filtered.filter((b) => b.status === "no_reply" || b.alert).length;
    const happyPct = total
      ? Math.round((filtered.filter((b) => b.sentiment === "happy").length / total) * 100)
      : 0;
    const openChats = filtered.reduce((s, b) => s + b.chatsOpen, 0);
    return { total, active, stalled, happyPct, openChats };
  }, [filtered]);

  const alerts = filtered.filter((b) => b.alert).length;
  const myOpen = view === "mine" ? filtered.filter((b) => b.status !== "closed") : [];
  const myClosed = view === "mine" ? filtered.filter((b) => b.status === "closed") : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header
        view={view}
        setView={setView}
        me={me}
        setMe={setMe}
        search={search}
        setSearch={setSearch}
        alerts={alerts}
      />

      <FilterBar
        stageFilter={stageFilter}
        setStageFilter={setStageFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sentimentFilter={sentimentFilter}
        setSentimentFilter={setSentimentFilter}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        count={filtered.length}
      />

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        <Metrics metrics={metrics} />

        <div className="mt-6 flex items-center justify-between">
          <SectionHeader
            title={view === "all" ? "All bosses" : `My bosses · ${me}`}
            subtitle={`${filtered.length} matches`}
          />
          <LayoutToggle layout={layout} setLayout={setLayout} />
        </div>

        {layout === "grid" ? (
          view === "all" ? (
            <BossGrid bosses={filtered} onOpen={setSelected} />
          ) : (
            <div className="grid gap-8">
              <section>
                <SubHead title="Open" count={myOpen.length} />
                <BossGrid bosses={myOpen} onOpen={setSelected} />
              </section>
              <section>
                <SubHead title="Closed" count={myClosed.length} />
                {myClosed.length === 0 ? (
                  <EmptyHint text="No closed chats yet." />
                ) : (
                  <BossGrid bosses={myClosed} onOpen={setSelected} />
                )}
              </section>
            </div>
          )
        ) : (
          <ChatLayout bosses={filtered} selected={selected} onOpen={setSelected} />
        )}
      </main>

      {selected && layout === "grid" && (
        <BossDrawer boss={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

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
          {l === "grid" ? "Grid" : "Chat split"}
        </button>
      ))}
    </div>
  );
}

function SubHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
    </div>
  );
}

/* ---------- Chat split layout (WhatsApp-style) ---------- */
function ChatLayout({
  bosses,
  selected,
  onOpen,
}: {
  bosses: Boss[];
  selected: Boss | null;
  onOpen: (b: Boss) => void;
}) {
  const active = selected && bosses.find((b) => b.id === selected.id) ? selected : bosses[0] ?? null;
  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100dvh-260px)] min-h-[560px] border border-border rounded-2xl overflow-hidden bg-surface">
      {/* Left: boss list */}
      <aside className="col-span-4 border-r border-border overflow-y-auto bg-surface">
        {bosses.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No bosses match.</div>
        ) : (
          <ul className="divide-y divide-border">
            {bosses.map((b) => {
              const s = statusMeta[b.status];
              const isActive = active?.id === b.id;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => onOpen(b)}
                    className={`w-full text-left flex items-start gap-3 p-3 hover:bg-surface-elevated transition-colors ${
                      isActive ? "bg-surface-elevated" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="size-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
                        {initials(b.name)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${s.dot}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{b.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {b.lastActivity}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {b.company} · {b.role}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                          {b.stage}
                        </span>
                        {b.chatsOpen > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 font-bold">
                            {b.chatsOpen}
                          </span>
                        )}
                        {b.alert && (
                          <span className="size-1.5 rounded-full bg-warn pulse-dot ml-auto" />
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Right: chat summary panel */}
      <section className="col-span-8 overflow-y-auto bg-background">
        {active ? (
          <ChatSummaryPanel boss={active} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Select a boss to view chat
          </div>
        )}
      </section>
    </div>
  );
}

function ChatSummaryPanel({ boss }: { boss: Boss }) {
  const s = statusMeta[boss.status];
  const owner = OWNERS.find((o) => o.initials === boss.ownerInitials);
  return (
    <div>
      <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
            {initials(boss.name)}
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">{boss.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {boss.company} · {boss.role}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${s.dot} ${boss.status === "active" ? "pulse-dot" : ""}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
          <span className="ml-2 size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20">
            {boss.ownerInitials}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Roles" value={boss.rolesOpen} accent />
          <Stat label="Open" value={boss.chatsOpen} />
          <Stat label="Closed" value={boss.chatsClosed} />
          <Stat label="Intent" value={`${boss.hiringIntent}%`} />
        </div>

        <div>
          <Label>Chat summary</Label>
          <p className="text-sm leading-relaxed p-3 rounded-lg bg-surface border-l-2 border-primary">
            {boss.summary}
          </p>
        </div>

        <div>
          <Label>Recent messages</Label>
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
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    m.from === "system"
                      ? "bg-transparent border border-dashed border-border text-muted-foreground text-xs"
                      : m.from === "ops"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-surface border border-border rounded-tl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Open roles · {boss.openRoles.length}</Label>
          <div className="grid gap-2">
            {boss.openRoles.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg bg-surface border border-border flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {r.compensation} · {r.experience} · {r.location}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {r.candidates}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Candidate chats</Label>
          <ChatsTab chats={boss.candidateChats} />
        </div>

        <div className="text-[11px] text-muted-foreground font-mono">
          Owner: {owner?.name ?? boss.ownerInitials} · ID {boss.id}
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
  alerts,
}: {
  view: View;
  setView: (v: View) => void;
  me: string;
  setMe: (m: string) => void;
  search: string;
  setSearch: (s: string) => void;
  alerts: number;
}) {
  const [open, setOpen] = useState(false);
  const current = OWNERS.find((o) => o.initials === me)!;
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
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search boss, company, ID…"
            className="w-72 bg-surface border border-border rounded-lg py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <svg
            className="absolute left-3 top-2.5 size-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
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
            <div className="absolute right-0 mt-2 w-60 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
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
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  count: number;
}) {
  const {
    stageFilter,
    setStageFilter,
    statusFilter,
    setStatusFilter,
    sentimentFilter,
    setSentimentFilter,
    verifiedOnly,
    setVerifiedOnly,
    count,
  } = props;
  return (
    <div className="px-6 py-3 border-b border-border bg-surface/40 flex flex-wrap items-center gap-2">
      <Group label="Stage">
        <Pill active={stageFilter === "all"} onClick={() => setStageFilter("all")}>All</Pill>
        {STAGES.map((s) => (
          <Pill key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>{s}</Pill>
        ))}
      </Group>
      <Divider />
      <Group label="Status">
        {(["all", "active", "idle", "no_reply"] as const).map((s) => (
          <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {s === "all" ? "Any" : s === "no_reply" ? "No reply" : s[0].toUpperCase() + s.slice(1)}
          </Pill>
        ))}
      </Group>
      <Divider />
      <Group label="Vibe">
        {(["all", "happy", "neutral", "unhappy"] as const).map((s) => (
          <Pill key={s} active={sentimentFilter === s} onClick={() => setSentimentFilter(s)}>
            {s === "all" ? "Any" : s[0].toUpperCase() + s.slice(1)}
          </Pill>
        ))}
      </Group>
      <Divider />
      <Pill active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>
        Verified only
      </Pill>
      <span className="ml-auto text-xs text-muted-foreground font-mono">{count} bosses</span>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
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

function Divider() {
  return <span className="h-4 w-px bg-border mx-1" />;
}

/* ---------- Metrics ---------- */
function Metrics({
  metrics,
}: {
  metrics: { total: number; active: number; stalled: number; happyPct: number; openChats: number };
}) {
  const cards = [
    { label: "Bosses", value: metrics.total, hint: "in current view" },
    { label: "Active now", value: metrics.active, hint: "live conversations", accent: true },
    { label: "Stalled", value: metrics.stalled, hint: "needs ops touch", warn: metrics.stalled > 0 },
    { label: "Open chats", value: metrics.openChats, hint: "across funnel" },
    { label: "Happy boss", value: `${metrics.happyPct}%`, hint: "sentiment score" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-surface border rounded-xl p-4 ${c.warn ? "border-warn/30" : "border-border"}`}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {c.label}
          </div>
          <div
            className={`text-2xl font-mono font-bold ${
              c.warn ? "text-warn" : c.accent ? "text-flow" : "text-foreground"
            }`}
          >
            {c.value}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Stage Analytics ---------- */
function StageAnalytics({ stats, total }: { stats: Record<Stage, number>; total: number }) {
  const max = Math.max(1, ...Object.values(stats));
  return (
    <div className="mt-4 bg-surface border border-border rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Funnel by stage</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Boss distribution across the pipeline
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{total} bosses</span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {STAGES.map((s, i) => {
          const v = stats[s];
          const pct = total ? Math.round((v / total) * 100) : 0;
          const h = `${(v / max) * 100}%`;
          return (
            <div key={s} className="flex flex-col">
              <div className="relative h-24 bg-surface-elevated rounded-md overflow-hidden flex items-end">
                <div
                  className="w-full bg-primary/80 transition-all"
                  style={{ height: v ? h : "4px" }}
                />
                <span className="absolute top-1.5 right-2 text-[10px] font-mono text-muted-foreground">
                  {pct}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-foreground/80 truncate">
                  <span className="text-muted-foreground mr-1 font-mono">{i + 1}</span>
                  {s}
                </span>
                <span className="text-xs font-mono font-bold">{v}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
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

      <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/60">
        <Stat label="Open" value={boss.chatsOpen} />
        <Stat label="Closed" value={boss.chatsClosed} />
        <Stat label="Roles" value={boss.rolesOpen} accent />
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
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${sentimentMeta[boss.sentiment].cls}`}
        >
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

/* ---------- Drawer ---------- */
type DrawerTab = "overview" | "roles" | "chats";

function BossDrawer({ boss, onClose }: { boss: Boss; onClose: () => void }) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [openRole, setOpenRole] = useState<OpenRole | null>(null);
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
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${sentimentMeta[boss.sentiment].cls}`}
                >
                  {sentimentMeta[boss.sentiment].label}
                </span>
              </div>

              <div>
                <Label>Boss profile</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Roles open" value={String(boss.rolesOpen)} />
                  <Field label="Chats open" value={String(boss.chatsOpen)} />
                  <Field label="Chats closed" value={String(boss.chatsClosed)} />
                  <Field label="Hiring intent" value={`${boss.hiringIntent}%`} />
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
            <RolesTab roles={boss.openRoles} openRole={openRole} setOpenRole={setOpenRole} />
          )}

          {tab === "chats" && <ChatsTab chats={boss.candidateChats} />}

          <div className="flex gap-2 pt-2 border-t border-border">
            <button className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              Open full chat
            </button>
            <button className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-surface-elevated">
              Reassign
            </button>
            <button className="px-3 py-2 rounded-lg border border-warn/30 text-warn text-sm font-semibold hover:bg-warn/10">
              Flag
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ---------- Roles tab (drill-down) ---------- */
function RolesTab({
  roles,
  openRole,
  setOpenRole,
}: {
  roles: OpenRole[];
  openRole: OpenRole | null;
  setOpenRole: (r: OpenRole | null) => void;
}) {
  if (roles.length === 0) {
    return <EmptyHint text="No open roles for this boss." />;
  }
  if (openRole) {
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Compensation" value={openRole.compensation} />
            <Field label="Experience" value={openRole.experience} />
            <Field label="Location" value={openRole.location} />
            <Field label="Type" value={openRole.type} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>Open roles · {roles.length}</Label>
      <div className="grid gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpenRole(r)}
            className="text-left p-4 rounded-xl bg-surface-elevated border border-border hover:border-primary/40 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{r.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {r.compensation} · {r.experience} · {r.location}
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {r.candidates}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Chats tab (WhatsApp style) ---------- */
function ChatsTab({ chats }: { chats: CandidateChat[] }) {
  const [seg, setSeg] = useState<"open" | "closed">("open");
  const open = chats.filter((c) => c.status === "open");
  const closed = chats.filter((c) => c.status === "closed");
  const list = seg === "open" ? open : closed;

  // group closed by reason
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
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {chat.lastTime}
          </span>
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
                chat.closeReason === "Hired"
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

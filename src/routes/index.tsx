import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BOSSES,
  STAGES,
  type Boss,
  type ChatStatus,
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
const ME = "YS";

const statusMeta: Record<ChatStatus, { label: string; cls: string; dot: string }> = {
  active: { label: "Active", cls: "text-flow", dot: "bg-flow shadow-[0_0_8px_var(--color-flow)]" },
  idle: { label: "Idle", cls: "text-muted-foreground", dot: "bg-muted-foreground" },
  no_reply: { label: "No reply", cls: "text-stall", dot: "bg-stall" },
  closed: { label: "Closed", cls: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

const sentimentMeta: Record<Sentiment, { label: string; cls: string }> = {
  happy: { label: "Happy", cls: "text-flow" },
  neutral: { label: "Neutral", cls: "text-muted-foreground" },
  unhappy: { label: "Unhappy", cls: "text-stall" },
};

function Dashboard() {
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ChatStatus | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selected, setSelected] = useState<Boss | null>(null);

  const filtered = useMemo(() => {
    return BOSSES.filter((b) => {
      if (view === "mine" && b.ownerInitials !== ME) return false;
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
  }, [view, search, stageFilter, statusFilter, sentimentFilter, verifiedOnly]);

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
      <Header view={view} setView={setView} search={search} setSearch={setSearch} alerts={alerts} />

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

        {view === "all" ? (
          <section>
            <SectionHeader title="All bosses" subtitle={`${filtered.length} matches`} />
            <BossGrid bosses={filtered} onOpen={setSelected} />
          </section>
        ) : (
          <div className="grid gap-8">
            <section>
              <SectionHeader title="Open" subtitle={`${myOpen.length} active`} />
              <BossGrid bosses={myOpen} onOpen={setSelected} />
            </section>
            <section>
              <SectionHeader title="Closed" subtitle={`${myClosed.length} archived`} />
              {myClosed.length === 0 ? (
                <EmptyHint text="No closed chats yet." />
              ) : (
                <BossGrid bosses={myClosed} onOpen={setSelected} />
              )}
            </section>
          </div>
        )}
      </main>

      {selected && <BossDrawer boss={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ---------- Header ---------- */
function Header({
  view,
  setView,
  search,
  setSearch,
  alerts,
}: {
  view: View;
  setView: (v: View) => void;
  search: string;
  setSearch: (s: string) => void;
  alerts: number;
}) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
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
              {v === "all" ? "All view" : "My view"}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search boss, company, ID…"
            className="w-72 bg-surface border border-border rounded-lg py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stall/30 bg-stall/10">
            <span className="size-1.5 rounded-full bg-stall pulse-dot" />
            <span className="text-xs font-semibold text-stall">{alerts} alerts</span>
          </div>
        )}

        <div className="size-9 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold">
          {ME}
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
    <div className="px-6 py-3 border-b border-border bg-surface/50 flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
        Stage
      </span>
      <Pill active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
        All
      </Pill>
      {STAGES.map((s) => (
        <Pill key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>
          {s}
        </Pill>
      ))}

      <Divider />

      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
        Status
      </span>
      {(["all", "active", "idle", "no_reply"] as const).map((s) => (
        <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
          {s === "all" ? "Any" : s === "no_reply" ? "No reply" : s[0].toUpperCase() + s.slice(1)}
        </Pill>
      ))}

      <Divider />

      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
        Vibe
      </span>
      {(["all", "happy", "neutral", "unhappy"] as const).map((s) => (
        <Pill key={s} active={sentimentFilter === s} onClick={() => setSentimentFilter(s)}>
          {s === "all" ? "Any" : s[0].toUpperCase() + s.slice(1)}
        </Pill>
      ))}

      <Divider />

      <Pill active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>
        Verified only
      </Pill>

      <span className="ml-auto text-xs text-muted-foreground font-mono">{count} bosses</span>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`glass border rounded-xl p-4 ${
            c.warn ? "border-stall/30" : "border-border"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {c.label}
          </div>
          <div
            className={`text-2xl font-mono font-bold ${
              c.warn ? "text-stall" : c.accent ? "text-flow" : "text-foreground"
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
  if (bosses.length === 0) {
    return <EmptyHint text="No bosses match the current filters." />;
  }
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
  const isAlert = !!boss.alert;
  return (
    <button
      onClick={() => onOpen(boss)}
      className={`text-left bg-surface border rounded-2xl p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 animate-fade-in ${
        isAlert ? "border-stall/30" : "border-border"
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
          <span className={`text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
            {s.label}
          </span>
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
        <span className="text-[11px] text-muted-foreground font-mono">{boss.lastActivity}</span>
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${sentimentMeta[boss.sentiment].cls}`}
        >
          {sentimentMeta[boss.sentiment].label}
        </span>
      </div>

      {isAlert && (
        <div className="mt-3 p-2 rounded-md bg-stall/5 border border-stall/20 text-[11px] text-stall flex items-start gap-2">
          <span className="size-1.5 rounded-full bg-stall mt-1.5 shrink-0" />
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
function BossDrawer({ boss, onClose }: { boss: Boss; onClose: () => void }) {
  const s = statusMeta[boss.status];
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal>
      <div
        className="flex-1 bg-background/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="w-full max-w-xl bg-surface border-l border-border overflow-y-auto animate-slide-in-right">
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

        <div className="p-5 space-y-6">
          {/* Status row */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${s.dot}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${s.cls}`}>
                {s.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{boss.id}</span>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${sentimentMeta[boss.sentiment].cls}`}
            >
              {sentimentMeta[boss.sentiment].label}
            </span>
          </div>

          {/* Profile stats */}
          <div>
            <Label>Boss profile</Label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Roles open" value={String(boss.rolesOpen)} />
              <Field label="Chats open" value={String(boss.chatsOpen)} />
              <Field label="Chats closed" value={String(boss.chatsClosed)} />
              <Field label="Exp needed" value={boss.expNeeded} />
              <Field label="Email" value={boss.email} mono />
              <Field label="Phone" value={boss.phone} mono />
              <Field label="Location" value={boss.location} />
              <Field label="Owner" value={boss.ownerInitials} />
            </div>
          </div>

          {/* Hiring intent */}
          <div>
            <Label>Hiring intent</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden border border-border">
                <div className="h-full bg-primary" style={{ width: `${boss.hiringIntent}%` }} />
              </div>
              <span className="text-sm font-mono font-bold">{boss.hiringIntent}%</span>
            </div>
          </div>

          {/* Stages */}
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

          {/* Summary */}
          <div>
            <Label>Chat summary</Label>
            <p className="text-sm leading-relaxed text-foreground/90 p-3 rounded-lg bg-surface-elevated border-l-2 border-primary">
              {boss.summary}
            </p>
          </div>

          {/* Conversation */}
          <div>
            <Label>Recent conversation</Label>
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

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <button className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              Open full chat
            </button>
            <button className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-surface-elevated transition-colors">
              Reassign
            </button>
            <button className="px-3 py-2 rounded-lg border border-stall/30 text-stall text-sm font-semibold hover:bg-stall/10 transition-colors">
              Flag
            </button>
          </div>
        </div>
      </aside>
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

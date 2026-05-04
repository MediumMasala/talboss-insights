export type Stage =
  | "Onboarding"
  | "Verification"
  | "Job Creation"
  | "Talking"
  | "Interview"
  | "Hiring"
  | "Closing";

export type ChatStatus = "active" | "idle" | "no_reply" | "closed";
export type Sentiment = "happy" | "neutral" | "unhappy";

export type CloseReason =
  | "Hired"
  | "Offer accepted"
  | "Comp mismatch"
  | "Profile mismatch"
  | "Candidate ghosted"
  | "Got another offer"
  | "Boss withdrew"
  | "On hold";

export const POSITIVE_CLOSE: CloseReason[] = ["Hired", "Offer accepted"];
export const NEGATIVE_CLOSE: CloseReason[] = [
  "Comp mismatch",
  "Profile mismatch",
  "Candidate ghosted",
  "Got another offer",
  "Boss withdrew",
  "On hold",
];

export interface OpenRole {
  id: string;
  title: string;
  compensation: string;
  experience: string;
  location: string;
  type: "Full-time" | "Contract" | "Part-time";
  candidates: number;
  hired: number;
  notHired: number;
  postedAgo: string;
}

export interface CandidateChat {
  id: string;
  bossId: string; // backref so chat-stream can resolve boss
  candidateName: string;
  candidateRole: string;
  forRole: string; // role title
  status: "open" | "closed";
  chatStatus: ChatStatus; // active / idle / no_reply / closed
  closeReason?: CloseReason;
  lastMessage: string;
  lastTime: string; // display
  lastTs: number; // ms epoch — for chat-stream sort
  unread?: number;
  pinned?: boolean;
}

export interface Owner {
  initials: string;
  name: string;
  role: string;
}

export interface Boss {
  id: string;
  name: string;
  company: string;
  role: string;
  location: string;
  verified: boolean;
  stage: Stage;
  status: ChatStatus;
  sentiment: Sentiment;
  rolesOpen: number;
  chatsOpen: number;
  chatsClosed: number;
  hired: number;
  notHired: number;
  hiringIntent: number;
  swipedToDM: number; // candidates swiped
  dmAccepted: number; // boss responded
  lastActivity: string;
  email: string;
  phone: string;
  ownerInitials: string;
  alert?: string;
  summary: string;
  openRoles: OpenRole[];
  candidateChats: CandidateChat[];
  conversation: { from: "boss" | "ops" | "system"; time: string; text: string }[];
}

export const STAGES: Stage[] = [
  "Onboarding",
  "Verification",
  "Job Creation",
  "Talking",
  "Interview",
  "Hiring",
  "Closing",
];

export const OWNERS: Owner[] = [
  { initials: "YS", name: "Yash Sinha", role: "Ops Lead" },
  { initials: "GJ", name: "Gaurika Jindal", role: "Talent Ops" },
  { initials: "SJ", name: "Saumya Joshi", role: "Talent Ops" },
  { initials: "GT", name: "Gaurav Tiwari", role: "Senior Ops" },
];

const NOW = Date.now();
const min = (m: number) => NOW - m * 60_000;
const hr = (h: number) => NOW - h * 3_600_000;
const day = (d: number) => NOW - d * 86_400_000;

let _cid = 0;
const mkChat = (
  bossId: string,
  rows: Omit<CandidateChat, "id" | "bossId">[],
): CandidateChat[] =>
  rows.map((r) => ({ ...r, id: `c-${++_cid}`, bossId }));

export const BOSSES: Boss[] = [
  {
    id: "GR-99421",
    name: "Marcus Thorne",
    company: "Vento Systems",
    role: "Principal Engineer",
    location: "Bengaluru",
    verified: true,
    stage: "Talking",
    status: "active",
    sentiment: "happy",
    rolesOpen: 3,
    chatsOpen: 4,
    chatsClosed: 3,
    hired: 1,
    notHired: 2,
    hiringIntent: 85,
    swipedToDM: 24,
    dmAccepted: 18,
    lastActivity: "4m ago",
    email: "marcus@vento.io",
    phone: "+91 98xxx 41203",
    ownerInitials: "YS",
    summary: "Highly engaged. Replies fast, prefers async voice notes. Optimizing for cultural fit.",
    openRoles: [
      { id: "r1", title: "SDE-1 Backend", compensation: "₹22-30 LPA", experience: "1-3 yrs", location: "Bengaluru / Remote", type: "Full-time", candidates: 8, hired: 1, notHired: 1, postedAgo: "5d ago" },
      { id: "r2", title: "Head of Design", compensation: "₹70-90 LPA", experience: "8+ yrs", location: "Bengaluru", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "12d ago" },
      { id: "r3", title: "ML Researcher", compensation: "₹45-60 LPA", experience: "4-6 yrs", location: "Remote", type: "Contract", candidates: 2, hired: 0, notHired: 0, postedAgo: "2d ago" },
    ],
    candidateChats: [],
    conversation: [
      { from: "system", time: "10:02", text: "Match initiated · score 94%" },
      { from: "boss", time: "10:14", text: "Profile looks strong. Send a voice note intro?" },
      { from: "ops", time: "10:22", text: "On it — sharing TAL voice intro now." },
      { from: "boss", time: "10:25", text: "Perfect. Let's book a chat tomorrow." },
    ],
  },
  {
    id: "GR-11029",
    name: "Elena Rossi",
    company: "Aether Lab",
    role: "Head of Design",
    location: "Berlin",
    verified: false,
    stage: "Verification",
    status: "no_reply",
    sentiment: "unhappy",
    rolesOpen: 1,
    chatsOpen: 2,
    chatsClosed: 2,
    hired: 0,
    notHired: 2,
    hiringIntent: 40,
    swipedToDM: 6,
    dmAccepted: 2,
    lastActivity: "3d ago",
    email: "elena@aetherlab.com",
    phone: "+49 30 xxx 88",
    ownerInitials: "GJ",
    alert: "No reply 3d · product issue reported",
    summary: "Verification stuck. Boss flagged dashboard not loading candidate cards.",
    openRoles: [
      { id: "r1", title: "Brand Designer", compensation: "€60-75k", experience: "3-5 yrs", location: "Berlin", type: "Full-time", candidates: 4, hired: 0, notHired: 2, postedAgo: "8d ago" },
    ],
    candidateChats: [],
    conversation: [
      { from: "system", time: "Mon 11:00", text: "Verification request sent" },
      { from: "boss", time: "Mon 11:42", text: "Cards aren't loading on my end." },
      { from: "ops", time: "Mon 11:55", text: "Engineering pinged. Stand by." },
    ],
  },
  {
    id: "GR-88402",
    name: "Silas Vane",
    company: "Quantum Forge",
    role: "VP Engineering",
    location: "Mumbai",
    verified: true,
    stage: "Closing",
    status: "active",
    sentiment: "happy",
    rolesOpen: 5,
    chatsOpen: 6,
    chatsClosed: 12,
    hired: 5,
    notHired: 7,
    hiringIntent: 92,
    swipedToDM: 41,
    dmAccepted: 33,
    lastActivity: "12m ago",
    email: "silas@quantumforge.ai",
    phone: "+91 99xxx 11023",
    ownerInitials: "GT",
    summary: "Closing 3 candidates this week. Wants white-glove offer support. Repeat boss — high LTV.",
    openRoles: [
      { id: "r1", title: "Staff Engineer · Platform", compensation: "₹85-110 LPA", experience: "8-12 yrs", location: "Mumbai", type: "Full-time", candidates: 6, hired: 2, notHired: 3, postedAgo: "10d ago" },
      { id: "r2", title: "SRE Lead", compensation: "₹60-80 LPA", experience: "6+ yrs", location: "Remote", type: "Full-time", candidates: 4, hired: 1, notHired: 2, postedAgo: "6d ago" },
      { id: "r3", title: "Engineering Manager", compensation: "₹75-95 LPA", experience: "7+ yrs", location: "Mumbai", type: "Full-time", candidates: 3, hired: 1, notHired: 1, postedAgo: "3d ago" },
      { id: "r4", title: "Frontend Architect", compensation: "₹70-90 LPA", experience: "7+ yrs", location: "Hybrid", type: "Full-time", candidates: 5, hired: 1, notHired: 1, postedAgo: "9d ago" },
      { id: "r5", title: "Data Eng (Contract)", compensation: "₹2.5L/mo", experience: "5+ yrs", location: "Remote", type: "Contract", candidates: 2, hired: 0, notHired: 0, postedAgo: "1d ago" },
    ],
    candidateChats: [],
    conversation: [
      { from: "boss", time: "09:10", text: "Sending offer to Anya today." },
      { from: "ops", time: "09:14", text: "Nice. Want us to handle counter-offer comms?" },
      { from: "boss", time: "09:15", text: "Yes please." },
    ],
  },
  {
    id: "GR-77310",
    name: "Priya Nair",
    company: "Loop Health",
    role: "Founding PM",
    location: "Bengaluru",
    verified: true,
    stage: "Interview",
    status: "active",
    sentiment: "neutral",
    rolesOpen: 2,
    chatsOpen: 3,
    chatsClosed: 4,
    hired: 1,
    notHired: 3,
    hiringIntent: 70,
    swipedToDM: 18,
    dmAccepted: 12,
    lastActivity: "1h ago",
    email: "priya@loophealth.com",
    phone: "+91 80xxx 22910",
    ownerInitials: "GJ",
    summary: "Interviews going well, but hesitant on comp band. Watch for stall after onsite round.",
    openRoles: [
      { id: "r1", title: "Senior PM · Growth", compensation: "₹55-70 LPA", experience: "5-7 yrs", location: "Bengaluru", type: "Full-time", candidates: 5, hired: 1, notHired: 2, postedAgo: "7d ago" },
      { id: "r2", title: "Product Designer", compensation: "₹40-55 LPA", experience: "4+ yrs", location: "Remote", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "4d ago" },
    ],
    candidateChats: [],
    conversation: [
      { from: "boss", time: "08:30", text: "Onsite round done — feedback split." },
      { from: "ops", time: "08:45", text: "Want a debrief template?" },
    ],
  },
  {
    id: "GR-55218",
    name: "Hiro Tanaka",
    company: "Mesh Robotics",
    role: "CTO",
    location: "Tokyo",
    verified: true,
    stage: "Talking",
    status: "idle",
    sentiment: "neutral",
    rolesOpen: 4,
    chatsOpen: 5,
    chatsClosed: 6,
    hired: 2,
    notHired: 4,
    hiringIntent: 60,
    swipedToDM: 22,
    dmAccepted: 14,
    lastActivity: "18h ago",
    email: "hiro@meshrobotics.jp",
    phone: "+81 3 xxx 9921",
    ownerInitials: "GJ",
    summary: "Idle for 18h. Last message asked about candidate visa status.",
    openRoles: [
      { id: "r1", title: "Robotics Engineer", compensation: "¥10-13M", experience: "5+ yrs", location: "Tokyo", type: "Full-time", candidates: 4, hired: 1, notHired: 1, postedAgo: "11d ago" },
      { id: "r2", title: "Computer Vision Lead", compensation: "¥14-18M", experience: "7+ yrs", location: "Tokyo / Remote", type: "Full-time", candidates: 3, hired: 1, notHired: 1, postedAgo: "9d ago" },
      { id: "r3", title: "Embedded Engineer", compensation: "¥9-11M", experience: "4+ yrs", location: "Tokyo", type: "Full-time", candidates: 2, hired: 0, notHired: 1, postedAgo: "5d ago" },
      { id: "r4", title: "Mech Designer", compensation: "¥8-10M", experience: "3+ yrs", location: "Tokyo", type: "Contract", candidates: 1, hired: 0, notHired: 0, postedAgo: "2d ago" },
    ],
    candidateChats: [],
    conversation: [
      { from: "boss", time: "Yesterday", text: "Does the candidate need visa sponsorship?" },
    ],
  },
  {
    id: "GR-33991",
    name: "Sloane Whitaker",
    company: "Nodal Labs",
    role: "VP Operations",
    location: "London",
    verified: true,
    stage: "Hiring",
    status: "no_reply",
    sentiment: "unhappy",
    rolesOpen: 1,
    chatsOpen: 1,
    chatsClosed: 5,
    hired: 0,
    notHired: 5,
    hiringIntent: 55,
    swipedToDM: 9,
    dmAccepted: 5,
    lastActivity: "2d ago",
    email: "sloane@nodal.co",
    phone: "+44 20 xxx 4421",
    ownerInitials: "GT",
    alert: "Candidate ghosted post-offer",
    summary: "Candidate stopped replying after verbal offer. Boss frustrated. Needs recovery.",
    openRoles: [
      { id: "r1", title: "Ops Manager", compensation: "£75-95k", experience: "6+ yrs", location: "London", type: "Full-time", candidates: 2, hired: 0, notHired: 3, postedAgo: "14d ago" },
    ],
    candidateChats: [],
    conversation: [
      { from: "boss", time: "Fri", text: "She's not replying. What now?" },
      { from: "ops", time: "Fri", text: "Calling her directly. Will revert in 1h." },
    ],
  },
  {
    id: "GR-22084",
    name: "Aarav Mehta",
    company: "Slate AI",
    role: "Founder",
    location: "Pune",
    verified: false,
    stage: "Onboarding",
    status: "active",
    sentiment: "happy",
    rolesOpen: 1,
    chatsOpen: 0,
    chatsClosed: 0,
    hired: 0,
    notHired: 0,
    hiringIntent: 80,
    swipedToDM: 0,
    dmAccepted: 0,
    lastActivity: "30m ago",
    email: "aarav@slate.ai",
    phone: "+91 98xxx 33001",
    ownerInitials: "YS",
    summary: "Brand new boss. Drafting first JD with white-glove support.",
    openRoles: [
      { id: "r1", title: "Founding ML Engineer", compensation: "₹40-55 LPA + equity", experience: "3+ yrs", location: "Remote", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "Today" },
    ],
    candidateChats: [],
    conversation: [
      { from: "ops", time: "11:00", text: "Welcome! Let's build your first role together." },
      { from: "boss", time: "11:05", text: "Looking for ML eng, 3+ yrs, remote-first." },
    ],
  },
  {
    id: "GR-44102",
    name: "Diya Kapoor",
    company: "Ferment",
    role: "Head of Talent",
    location: "Delhi",
    verified: false,
    stage: "Verification",
    status: "idle",
    sentiment: "neutral",
    rolesOpen: 2,
    chatsOpen: 1,
    chatsClosed: 0,
    hired: 0,
    notHired: 0,
    hiringIntent: 50,
    swipedToDM: 4,
    dmAccepted: 1,
    lastActivity: "1d ago",
    email: "diya@ferment.in",
    phone: "+91 11 xxx 9001",
    ownerInitials: "GJ",
    summary: "Awaiting LinkedIn verification doc.",
    openRoles: [
      { id: "r1", title: "Talent Partner", compensation: "₹25-35 LPA", experience: "4+ yrs", location: "Delhi", type: "Full-time", candidates: 1, hired: 0, notHired: 0, postedAgo: "3d ago" },
      { id: "r2", title: "Recruiter (Tech)", compensation: "₹18-25 LPA", experience: "2+ yrs", location: "Delhi / Remote", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "1d ago" },
    ],
    candidateChats: [],
    conversation: [{ from: "system", time: "Yesterday", text: "Verification email sent" }],
  },
];

// Wire candidate chats with timestamps
BOSSES[0].candidateChats = mkChat("GR-99421", [
  { candidateName: "Anya Bose", candidateRole: "SDE-2", forRole: "SDE-1 Backend", status: "open", chatStatus: "active", lastMessage: "Sounds good, sending availability tomorrow.", lastTime: "4m", lastTs: min(4), unread: 2, pinned: true },
  { candidateName: "Karan Vyas", candidateRole: "Senior Designer", forRole: "Head of Design", status: "open", chatStatus: "idle", lastMessage: "Can we reschedule the chat?", lastTime: "1h", lastTs: hr(1) },
  { candidateName: "Nikita Rao", candidateRole: "ML Engineer", forRole: "ML Researcher", status: "open", chatStatus: "active", lastMessage: "Shared portfolio link.", lastTime: "3h", lastTs: hr(3) },
  { candidateName: "Rohan Iyer", candidateRole: "Backend dev", forRole: "SDE-1 Backend", status: "open", chatStatus: "no_reply", lastMessage: "Thanks, will revert by EOD.", lastTime: "Yest", lastTs: day(1) },
  { candidateName: "Tara Khanna", candidateRole: "SDE-1", forRole: "SDE-1 Backend", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Offer accepted 🎉", lastTime: "2d", lastTs: day(2) },
  { candidateName: "Vikram Set", candidateRole: "Designer", forRole: "Head of Design", status: "closed", chatStatus: "closed", closeReason: "Comp mismatch", lastMessage: "Comp band too low.", lastTime: "5d", lastTs: day(5) },
  { candidateName: "Maya Gill", candidateRole: "MLE", forRole: "ML Researcher", status: "closed", chatStatus: "closed", closeReason: "Profile mismatch", lastMessage: "Looking for senior IC.", lastTime: "1w", lastTs: day(7) },
]);

BOSSES[1].candidateChats = mkChat("GR-11029", [
  { candidateName: "Lukas Berg", candidateRole: "Designer", forRole: "Brand Designer", status: "open", chatStatus: "no_reply", lastMessage: "Awaiting boss response.", lastTime: "3d", lastTs: day(3) },
  { candidateName: "Mina Falk", candidateRole: "Designer", forRole: "Brand Designer", status: "open", chatStatus: "no_reply", lastMessage: "Portfolio shared.", lastTime: "3d", lastTs: day(3) + 1000 },
  { candidateName: "Eva Stein", candidateRole: "Designer", forRole: "Brand Designer", status: "closed", chatStatus: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "1w", lastTs: day(7) },
  { candidateName: "Tom Hoff", candidateRole: "Designer", forRole: "Brand Designer", status: "closed", chatStatus: "closed", closeReason: "On hold", lastMessage: "Boss paused role.", lastTime: "2w", lastTs: day(14) },
]);

BOSSES[2].candidateChats = mkChat("GR-88402", [
  { candidateName: "Anya Pillai", candidateRole: "Staff Eng", forRole: "Staff Engineer · Platform", status: "open", chatStatus: "active", lastMessage: "Offer in review.", lastTime: "12m", lastTs: min(12), pinned: true },
  { candidateName: "Devansh K", candidateRole: "SRE", forRole: "SRE Lead", status: "open", chatStatus: "active", lastMessage: "Final round done.", lastTime: "2h", lastTs: hr(2) },
  { candidateName: "Kiran M", candidateRole: "EM", forRole: "Engineering Manager", status: "open", chatStatus: "idle", lastMessage: "Discussing comp.", lastTime: "1d", lastTs: day(1) },
  { candidateName: "Ravi Joshi", candidateRole: "Staff", forRole: "Frontend Architect", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Joined ✓", lastTime: "1w", lastTs: day(7) },
  { candidateName: "Pooja Nair", candidateRole: "EM", forRole: "Engineering Manager", status: "closed", chatStatus: "closed", closeReason: "Comp mismatch", lastMessage: "—", lastTime: "2w", lastTs: day(14) },
]);

BOSSES[3].candidateChats = mkChat("GR-77310", [
  { candidateName: "Ishaan Mehta", candidateRole: "PM", forRole: "Senior PM · Growth", status: "open", chatStatus: "active", lastMessage: "Onsite scheduled Fri.", lastTime: "1h", lastTs: hr(1) },
  { candidateName: "Naina S", candidateRole: "Designer", forRole: "Product Designer", status: "open", chatStatus: "active", lastMessage: "Sending case study.", lastTime: "3h", lastTs: hr(3) },
  { candidateName: "Arjun B", candidateRole: "PM", forRole: "Senior PM · Growth", status: "open", chatStatus: "idle", lastMessage: "Follow-up.", lastTime: "Yest", lastTs: day(1) },
  { candidateName: "Sara D", candidateRole: "PM", forRole: "Senior PM · Growth", status: "closed", chatStatus: "closed", closeReason: "Profile mismatch", lastMessage: "—", lastTime: "1w", lastTs: day(7) },
]);

BOSSES[4].candidateChats = mkChat("GR-55218", [
  { candidateName: "Yuki T", candidateRole: "Robotics", forRole: "Robotics Engineer", status: "open", chatStatus: "no_reply", lastMessage: "Visa question.", lastTime: "18h", lastTs: hr(18) },
  { candidateName: "Hana O", candidateRole: "CV", forRole: "Computer Vision Lead", status: "open", chatStatus: "idle", lastMessage: "Round 2 done.", lastTime: "1d", lastTs: day(1) },
  { candidateName: "Ren A", candidateRole: "Embedded", forRole: "Embedded Engineer", status: "closed", chatStatus: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "1w", lastTs: day(7) },
]);

BOSSES[5].candidateChats = mkChat("GR-33991", [
  { candidateName: "Olivia Crane", candidateRole: "Ops", forRole: "Ops Manager", status: "open", chatStatus: "no_reply", lastMessage: "Awaiting reply.", lastTime: "2d", lastTs: day(2) },
  { candidateName: "James Holt", candidateRole: "Ops", forRole: "Ops Manager", status: "closed", chatStatus: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "3d", lastTs: day(3) },
  { candidateName: "Sara Leigh", candidateRole: "Ops", forRole: "Ops Manager", status: "closed", chatStatus: "closed", closeReason: "Comp mismatch", lastMessage: "—", lastTime: "1w", lastTs: day(7) },
]);

BOSSES[7].candidateChats = mkChat("GR-44102", [
  { candidateName: "Nidhi A", candidateRole: "Recruiter", forRole: "Talent Partner", status: "open", chatStatus: "idle", lastMessage: "Intro sent.", lastTime: "1d", lastTs: day(1) },
]);

export const ROLES = Array.from(new Set(BOSSES.map((b) => b.role)));
export const LOCATIONS = Array.from(new Set(BOSSES.map((b) => b.location)));
export const COMPANIES = Array.from(new Set(BOSSES.map((b) => b.company)));

// Flat list of all chats for chat-stream view
export const ALL_CHATS: CandidateChat[] = BOSSES.flatMap((b) => b.candidateChats);

export function bossById(id: string): Boss | undefined {
  return BOSSES.find((b) => b.id === id);
}

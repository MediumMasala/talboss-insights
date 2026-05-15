export type Stage =
  | "Identity"
  | "Personality"
  | "Job Setup"
  | "Verification"
  | "Talking"
  | "Chatting"
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

export interface ChatMessage {
  from: "boss" | "candidate" | "ops" | "system";
  time: string;
  text: string;
}

export interface CandidateProfile {
  experience: string;
  location: string;
  currentCompany: string;
  expectedComp: string;
  email: string;
  phone: string;
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
  interviewChannel?: "app" | "external"; // where the interview happens, when relevant
  candidateProfile?: CandidateProfile;
  messages?: ChatMessage[];
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
  "Identity",
  "Personality",
  "Job Setup",
  "Verification",
  "Talking",
  "Chatting",
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
    stage: "Chatting",
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
    stage: "Chatting",
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
    stage: "Personality",
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
  // ---- Additional bosses for density ----
  {
    id: "GR-66501", name: "Ravi Banerjee", company: "Norther", role: "Director Eng", location: "Bengaluru",
    verified: true, stage: "Talking", status: "active", sentiment: "happy",
    rolesOpen: 2, chatsOpen: 3, chatsClosed: 4, hired: 2, notHired: 2, hiringIntent: 78,
    swipedToDM: 20, dmAccepted: 16, lastActivity: "22m ago",
    email: "ravi@norther.io", phone: "+91 80xxx 55012", ownerInitials: "GJ",
    summary: "Strong replier. Two interviews lined up this week.",
    openRoles: [{ id: "r1", title: "Backend Engineer", compensation: "₹35-50 LPA", experience: "4+ yrs", location: "Bengaluru", type: "Full-time", candidates: 5, hired: 1, notHired: 1, postedAgo: "6d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "10:11", text: "Loved the last shortlist." }],
  },
  {
    id: "GR-66502", name: "Anika Sethi", company: "Vault", role: "Head Product", location: "Mumbai",
    verified: true, stage: "Chatting", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 2, chatsClosed: 2, hired: 1, notHired: 1, hiringIntent: 82,
    swipedToDM: 14, dmAccepted: 11, lastActivity: "1h ago",
    email: "anika@vault.so", phone: "+91 22 xxx 1190", ownerInitials: "GJ",
    summary: "Onsite this Friday for senior PM.",
    openRoles: [{ id: "r1", title: "Senior PM", compensation: "₹50-65 LPA", experience: "5+ yrs", location: "Mumbai", type: "Full-time", candidates: 4, hired: 1, notHired: 1, postedAgo: "8d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "09:44", text: "Send the panel debrief by EOD pls." }],
  },
  {
    id: "GR-66503", name: "Karthik Iyer", company: "Lumen Labs", role: "CTO", location: "Hyderabad",
    verified: true, stage: "Talking", status: "no_reply", sentiment: "neutral",
    rolesOpen: 2, chatsOpen: 2, chatsClosed: 1, hired: 0, notHired: 1, hiringIntent: 68,
    swipedToDM: 12, dmAccepted: 7, lastActivity: "2d ago",
    email: "k@lumen.dev", phone: "+91 40 xxx 2233", ownerInitials: "GJ",
    alert: "No reply 2d on top candidate",
    summary: "Owes Aman Bhat a reply for 2 days.",
    openRoles: [{ id: "r1", title: "Platform Eng", compensation: "₹40-55 LPA", experience: "5+ yrs", location: "Remote", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "9d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "Mon", text: "Pinged on WhatsApp." }],
  },
  {
    id: "GR-66504", name: "Meera Joshi", company: "Stitch", role: "Founder", location: "Bengaluru",
    verified: false, stage: "Verification", status: "idle", sentiment: "neutral",
    rolesOpen: 1, chatsOpen: 1, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 60,
    swipedToDM: 6, dmAccepted: 2, lastActivity: "3d ago",
    email: "meera@stitch.in", phone: "+91 99xxx 70011", ownerInitials: "GJ",
    alert: "Verification stuck 3d",
    summary: "Awaiting work-email verification.",
    openRoles: [{ id: "r1", title: "Founding Eng", compensation: "₹30-45 LPA + equity", experience: "3+ yrs", location: "Bengaluru", type: "Full-time", candidates: 1, hired: 0, notHired: 0, postedAgo: "4d ago" }],
    candidateChats: [], conversation: [{ from: "system", time: "3d ago", text: "Verification email re-sent" }],
  },
  {
    id: "GR-66505", name: "Sahil Dewan", company: "Kite Health", role: "VP Eng", location: "Gurgaon",
    verified: true, stage: "Chatting", status: "active", sentiment: "happy",
    rolesOpen: 2, chatsOpen: 2, chatsClosed: 3, hired: 2, notHired: 1, hiringIntent: 88,
    swipedToDM: 18, dmAccepted: 15, lastActivity: "30m ago",
    email: "sahil@kite.health", phone: "+91 12 xxx 4501", ownerInitials: "GJ",
    summary: "Two offers out this week.",
    openRoles: [{ id: "r1", title: "SRE", compensation: "₹45-60 LPA", experience: "5+ yrs", location: "Gurgaon", type: "Full-time", candidates: 5, hired: 1, notHired: 1, postedAgo: "11d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "11:01", text: "Sending the offer letter." }],
  },
  {
    id: "GR-66506", name: "Tanvi Shah", company: "Northstar", role: "Head Design", location: "Pune",
    verified: true, stage: "Talking", status: "idle", sentiment: "neutral",
    rolesOpen: 1, chatsOpen: 2, chatsClosed: 1, hired: 0, notHired: 1, hiringIntent: 65,
    swipedToDM: 9, dmAccepted: 5, lastActivity: "1d ago",
    email: "tanvi@nstar.io", phone: "+91 20 xxx 3344", ownerInitials: "GJ",
    summary: "Boss owes feedback on portfolio.",
    openRoles: [{ id: "r1", title: "Sr Designer", compensation: "₹35-50 LPA", experience: "4+ yrs", location: "Pune", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "5d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "Yest", text: "Nudged for portfolio feedback." }],
  },
  {
    id: "GR-66507", name: "Devika Rao", company: "Pulse AI", role: "Founder", location: "Bengaluru",
    verified: true, stage: "Closing", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 1, chatsClosed: 4, hired: 3, notHired: 1, hiringIntent: 92,
    swipedToDM: 22, dmAccepted: 19, lastActivity: "10m ago",
    email: "d@pulse.ai", phone: "+91 80xxx 99821", ownerInitials: "GJ",
    summary: "Closing first ML hire — happy with TAL service.",
    openRoles: [{ id: "r1", title: "ML Eng", compensation: "₹45-60 LPA", experience: "4+ yrs", location: "Remote", type: "Full-time", candidates: 4, hired: 1, notHired: 1, postedAgo: "12d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "10:58", text: "Counter-offer accepted! 🎉" }],
  },
  {
    id: "GR-66508", name: "Rohit Khanna", company: "Orbit Cloud", role: "Eng Manager", location: "Remote",
    verified: false, stage: "Identity", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 70,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "1h ago",
    email: "rohit@orbit.cloud", phone: "+91 98xxx 22019", ownerInitials: "SJ",
    summary: "First-time boss. JD draft in progress.",
    openRoles: [{ id: "r1", title: "Cloud Engineer", compensation: "₹30-45 LPA", experience: "3+ yrs", location: "Remote", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "Today" }],
    candidateChats: [], conversation: [{ from: "ops", time: "10:30", text: "Welcome to TAL!" }],
  },
  {
    id: "GR-66509", name: "Liam Carter", company: "Brightline", role: "Head Talent", location: "London",
    verified: true, stage: "Chatting", status: "no_reply", sentiment: "unhappy",
    rolesOpen: 1, chatsOpen: 1, chatsClosed: 3, hired: 0, notHired: 3, hiringIntent: 45,
    swipedToDM: 11, dmAccepted: 4, lastActivity: "4d ago",
    email: "liam@brightline.co", phone: "+44 20 xxx 7012", ownerInitials: "GT",
    alert: "Boss frustrated · 3 ghosted in a row",
    summary: "Recovery call needed. Sentiment slipping.",
    openRoles: [{ id: "r1", title: "Talent Lead", compensation: "£70-90k", experience: "5+ yrs", location: "London", type: "Full-time", candidates: 2, hired: 0, notHired: 2, postedAgo: "16d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "Wed", text: "This isn't working." }],
  },
  {
    id: "GR-66510", name: "Aisha Khan", company: "Mosaic", role: "VP Product", location: "Dubai",
    verified: true, stage: "Chatting", status: "active", sentiment: "happy",
    rolesOpen: 2, chatsOpen: 3, chatsClosed: 2, hired: 1, notHired: 1, hiringIntent: 80,
    swipedToDM: 16, dmAccepted: 13, lastActivity: "45m ago",
    email: "aisha@mosaic.ae", phone: "+971 4 xxx 1188", ownerInitials: "GJ",
    summary: "Two finalists in panel round.",
    openRoles: [{ id: "r1", title: "Group PM", compensation: "AED 45-60k/mo", experience: "7+ yrs", location: "Dubai", type: "Full-time", candidates: 4, hired: 1, notHired: 1, postedAgo: "9d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "11:22", text: "Both panels done — debrief tmrw." }],
  },
  {
    id: "GR-66511", name: "Neil Saxena", company: "Forge", role: "CTO", location: "Bengaluru",
    verified: true, stage: "Job Setup", status: "idle", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 65,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "2d ago",
    email: "neil@forge.io", phone: "+91 80xxx 11290", ownerInitials: "GJ",
    alert: "JD draft stalled 2d",
    summary: "Waiting on comp band sign-off.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "ops", time: "Mon", text: "Need comp band to publish JD." }],
  },
  {
    id: "GR-66512", name: "Priya Goel", company: "Switch Labs", role: "Founder", location: "Bengaluru",
    verified: true, stage: "Talking", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 2, chatsClosed: 1, hired: 1, notHired: 0, hiringIntent: 85,
    swipedToDM: 13, dmAccepted: 11, lastActivity: "15m ago",
    email: "priya@switch.dev", phone: "+91 80xxx 88122", ownerInitials: "SJ",
    summary: "Quick replies, glowing feedback to ops.",
    openRoles: [{ id: "r1", title: "Founding Designer", compensation: "₹35-50 LPA + equity", experience: "4+ yrs", location: "Bengaluru", type: "Full-time", candidates: 3, hired: 1, notHired: 0, postedAgo: "7d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "11:45", text: "Loving the speed." }],
  },
  // ---- Identity stage ----
  {
    id: "GR-77001", name: "Vikram Shroff", company: "Helix AI", role: "Co-founder", location: "Bengaluru",
    verified: false, stage: "Identity", status: "idle", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 60,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "20m ago",
    email: "vikram@helix.ai", phone: "+91 98xxx 71010", ownerInitials: "SJ",
    alert: "Stuck on LinkedIn confirm step",
    summary: "Signed up via referral. Hasn't confirmed LinkedIn URL yet.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "ops", time: "10:40", text: "Drop your LinkedIn — takes 10s, unlocks the next step." }],
  },
  {
    id: "GR-77002", name: "Sneha Reddy", company: "Tessera", role: "Head of Eng", location: "Hyderabad",
    verified: false, stage: "Identity", status: "no_reply", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 55,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "3h ago",
    email: "sneha@tessera.io", phone: "+91 40 xxx 5567", ownerInitials: "YS",
    alert: "WATI sent · awaiting role confirm",
    summary: "Confirmed name + company. Hasn't picked role yet — WATI nudge sent 1h ago.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "ops", time: "08:10", text: "What's your role at Tessera?" }],
  },
  // ---- Personality stage ----
  {
    id: "GR-77003", name: "Daniel Park", company: "Inkwell", role: "Founder", location: "Singapore",
    verified: false, stage: "Personality", status: "active", sentiment: "happy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 75,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "8m ago",
    email: "daniel@inkwell.so", phone: "+65 8 xxx 2210", ownerInitials: "SJ",
    summary: "Uploading photos and prompts. tal.af page goes live next.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "boss", time: "11:38", text: "Just dropped 4 pics — does that work?" }, { from: "ops", time: "11:39", text: "Perfect. Two prompts to go." }],
  },
  {
    id: "GR-77004", name: "Ishita Bhatt", company: "Plume", role: "VP Marketing", location: "Mumbai",
    verified: false, stage: "Personality", status: "no_reply", sentiment: "unhappy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 40,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "2d ago",
    email: "ishita@plume.co", phone: "+91 22 xxx 8890", ownerInitials: "GJ",
    alert: "Friction on prompts · 2d cold",
    summary: "Said prompts feel intrusive. Bounced after AI-stack screen.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "boss", time: "Mon", text: "Why do you need my AI tools? Feels like a quiz." }, { from: "ops", time: "Mon", text: "Fair — they're optional. Skip and move on." }],
  },
  // ---- Job Setup stage ----
  {
    id: "GR-77005", name: "Rahul Menon", company: "Kavach", role: "CTO", location: "Bengaluru",
    verified: true, stage: "Job Setup", status: "active", sentiment: "happy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 80,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "12m ago",
    email: "rahul@kavach.io", phone: "+91 80xxx 33402", ownerInitials: "GJ",
    summary: "JD almost done. Picking seniority + comp band now.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "boss", time: "11:30", text: "Senior Backend, 6-9 yrs, ₹50-70 LPA. Sound right?" }, { from: "ops", time: "11:31", text: "Spot on. Hit publish when ready." }],
  },
  {
    id: "GR-77006", name: "Mira Khanna", company: "Onyx Studios", role: "Head Talent", location: "Delhi",
    verified: true, stage: "Job Setup", status: "no_reply", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 55,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "3d ago",
    email: "mira@onyx.studio", phone: "+91 11 xxx 7720", ownerInitials: "GT",
    alert: "JD draft cold 3d · WATI + call queued",
    summary: "Filled title only. Stuck on location + comp. 2 nudges sent.",
    openRoles: [],
    candidateChats: [], conversation: [{ from: "ops", time: "Tue", text: "Need comp band + location to publish. 2 mins?" }],
  },
  // ---- Verification stage ----
  {
    id: "GR-77007", name: "Arnav Bhargava", company: "Stellar Health", role: "Founder", location: "Bengaluru",
    verified: false, stage: "Verification", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 75,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "5m ago",
    email: "arnav@stellar.health", phone: "+91 98xxx 41122", ownerInitials: "SJ",
    summary: "OTP sent to work email. Awaiting confirmation.",
    openRoles: [{ id: "r1", title: "Clinical Lead", compensation: "₹35-50 LPA", experience: "5+ yrs", location: "Bengaluru", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "Today" }],
    candidateChats: [], conversation: [{ from: "system", time: "11:50", text: "OTP sent to arnav@stellar.health" }],
  },
  // ---- Talking stage ----
  {
    id: "GR-77008", name: "Nadia Ahmed", company: "Crescent Labs", role: "VP Engineering", location: "Dubai",
    verified: true, stage: "Talking", status: "no_reply", sentiment: "unhappy",
    rolesOpen: 2, chatsOpen: 2, chatsClosed: 1, hired: 0, notHired: 1, hiringIntent: 50,
    swipedToDM: 8, dmAccepted: 3, lastActivity: "5d ago",
    email: "nadia@crescent.ae", phone: "+971 4 xxx 9090", ownerInitials: "GT",
    alert: "Stale 5d · escalation due",
    summary: "Two intro DMs ignored. Boss said shortlist felt off.",
    openRoles: [{ id: "r1", title: "Senior iOS Eng", compensation: "AED 30-40k/mo", experience: "5+ yrs", location: "Dubai", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "10d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "Last wk", text: "These profiles aren't matching the brief." }],
  },
  // ---- Chatting stage ----
  {
    id: "GR-77009", name: "Tobias Vance", company: "Northbeam", role: "Head of Product", location: "Amsterdam",
    verified: true, stage: "Chatting", status: "idle", sentiment: "neutral",
    rolesOpen: 1, chatsOpen: 2, chatsClosed: 1, hired: 0, notHired: 1, hiringIntent: 65,
    swipedToDM: 10, dmAccepted: 7, lastActivity: "20h ago",
    email: "tobias@northbeam.io", phone: "+31 20 xxx 4411", ownerInitials: "GJ",
    summary: "Resume shared. Slots requested. Awaiting boss to pick a time.",
    openRoles: [{ id: "r1", title: "Group PM", compensation: "€90-110k", experience: "6+ yrs", location: "Amsterdam", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "9d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "Yest", text: "Candidate shared 3 slots. Pick one?" }],
  },
  {
    id: "GR-77010", name: "Reema Saxena", company: "Bloom", role: "Founder", location: "Bengaluru",
    verified: true, stage: "Chatting", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 3, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 85,
    swipedToDM: 12, dmAccepted: 10, lastActivity: "6m ago",
    email: "reema@bloom.so", phone: "+91 80xxx 27711", ownerInitials: "SJ",
    summary: "Three live chats. Calls held with two. Feedback pending.",
    openRoles: [{ id: "r1", title: "Founding PM", compensation: "₹40-55 LPA + equity", experience: "4+ yrs", location: "Bengaluru", type: "Full-time", candidates: 5, hired: 0, notHired: 0, postedAgo: "6d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "11:54", text: "Loved Anya. Drop feedback form?" }],
  },
  // ---- Closing stage ----
  {
    id: "GR-77011", name: "Hassan Qureshi", company: "Tidewater", role: "VP Eng", location: "Karachi",
    verified: true, stage: "Closing", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 1, chatsClosed: 6, hired: 3, notHired: 3, hiringIntent: 90,
    swipedToDM: 19, dmAccepted: 16, lastActivity: "18m ago",
    email: "hassan@tidewater.pk", phone: "+92 21 xxx 5500", ownerInitials: "GT",
    summary: "Offer extended. Closing chats post-feedback. Repeat boss.",
    openRoles: [{ id: "r1", title: "Backend Lead", compensation: "PKR 1.2-1.6M/mo", experience: "6+ yrs", location: "Karachi", type: "Full-time", candidates: 4, hired: 1, notHired: 2, postedAgo: "8d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "11:36", text: "Sent offer. Closing the other two." }],
  },
  {
    id: "GR-77012", name: "Juno Park", company: "Voltage", role: "CTO", location: "Seoul",
    verified: true, stage: "Closing", status: "no_reply", sentiment: "unhappy",
    rolesOpen: 1, chatsOpen: 1, chatsClosed: 4, hired: 0, notHired: 4, hiringIntent: 35,
    swipedToDM: 14, dmAccepted: 9, lastActivity: "6d ago",
    email: "juno@voltage.kr", phone: "+82 2 xxx 7711", ownerInitials: "GT",
    alert: "Hire/no-hire pending · 6d cold",
    summary: "All four chats closed without feedback. Blocking the 10-chat cap.",
    openRoles: [{ id: "r1", title: "Staff Eng", compensation: "₩140-180M", experience: "8+ yrs", location: "Seoul", type: "Full-time", candidates: 4, hired: 0, notHired: 4, postedAgo: "20d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "Last wk", text: "Need outcome on each chat to free up slots." }],
  },
  // ---- Identity · more variants (stuck on different steps) ----
  {
    id: "GR-88001", name: "Omar Haddad", company: "Cinder", role: "—", location: "Beirut",
    verified: false, stage: "Identity", status: "no_reply", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 50,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "2d ago",
    email: "—", phone: "+961 1 xxx 4421", ownerInitials: "GT",
    alert: "No name added · 2d cold",
    summary: "Signup complete but never typed name. WATI + PN both ignored.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "Mon", text: "Hey! What should I call you?" }],
  },
  {
    id: "GR-88002", name: "Yuki Tanaka", company: "—", role: "—", location: "Tokyo",
    verified: false, stage: "Identity", status: "idle", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 55,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "4h ago",
    email: "yuki@—", phone: "+81 3 xxx 9911", ownerInitials: "SJ",
    alert: "Company & role missing",
    summary: "Name added. Tal asked for company — bounced before answering.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "07:50", text: "Which company are you hiring for?" }],
  },
  {
    id: "GR-88003", name: "Marco Bellini", company: "Falco", role: "Founder", location: "Milan",
    verified: false, stage: "Identity", status: "active", sentiment: "happy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 70,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "12m ago",
    email: "marco@falco.it", phone: "—", ownerInitials: "GT",
    alert: "Phone not added",
    summary: "LinkedIn confirmed. Skipped phone — needed for WhatsApp loop.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "11:48", text: "Drop your phone so we can WhatsApp shortlists." }],
  },
  // ---- Personality · more variants ----
  {
    id: "GR-88010", name: "Hana Kim", company: "Petal", role: "Head Design", location: "Seoul",
    verified: false, stage: "Personality", status: "idle", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 60,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "1d ago",
    email: "hana@petal.kr", phone: "+82 2 xxx 3322", ownerInitials: "SJ",
    alert: "No photos uploaded",
    summary: "Skipped photo step. tal.af page can't go live without pics.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "Yest", text: "Add 3 pics — even casual ones. Page won't ship without." }],
  },
  {
    id: "GR-88011", name: "Felix Nguyen", company: "Rune", role: "CTO", location: "Ho Chi Minh",
    verified: false, stage: "Personality", status: "active", sentiment: "happy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 72,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "25m ago",
    email: "felix@rune.vn", phone: "+84 28 xxx 1144", ownerInitials: "GJ",
    summary: "Photos done. Stuck on prompts — only 1 of 3 answered.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "boss", time: "11:30", text: "What kind of prompts?" }, { from: "ops", time: "11:31", text: "Short — 'first hire I made', 'rule I break', 'why TAL'." }],
  },
  {
    id: "GR-88012", name: "Zara Ali", company: "Mango Labs", role: "VP Eng", location: "Lahore",
    verified: false, stage: "Personality", status: "active", sentiment: "happy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 78,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "8m ago",
    email: "zara@mango.pk", phone: "+92 42 xxx 7711", ownerInitials: "GT",
    summary: "All steps done except AI stack. tal.af/workwithzara stagged.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "11:55", text: "Drop your AI stack — Cursor, Claude, etc. Page ships after." }],
  },
  // ---- Verification · more variants per step ----
  {
    id: "GR-88020", name: "Suresh Iyer", company: "Tinder Cloud", role: "Founder", location: "Bengaluru",
    verified: false, stage: "Verification", status: "idle", sentiment: "neutral",
    rolesOpen: 1, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 65,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "2d ago",
    email: "suresh@gmail.com", phone: "+91 80xxx 99100", ownerInitials: "GJ",
    alert: "Personal email submitted · needs work email",
    summary: "Used gmail. Domain check failed. Needs to resubmit with company email.",
    openRoles: [{ id: "r1", title: "Mobile Lead", compensation: "₹40-55 LPA", experience: "5+ yrs", location: "Bengaluru", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "2d ago" }],
    candidateChats: [], conversation: [{ from: "system", time: "Mon", text: "gmail.com rejected — please use work email." }],
  },
  {
    id: "GR-88021", name: "Lara Conti", company: "Verde", role: "Head Talent", location: "São Paulo",
    verified: false, stage: "Verification", status: "no_reply", sentiment: "neutral",
    rolesOpen: 1, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 60,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "1d ago",
    email: "lara@verde.com.br", phone: "+55 11 xxx 4422", ownerInitials: "GT",
    alert: "OTP sent · not entered",
    summary: "Work email submitted. OTP delivered — boss never opened the email.",
    openRoles: [{ id: "r1", title: "TA Lead", compensation: "R$ 22-30k/mo", experience: "5+ yrs", location: "São Paulo", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "1d ago" }],
    candidateChats: [], conversation: [{ from: "system", time: "Yest", text: "OTP sent to lara@verde.com.br" }],
  },
  {
    id: "GR-88022", name: "Ben Whitaker", company: "Sable", role: "Founder", location: "Austin",
    verified: false, stage: "Verification", status: "active", sentiment: "unhappy",
    rolesOpen: 1, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 55,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "3h ago",
    email: "ben@sable.io", phone: "+1 512 xxx 4488", ownerInitials: "SJ",
    alert: "Domain mismatch · sable.io vs sable.com",
    summary: "OTP confirmed but domain doesn't match LinkedIn company. Manual review needed.",
    openRoles: [{ id: "r1", title: "Founding Eng", compensation: "$160-200k", experience: "5+ yrs", location: "Remote", type: "Full-time", candidates: 0, hired: 0, notHired: 0, postedAgo: "3d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "08:40", text: "Why am I not verified yet? OTP went through." }],
  },
  // ---- Job Setup · more variants per step ----
  {
    id: "GR-88030", name: "Chen Wei", company: "Lattice AI", role: "CEO", location: "Singapore",
    verified: true, stage: "Job Setup", status: "active", sentiment: "happy",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 80,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "30m ago",
    email: "chen@lattice.ai", phone: "+65 8 xxx 9921", ownerInitials: "GJ",
    alert: "Salary band missing",
    summary: "Title + seniority + location set. Skipped comp band.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "11:20", text: "Drop a salary range — even rough. Helps shortlists." }],
  },
  {
    id: "GR-88031", name: "Aaron Levy", company: "Hexaware", role: "VP Product", location: "Tel Aviv",
    verified: true, stage: "Job Setup", status: "idle", sentiment: "neutral",
    rolesOpen: 0, chatsOpen: 0, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 60,
    swipedToDM: 0, dmAccepted: 0, lastActivity: "5d ago",
    email: "aaron@hexaware.il", phone: "+972 3 xxx 5511", ownerInitials: "GT",
    alert: "Location undecided · 5d stale",
    summary: "Filled title + comp. Toggling between Remote and Tel Aviv for 5 days.",
    openRoles: [], candidateChats: [],
    conversation: [{ from: "ops", time: "Last wk", text: "Pick one — you can always relax later." }],
  },
  // ---- Talking · more variants ----
  {
    id: "GR-88040", name: "Riya Malhotra", company: "Oat", role: "Founder", location: "Bengaluru",
    verified: true, stage: "Talking", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 1, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 82,
    swipedToDM: 6, dmAccepted: 5, lastActivity: "8m ago",
    email: "riya@oat.in", phone: "+91 80xxx 12233", ownerInitials: "SJ",
    summary: "Shortlist viewed. Intro DM drafted but not sent.",
    openRoles: [{ id: "r1", title: "Marketing Lead", compensation: "₹30-45 LPA", experience: "5+ yrs", location: "Bengaluru", type: "Full-time", candidates: 4, hired: 0, notHired: 0, postedAgo: "4d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "11:52", text: "Hit send on those drafts — they're solid." }],
  },
  {
    id: "GR-88041", name: "Diego Ramos", company: "Pampas", role: "CTO", location: "Buenos Aires",
    verified: true, stage: "Talking", status: "no_reply", sentiment: "neutral",
    rolesOpen: 2, chatsOpen: 2, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 65,
    swipedToDM: 11, dmAccepted: 8, lastActivity: "3d ago",
    email: "diego@pampas.ar", phone: "+54 11 xxx 8822", ownerInitials: "GT",
    alert: "8 DMs sent · 0 first replies in 2h window",
    summary: "Bulk-DM'd 8 candidates. Hasn't replied to any of their responses.",
    openRoles: [{ id: "r1", title: "Senior Backend", compensation: "USD 5-7k/mo", experience: "5+ yrs", location: "Remote", type: "Full-time", candidates: 8, hired: 0, notHired: 0, postedAgo: "5d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "Tue", text: "5 candidates replied. They're waiting on you." }],
  },
  // ---- Chatting · more variants ----
  {
    id: "GR-88050", name: "Eva Lindgren", company: "Nordic Loop", role: "Head Eng", location: "Stockholm",
    verified: true, stage: "Chatting", status: "no_reply", sentiment: "unhappy",
    rolesOpen: 1, chatsOpen: 4, chatsClosed: 0, hired: 0, notHired: 0, hiringIntent: 50,
    swipedToDM: 9, dmAccepted: 8, lastActivity: "4d ago",
    email: "eva@nordicloop.se", phone: "+46 8 xxx 6611", ownerInitials: "GT",
    alert: "Resume requested · not shared",
    summary: "Boss asked for resumes. Candidates uploaded — boss never opened them.",
    openRoles: [{ id: "r1", title: "Eng Manager", compensation: "SEK 95-120k/mo", experience: "6+ yrs", location: "Stockholm", type: "Full-time", candidates: 4, hired: 0, notHired: 0, postedAgo: "11d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "Mon", text: "Where are the resumes?" }, { from: "ops", time: "Mon", text: "Top of each chat — 3 attached." }],
  },
  {
    id: "GR-88051", name: "Karim Osman", company: "Atlas Build", role: "Founder", location: "Cairo",
    verified: true, stage: "Chatting", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 2, chatsClosed: 1, hired: 0, notHired: 1, hiringIntent: 78,
    swipedToDM: 8, dmAccepted: 6, lastActivity: "1h ago",
    email: "karim@atlas.eg", phone: "+20 2 xxx 4477", ownerInitials: "SJ",
    summary: "Resume + slots shared. Call held with 1, awaiting call with 2nd.",
    openRoles: [{ id: "r1", title: "Tech Lead", compensation: "EGP 80-110k/mo", experience: "6+ yrs", location: "Cairo", type: "Full-time", candidates: 3, hired: 0, notHired: 1, postedAgo: "8d ago" }],
    candidateChats: [], conversation: [{ from: "boss", time: "10:50", text: "Call with Mona was great. Booking the next." }],
  },
  // ---- Closing · more variants ----
  {
    id: "GR-88060", name: "Sasha Volkov", company: "Krait", role: "Head Eng", location: "Berlin",
    verified: true, stage: "Closing", status: "no_reply", sentiment: "neutral",
    rolesOpen: 1, chatsOpen: 0, chatsClosed: 3, hired: 1, notHired: 2, hiringIntent: 70,
    swipedToDM: 10, dmAccepted: 8, lastActivity: "2d ago",
    email: "sasha@krait.de", phone: "+49 30 xxx 2233", ownerInitials: "GT",
    alert: "Hire confirmed · feedback missing on 2 closed",
    summary: "Hired Maya. Closed 2 others without feedback — blocking analytics.",
    openRoles: [{ id: "r1", title: "Backend Lead", compensation: "€95-115k", experience: "6+ yrs", location: "Berlin", type: "Full-time", candidates: 3, hired: 1, notHired: 2, postedAgo: "14d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "Yest", text: "30s feedback per closed chat — unblocks the next batch." }],
  },
  {
    id: "GR-88061", name: "Maya Rodrigues", company: "Coast", role: "Founder", location: "Lisbon",
    verified: true, stage: "Closing", status: "active", sentiment: "happy",
    rolesOpen: 1, chatsOpen: 9, chatsClosed: 1, hired: 0, notHired: 1, hiringIntent: 75,
    swipedToDM: 16, dmAccepted: 14, lastActivity: "20m ago",
    email: "maya@coast.pt", phone: "+351 21 xxx 8800", ownerInitials: "GJ",
    alert: "9/10 chats open · cap risk",
    summary: "One slot left before 10-chat cap. Needs to close one before opening more.",
    openRoles: [{ id: "r1", title: "Growth Lead", compensation: "€70-90k", experience: "5+ yrs", location: "Lisbon", type: "Full-time", candidates: 9, hired: 0, notHired: 1, postedAgo: "9d ago" }],
    candidateChats: [], conversation: [{ from: "ops", time: "11:40", text: "Close one — even a quick 'not now' frees a slot." }],
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

BOSSES[8].candidateChats = mkChat("GR-66501", [
  { candidateName: "Aman Bhat", candidateRole: "Backend", forRole: "Backend Engineer", status: "open", chatStatus: "active", lastMessage: "Sending availability.", lastTime: "22m", lastTs: min(22) },
  { candidateName: "Riya Shah", candidateRole: "Backend", forRole: "Backend Engineer", status: "open", chatStatus: "active", lastMessage: "Final round done.", lastTime: "2h", lastTs: hr(2) },
  { candidateName: "Vivek Nag", candidateRole: "Backend", forRole: "Backend Engineer", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Joined.", lastTime: "1w", lastTs: day(7) },
]);
BOSSES[9].candidateChats = mkChat("GR-66502", [
  { candidateName: "Sana Vora", candidateRole: "PM", forRole: "Senior PM", status: "open", chatStatus: "active", lastMessage: "Onsite Fri.", lastTime: "1h", lastTs: hr(1) },
  { candidateName: "Rahul Bose", candidateRole: "PM", forRole: "Senior PM", status: "open", chatStatus: "idle", lastMessage: "Awaiting feedback.", lastTime: "1d", lastTs: day(1) },
]);
BOSSES[10].candidateChats = mkChat("GR-66503", [
  { candidateName: "Aman B", candidateRole: "Platform", forRole: "Platform Eng", status: "open", chatStatus: "no_reply", lastMessage: "Shared resume — awaiting boss.", lastTime: "2d", lastTs: day(2) },
  { candidateName: "Sneha Pal", candidateRole: "Platform", forRole: "Platform Eng", status: "open", chatStatus: "no_reply", lastMessage: "Following up.", lastTime: "1d", lastTs: day(1) },
]);
BOSSES[11].candidateChats = mkChat("GR-66504", [
  { candidateName: "Tara M", candidateRole: "Eng", forRole: "Founding Eng", status: "open", chatStatus: "idle", lastMessage: "Awaiting boss.", lastTime: "3d", lastTs: day(3) },
]);
BOSSES[12].candidateChats = mkChat("GR-66505", [
  { candidateName: "Vikas Rao", candidateRole: "SRE", forRole: "SRE", status: "open", chatStatus: "active", lastMessage: "Offer in review.", lastTime: "30m", lastTs: min(30), pinned: true },
  { candidateName: "Nina K", candidateRole: "SRE", forRole: "SRE", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Joined.", lastTime: "1w", lastTs: day(7) },
]);
BOSSES[13].candidateChats = mkChat("GR-66506", [
  { candidateName: "Esha N", candidateRole: "Designer", forRole: "Sr Designer", status: "open", chatStatus: "no_reply", lastMessage: "Portfolio sent — awaiting feedback.", lastTime: "1d", lastTs: day(1) },
  { candidateName: "Mira J", candidateRole: "Designer", forRole: "Sr Designer", status: "open", chatStatus: "active", lastMessage: "Loved the brief.", lastTime: "3h", lastTs: hr(3) },
]);
BOSSES[14].candidateChats = mkChat("GR-66507", [
  { candidateName: "Arjun K", candidateRole: "MLE", forRole: "ML Eng", status: "open", chatStatus: "active", lastMessage: "Counter accepted!", lastTime: "10m", lastTs: min(10), pinned: true },
  { candidateName: "Tia P", candidateRole: "MLE", forRole: "ML Eng", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Joined.", lastTime: "2w", lastTs: day(14) },
]);
BOSSES[16].candidateChats = mkChat("GR-66509", [
  { candidateName: "Hannah Lee", candidateRole: "Talent", forRole: "Talent Lead", status: "open", chatStatus: "no_reply", lastMessage: "Reaching out again.", lastTime: "4d", lastTs: day(4) },
  { candidateName: "Owen P", candidateRole: "Talent", forRole: "Talent Lead", status: "closed", chatStatus: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "1w", lastTs: day(7) },
]);
BOSSES[17].candidateChats = mkChat("GR-66510", [
  { candidateName: "Layla H", candidateRole: "PM", forRole: "Group PM", status: "open", chatStatus: "active", lastMessage: "Panel debrief tmrw.", lastTime: "45m", lastTs: min(45) },
  { candidateName: "Yusuf M", candidateRole: "PM", forRole: "Group PM", status: "open", chatStatus: "active", lastMessage: "Sending case study.", lastTime: "2h", lastTs: hr(2) },
  { candidateName: "Reem A", candidateRole: "PM", forRole: "Group PM", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Joined.", lastTime: "2w", lastTs: day(14) },
]);
BOSSES[19].candidateChats = mkChat("GR-66512", [
  { candidateName: "Jay K", candidateRole: "Designer", forRole: "Founding Designer", status: "open", chatStatus: "active", lastMessage: "Loving the speed.", lastTime: "15m", lastTs: min(15), pinned: true },
  { candidateName: "Sara V", candidateRole: "Designer", forRole: "Founding Designer", status: "closed", chatStatus: "closed", closeReason: "Hired", lastMessage: "Joined.", lastTime: "1w", lastTs: day(7) },
]);

// Synthesize candidate profile + full message thread for every chat
const LOCS = ["Bengaluru", "Mumbai", "Delhi", "Pune", "Remote", "Hyderabad", "Berlin", "London", "Tokyo"];
const COS = ["Razorpay", "Swiggy", "Stripe", "Notion", "Atlassian", "Flipkart", "Zomato", "CRED", "PhonePe"];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildProfile(c: CandidateChat): CandidateProfile {
  const h = hashStr(c.candidateName);
  return {
    experience: `${3 + (h % 8)} yrs`,
    location: LOCS[h % LOCS.length],
    currentCompany: COS[h % COS.length],
    expectedComp: `₹${20 + (h % 50)}-${30 + (h % 60)} LPA`,
    email: `${c.candidateName.toLowerCase().replace(/\s+/g, ".")}@mail.com`,
    phone: `+91 9${String(h).slice(0, 4)} ${String(h).slice(4, 9).padEnd(5, "0")}`,
  };
}

function buildThread(c: CandidateChat, boss: Boss): ChatMessage[] {
  const t = c.lastTime;
  const base: ChatMessage[] = [
    { from: "system", time: "Day 1 · 09:02", text: `Match initiated · ${c.candidateName} → ${c.forRole} @ ${boss.company}` },
    { from: "ops", time: "Day 1 · 09:05", text: `Hi ${c.candidateName.split(" ")[0]}, sharing the role at ${boss.company}. Compensation in band, hybrid setup. Interested?` },
    { from: "candidate", time: "Day 1 · 10:11", text: `Yes, looks aligned. Can you share the full JD and team details?` },
    { from: "ops", time: "Day 1 · 10:18", text: `Sent on email. Looping in ${boss.name.split(" ")[0]} for intro.` },
    { from: "boss", time: "Day 1 · 14:02", text: `Hi ${c.candidateName.split(" ")[0]} — saw your profile, looks strong. Quick chat tomorrow?` },
    { from: "candidate", time: "Day 1 · 18:30", text: `Sure, 4pm IST works.` },
    { from: "boss", time: "Day 2 · 16:45", text: `Good chat. Sending you a small take-home.` },
    { from: "candidate", time: "Day 3 · 11:00", text: `Submitted. Let me know feedback.` },
  ];
  if (c.status === "closed" && c.closeReason) {
    if (POSITIVE_CLOSE.includes(c.closeReason)) {
      base.push(
        { from: "boss", time: `${t} ago`, text: `Loved the submission. Sending an offer.` },
        { from: "candidate", time: `${t} ago`, text: c.lastMessage },
        { from: "system", time: `${t} ago`, text: `Chat closed · ${c.closeReason}` },
      );
    } else {
      base.push(
        { from: "ops", time: `${t} ago`, text: `Following up on the take-home.` },
        { from: "system", time: `${t} ago`, text: `Chat closed · ${c.closeReason}` },
      );
    }
  } else {
    base.push({ from: c.chatStatus === "no_reply" ? "ops" : "candidate", time: `${t} ago`, text: c.lastMessage });
  }
  return base;
}

BOSSES.forEach((boss) => {
  boss.candidateChats.forEach((c) => {
    if (!c.candidateProfile) c.candidateProfile = buildProfile(c);
    if (!c.messages) c.messages = buildThread(c, boss);
    if (!c.interviewChannel) {
      c.interviewChannel = hashStr(c.candidateName) % 2 === 0 ? "app" : "external";
    }
  });
});

export const ROLES = Array.from(new Set(BOSSES.map((b) => b.role)));
export const LOCATIONS = Array.from(new Set(BOSSES.map((b) => b.location)));
export const COMPANIES = Array.from(new Set(BOSSES.map((b) => b.company)));

// Flat list of all chats for chat-stream view
export const ALL_CHATS: CandidateChat[] = BOSSES.flatMap((b) => b.candidateChats);

export function bossById(id: string): Boss | undefined {
  return BOSSES.find((b) => b.id === id);
}

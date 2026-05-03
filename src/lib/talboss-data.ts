export type Stage =
  | "Job Creation"
  | "Verification"
  | "Talking"
  | "Interview"
  | "Hiring"
  | "Closing";

export type ChatStatus = "active" | "idle" | "no_reply" | "closed";
export type Sentiment = "happy" | "neutral" | "unhappy";

export type CloseReason =
  | "Hired"
  | "Comp mismatch"
  | "Profile mismatch"
  | "Candidate ghosted"
  | "Boss withdrew"
  | "On hold";

export interface OpenRole {
  id: string;
  title: string;
  compensation: string;
  experience: string;
  location: string;
  type: "Full-time" | "Contract" | "Part-time";
  candidates: number;
  postedAgo: string;
}

export interface CandidateChat {
  id: string;
  candidateName: string;
  candidateRole: string;
  forRole: string; // role title
  status: "open" | "closed";
  closeReason?: CloseReason;
  lastMessage: string;
  lastTime: string;
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
  hiringIntent: number;
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
  "Job Creation",
  "Verification",
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

const mkChats = (rows: Omit<CandidateChat, "id">[]): CandidateChat[] =>
  rows.map((r, i) => ({ ...r, id: `c-${i}-${Math.random().toString(36).slice(2, 7)}` }));

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
    hiringIntent: 85,
    lastActivity: "4m ago",
    email: "marcus@vento.io",
    phone: "+91 98xxx 41203",
    ownerInitials: "YS",
    summary: "Highly engaged. Replies fast, prefers async voice notes. Optimizing for cultural fit.",
    openRoles: [
      { id: "r1", title: "SDE-1 Backend", compensation: "₹22-30 LPA", experience: "1-3 yrs", location: "Bengaluru / Remote", type: "Full-time", candidates: 8, postedAgo: "5d ago" },
      { id: "r2", title: "Head of Design", compensation: "₹70-90 LPA", experience: "8+ yrs", location: "Bengaluru", type: "Full-time", candidates: 3, postedAgo: "12d ago" },
      { id: "r3", title: "ML Researcher", compensation: "₹45-60 LPA", experience: "4-6 yrs", location: "Remote", type: "Contract", candidates: 2, postedAgo: "2d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Anya Bose", candidateRole: "SDE-2", forRole: "SDE-1 Backend", status: "open", lastMessage: "Sounds good, sending availability tomorrow.", lastTime: "4m", unread: 2, pinned: true },
      { candidateName: "Karan Vyas", candidateRole: "Senior Designer", forRole: "Head of Design", status: "open", lastMessage: "Can we reschedule the chat?", lastTime: "1h" },
      { candidateName: "Nikita Rao", candidateRole: "ML Engineer", forRole: "ML Researcher", status: "open", lastMessage: "Shared portfolio link.", lastTime: "3h" },
      { candidateName: "Rohan Iyer", candidateRole: "Backend dev", forRole: "SDE-1 Backend", status: "open", lastMessage: "Thanks, will revert by EOD.", lastTime: "Yest" },
      { candidateName: "Tara Khanna", candidateRole: "SDE-1", forRole: "SDE-1 Backend", status: "closed", closeReason: "Hired", lastMessage: "Offer accepted 🎉", lastTime: "2d" },
      { candidateName: "Vikram Set", candidateRole: "Designer", forRole: "Head of Design", status: "closed", closeReason: "Comp mismatch", lastMessage: "Comp band too low.", lastTime: "5d" },
      { candidateName: "Maya Gill", candidateRole: "MLE", forRole: "ML Researcher", status: "closed", closeReason: "Profile mismatch", lastMessage: "Looking for senior IC.", lastTime: "1w" },
    ]),
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
    hiringIntent: 40,
    lastActivity: "3d ago",
    email: "elena@aetherlab.com",
    phone: "+49 30 xxx 88",
    ownerInitials: "GJ",
    alert: "No reply 3d · product issue reported",
    summary: "Verification stuck. Boss flagged dashboard not loading candidate cards.",
    openRoles: [
      { id: "r1", title: "Brand Designer", compensation: "€60-75k", experience: "3-5 yrs", location: "Berlin", type: "Full-time", candidates: 4, postedAgo: "8d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Lukas Berg", candidateRole: "Designer", forRole: "Brand Designer", status: "open", lastMessage: "Awaiting boss response.", lastTime: "3d" },
      { candidateName: "Mina Falk", candidateRole: "Designer", forRole: "Brand Designer", status: "open", lastMessage: "Portfolio shared.", lastTime: "3d" },
      { candidateName: "Eva Stein", candidateRole: "Designer", forRole: "Brand Designer", status: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "1w" },
      { candidateName: "Tom Hoff", candidateRole: "Designer", forRole: "Brand Designer", status: "closed", closeReason: "On hold", lastMessage: "Boss paused role.", lastTime: "2w" },
    ]),
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
    hiringIntent: 92,
    lastActivity: "12m ago",
    email: "silas@quantumforge.ai",
    phone: "+91 99xxx 11023",
    ownerInitials: "GT",
    summary: "Closing 3 candidates this week. Wants white-glove offer support. Repeat boss — high LTV.",
    openRoles: [
      { id: "r1", title: "Staff Engineer · Platform", compensation: "₹85-110 LPA", experience: "8-12 yrs", location: "Mumbai", type: "Full-time", candidates: 6, postedAgo: "10d ago" },
      { id: "r2", title: "SRE Lead", compensation: "₹60-80 LPA", experience: "6+ yrs", location: "Remote", type: "Full-time", candidates: 4, postedAgo: "6d ago" },
      { id: "r3", title: "Engineering Manager", compensation: "₹75-95 LPA", experience: "7+ yrs", location: "Mumbai", type: "Full-time", candidates: 3, postedAgo: "3d ago" },
      { id: "r4", title: "Frontend Architect", compensation: "₹70-90 LPA", experience: "7+ yrs", location: "Hybrid", type: "Full-time", candidates: 5, postedAgo: "9d ago" },
      { id: "r5", title: "Data Eng (Contract)", compensation: "₹2.5L/mo", experience: "5+ yrs", location: "Remote", type: "Contract", candidates: 2, postedAgo: "1d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Anya Pillai", candidateRole: "Staff Eng", forRole: "Staff Engineer · Platform", status: "open", lastMessage: "Offer in review.", lastTime: "12m", pinned: true },
      { candidateName: "Devansh K", candidateRole: "SRE", forRole: "SRE Lead", status: "open", lastMessage: "Final round done.", lastTime: "2h" },
      { candidateName: "Kiran M", candidateRole: "EM", forRole: "Engineering Manager", status: "open", lastMessage: "Discussing comp.", lastTime: "1d" },
      { candidateName: "Ravi Joshi", candidateRole: "Staff", forRole: "Frontend Architect", status: "closed", closeReason: "Hired", lastMessage: "Joined ✓", lastTime: "1w" },
      { candidateName: "Pooja Nair", candidateRole: "EM", forRole: "Engineering Manager", status: "closed", closeReason: "Comp mismatch", lastMessage: "—", lastTime: "2w" },
    ]),
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
    hiringIntent: 70,
    lastActivity: "1h ago",
    email: "priya@loophealth.com",
    phone: "+91 80xxx 22910",
    ownerInitials: "GJ",
    summary: "Interviews going well, but hesitant on comp band. Watch for stall after onsite round.",
    openRoles: [
      { id: "r1", title: "Senior PM · Growth", compensation: "₹55-70 LPA", experience: "5-7 yrs", location: "Bengaluru", type: "Full-time", candidates: 5, postedAgo: "7d ago" },
      { id: "r2", title: "Product Designer", compensation: "₹40-55 LPA", experience: "4+ yrs", location: "Remote", type: "Full-time", candidates: 3, postedAgo: "4d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Ishaan Mehta", candidateRole: "PM", forRole: "Senior PM · Growth", status: "open", lastMessage: "Onsite scheduled Fri.", lastTime: "1h" },
      { candidateName: "Naina S", candidateRole: "Designer", forRole: "Product Designer", status: "open", lastMessage: "Sending case study.", lastTime: "3h" },
      { candidateName: "Arjun B", candidateRole: "PM", forRole: "Senior PM · Growth", status: "open", lastMessage: "Follow-up.", lastTime: "Yest" },
      { candidateName: "Sara D", candidateRole: "PM", forRole: "Senior PM · Growth", status: "closed", closeReason: "Profile mismatch", lastMessage: "—", lastTime: "1w" },
    ]),
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
    hiringIntent: 60,
    lastActivity: "18h ago",
    email: "hiro@meshrobotics.jp",
    phone: "+81 3 xxx 9921",
    ownerInitials: "GJ",
    summary: "Idle for 18h. Last message asked about candidate visa status.",
    openRoles: [
      { id: "r1", title: "Robotics Engineer", compensation: "¥10-13M", experience: "5+ yrs", location: "Tokyo", type: "Full-time", candidates: 4, postedAgo: "11d ago" },
      { id: "r2", title: "Computer Vision Lead", compensation: "¥14-18M", experience: "7+ yrs", location: "Tokyo / Remote", type: "Full-time", candidates: 3, postedAgo: "9d ago" },
      { id: "r3", title: "Embedded Engineer", compensation: "¥9-11M", experience: "4+ yrs", location: "Tokyo", type: "Full-time", candidates: 2, postedAgo: "5d ago" },
      { id: "r4", title: "Mech Designer", compensation: "¥8-10M", experience: "3+ yrs", location: "Tokyo", type: "Contract", candidates: 1, postedAgo: "2d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Yuki T", candidateRole: "Robotics", forRole: "Robotics Engineer", status: "open", lastMessage: "Visa question.", lastTime: "18h" },
      { candidateName: "Hana O", candidateRole: "CV", forRole: "Computer Vision Lead", status: "open", lastMessage: "Round 2 done.", lastTime: "1d" },
      { candidateName: "Ren A", candidateRole: "Embedded", forRole: "Embedded Engineer", status: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "1w" },
    ]),
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
    hiringIntent: 55,
    lastActivity: "2d ago",
    email: "sloane@nodal.co",
    phone: "+44 20 xxx 4421",
    ownerInitials: "GT",
    alert: "Candidate ghosted post-offer",
    summary: "Candidate stopped replying after verbal offer. Boss frustrated. Needs recovery.",
    openRoles: [
      { id: "r1", title: "Ops Manager", compensation: "£75-95k", experience: "6+ yrs", location: "London", type: "Full-time", candidates: 2, postedAgo: "14d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Olivia Crane", candidateRole: "Ops", forRole: "Ops Manager", status: "open", lastMessage: "Awaiting reply.", lastTime: "2d" },
      { candidateName: "James Holt", candidateRole: "Ops", forRole: "Ops Manager", status: "closed", closeReason: "Candidate ghosted", lastMessage: "—", lastTime: "3d" },
      { candidateName: "Sara Leigh", candidateRole: "Ops", forRole: "Ops Manager", status: "closed", closeReason: "Comp mismatch", lastMessage: "—", lastTime: "1w" },
    ]),
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
    verified: true,
    stage: "Job Creation",
    status: "active",
    sentiment: "happy",
    rolesOpen: 1,
    chatsOpen: 0,
    chatsClosed: 0,
    hiringIntent: 80,
    lastActivity: "30m ago",
    email: "aarav@slate.ai",
    phone: "+91 98xxx 33001",
    ownerInitials: "YS",
    summary: "Brand new boss. Drafting first JD with white-glove support.",
    openRoles: [
      { id: "r1", title: "Founding ML Engineer", compensation: "₹40-55 LPA + equity", experience: "3+ yrs", location: "Remote", type: "Full-time", candidates: 0, postedAgo: "Today" },
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
    hiringIntent: 50,
    lastActivity: "1d ago",
    email: "diya@ferment.in",
    phone: "+91 11 xxx 9001",
    ownerInitials: "GJ",
    summary: "Awaiting LinkedIn verification doc.",
    openRoles: [
      { id: "r1", title: "Talent Partner", compensation: "₹25-35 LPA", experience: "4+ yrs", location: "Delhi", type: "Full-time", candidates: 1, postedAgo: "3d ago" },
      { id: "r2", title: "Recruiter (Tech)", compensation: "₹18-25 LPA", experience: "2+ yrs", location: "Delhi / Remote", type: "Full-time", candidates: 0, postedAgo: "1d ago" },
    ],
    candidateChats: mkChats([
      { candidateName: "Nidhi A", candidateRole: "Recruiter", forRole: "Talent Partner", status: "open", lastMessage: "Intro sent.", lastTime: "1d" },
    ]),
    conversation: [{ from: "system", time: "Yesterday", text: "Verification email sent" }],
  },
];

export const ROLES = Array.from(new Set(BOSSES.map((b) => b.role)));
export const LOCATIONS = Array.from(new Set(BOSSES.map((b) => b.location)));
export const COMPANIES = Array.from(new Set(BOSSES.map((b) => b.company)));

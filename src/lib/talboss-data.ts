export type Stage =
  | "Job Creation"
  | "Verification"
  | "Talking"
  | "Interview"
  | "Hiring"
  | "Closing";

export type ChatStatus = "active" | "idle" | "no_reply" | "closed";
export type Sentiment = "happy" | "neutral" | "unhappy";

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
  expNeeded: string;
  hiringIntent: number; // 0-100
  lastActivity: string;
  email: string;
  phone: string;
  ownerInitials: string;
  alert?: string;
  summary: string;
  conversation: { from: "boss" | "ops" | "system"; time: string; text: string }[];
}

const stages: Stage[] = [
  "Job Creation",
  "Verification",
  "Talking",
  "Interview",
  "Hiring",
  "Closing",
];

export const STAGES = stages;

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
    chatsOpen: 14,
    chatsClosed: 102,
    expNeeded: "8+ yrs",
    hiringIntent: 85,
    lastActivity: "4m ago",
    email: "marcus@vento.io",
    phone: "+91 98xxx 41203",
    ownerInitials: "YS",
    summary:
      "Boss is highly engaged. Replies fast, prefers async voice notes. Optimizing for cultural fit > raw skill.",
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
    chatsOpen: 3,
    chatsClosed: 4,
    expNeeded: "6+ yrs",
    hiringIntent: 40,
    lastActivity: "3d ago",
    email: "elena@aetherlab.com",
    phone: "+49 30 xxx 88",
    ownerInitials: "SJ",
    alert: "No reply 3d · product issue reported",
    summary:
      "Verification stuck. Boss flagged dashboard not loading candidate cards. Needs human-in-loop ping.",
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
    chatsOpen: 9,
    chatsClosed: 41,
    expNeeded: "10+ yrs",
    hiringIntent: 92,
    lastActivity: "12m ago",
    email: "silas@quantumforge.ai",
    phone: "+91 99xxx 11023",
    ownerInitials: "GT",
    summary:
      "Closing 3 candidates this week. Wants white-glove offer support. Repeat boss — high LTV.",
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
    chatsOpen: 6,
    chatsClosed: 18,
    expNeeded: "4+ yrs",
    hiringIntent: 70,
    lastActivity: "1h ago",
    email: "priya@loophealth.com",
    phone: "+91 80xxx 22910",
    ownerInitials: "YS",
    summary:
      "Interviews going well, but hesitant on comp band. Watch for stall after onsite round.",
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
    chatsOpen: 11,
    chatsClosed: 33,
    expNeeded: "7+ yrs",
    hiringIntent: 60,
    lastActivity: "18h ago",
    email: "hiro@meshrobotics.jp",
    phone: "+81 3 xxx 9921",
    ownerInitials: "SJ",
    summary: "Idle for 18h. Last message asked about candidate visa status.",
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
    chatsOpen: 2,
    chatsClosed: 7,
    expNeeded: "9+ yrs",
    hiringIntent: 55,
    lastActivity: "2d ago",
    email: "sloane@nodal.co",
    phone: "+44 20 xxx 4421",
    ownerInitials: "GT",
    alert: "Candidate ghosted post-offer",
    summary: "Candidate stopped replying after verbal offer. Boss frustrated. Needs recovery.",
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
    expNeeded: "3+ yrs",
    hiringIntent: 80,
    lastActivity: "30m ago",
    email: "aarav@slate.ai",
    phone: "+91 98xxx 33001",
    ownerInitials: "YS",
    summary: "Brand new boss. Drafting first JD with white-glove support.",
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
    expNeeded: "5+ yrs",
    hiringIntent: 50,
    lastActivity: "1d ago",
    email: "diya@ferment.in",
    phone: "+91 11 xxx 9001",
    ownerInitials: "SJ",
    summary: "Awaiting LinkedIn verification doc.",
    conversation: [
      { from: "system", time: "Yesterday", text: "Verification email sent" },
    ],
  },
];

export const OWNERS = ["YS", "SJ", "GT"] as const;
export const ROLES = Array.from(new Set(BOSSES.map((b) => b.role)));
export const LOCATIONS = Array.from(new Set(BOSSES.map((b) => b.location)));
export const COMPANIES = Array.from(new Set(BOSSES.map((b) => b.company)));

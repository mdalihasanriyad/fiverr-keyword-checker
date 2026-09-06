// Shared helpers for the Fiverr message inbox: forbidden-keyword scanning,
// highlight segmentation, and simulated contact seeding data.

export const FORBIDDEN_WORDS: string[] = [
  "crypto", "payment", "payments", "payout", "payouts", "instagram", "linkedin", "facebook",
  "negative", "star", "five star", "transferwise", "account", "bank",
  "messenger", "skype", "card", "credit", "purchase", "whatsapp",
  "password", "inbox", "sms", "transaction", "stripe", "paypal",
  "rating", "rate", "review", "reviews", "reviewed", "feedback",
  "euro", "dollar", "money", "pay", "outside", "contact", "email",
  "gmail", "mail", "@",
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest-first so "five star" wins over "star", "payments" over "pay".
const buildPattern = () => {
  const sorted = [...FORBIDDEN_WORDS].sort((a, b) => b.length - a.length);
  const parts = sorted.map((w) =>
    /^[a-z ]+$/i.test(w) ? `\\b${escapeRe(w)}\\b` : escapeRe(w),
  );
  return new RegExp(`(${parts.join("|")})`, "gi");
};

export type Segment = { text: string; flagged: boolean };

export const segmentText = (text: string): Segment[] => {
  if (!text) return [];
  const re = buildPattern();
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), flagged: false });
    out.push({ text: m[0], flagged: true });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) out.push({ text: text.slice(last), flagged: false });
  return out;
};

export const findFlagged = (text: string): string[] => {
  const found = new Set<string>();
  for (const seg of segmentText(text)) {
    if (seg.flagged) found.add(seg.text.toLowerCase());
  }
  return [...found];
};

export type SeedContact = { name: string; role: string; opener: string };

export const SEED_CONTACTS: SeedContact[] = [
  {
    name: "Amelia Brooks",
    role: "Buyer",
    opener:
      "Hi! I loved your portfolio. Can you deliver a logo pack by Friday? What's your best price for a rush order?",
  },
  {
    name: "Daniel Okafor",
    role: "Buyer",
    opener:
      "Hey, quick question before I order — do revisions cover a full concept change or just tweaks?",
  },
  {
    name: "Sora Tanaka",
    role: "Repeat client",
    opener:
      "Thanks for the last delivery, it was perfect. I have three more gigs coming this month — are you available?",
  },
];

// Canned replies for the simulated contacts, rotated per reply.
export const CONTACT_REPLIES: string[] = [
  "Great, that works for me. Please go ahead and send the offer.",
  "Understood — could you share a rough timeline as well?",
  "Sounds good. I'll review it tonight and get back to you here.",
  "Thanks for the quick reply! One more thing: can you include the source files?",
  "Perfect. I'll place the order through the gig page now.",
];

// Checker modes used by the landing pages to preselect a focused
// subset of keywords when the user lands on the main checker.
export type CheckerMode = "all" | "forbidden-words" | "compliance" | "gig-seo";

export const MODE_LABEL: Record<CheckerMode, string> = {
  "all": "All Keywords",
  "forbidden-words": "Forbidden Words",
  "compliance": "Compliance",
  "gig-seo": "Gig SEO",
};

export const MODE_DESCRIPTION: Record<CheckerMode, string> = {
  "all": "Checking against your full keyword list.",
  "forbidden-words": "Focused on Fiverr's most common forbidden words.",
  "compliance": "Focused on off-platform contact and payment redirection terms.",
  "gig-seo": "Focused on risky terms that hurt gig ranking.",
};

// Curated keyword subsets per mode. These must be lowercase and should
// exist in the user's keyword map (extras are ignored at filter time).
export const MODE_KEYWORDS: Record<Exclude<CheckerMode, "all">, string[]> = {
  "forbidden-words": [
    "whatsapp", "email", "gmail", "mail", "skype", "messenger",
    "instagram", "facebook", "linkedin", "sms", "inbox", "@",
  ],
  "compliance": [
    "paypal", "stripe", "transferwise", "bank", "card", "credit",
    "crypto", "payment", "transaction", "account", "outside", "contact",
    "money", "euro", "dollar", "pay", "purchase", "password",
  ],
  "gig-seo": [
    "rating", "rate", "review", "star", "negative",
  ],
};

export const isCheckerMode = (v: unknown): v is CheckerMode =>
  v === "all" || v === "forbidden-words" || v === "compliance" || v === "gig-seo";

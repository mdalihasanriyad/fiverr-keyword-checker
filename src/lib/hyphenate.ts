export type HyphenStyle = "after-second" | "middle" | "after-first-vowel";

export const HYPHEN_STYLE_KEY = "keyword-guard:hyphen-style-v1";

export const HYPHEN_STYLE_LABELS: Record<HyphenStyle, string> = {
  "after-second": "After 2nd character",
  middle: "Middle of word",
  "after-first-vowel": "After first vowel",
};

export const hyphenateWith = (word: string, style: HyphenStyle): string => {
  if (word.length < 2) return word;
  if (!/[a-z]/i.test(word)) return word;

  let cut: number;
  switch (style) {
    case "middle":
      cut = Math.max(1, Math.min(Math.floor(word.length / 2), word.length - 1));
      break;
    case "after-first-vowel": {
      const m = word.match(/[aeiouAEIOU]/);
      if (m && m.index !== undefined && m.index + 1 < word.length) {
        cut = m.index + 1;
      } else {
        cut = Math.min(2, word.length - 1);
      }
      break;
    }
    case "after-second":
    default:
      cut = Math.min(2, word.length - 1);
      break;
  }
  return word.slice(0, cut) + "-" + word.slice(cut);
};

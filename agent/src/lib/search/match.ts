import type { SearchHit } from "./types";

/**
 * Words that name a different model when the title has them but the model
 * name doesn't ("S26" vs "S26 Ultra", "OnePlus 15" vs "OnePlus 15 R").
 * Any standalone single letter is treated the same way (see isVariantToken).
 */
const VARIANT_WORDS = new Set([
  "pro", "plus", "max", "ultra", "lite", "mini", "neo", "fe", "prime", "power",
  "fusion", "turbo", "speed", "edge", "fold", "flip", "note", "air", "ce", "gt", "slim", "curve",
]);

/**
 * Accessory titles name the phone too ("Case for Vivo Y58"); checked in the
 * title head only, because phone titles mention some of these later
 * ("Gorilla Glass", "45W charger", "Magic Skin Orange").
 */
const ACCESSORY_WORDS = new Set([
  "case", "cover", "tempered", "glass", "guard", "protector", "charger", "cable", "adapter",
  "skin", "holder", "stand", "for", "compatible",
]);

/**
 * Words no phone listing carries anywhere. Stores put them late in the
 * title ("Moto E13, [Bumper] … Back Cover", "REALME P3X 5G - REALME -
 * CASETiFY 2025 - SILICON"), so the head check alone misses them.
 */
const ACCESSORY_ANYWHERE = [
  "case", "cases", "cover", "covers", "bumper", "pouch", "tempered", "protector", "replacement",
  "housing", "casetify", "screen guard", "back panel", "anti reflection", "praxisbuch",
];

/** Other products sold under the phone's name ("Nord Buds 3", "Redmi Watch 5"); checked in the title head. */
const OTHER_PRODUCT_WORDS = new Set([
  "buds", "earbuds", "neckband", "headset", "headphones", "earphones", "earphone", "tws", "bullets",
  "watch", "smartwatch", "band", "iron", "laptop", "tablet", "pad", "speaker", "powerbank", "trimmer",
  "keypad", "film", "book",
]);

/**
 * Store titles name the brand or its product line. A title with none of them
 * is some other product that happens to share words ("Bajaj DX 7 Neo Iron"
 * for "iQOO Neo 7").
 */
export const BRAND_ALIASES: Record<string, string[]> = {
  samsung: ["galaxy"],
  apple: ["iphone"],
  google: ["pixel"],
  oneplus: ["nord"],
  motorola: ["moto"],
  xiaomi: ["mi", "redmi", "poco"],
  mi: ["xiaomi", "redmi", "poco"],
  redmi: ["xiaomi", "mi"],
  poco: ["xiaomi"],
  iqoo: ["vivo"],
  vivo: ["iqoo"],
  realme: ["narzo"],
  oppo: ["reno"],
  nothing: ["cmf"],
  asus: ["rog", "zenfone"],
};

/** Below this no listing is a current smartphone; it's a case, cable or earbud that slipped through. */
export const MIN_PHONE_PRICE = 2500;

/** How far into the full title a model token may sit when the head reading fails. */
const WIDE_HEAD_TOKENS = 10;

/** Not a new unit; checked anywhere in the title (Amazon appends "(Renewed)"). */
const NOT_NEW = ["refurbished", "renewed", "unboxed", "pre owned", "preowned", "open box", "demo", "display unit"];

const CONNECTIVITY = new Set(["5g", "4g"]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    // Infinix's "5G+" is marketing, not a "Plus" model.
    .replace(/\b([45]g)\s*\+/g, "$1")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Whitespace tokens, with a lone letter glued to an adjacent number so
 * spacing differences don't matter: "Moto g 37" → g37, "OnePlus 15 R" → 15r,
 * "iPhone 16 e" → 16e.
 */
export function tokenize(s: string): string[] {
  const n = normalize(s);
  if (!n) return [];
  const out: string[] = [];
  for (const t of n.split(" ")) {
    const prev = out[out.length - 1];
    if (prev !== undefined && ((/^[a-z]$/.test(prev) && /^\d+$/.test(t)) || (/^\d+$/.test(prev) && /^[a-z]$/.test(t)))) {
      out[out.length - 1] = prev + t;
    } else {
      out.push(t);
    }
  }
  return out;
}

const isMemoryToken = (t: string) => /^\d+(gb|tb|mb)$/.test(t);

function isVariantToken(t: string): boolean {
  return VARIANT_WORDS.has(t) || /^[a-z]$/.test(t);
}

/** Tokens before the first RAM/storage figure ("8gb", "128 gb", "ram"). */
function untilMemory(tokens: string[]): string[] {
  const cut = tokens.findIndex(
    (t, i) => isMemoryToken(t) || t === "ram" || (/^\d+$/.test(t) && /^(gb|tb)$/.test(tokens[i + 1] ?? ""))
  );
  return cut >= 0 ? tokens.slice(0, cut) : tokens;
}

/**
 * The model part of a store title: text before the first "(", "|", ",", ":",
 * " - " and before the first RAM/storage figure. Variant and accessory words
 * after that ("... | S Pen", "Gorilla Glass", "45W charger") are not about
 * which phone it is.
 */
export function titleHead(title: string): string[] {
  const head = dropBundleNote(untilMemory(tokenize(title.split(/[([|,:]| [-–—] /)[0])));
  // Titles that open with "(Pack of 2) ..." have no head before "(".
  return head.length >= 2 ? head : untilMemory(tokenize(title));
}

/**
 * "Infinix Note 50x 5G+ 45W Charger In the Box & AI", "OPPO K14x 5G 6500mAh
 * and 45W SUPERVOOC Charger & AI": the phone with its charger, not a charger.
 * The head ends where that note starts. A real charger listing ("45W Charger
 * for …") is left with no head and still fails the accessory check.
 */
function dropBundleNote(head: string[]): string[] {
  let cut = head.indexOf("charger");
  if (cut <= 0) return head;
  while (cut > 0 && /^(\d+w|\d+mah|supervooc|vooc|turbopower|fast|and|with)$/.test(head[cut - 1])) cut--;
  return head.slice(0, cut);
}

/** "fold 7" → "fold7", so "Galaxy Z Fold 7" and "Galaxy Z Fold7" compare equal. */
function squash(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev !== undefined && /^[a-z]+$/.test(prev) && /^\d+$/.test(t)) out[out.length - 1] = prev + t;
    else out.push(t);
  }
  return out;
}

export function isMatch(modelName: string, brand: string, title: string): boolean {
  const full = ` ${normalize(title)} `;
  if (NOT_NEW.some((w) => full.includes(` ${w} `))) return false;

  if (ACCESSORY_ANYWHERE.some((w) => full.includes(` ${w} `))) return false;

  const brandSet = new Set(tokenize(brand));
  const modelTokens = tokenize(modelName);
  const titleTokens = new Set(full.trim().split(" "));

  // The brand, a product-line alias, or the model's own first word
  // ("iPhone", "Pixel", "Moto") must be somewhere in the title.
  const family = new Set([...brandSet, ...[...brandSet].flatMap((b) => BRAND_ALIASES[b] ?? [])]);
  if (modelTokens[0] && /[a-z]/.test(modelTokens[0])) family.add(modelTokens[0]);
  // Also "xiaomi15", "reno10": brand glued to the model number.
  const named = (w: string) =>
    titleTokens.has(w) || [...titleTokens].some((t) => t.startsWith(w) && /^\d/.test(t.slice(w.length)));
  if (![...family].some(named)) return false;

  const head = titleHead(title);
  // Model name inside parentheses ("Nothing Phone (3a)"): the start of the
  // whole title. Capped, so a stray number deep in a long title ("… 1 Year
  // Warranty") can't stand in for the model ("Nokia 1").
  const wideHead = untilMemory(tokenize(title)).slice(0, WIDE_HEAD_TOKENS);

  // First reading of the title in which every model token is present decides.
  const readings: [string[], string[]][] = [
    [modelTokens, head],
    [modelTokens, wideHead],
    [squash(modelTokens), squash(head)],
    [squash(modelTokens), squash(wideHead)],
  ];
  for (const [model, h] of readings) {
    // Brand and 5G/4G are optional: titles often omit them ("Galaxy S26 Ultra").
    const core = model.filter((t) => !brandSet.has(t) && !CONNECTIVITY.has(t) && !isMemoryToken(t));
    if (!core.every((t) => h.includes(t))) continue;
    // With only a number left ("OnePlus 15" → "15") the brand is what names
    // the phone, so it must be in the title: otherwise "Apple iPhone 15" or an
    // HP "15-fc0088AU" laptop would match.
    if (!core.some((t) => /[a-z]/.test(t)) && ![...brandSet].some((b) => full.includes(` ${b} `))) return false;
    return passesFilters(model, h, brandSet, full);
  }
  return false;
}

function passesFilters(model: string[], head: string[], brandSet: Set<string>, full: string): boolean {
  const modelSet = new Set(model);
  const headSet = new Set(head);

  // RAM/storage in the model name sits after the head; look in the whole title.
  const fullSet = new Set(full.trim().split(" "));
  if (model.some((t) => isMemoryToken(t) && !fullSet.has(t))) return false;

  if (head.some((t) => ACCESSORY_WORDS.has(t) || OTHER_PRODUCT_WORDS.has(t))) return false;

  // "Redmi Note 14 Pro 5G" ≠ "Redmi Note 14 Pro 4G".
  for (const [want, other] of [["5g", "4g"], ["4g", "5g"]]) {
    if (modelSet.has(want) && headSet.has(other) && !headSet.has(want)) return false;
  }

  return !head.some((t) => isVariantToken(t) && !modelSet.has(t) && !brandSet.has(t));
}

/**
 * Pick the listing for `modelName` from a store's search hits: drop other
 * models/variants/accessories/refurbs, prefer in-stock, then the lowest price
 * (the base variant); ties keep store order. Unpriced matches only win when
 * nothing has a price.
 */
/**
 * Every hit that is this model (any storage or colour), after the word,
 * price-floor and accessory-price filters. In-stock hits are not preferred
 * here: an out-of-stock colour is still a variant with a listed price.
 */
export function matchingHits(modelName: string, brand: string, hits: SearchHit[]): SearchHit[] {
  const candidates = hits.filter(
    (h) => isMatch(modelName, brand, h.title) && (h.price === null || h.price >= MIN_PHONE_PRICE)
  );
  // An accessory that slipped past the word filters ("Vivo Y58 5G (Black)
  // Back Case") would be the cheapest "match". Storage variants of one phone
  // stay well within 3x of each other; a ₹299 hit next to a ₹17,000 one is
  // not the phone.
  const maxPrice = Math.max(0, ...candidates.map((h) => h.price ?? 0));
  return candidates.filter((h) => h.price === null || h.price >= maxPrice * 0.35);
}

export function pickBestHit(modelName: string, brand: string, hits: SearchHit[]): SearchHit | null {
  let candidates = matchingHits(modelName, brand, hits);
  if (candidates.some((h) => h.inStock !== false)) candidates = candidates.filter((h) => h.inStock !== false);
  if (candidates.length === 0) return null;

  let best: SearchHit | null = null;
  for (const h of candidates) {
    if (h.price !== null && (best === null || h.price < best.price!)) best = h;
  }
  return best ?? candidates[0];
}

import { BRAND_ALIASES, tokenize } from "./match";

/** Storage + colour (+ RAM when the store says) read from a listing title. */
export interface VariantInfo {
  ram: string | null;
  storage: string | null;
  color: string | null;
}

const STORAGE_GB = new Set([8, 16, 32, 64, 128, 256, 512]);

/**
 * Memory sizes. The lookbehind skips digits glued to letters, so item codes
 * like "S26ULTRA5G12256GB" don't read as a 12,256 GB phone.
 */
const MEMORY = /(?<![A-Za-z0-9.])(\d+(?:\.\d+)?)\s*(GB|TB)\b(?:\s*(RAM|ROM|Storage))?/gi;
const HAS_MEMORY = new RegExp(MEMORY.source, "i");

/** Words that never belong to a colour name: specs, marketing, model residue. */
const NOT_COLOR = new Set(
  (
    "ram rom storage gb tb mobile mobiles phone phones smartphone smart ai dual sim with without offer offers no cost " +
    "emi additional exchange and the for new display camera cameras battery processor charging charge charger fast " +
    "snapdragon dimensity helio exynos tensor bionic android ios mah hz mp inch inches lcd amoled oled poled ip sony " +
    "ois turbopower supervooc warranty version renewed refurbished by lte wifi wi fi nfc gen octa core chip of in on " +
    "india segment segments first worlds world largest pro plus max ultra lite mini neo fe prime edge fold flip " +
    "speed turbo curve curved year years free months cm only stereo speakers massive design portrait zoom"
  ).split(" ")
);

function normalizeMemory(value: string, unit: string): string {
  return `${Number(value)}${unit.toUpperCase()}`;
}

/** RAM and storage. Labelled values win; otherwise ≥32 GB (or TB) is storage and the rest RAM. */
export function parseMemory(title: string): { ram: string | null; storage: string | null } {
  let ram: string | null = null;
  let storage: string | null = null;
  const unlabeled: { gb: number; text: string }[] = [];

  for (const m of title.matchAll(MEMORY)) {
    const [, value, unit, label] = m;
    const gb = unit.toUpperCase() === "TB" ? Number(value) * 1024 : Number(value);
    const text = normalizeMemory(value, unit);
    const l = label?.toUpperCase();
    if (l === "RAM") ram ??= gb <= 24 ? text : null;
    else if (l === "ROM" || l === "STORAGE") storage ??= text;
    else unlabeled.push({ gb, text });
  }
  for (const u of unlabeled) {
    if (!storage && (u.gb >= 32 || u.text.endsWith("TB"))) storage = u.text;
    else if (!ram && u.gb <= 24) ram = u.text;
  }
  // Amazon shorthand without units: "128 Storage", "(Web, 8+256)", "8+256 Green".
  if (!storage) {
    const bare = title.match(/(?<![\w.])(\d{2,4})\s*Storage\b/i);
    if (bare && STORAGE_GB.has(Number(bare[1]))) storage = `${Number(bare[1])}GB`;
  }
  if (!storage) {
    const pair = title.match(/(?<![\w.])(\d{1,2})\s*\+\s*(\d{2,4})(?![\w.])/);
    if (pair && STORAGE_GB.has(Number(pair[2])) && Number(pair[1]) <= 24) {
      storage = `${Number(pair[2])}GB`;
      ram ??= `${Number(pair[1])}GB`;
    }
  }
  // "8GB" storage only exists on keypad phones; treat lone small values as RAM-less noise.
  if (storage && storage.endsWith("GB") && !STORAGE_GB.has(Number(storage.slice(0, -2)))) storage = null;
  return { ram, storage };
}

/** "SPACE black" → "Space Black" */
function titleCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * The colour: split the title into pieces (brackets, commas, pipes, " - ",
 * "+", ";"), strip the model's own words, memory sizes, item codes and spec or
 * marketing words, and take the first piece left with 1–4 plain words.
 */
export function parseColor(title: string, modelName: string, brand: string): string | null {
  const brandWords = tokenize(brand);
  // "Xiaomi Redmi Note 14", "OnePlus Nord 4": the brand's other names aren't colours either.
  const modelWords = new Set([...tokenize(modelName), ...brandWords, ...brandWords.flatMap((b) => BRAND_ALIASES[b] ?? [])]);
  const pieces = title.split(/[()|,+/;]| [-–—] /);
  // Amazon's Apple titles end in "...Front Camera; Cosmic Orange": that last
  // piece goes first, ahead of phrases like "Thinnest iPhone Ever".
  if (title.includes(";")) pieces.unshift(title.slice(title.lastIndexOf(";") + 1));

  for (const piece of pieces) {
    // "iPhone 17 Pro 1TB Cosmic Orange with damage protection": a bundle note
    // after the size and colour. Without a size first ("Smarter with OnePlus
    // AI") the piece is marketing and stays whole, so it's rejected below.
    const head = piece.match(/^(.*?)\bwith(?:out)?\b/i)?.[1];
    const cleaned = (head && HAS_MEMORY.test(head) ? head : piece).replace(MEMORY, " ");
    const words = cleaned
      .split(/[\s\-_:;."'’”“!&]+/)
      .filter(Boolean)
      .filter((w) => !/\d/.test(w)) // item codes, years, "5G"
      .filter((w) => !modelWords.has(w.toLowerCase()));
    if (words.length === 0 || words.length > 4) continue;
    if (words.some((w) => NOT_COLOR.has(w.toLowerCase()) || !/^[A-Za-z]+$/.test(w))) continue;
    if (words.join("").length < 3) continue;
    return titleCase(words);
  }
  return null;
}

export function parseVariant(title: string, modelName: string, brand: string): VariantInfo {
  // Amazon appends specs after " | "; colours in them come before that point
  // or in their own early segment, both of which parseColor reaches first.
  const { ram, storage } = parseMemory(title.split(" | ").slice(0, 3).join(" | "));
  return { ram, storage, color: parseColor(title, modelName, brand) };
}

/** Same storage + colour words (any order) = same variant across stores. */
export function variantKey(v: VariantInfo): string | null {
  if (!v.storage || !v.color) return null;
  return `${v.storage.toLowerCase()}|${v.color.toLowerCase().split(" ").sort().join(" ")}`;
}

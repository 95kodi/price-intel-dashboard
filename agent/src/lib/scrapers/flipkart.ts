import type { ParsedPrice } from "../parser";

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parse(html: string): ParsedPrice {
  const priceMatch =
    html.match(/"ppd"\s*:\s*\{[^}]*"(?:fsp|finalPrice)"\s*:\s*"?([\d,]+)"?/i) ??
    html.match(/"(?:fsp|finalPrice|sellingPrice|specialPrice|price)"\s*:\s*"?([\d,]+)"?/i) ??
    html.match(/(?:\u20b9|&#x20B9;|&#8377;|Rs\.?)\s*([\d,]+)/i);

  const mrpMatch =
    html.match(/"ppd"\s*:\s*\{[^}]*"mrp"\s*:\s*"?([\d,]+)"?/i) ??
    html.match(/"(?:mrp|maximumRetailPrice|listPrice)"\s*:\s*"?([\d,]+)"?/i);

  const price = toNumber(priceMatch?.[1]);
  const mrp = toNumber(mrpMatch?.[1]) ?? price;
  const discount =
    mrp && price && mrp > 0
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

  return { price, mrp, discount };
}

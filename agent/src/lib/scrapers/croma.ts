import type { ParsedPrice } from "../parser";

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function parse(html: string): ParsedPrice {
  const priceMatch =
    html.match(/"sellingPrice"\s*:\s*\{\s*"value"\s*:\s*"([\d,.]+)"/i) ??
    html.match(/"price"\s*:\s*"([\d,.]+)"/i) ??
    html.match(/(?:\u20b9|&#x20B9;|&#8377;|Rs\.?)\s*([\d,]+)/i);

  const mrpMatch =
    html.match(/"mrp"\s*:\s*\{\s*"value"\s*:\s*"([\d,.]+)"/i) ??
    html.match(/"listPrice"\s*:\s*"([\d,.]+)"/i);

  const price = toNumber(priceMatch?.[1]);
  const mrp = toNumber(mrpMatch?.[1]) ?? price;

  if (price === null || price <= 0) {
    return { price: null, mrp: null, discount: null };
  }

  const discount =
    mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return { price, mrp, discount };
}

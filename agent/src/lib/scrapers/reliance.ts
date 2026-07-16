import type { ParsedPrice } from "../parser";

export function parse(html: string): ParsedPrice {
  const priceMatch = html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/);
  const mrpMatch = html.match(/"mrp"\s*:\s*"?(\d+(?:\.\d+)?)"?/i);

  const price = priceMatch ? Math.round(Number(priceMatch[1])) : null;
  const mrp = mrpMatch ? Math.round(Number(mrpMatch[1])) : price;
  const discount =
    mrp && price && mrp > 0
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

  return { price, mrp, discount };
}

import type { ParsedPrice } from "../parser";

export function parse(html: string): ParsedPrice {
  const lowPrice = html.match(/"lowPrice"\s*:\s*"(\d+)"/);
  const highPrice = html.match(/"highPrice"\s*:\s*"(\d+)"/);

  const price = lowPrice ? Number(lowPrice[1]) : null;
  const mrp = highPrice ? Number(highPrice[1]) : price;
  const discount =
    mrp && price && mrp > 0
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

  return { price, mrp, discount };
}

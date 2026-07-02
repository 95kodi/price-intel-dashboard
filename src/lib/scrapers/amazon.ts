import type { ParsedPrice } from "../parser";

export function parse(html: string): ParsedPrice {
  const priceMatch =
    html.match(/"priceToPay"[\s\S]*?"priceAmount":\s*([\d.]+)/) ||
    html.match(/"priceAmount":\s*([\d.]+)/) ||
    html.match(/<span class="a-price-whole">\s*([\d,]+)\s*<\/span>/i);

  const mrpMatch =
    html.match(/"listPriceAmount":\s*([\d.]+)/) ||
    html.match(/"priceBeforeDiscount":\s*([\d.]+)/) ||
    html.match(
      /<span[^>]*class="a-price a-text-price"[\s\S]*?<span class="a-offscreen">₹\s*([\d,]+)/
    );

  const price = priceMatch
    ? Number(priceMatch[1].replace(/,/g, ""))
    : null;

  const mrp = mrpMatch
    ? Number(mrpMatch[1].replace(/,/g, ""))
    : price;

  const discount =
    price && mrp && mrp > price
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

  return {
    price,
    mrp,
    discount,
  };
}
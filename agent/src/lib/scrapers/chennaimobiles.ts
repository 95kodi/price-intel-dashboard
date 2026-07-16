import type { ParsedPrice } from "../parser";

export function parse(html: string): ParsedPrice {
  // Sale Price
  const salesMatch = html.match(
    /"discount_price"\s*:\s*(\d+)/i
  );

  // MRP
  const mrpMatch = html.match(
    /"product_price"\s*:\s*(\d+)/i
  );

  // Discount %
  const discountMatch = html.match(
    /"discount_percentage"\s*:\s*(\d+)/i
  );

  const price = salesMatch
    ? Number(salesMatch[1])
    : null;

  const mrp = mrpMatch
    ? Number(mrpMatch[1])
    : price;

  const discount = discountMatch
    ? Number(discountMatch[1])
    : (
        price &&
        mrp &&
        mrp > price
      )
        ? Math.round(((mrp - price) / mrp) * 100)
        : null;

  return {
    price,
    mrp,
    discount,
  };
}
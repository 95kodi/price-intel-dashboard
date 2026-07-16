import type { ParsedPrice } from "../parser";

export function parse(html: string): ParsedPrice {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match) {
    return {
      price: null,
      mrp: null,
      discount: null,
    };
  }

  const data = JSON.parse(match[1]);

  const product = data?.props?.pageProps?.initialProductDetails;

  const price = product?.sale_price
    ? Number(product.sale_price)
    : null;

  const mrp = product?.mrp
    ? Number(product.mrp)
    : price;

  const discount =
    price !== null &&
    mrp !== null &&
    mrp > 0
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

  return {
    price,
    mrp,
    discount,
  };
}
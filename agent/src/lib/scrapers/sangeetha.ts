import type { ParsedPrice } from "../parser";

const EMPTY: ParsedPrice = { price: null, mrp: null, discount: null };

function toParsed(salePrice: unknown, mrpValue: unknown): ParsedPrice {
  const price = salePrice ? Number(salePrice) : null;
  const mrp = mrpValue ? Number(mrpValue) : price;
  const discount =
    price !== null && mrp !== null && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : null;
  return { price, mrp, discount };
}

export function parse(html: string): ParsedPrice {
  // sangeetha.com: http.ts fetches the product-details JSON API instead of
  // the client-rendered page ({"data":[{"sale_price":"54826.00","mrp":...}]}).
  if (html.trimStart().startsWith("{")) {
    try {
      const product = JSON.parse(html)?.data?.[0];
      return product ? toParsed(product.sale_price, product.mrp) : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  // Old sangeethamobiles.com pages embedded the product in __NEXT_DATA__.
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return EMPTY;
  const product = JSON.parse(match[1])?.props?.pageProps?.initialProductDetails;
  return toParsed(product?.sale_price, product?.mrp);
}

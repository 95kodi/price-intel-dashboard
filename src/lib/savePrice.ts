export async function savePrice(
  productPlatformId: number,
  price: number,
  mrp: number | null,
  discount: number | null
): Promise<boolean> {
  const res = await fetch(
    "https://api.gogizmo.co/platform-price-history/save",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PriceID: 0,
        ProductPlatformID: productPlatformId,
        Price: price,
        MRP: mrp ?? price,
        Discount: discount ?? 0,
        Source: "HTTP Scraper",
        IsActive: 1,
      }),
    }
  );
  return res.ok;
}

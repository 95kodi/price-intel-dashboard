/**
 * Self-test for match.ts. Run from the repo root:
 *   npx esbuild agent/src/lib/search/match.test.ts --bundle --platform=node --outfile=<scratch>/t.cjs && node <scratch>/t.cjs
 */
import assert from "assert";
import type { SearchHit } from "./types";
import { isMatch, pickBestHit } from "./match";

const hit = (title: string, price: number | null = null, extra: Partial<SearchHit> = {}): SearchHit => ({
  title,
  url: `https://example.com/${encodeURIComponent(title)}`,
  price,
  mrp: null,
  ...extra,
});

const yes = (model: string, brand: string, title: string) =>
  assert.ok(isMatch(model, brand, title), `expected match: "${model}" ~ "${title}"`);
const no = (model: string, brand: string, title: string) =>
  assert.ok(!isMatch(model, brand, title), `expected NO match: "${model}" ~ "${title}"`);

// Galaxy S26 vs Ultra vs Plus (brand omitted from the title is fine)
yes("Samsung Galaxy S26", "Samsung", "Samsung Galaxy S26 5G (Black, 12GB RAM, 256GB Storage)");
yes("Samsung Galaxy S26", "Samsung", "Galaxy S26 5G (Cobalt Violet, 12GB, 256GB)");
yes("Samsung Galaxy S26", "Samsung", "Samsung Galaxy S26 12GB 256GB White");
no("Samsung Galaxy S26", "Samsung", "Samsung Galaxy S26 Ultra 5G (Black, 12GB RAM, 256GB Storage)");
no("Samsung Galaxy S26", "Samsung", "Samsung Galaxy S26+ 12GB 256GB Black");
no("Samsung Galaxy S26", "Samsung", "SAMSUNG Galaxy S26 Plus 5G (12GB RAM, 512GB, Black)");
no("Samsung Galaxy S26", "Samsung", "Samsung Galaxy S26 FE 5G (8GB, 128GB)");
no("Samsung Galaxy S26", "Samsung", "Samsung Galaxy S261 (Black)");
yes("Samsung Galaxy S26 Ultra", "Samsung", "SAMSUNG Galaxy S26 Ultra 5G (12GB RAM, 256GB, Cobalt Violet)");
// Variant words after the head ("| S Pen", "Gorilla Glass") don't count
yes(
  "Samsung Galaxy S26 Ultra",
  "Samsung",
  "Samsung Galaxy S26 Ultra 5G (Black, 12GB RAM, 256GB Storage) with Built-in Privacy Display | S Pen | Gorilla Glass Armor"
);
no("Samsung Galaxy S26 Ultra", "Samsung", "Samsung Galaxy S26 5G (Black, 12GB RAM, 256GB Storage)");
yes("Samsung Galaxy S26+", "Samsung", "Samsung Galaxy S26 Plus 5G (Black, 12GB RAM, 256GB)");
yes("Samsung Galaxy S26 Plus", "Samsung", "Samsung Galaxy S26+ 12GB 256GB Black");

// iPhone 16 vs 16e vs 16 Pro
yes("iPhone 16", "Apple", "Apple iPhone 16 (128 GB) - Black");
no("iPhone 16", "Apple", "Apple iPhone 16e (128 GB) - White");
no("iPhone 16", "Apple", "Apple iPhone 16 Pro (128 GB) - Desert Titanium");
no("iPhone 16", "Apple", "Apple iPhone 16 Plus (128 GB) - Ultramarine");
yes("iPhone 16e", "Apple", "Apple iPhone 16e (128 GB) - White");
yes("iPhone 17 Pro Max", "Apple", "Apple iPhone 17 Pro Max 256 GB: 17.42 cm (6.9″) Display with ProMotion");
no("iPhone 17 Pro", "Apple", "APPLE iPhone 17 Pro Max (256GB, Cosmic Orange)");

// Poco C81 Pro vs C81
yes("Poco C81 Pro", "Xiaomi", "POCO C81 Pro 5G (Mystic Black, 6GB RAM, 128GB)");
no("Poco C81 Pro", "Xiaomi", "POCO C81 5G (Mystic Black, 4GB RAM, 64GB)");
no("Poco C81", "Poco", "POCO C81 Pro 5G (Mystic Black, 6GB RAM, 128GB)");
yes("Poco C81", "Poco", "POCO C81 (Mystic Black, 4GB RAM, 64GB)");

// OnePlus 15 vs 15R / 15 R / Nord
yes("OnePlus 15", "OnePlus", "OnePlus 15 | 12GB+256GB | Infinite Black");
no("OnePlus 15", "OnePlus", "OnePlus 15R | 12GB+256GB | Charcoal Black");
no("OnePlus 15", "OnePlus", "OnePlus 15 R 5G (12GB, 256GB)");
// Only a number besides the brand: the brand has to be in the title (seen live).
no("OnePlus 15", "Oneplus", "Apple iPhone 15 (Black, 128 GB)");
no("OnePlus 15", "Oneplus", 'HP - AMD Ryzen 7-7730U 15.6" (39.6 cm) 15-fc0088AU Thin & Light Laptop (8GB DDR4/ 512GB SSD)');
yes("OnePlus 15", "Oneplus", "Oneplus 15 5G (Sand Storm, 12GB, 256GB)");
yes("Samsung Galaxy S26 Ultra", "Samsung", "Galaxy S26 Ultra 5G (Titanium Black, 12GB, 256GB)");
no("OnePlus Nord 6", "OnePlus", "OnePlus Nord CE 6 5G (8GB RAM, 128GB)");
no("OnePlus Nord 6", "OnePlus", "OnePlus Nord CE6 5G (8GB RAM, 128GB)");

// Optional brand / 5G, conflicting 4G
yes("Motorola G43 5G", "Motorola", "moto g43 (Ocean Blue, 8GB RAM, 128GB)");
yes("Redmi Note 14 Pro 5G", "Xiaomi", "REDMI Note 14 Pro 5G (Titan Black, 8GB RAM, 256GB)");
no("Redmi Note 14 Pro 5G", "Xiaomi", "Redmi Note 14 Pro 4G (Titan Black, 8GB, 256GB)");
no("Redmi Note 14 Pro 5G", "Xiaomi", "Redmi Note 14 Pro+ 5G (Titan Black, 8GB, 256GB)");
no("Redmi 15 5G", "Xiaomi", "Redmi Note 15 5G (Black, 8GB, 128GB)");

// Vivo Y58: real listings match; accessories / refurbs / demo units don't
yes("Vivo Y58", "Vivo", "vivo Y58 5G (Sundarbans Green, 8GB RAM, 128GB Storage)");
yes("Vivo Y58", "Vivo", "Vivo Y58 5G ( Himalayan Blue, 8GB-128GB )");
no("Vivo Y58", "Vivo", "vivo Y58s 5G (Black, 8GB, 128GB)");
no("Vivo Y58", "Vivo", "Cute Bear 3D Silicone Phone Case for vivo Y58 5G | Beige");
no("Vivo Y58", "Vivo", "Tempered Glass for Vivo Y58 (6.72 Inch) With Installation Kit");
no("Vivo Y58", "Vivo", "Space Cloth Silicon Back Case For Vivo Y58/Y38 5G ( Green )");
no("Vivo Y58", "Vivo", "VIVO Y58 5G Back Cover");
no("Vivo Y58", "Vivo", "vivo Y58 5G (Himalayan Blue, 8GB RAM, 128GB Storage) (Renewed)");
no("Vivo Y58", "Vivo", "Demo Vivo Y58 5G ( Himalayan Blue, 8GB-128GB )");
no("Samsung Galaxy S26 Ultra", "Samsung", "Store Display Unit - Samsung Galaxy S26 Ultra Slim Magnet Case");
no("Samsung Galaxy S26 Ultra", "Samsung", "Samsung Galaxy S26 Ultra Silicone Magnet Case | Soft Touch Grip (Violet)");

// Model name in parentheses
yes("Nothing Phone 3a", "Nothing", "Nothing Phone (3a) 5G (Black, 8GB RAM, 256GB)");

// Letter/number spacing differences
yes("Motorola G37", "Motorola", "Moto g 37 4GB 64GB PANTONE Capri");
no("Motorola G37", "Motorola", "Moto g 37 Power 4GB 64GB PANTONE Capri");
no("iPhone 16", "Apple", "Apple iPhone 16 e (128 GB) - White");
yes("Samsung Galaxy Z Fold 7", "Samsung", "Samsung Galaxy Z Fold7 5G (Blue Shadow, 12GB RAM, 256GB)");
yes("Samsung Galaxy Z Fold7", "Samsung", "Samsung Galaxy Z Fold 7 5G (Blue Shadow, 12GB RAM, 256GB)");
no("Samsung Galaxy Z Fold7", "Samsung", "Samsung Galaxy Z Flip7 5G (Blue Shadow, 12GB RAM, 256GB)");
no("Samsung Galaxy Z Fold 7", "Samsung", "Samsung Galaxy Z Fold7 FE 5G (Black, 12GB RAM, 256GB)");

// pickBestHit: lowest price among matches, in-stock first, store order on ties
{
  const hits = [
    hit("Samsung Galaxy S26 Ultra 5G (12GB RAM, 256GB)", 139999),
    hit("Samsung Galaxy S26 5G (12GB RAM, 512GB, Black)", 109999),
    hit("Samsung Galaxy S26+ 5G (12GB RAM, 256GB)", 99999),
    hit("Samsung Galaxy S26 5G (12GB RAM, 256GB, Black)", 89999),
    hit("Samsung Galaxy S26 5G (12GB RAM, 256GB, White)", 89999),
    hit("Silicone Case for Samsung Galaxy S26", 499),
  ];
  assert.strictEqual(pickBestHit("Samsung Galaxy S26", "Samsung", hits)?.title, hits[3].title);
  assert.strictEqual(pickBestHit("Galaxy S26 Ultra", "Samsung", hits)?.title, hits[0].title);
  assert.strictEqual(pickBestHit("Galaxy S26+", "Samsung", hits)?.title, hits[2].title);
  assert.strictEqual(pickBestHit("Galaxy S26 Edge", "Samsung", hits), null);
}
{
  const hits = [
    hit("Vivo Y58 5G ( Sundarbans Green, 8GB-128GB )", 16499, { inStock: false }),
    hit("Vivo Y58 5G ( Himalayan Blue, 8GB-128GB )", 17499, { inStock: true }),
  ];
  assert.strictEqual(pickBestHit("Vivo Y58", "Vivo", hits)?.price, 17499, "in-stock preferred");
  const oos = hits.map((h) => ({ ...h, inStock: false }));
  assert.strictEqual(pickBestHit("Vivo Y58", "Vivo", oos)?.price, 16499, "all out of stock → still pick cheapest");
}
{
  const hits = [hit("vivo Y58 5G (Black, 8GB, 128GB)"), hit("vivo Y58 5G (Green, 8GB, 128GB)")];
  assert.strictEqual(pickBestHit("Vivo Y58", "Vivo", hits), hits[0], "no prices → first match");
  const mixed = [hit("vivo Y58 5G (Black, 8GB, 128GB)"), hit("vivo Y58 5G (Green, 8GB, 128GB)", 17499)];
  assert.strictEqual(pickBestHit("Vivo Y58", "Vivo", mixed), mixed[1], "priced match beats unpriced");
}
{
  // An accessory that dodges the word filters is dropped by the price guard.
  const hits = [hit("Vivo Y58 5G (Black) Back Case", 299), hit("vivo Y58 5G (Himalayan Blue, 128 GB)", 17491)];
  assert.strictEqual(pickBestHit("Vivo Y58", "Vivo", hits), hits[1]);
}

console.log("match.test: all assertions passed");

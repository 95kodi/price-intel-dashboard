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

// Junk seen live in the full scan: accessories named late in the title,
// other products sharing the name, unbranded lookalikes, deep stray numbers.
no("Moto E13", "Motorola", "Silicone Motorola Moto E13, [Bumper] Exclusive - Transparent Back Cover Clear Thin");
no("Samsung Galaxy M54 5G", "Samsung", "CEDO Samsung Galaxy M54 / F54 (5G) Bumper Case | Soft Jel Flexible Thin");
no("Realme P3x 5G", "Realme", "REALME P3X 5G - REALME - CASETiFY 2025 - SILICON");
no("iPhone 7", "Apple", "iPhone 7 - APPLE - GLITTER - BACK CASE - LIQUID CASE");
no("Realme C25Y", "Realme", "Realme C25Y Back Panel Replacement, Rear Housing Cover with Camera & Fingerprint Cutouts");
no("Samsung Galaxy Z Flip 6", "Samsung", "Samsung Galaxy Z Flip6 Anti-Reflection Film");
no("OnePlus Nord 3", "Oneplus", "Oneplus Nord Buds 3 True Wireless ( Chromatic Blue )");
no("Redmi 6", "Redmi", "Redmi Buds 6 True Wireless ( Spectre Black )");
no("Redmi 5", "Redmi", "Redmi Watch 5 Active Smartwatch, Black");
no("iQOO Neo 7", "IQOO", "Bajaj DX 7 Neo 1000W Dry Iron");
no("Nokia 1", "Nokia", "Nokia 6310 Dual SIM Keypad Phone with a 2.8? Screen, Wireless FM Radio and Rear Camera with Flash | 1 Year Replacement");
no("Poco X4 GT", "Poco", "Das Praxisbuch Xiaomi Poco X4 GT - Anleitung für Einsteiger (German Edition)");
// …while real phones with risky words or no brand word still match.
yes("Tecno Spark 10", "Tecno", "Tecno Spark 10 (Magic Skin Orange, 128 GB)");
yes("Nothing Phone 3a", "Nothing", "Nothing Phone (3a) 5G (Black, 8GB RAM, 128GB Storage)");
yes("iQOO Neo 7", "IQOO", "iQOO Neo 7 5G (Frost Blue, 8GB RAM, 128GB Storage)");
yes("Pixel 10", "Google", "Pixel 10 5G (Obsidian, 12GB RAM, 256GB)");
yes("Moto G85", "Motorola", "Moto G85 5G (Olive Green, 8GB RAM, 128GB Storage)");
yes("Redmi Go", "Redmi", "REDMI Go (Blue, 8 GB)");
yes("Xiaomi 15", "Xiaomi", "Xiaomi15 (Black, 512 GB)");
yes("Oppo Reno 10 Pro 5G", "Oppo", "Reno10 Pro 5G Smartphone (Silvery Grey, 12GB RAM, 256GB Storage)");
// Cross-brand and other-category matches the old matcher accepted.
no("OnePlus 15R", "Oneplus", "iQOO 15R (Triumph Silver 2026, 8GB RAM, 256GB Storage)");
no("Oppo A36", "Oppo", "Samsung Galaxy A36 5G (Dark Blue, 8GB RAM, 128GB Storage)");
no("Pixel 4", "Google", "Google Pixel Watch 4 41 mm Smart Watch with Matte Black Active Band");
no("OnePlus 3", "Oneplus", "OnePlus Pad 3 33.52 cm (13.2 inch) 12 GB RAM, 256 GB, Frosted Silver, Wi-Fi Tablet");
no("Micromax In 1", "Micromax", "LG 1.42 Ton 3 Star AI Convertible 6 in 1 Inverter Split AC");
no("Tecno Pova 2", "Tecno", "Tecno Pova Curve 2 5G (Melting Silver, 8GB RAM, 256GB Storage)");
yes("Lava Blaze Curve 5G", "Lava", "LAVA Blaze Curve 5G (Glass Iron, 256 GB)");
{
  // A case that passes every word filter still loses to the price floor.
  const hits = [hit("Vivo Y58 5G (Himalayan Blue)", 299)];
  assert.strictEqual(pickBestHit("Vivo Y58", "Vivo", hits), null, "₹299 is not a phone");
}
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

// Phone sold with its charger: the charger note isn't an accessory, "5G+" isn't a Plus model
yes("Infinix Note 50x", "Infinix", "Infinix Note 50x 5G+ 45W Charger In the Box & AI (Sea Breeze Green, 128 GB)");
yes("Oppo K14x 5G", "Oppo", "OPPO K14x 5G 6500mAh and 45W SUPERVOOC Charger & AI (Prism Violet, 128 GB)");
no("Infinix Note 50x", "Infinix", "45W Charger for Infinix Note 50x 5G (Type C, White)");
no("Infinix Note 50x", "Infinix", "Infinix Note 50x Pro 5G+ 45W Charger In the Box (Grey, 128 GB)");
no("Redmi Note 14 Pro 5G", "Redmi", "Redmi Note 14 Pro+ 5G (Spectre Blue, 256 GB)");

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

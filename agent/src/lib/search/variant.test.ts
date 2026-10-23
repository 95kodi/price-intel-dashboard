import assert from "assert";
import { parseVariant, variantKey } from "./variant";

// Real titles from each store, as seen in the scans.
const cases: [string, string, string, string | null, string | null, string | null][] = [
  // [title, model, brand, ram, storage, color]
  ["POCO X8 Pro Max (White, 256 GB)", "Poco X8 Pro Max", "Poco", null, "256GB", "White"],
  ["OnePlus Nord CE5 5G (Black Infinity, 128 GB)", "OnePlus Nord CE 5", "Oneplus", null, "128GB", "Black Infinity"],
  ["Apple iPhone Air (256 GB) - Space Black", "iPhone Air", "Apple", null, "256GB", "Space Black"],
  ["OPPO A6 5G (Ice White, 4GB RAM,128GB Storage) with No Cost EMI/Additional Exchange Offers", "Oppo A6 5G", "Oppo", "4GB", "128GB", "Ice White"],
  ["Motorola G86 Power (Cosmic Sky, 8GB RAM + 128GB Storage) | 6.7\" 1.5K pOLED Display | 50MP Sony OIS Camera", "Motorola G86 Power 5G", "Motorola", "8GB", "128GB", "Cosmic Sky"],
  ["vivo T4 Lite 5G 4GB RAM, 64 GB Storage, Titanium Gold | 6.74'' HD+ 90Hz LCD | Dimensity 6300", "Vivo T4 Lite", "Vivo", "4GB", "64GB", "Titanium Gold"],
  ["CMF BY NOTHING Phone 2 Pro 5G (Black 128 GB 8 GB RAM)", "CMF by Nothing Phone 2 Pro", "Nothing", "8GB", "128GB", "Black"],
  ["vivo T4x 5G (Blue, 256 GB) (8 GB RAM)", "Vivo T4x 5G", "Vivo", "8GB", "256GB", "Blue"],
  ["Redmi Note 14 Pro 5G Titan Black 8GB RAM 128GB ROM(Without Offer)", "Redmi Note 14 Pro 5G", "Redmi", "8GB", "128GB", "Titan Black"],
  ["OnePlus 15R | 12GB+256GB | Charcoal Black | World's First Snapdragon® 8 Gen 5 | 7400mAh Battery", "OnePlus 15R", "Oneplus", "12GB", "256GB", "Charcoal Black"],
  ["Vivo Y400 5G 8GB 128GB Glam White", "Vivo Y400 5G", "Vivo", "8GB", "128GB", "Glam White"],
  ["Samsung Galaxy Z Fold 6 5G 12GB 256GB Light Pink", "Samsung Galaxy Z Fold 6", "Samsung", "12GB", "256GB", "Light Pink"],
  ["Oppo Reno 10 Pro Plus 5G ( Silvery Grey, 12GB-256GB )", "Oppo Reno 10 Pro+ 5G", "Oppo", "12GB", "256GB", "Silvery Grey"],
  ["Apple iPhone 16 Pro Max ( White Titanium,256GB )", "iPhone 16 Pro Max", "Apple", null, "256GB", "White Titanium"],
  ["APPLE IPHONE 16 PLUS (WHITE, 128GB)", "iPhone 16 Plus", "Apple", null, "128GB", "White"],
  ["C55 - REALME - 6GB RAM - 64GB - SUNSHOWER", "Realme C55", "Realme", "6GB", "64GB", "Sunshower"],
  ["SAMSUNG Galaxy S26 Ultra 5G (12GB RAM, 256GB, Cobalt Violet)", "Samsung Galaxy S26 Ultra", "Samsung", "12GB", "256GB", "Cobalt Violet"],
  ["Samsung Galaxy Z Fold7 5G 256 GB, 12 GB RAM, Blue Shadow, Mobile Phone", "Samsung Galaxy Z Fold 7", "Samsung", "12GB", "256GB", "Blue Shadow"],
  ["Apple iPhone 16 Plus 128 GB, Black", "iPhone 16 Plus", "Apple", null, "128GB", "Black"],
  ["Google Pixel 9A, 256 GB, 8 GB RAM, Obsidian, Mobile (PIX9A256OBSI)", "Pixel 9a", "Google", "8GB", "256GB", "Obsidian"],
  ["Apple iPhone 17e (512GB Storage, White, IP17E512WHTMHU04)", "iPhone 17e", "Apple", null, "512GB", "White"],
  ["Apple iPhone 15 Pro (Natural Titanium, 1 TB)", "iPhone 15 Pro", "Apple", null, "1TB", "Natural Titanium"],
  ["Samsung Galaxy S26 Ultra 5G AI Smartphone (Silver Shadow, 12GB, 256GB)", "Samsung Galaxy S26 Ultra", "Samsung", "12GB", "256GB", "Silver Shadow"],
  ["POCO M6 Pro 5G (Power Black, 6GB RAM, 128GB Storage) | Snapdragon 4 Gen 2", "Poco M6 Pro 5G", "Poco", "6GB", "128GB", "Power Black"],
  ["OPPO A77 (Sunset Orange, 4GB RAM, 128 Storage) with No Cost EMI/Additional Exchange Offers", "Oppo A77", "Oppo", "4GB", "128GB", "Sunset Orange"],
  ["Motorola Edge 40 (Eclipse Black, 8+256)", "Motorola Edge 40", "Motorola", "8GB", "256GB", "Eclipse Black"],
  ["OPPO Reno11 Smartphone 8+256 Green", "Oppo Reno 11", "Oppo", "8GB", "256GB", "Green"],
  ["XIAOMI REDMI NOTE 14 PRO 5G (CHAMPAGNE GOLD, 8GB, 128GB)", "Redmi Note 14 Pro 5G", "Redmi", "8GB", "128GB", "Champagne Gold"],
  // Amazon's Apple titles: specs first, colour after the last ";".
  ["Apple iPhone 17 Pro 1 TB: 15.93 cm (6.3″) Display with Promotion up to 120Hz, A19 Pro Chip, Breakthrough Battery Life, Pro Fusion Camera System with Center Stage Front Camera; Cosmic Orange", "iPhone 17 Pro", "Apple", null, "1TB", "Cosmic Orange"],
  ["Apple iPhone 16 128 GB: 5G Mobile Phone with Camera Control, A18 Chip and a Big Boost in Battery Life. Works with AirPods; Black", "iPhone 16", "Apple", null, "128GB", "Black"],
  ["Apple iPhone Air 256 GB: Thinnest iPhone Ever, 16.63 cm (6.5″) Display with Promotion up to 120Hz, Powerful A19 Pro Chip, Center Stage Front Camera, All-Day Battery Life; Space Black", "iPhone Air", "Apple", null, "256GB", "Space Black"],
  // Sangeetha sells the iPhone 17 range bundled with damage protection.
  ["Apple iPhone 17 Pro 1TB Cosmic Orange with damage protection", "iPhone 17 Pro", "Apple", null, "1TB", "Cosmic Orange"],
  ["Apple iPhone 17 Pro 512GB, Silver (IP17PRO512SILMG8K4)", "iPhone 17 Pro", "Apple", null, "512GB", "Silver"],
  ["Apple iPhone 17 Pro 1 TB, Cosmic Orange", "iPhone 17 Pro", "Apple", null, "1TB", "Cosmic Orange"],
  // "with" in a marketing segment isn't a bundle note, so that segment isn't read as a colour.
  // (Sizes only count in the first three " | " segments.)
  ["OnePlus 13s | Snapdragon® 8 Elite | Smarter with OnePlus AI | Lifetime Display Warranty | 12GB+256GB | Green Silk", "OnePlus 13s", "Oneplus", null, null, "Green Silk"],
  // No colour in the title → no variant (storage alone can't tell colours apart).
  ["SAMSUNG Galaxy S26 Ultra 5G 12GB RAM, 256GB (S26ULTRA5G12256GB)", "Samsung Galaxy S26 Ultra", "Samsung", "12GB", "256GB", null],
  ["Motorola Edge 60 Fusion 5G Smartphone (256GB Storage, 12GB RAM, MOTOEDGE60FUS5G12256)", "Motorola Edge 60 Fusion 5G", "Motorola", "12GB", "256GB", null],
];

for (const [title, model, brand, ram, storage, color] of cases) {
  const v = parseVariant(title, model, brand);
  assert.deepStrictEqual(v, { ram, storage, color }, title);
}

// Stores name colours in different word orders; the key treats them as one.
assert.strictEqual(
  variantKey({ ram: null, storage: "256GB", color: "Titanium Blue" }),
  variantKey({ ram: "8GB", storage: "256GB", color: "Blue Titanium" })
);
assert.strictEqual(variantKey({ ram: "8GB", storage: "256GB", color: null }), null);

console.log(`variant.test: ${cases.length} titles parsed correctly`);

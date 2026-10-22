// Assembles hostinger/public_html: the static dashboard (out/) at the root and
// the PHP API (backend-php/) under api/. Upload the folder's contents to
// Hostinger's public_html. Run via `npm run build:hostinger`.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const target = join(root, "hostinger", "public_html");

if (!existsSync(join(root, "out", "index.html"))) {
  console.error("out/ is missing — run `next build` first.");
  process.exit(1);
}

rmSync(join(root, "hostinger"), { recursive: true, force: true });
cpSync(join(root, "out"), target, { recursive: true });
cpSync(join(root, "backend-php"), join(target, "api"), {
  recursive: true,
  // config.php holds the DB password; it's created on the server, never uploaded from here.
  filter: (src) => !src.endsWith(join("backend-php", "config.php")),
});

console.log(`Ready: ${target}`);
console.log("Upload its contents to public_html, then create price-intel-config.php (from api/config.sample.php) in the folder above public_html.");

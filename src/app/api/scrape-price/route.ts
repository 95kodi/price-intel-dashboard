import { NextRequest, NextResponse } from "next/server";
import { fetchProductPage, hasGateway, BlockedError } from "@/lib/http";
import { getParser } from "@/lib/scrapers";
import { savePrice } from "@/lib/savePrice";

// Browser launches on serverless can take well over the 10s default.
export const maxDuration = 60;

const REQUIRED_FIELDS = ["url", "platform", "productPlatformId"] as const;
const BROWSER_FETCH_PLATFORMS = new Set(["croma"]);

export async function POST(request: NextRequest) {
  console.log("=== /api/scrape-price ===");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  console.log("Incoming Request:", body);

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !body[field] && body[field] !== 0
  );

  if (missingFields.length > 0) {
    console.error("Validation failed. Missing fields:", missingFields);
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        received: body,
        missingFields,
      },
      { status: 422 }
    );
  }

  const { url, platform, productPlatformId } = body as {
    url: string;
    platform: string;
    productPlatformId: number;
  };

  console.log("Validated Payload:", { url, platform, productPlatformId });
  console.log(`[${platform}] Fetching HTML...`);

  try {
    const needsBrowser = BROWSER_FETCH_PLATFORMS.has(platform.toLowerCase());
    if (needsBrowser) console.log(`[${platform}] Using browser fetch...`);
    const html = await fetchProductPage(url, needsBrowser);

    console.log(`[${platform}] HTTP 200`);
    console.log(`[${platform}] HTML Length: ${html.length}`);

    // const parser = getParser(platform);
    // if (!parser) {
    //   const reason = `Unknown platform: ${platform}`;
    //   return NextResponse.json(
    //     { success: false, platform, error: reason, reason },
    //     { status: 422 }
    //   );
    // }

    // console.log(`[${platform}] Running parser...`);
    // const result = parser.parse(html);

    // if (result.price === null || result.price <= 0) {
    //   const reason = "Price not found";
    //   console.log(`[${platform}] Price not found in HTML`);
    //   return NextResponse.json(
    //     { success: false, platform, error: reason, reason },
    //     { status: 422 }
    //   );
    // }
    const parser = getParser(platform);

console.log("================================");
console.log("Platform:", platform);
console.log("Parser Found:", !!parser);

if (!parser) {
  const reason = `Unknown platform: ${platform}`;
  console.error(reason);

  return NextResponse.json(
    { success: false, platform, error: reason, reason },
    { status: 422 }
  );
}

console.log(`[${platform}] Running parser...`);

const result = parser.parse(html);

console.log("Parser Result:");
console.log(result);

if (result.price === null || result.price <= 0) {
  const reason = "Price not found";

  console.error("Price extraction failed.");
  console.log("Returned Result:", result);
  // Surface what actually came back so bot-challenge pages are identifiable in logs.
  const pageTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "(no title)";
  console.log(`[${platform}] Page title: ${pageTitle}`);
  console.log(`[${platform}] HTML snippet: ${html.replace(/\s+/g, " ").slice(0, 600)}`);

  return NextResponse.json(
    { success: false, platform, error: reason, reason, pageTitle },
    { status: 422 }
  );
}

    console.log(`[${platform}] Price: ${result.price}`);
    if (result.mrp) console.log(`[${platform}] MRP: ${result.mrp}`);

    console.log(`[${platform}] Saving...`);

    const saved = await savePrice(
      productPlatformId,
      result.price,
      result.mrp,
      result.discount
    );

    if (!saved) {
      const reason = "Failed to save price";
      console.error(`[${platform}] Failed to save price`);
      return NextResponse.json(
        { success: false, platform, error: reason, reason },
        { status: 500 }
      );
    }

    console.log(`[${platform}] Done.`);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof BlockedError) {
      const hint = hasGateway()
        ? "The configured scraping gateway was also blocked."
        : "This host's IP is refused by the site. Set SCRAPER_GATEWAY_URL (scraping API) or SCRAPER_PROXY_URL in the environment.";
      const message = `${err.message}. ${hint}`;
      console.error(`[${platform}] ${message}`);
      return NextResponse.json(
        { success: false, platform, error: message, reason: message },
        { status: 422 }
      );
    }
    const message = err instanceof Error ? err.message : "Scraping failed";
    console.error(`[${platform}] ${message}`);
    return NextResponse.json(
      { success: false, platform, error: message, reason: message },
      { status: 500 }
    );
  }
}

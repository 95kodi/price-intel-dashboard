import type { ParsedPrice } from "../parser";
import * as poorvika from "./poorvika";
import * as croma from "./croma";
import * as flipkart from "./flipkart";
import * as amazon from "./amazon";
import * as sangeetha from "./sangeetha";
import * as reliance from "./reliance";
import * as vijaysales from "./vijaysales";
import * as chennaimobiles from "./chennaimobiles";

interface ScraperModule {
  parse(html: string): ParsedPrice;
}

const scrapers: Record<string, ScraperModule> = {
  poorvika,
  croma,
  flipkart,
  amazon,
  sangeetha,
  reliance,
  vijaysales,
  chennaimobiles,
};

export function getParser(platform: string): ScraperModule | null {
  const key = platform.toLowerCase().trim();

  switch (key) {
    case "poorvika":
      return poorvika;

    case "croma":
      return croma;

    case "flipkart":
      return flipkart;

    case "amazon":
      return amazon;

    case "sangeetha mobiles":
    case "sangeetha":
      return sangeetha;

    case "reliance":
    case "reliance digital":
      return reliance;

    case "vijay sales":
    case "vijayasales":
      return vijaysales;

    case "the chennai mobiles":
    case "chennai mobiles":
      return chennaimobiles;

    default:
      return null;
  }
}
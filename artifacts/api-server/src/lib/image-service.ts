import { logger } from "./logger";

const IMAGE_FETCH_TIMEOUT_MS = 5000;

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

const UNSPLASH_CATEGORY_KEYWORDS: Record<string, string> = {
  Skincare: "skincare,serum,moisturizer,beauty",
  Makeup: "makeup,cosmetics,lipstick,foundation",
  Haircare: "haircare,shampoo,hair,beauty",
  Bodycare: "bodycare,lotion,body,skin",
  Fragrance: "perfume,fragrance,bottle,luxury",
};

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^localhost$/i,
  /^0\./,
  /^169\.254\./,
];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (PRIVATE_IP_PATTERNS.some((p) => p.test(host))) {
      logger.warn({ host }, "Blocked SSRF attempt to private/local host");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function buildUnsplashFallback(category: string, seed: string): string {
  const keywords = UNSPLASH_CATEGORY_KEYWORDS[category] ?? "beauty,cosmetics";
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `https://source.unsplash.com/400x400/?${keywords}&sig=${hash}`;
}

async function isValidImageUrl(url: string): Promise<boolean> {
  if (!isSafeUrl(url)) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "DupliaBot/1.0" },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") ?? "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}

async function searchGoogleCustomImage(
  brand: string,
  name: string,
  category: string
): Promise<string | null> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;

  try {
    const searchQuery = encodeURIComponent(`${brand} ${name} ${category} product`);
    const url =
      `https://www.googleapis.com/customsearch/v1` +
      `?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${searchQuery}&searchType=image` +
      `&imgType=photo&imgSize=medium&num=1&safe=active`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn({ status: response.status }, "Google Custom Search API returned error");
      return null;
    }

    const data = (await response.json()) as { items?: Array<{ link?: string }> };
    const imageUrl = data.items?.[0]?.link;

    if (imageUrl && isSafeUrl(imageUrl)) {
      logger.info({ imageUrl, brand, name }, "Got image from Google Custom Search");
      return imageUrl;
    }
  } catch (err) {
    logger.warn({ err }, "Google Custom Search image lookup failed");
  }

  return null;
}

export async function resolveProductImageUrl(
  suggestedUrl: string,
  brand: string,
  name: string,
  category: string
): Promise<string> {
  if (suggestedUrl && isSafeUrl(suggestedUrl)) {
    const valid = await isValidImageUrl(suggestedUrl);
    if (valid) {
      logger.debug({ url: suggestedUrl, brand, name }, "Using AI-provided image URL");
      return suggestedUrl;
    }
    logger.debug({ url: suggestedUrl }, "AI-provided URL failed validation");
  }

  const googleImage = await searchGoogleCustomImage(brand, name, category);
  if (googleImage) return googleImage;

  const fallback = buildUnsplashFallback(category, `${brand}-${name}`);
  logger.debug({ fallback, brand, name }, "Using Unsplash fallback image");
  return fallback;
}

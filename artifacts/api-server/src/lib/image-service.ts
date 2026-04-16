import { logger } from "./logger";

const IMAGE_FETCH_TIMEOUT_MS = 5000;

const UNSPLASH_CATEGORY_KEYWORDS: Record<string, string> = {
  Skincare: "skincare,serum,moisturizer,beauty",
  Makeup: "makeup,cosmetics,lipstick,foundation",
  Haircare: "haircare,shampoo,hair,beauty",
  Bodycare: "bodycare,lotion,body,skin",
  Fragrance: "perfume,fragrance,bottle,luxury",
};

function buildUnsplashFallback(category: string, seed: string): string {
  const keywords = UNSPLASH_CATEGORY_KEYWORDS[category] ?? "beauty,cosmetics";
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `https://source.unsplash.com/400x400/?${keywords}&sig=${hash}`;
}

async function isValidImageUrl(url: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "DupliaBot/1.0" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") ?? "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}

export async function resolveProductImageUrl(
  suggestedUrl: string,
  brand: string,
  name: string,
  category: string
): Promise<string> {
  if (suggestedUrl) {
    const valid = await isValidImageUrl(suggestedUrl);
    if (valid) {
      logger.debug({ url: suggestedUrl, brand, name }, "Using AI-provided image URL");
      return suggestedUrl;
    }
    logger.debug({ url: suggestedUrl, brand, name }, "AI-provided image URL invalid, using fallback");
  }

  const fallback = buildUnsplashFallback(category, `${brand}-${name}`);
  logger.debug({ fallback, brand, name }, "Using Unsplash fallback image");
  return fallback;
}

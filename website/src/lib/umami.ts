// The Umami analytics tag, from platform-config keys read at request time (never import.meta.env: Astro inlines
// those at build time, and one build is promoted to every environment).

export interface UmamiTag {
  src: string;
  websiteId: string;
}

/**
 * The tag for `PUBLIC_UMAMI_WEBSITE_ID` and `PUBLIC_UMAMI_SCRIPT_URL`, or null when either is missing or invalid
 * (dev and staging get neither key). The script URL must be https.
 */
export function umamiTag(read: (key: string) => string | undefined): UmamiTag | null {
  const websiteId = read("PUBLIC_UMAMI_WEBSITE_ID")?.trim();
  const rawSrc = read("PUBLIC_UMAMI_SCRIPT_URL")?.trim();
  if (!websiteId || !rawSrc || !/^[\w-]+$/.test(websiteId)) return null;
  try {
    const url = new URL(rawSrc);
    if (url.protocol !== "https:") return null;
    return { src: url.toString(), websiteId };
  } catch {
    return null;
  }
}

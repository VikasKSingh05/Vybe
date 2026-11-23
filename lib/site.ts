/**
 * Canonical public origin of the deployed app. Used for metadataBase, Open
 * Graph URLs, robots.txt and sitemap.xml. Falls back to the production domain
 * when NEXT_PUBLIC_APP_URL is unset; trailing slashes are trimmed.
 */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://vybe.app"
).replace(/\/+$/, "");

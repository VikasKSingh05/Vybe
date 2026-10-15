import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/party`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}

import type { PlatformAdapter, Platform } from "@/types";
import { WhatsAppAdapter } from "./whatsapp";
import { GmailAdapter } from "./gmail";

const adapters: PlatformAdapter[] = [
  new WhatsAppAdapter(),
  new GmailAdapter(),
];

/** Get the adapter that can handle the current page URL */
export function getAdapterForUrl(url: string): PlatformAdapter | null {
  return adapters.find((a) => a.canHandle(url)) ?? null;
}

/** Get an adapter by platform name */
export function getAdapterByPlatform(
  platform: Platform
): PlatformAdapter | null {
  return adapters.find((a) => a.platform === platform) ?? null;
}

/** Get all registered platform names */
export function getRegisteredPlatforms(): Platform[] {
  return adapters.map((a) => a.platform);
}

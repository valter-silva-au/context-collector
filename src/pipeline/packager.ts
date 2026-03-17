import JSZip from "jszip";
import type {
  NormalizedChat,
  NormalizedMessage,
  Platform,
  ExtractionManifest,
  DateRange,
} from "@/types";
import {
  deduplicateMessages,
  sortMessages,
  groupByChat,
} from "./normalizer";
import { renderChat, renderEmailThread } from "./renderer";

interface PlatformData {
  chats: NormalizedChat[];
  messages: NormalizedMessage[];
}

/** Sanitize a string for use as a filename */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

/** Get the subfolder for a chat type within a platform */
function chatTypeFolder(platform: Platform, type: string): string {
  if (platform === "gmail") {
    return type === "thread" ? "threads" : "emails";
  }
  if (platform === "telegram") {
    const folders: Record<string, string> = {
      individual: "chats",
      group: "groups",
      channel: "channels",
    };
    return folders[type] ?? "chats";
  }
  // whatsapp, linkedin
  return type === "individual" || type === "group" ? "chats" : "messages";
}

/** Package extraction results into a downloadable ZIP */
export async function packageToZip(
  platformData: Map<Platform, PlatformData>,
  options: { mode: "full" | "incremental"; dateRange: DateRange }
): Promise<Blob> {
  const zip = new JSZip();
  const manifestPlatforms: ExtractionManifest["platforms"] = [];
  const excludedChats: string[] = [];

  for (const [platform, data] of platformData) {
    const allMessages = sortMessages(deduplicateMessages(data.messages));
    const byChat = groupByChat(allMessages);
    let platformMsgCount = 0;
    let earliest = "";
    let latest = "";

    for (const chat of data.chats) {
      const chatMessages = byChat.get(chat.id) ?? [];
      if (chatMessages.length === 0) continue;

      platformMsgCount += chatMessages.length;

      const firstTs = chatMessages[0].timestamp;
      const lastTs = chatMessages[chatMessages.length - 1].timestamp;
      if (!earliest || firstTs < earliest) earliest = firstTs;
      if (!latest || lastTs > latest) latest = lastTs;

      const folder = chatTypeFolder(platform, chat.type);
      const filename = sanitizeFilename(chat.name);
      const filepath = `${platform}/${folder}/${filename}.md`;

      const markdown =
        platform === "gmail"
          ? renderEmailThread(chat, chatMessages)
          : renderChat(chat, chatMessages);

      zip.file(filepath, markdown);
    }

    if (platformMsgCount > 0) {
      manifestPlatforms.push({
        name: platform,
        chats_extracted: data.chats.length,
        messages_extracted: platformMsgCount,
        date_range: {
          start: earliest,
          end: latest,
        },
      });
    }
  }

  // Add manifest
  const manifest: ExtractionManifest = {
    version: "1.0",
    extraction_date: new Date().toISOString(),
    platforms: manifestPlatforms,
    options: {
      mode: options.mode,
      date_filter: options.dateRange,
      excluded_chats: excludedChats,
    },
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: "blob" });
}

/** Trigger a browser download of the ZIP blob */
export function downloadBlob(blob: Blob): void {
  const date = new Date().toISOString().split("T")[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `context-collector-${date}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

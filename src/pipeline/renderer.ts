import type { NormalizedChat, NormalizedMessage, Platform } from "@/types";

/** Group messages by date (YYYY-MM-DD) */
function groupByDate(
  messages: NormalizedMessage[]
): Map<string, NormalizedMessage[]> {
  const groups = new Map<string, NormalizedMessage[]>();
  for (const msg of messages) {
    const date = new Date(msg.timestamp).toISOString().split("T")[0];
    const existing = groups.get(date) ?? [];
    existing.push(msg);
    groups.set(date, existing);
  }
  return groups;
}

/** Format a timestamp as readable time */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a date as readable date */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Get platform display name */
function platformLabel(p: Platform): string {
  const labels: Record<Platform, string> = {
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    gmail: "Gmail",
    linkedin: "LinkedIn",
  };
  return labels[p];
}

/** Render a chat/conversation to Markdown */
export function renderChat(
  chat: NormalizedChat,
  messages: NormalizedMessage[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Chat: ${chat.name}`);
  lines.push("");
  lines.push(`**Platform:** ${platformLabel(chat.platform)}`);
  lines.push(`**Type:** ${capitalize(chat.type)}`);
  lines.push(`**Extracted:** ${new Date().toISOString()}`);
  lines.push(`**Messages:** ${messages.length}`);

  if (messages.length > 0) {
    const first = messages[0].timestamp;
    const last = messages[messages.length - 1].timestamp;
    lines.push(
      `**Date Range:** ${formatDate(first)} to ${formatDate(last)}`
    );
  }

  if (chat.participants.length > 0) {
    const names = chat.participants.map((p) => p.name).join(", ");
    lines.push(`**Participants:** ${names}`);
  }

  lines.push("");
  lines.push("---");

  // Messages grouped by date
  const byDate = groupByDate(messages);

  for (const [date, msgs] of byDate) {
    lines.push("");
    lines.push(`## ${formatDate(date)}`);
    lines.push("");

    for (const msg of msgs) {
      lines.push(`**${msg.sender.name}** - ${formatTime(msg.timestamp)}`);
      lines.push(msg.content.text);

      if (msg.media?.length) {
        for (const m of msg.media) {
          const caption = m.caption ? ` - Caption: ${m.caption}` : "";
          lines.push(`\n[Media: ${m.type}]${caption}`);
        }
      }

      lines.push("");
    }

    lines.push("---");
  }

  return lines.join("\n");
}

/** Render Gmail email thread to Markdown */
export function renderEmailThread(
  chat: NormalizedChat,
  messages: NormalizedMessage[]
): string {
  const lines: string[] = [];

  lines.push(`# Email Thread: ${chat.name}`);
  lines.push("");
  lines.push(`**Platform:** Gmail`);
  lines.push(`**Extracted:** ${new Date().toISOString()}`);

  const emails = chat.participants.map((p) => p.email ?? p.name).join(", ");
  lines.push(`**Participants:** ${emails}`);
  lines.push(`**Messages:** ${messages.length}`);
  lines.push("");
  lines.push("---");

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    lines.push("");
    lines.push(`## Message ${i + 1}`);
    lines.push("");
    lines.push(
      `**From:** ${msg.sender.email ?? msg.sender.name} (${msg.sender.name})`
    );
    lines.push(`**Date:** ${formatDate(msg.timestamp)} ${formatTime(msg.timestamp)}`);
    lines.push("");
    lines.push(msg.content.text);
    lines.push("");
    lines.push("---");
  }

  return lines.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

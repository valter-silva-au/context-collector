import type { NormalizedMessage, DateRange } from "@/types";

/** Filter messages by date range setting */
export function filterByDateRange(
  messages: NormalizedMessage[],
  dateRange: DateRange
): NormalizedMessage[] {
  if (dateRange === "all_time") return messages;

  const now = new Date();
  const cutoff = new Date(now);

  switch (dateRange) {
    case "last_7_days":
      cutoff.setDate(now.getDate() - 7);
      break;
    case "last_30_days":
      cutoff.setDate(now.getDate() - 30);
      break;
    case "last_90_days":
      cutoff.setDate(now.getDate() - 90);
      break;
  }

  return messages.filter((m) => new Date(m.timestamp) >= cutoff);
}

/** De-duplicate messages by ID */
export function deduplicateMessages(
  messages: NormalizedMessage[]
): NormalizedMessage[] {
  const seen = new Set<string>();
  return messages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/** Sort messages chronologically */
export function sortMessages(
  messages: NormalizedMessage[]
): NormalizedMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/** Group messages by chat ID */
export function groupByChat(
  messages: NormalizedMessage[]
): Map<string, NormalizedMessage[]> {
  const groups = new Map<string, NormalizedMessage[]>();
  for (const msg of messages) {
    const existing = groups.get(msg.chatId) ?? [];
    existing.push(msg);
    groups.set(msg.chatId, existing);
  }
  return groups;
}

import { BaseAdapter } from "./base";
import type {
  NormalizedChat,
  NormalizedMessage,
  ExtractionOptions,
  Participant,
} from "@/types";

/**
 * WhatsApp Web Adapter
 *
 * Extracts individual and group chats from web.whatsapp.com.
 * Uses data-* attributes and ARIA roles which are more stable than class names.
 *
 * Known selectors (as of March 2026, WhatsApp Web):
 * - Chat list sidebar: div[aria-label="Chat list"] or #pane-side
 * - Chat items: div[role="listitem"] inside the sidebar
 * - Chat name: span[data-testid="cell-frame-title"] span[dir="auto"]
 * - Last message preview: span[data-testid="last-msg-status"]
 * - Message container: div[role="application"] or div[data-testid="conversation-panel-messages"]
 * - Message rows: div[data-testid="msg-container"]
 * - Message text: span.selectable-text
 * - Sender (in groups): span[data-testid="msg-meta"] or message metadata
 * - Timestamp: span[data-testid="msg-time"] or div[data-pre-plain-text]
 */

// Selectors grouped for easy maintenance
const S = {
  chatListSidebar: "#pane-side",
  chatItems: '[role="listitem"]',
  chatTitle: 'span[dir="auto"]',
  conversationPanel: '[data-testid="conversation-panel-messages"]',
  messageContainer: '[data-testid="msg-container"]',
  messageText: "span.selectable-text",
  messageTime: '[data-testid="msg-time"]',
  messageSender: '[data-testid="msg-meta"]',
  messageIn: ".message-in",
  messageOut: ".message-out",
  headerTitle: "header span[dir='auto']",
  searchBox: '[data-testid="chat-list-search"]',
  backButton: '[data-testid="back"]',
} as const;

export class WhatsAppAdapter extends BaseAdapter {
  platform = "whatsapp" as const;
  private currentUser = "You";

  canHandle(url: string): boolean {
    return url.includes("web.whatsapp.com");
  }

  async initialize(): Promise<void> {
    // Wait for the chat list sidebar to be loaded
    const sidebar = await this.waitForElement(S.chatListSidebar, 15000);
    if (!sidebar) {
      throw new Error(
        "WhatsApp Web not loaded. Please make sure you are logged in."
      );
    }
  }

  async extractChats(): Promise<NormalizedChat[]> {
    const sidebar = document.querySelector(S.chatListSidebar);
    if (!sidebar) return [];

    const chatItems = sidebar.querySelectorAll(S.chatItems);
    const chats: NormalizedChat[] = [];

    for (const item of chatItems) {
      const titleEl = item.querySelector(S.chatTitle);
      const name = this.getText(titleEl);
      if (!name) continue;

      const id = `whatsapp-${sanitizeId(name)}`;

      chats.push({
        id,
        platform: "whatsapp",
        name,
        type: "individual", // We'll refine this during message extraction
        participants: [{ id: "self", name: this.currentUser }],
        messageCount: 0,
        lastMessage: undefined,
      });
    }

    return chats;
  }

  async extractMessages(
    chatId: string,
    _options?: ExtractionOptions
  ): Promise<NormalizedMessage[]> {
    // Find and click the chat in the sidebar
    const chatName = chatId.replace("whatsapp-", "").replace(/-/g, " ");
    const opened = await this.openChat(chatName);
    if (!opened) return [];

    // Wait for messages to load
    await this.delay(1000);

    // Scroll up to load history (limited for MVP)
    const panel = document.querySelector(S.conversationPanel);
    if (panel) {
      await this.scrollToLoadHistory(panel, 10, 600);
    }

    // Parse visible messages
    const msgElements = document.querySelectorAll(S.messageContainer);
    const messages: NormalizedMessage[] = [];

    for (const el of msgElements) {
      const msg = this.parseMessage(el, chatId, chatName);
      if (msg) messages.push(msg);
    }

    return messages;
  }

  private async openChat(name: string): Promise<boolean> {
    const sidebar = document.querySelector(S.chatListSidebar);
    if (!sidebar) return false;

    const chatItems = sidebar.querySelectorAll(S.chatItems);

    for (const item of chatItems) {
      const titleEl = item.querySelector(S.chatTitle);
      const title = this.getText(titleEl);

      if (title.toLowerCase() === name.toLowerCase()) {
        await this.clickAndWait(item, 800);
        // Wait for conversation panel
        await this.waitForElement(S.conversationPanel, 5000);
        return true;
      }
    }

    return false;
  }

  private parseMessage(
    el: Element,
    chatId: string,
    chatName: string
  ): NormalizedMessage | null {
    // Determine if incoming or outgoing
    const isOutgoing = el.closest(".message-out") !== null;

    // Extract text
    const textEl = el.querySelector(S.messageText);
    const text = this.getText(textEl);
    if (!text) return null;

    // Extract timestamp
    const timeEl = el.querySelector(S.messageTime);
    const timeText = this.getText(timeEl);
    const timestamp = parseWhatsAppTime(timeText);

    // Extract sender for group messages
    const prePlain = el.querySelector("[data-pre-plain-text]");
    let senderName = isOutgoing ? this.currentUser : chatName;

    if (prePlain) {
      const attr = prePlain.getAttribute("data-pre-plain-text") ?? "";
      // Format: "[HH:MM, DD/MM/YYYY] Sender Name: "
      const match = attr.match(/\]\s*(.+?):\s*$/);
      if (match) senderName = match[1];
    }

    const sender: Participant = {
      id: isOutgoing ? "self" : sanitizeId(senderName),
      name: senderName,
    };

    // Extract links
    const links: string[] = [];
    el.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("http")) links.push(href);
    });

    // Detect media
    const media: NormalizedMessage["media"] = [];
    if (el.querySelector("img[src*='blob:']")) {
      media.push({ type: "image" });
    }
    if (el.querySelector("video")) {
      media.push({ type: "video" });
    }
    if (
      el.querySelector('[data-testid="audio-play"]') ||
      el.querySelector("audio")
    ) {
      media.push({ type: "audio" });
    }

    // Generate unique ID from content + time
    const id = `wa-${hashCode(chatId + timestamp + text)}`;

    return {
      id,
      platform: "whatsapp",
      chatId,
      chatName,
      chatType: "individual",
      sender,
      timestamp,
      content: {
        text,
        links,
        mentions: [],
      },
      media: media.length > 0 ? media : undefined,
    };
  }
}

// ── Utilities ──

function sanitizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseWhatsAppTime(timeText: string): string {
  // WhatsApp shows time as "HH:MM" or "HH:MM AM/PM"
  // We combine with today's date for a rough timestamp
  const now = new Date();
  try {
    const parts = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (parts) {
      let hours = parseInt(parts[1], 10);
      const minutes = parseInt(parts[2], 10);
      if (parts[3]?.toUpperCase() === "PM" && hours !== 12) hours += 12;
      if (parts[3]?.toUpperCase() === "AM" && hours === 12) hours = 0;
      now.setHours(hours, minutes, 0, 0);
    }
  } catch {
    // Fall through to default
  }
  return now.toISOString();
}

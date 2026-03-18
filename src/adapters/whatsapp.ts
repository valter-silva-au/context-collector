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
 * Strategy: Use multiple fallback selector chains since WhatsApp Web
 * frequently changes class names. Prefer data-testid, aria-*, and role
 * attributes which are more stable.
 *
 * Debugging: All operations log to console with [CC:WA] prefix.
 * Open DevTools on the WhatsApp Web tab to see extraction progress.
 */

// Multiple selector strategies - try each until one works
const SELECTORS = {
  // Chat list container (sidebar)
  chatList: [
    "#pane-side",
    '[data-testid="chat-list"]',
    '[aria-label*="Chat list"]',
    '[aria-label*="chat list"]',
    'div[role="grid"]',
    "#app .two > div:nth-child(1)",
  ],
  // Individual chat rows in the sidebar
  chatRows: [
    '[role="listitem"]',
    '[data-testid="cell-frame-container"]',
    '[data-testid="list-item"]',
    "#pane-side > div > div > div > div",
  ],
  // Chat name within a row
  chatName: [
    'span[dir="auto"][title]',
    'span[data-testid="cell-frame-title"] span',
    'span[dir="auto"]',
  ],
  // Message container area
  messagePanel: [
    '[data-testid="conversation-panel-messages"]',
    'div[role="application"]',
    "#main .copyable-area",
    "#main",
  ],
  // Individual message bubbles
  messageRows: [
    '[data-testid="msg-container"]',
    'div.message-in, div.message-out',
    '[data-id][class*="message"]',
    'div[data-id]',
  ],
  // Message text content
  messageText: [
    "span.selectable-text span",
    "span.selectable-text",
    '[data-testid="balloon-text"] span',
    ".copyable-text span",
  ],
  // Timestamp
  messageTime: [
    '[data-testid="msg-time"]',
    '[data-testid="msg-meta"] span',
    'span[dir="auto"].copyable-text',
    "div[data-pre-plain-text]",
  ],
} as const;

export class WhatsAppAdapter extends BaseAdapter {
  platform = "whatsapp" as const;
  private currentUser = "You";
  private log = (...args: unknown[]) =>
    console.log("[CC:WA]", ...args);

  canHandle(url: string): boolean {
    return url.includes("web.whatsapp.com");
  }

  async initialize(): Promise<void> {
    this.log("Initializing WhatsApp adapter...");
    const sidebar = await this.findFirst(SELECTORS.chatList, 15000);
    if (!sidebar) {
      throw new Error(
        "WhatsApp Web not loaded. Please make sure you are logged in and the chat list is visible."
      );
    }
    this.log("Chat list found:", sidebar.tagName, sidebar.className.slice(0, 50));
  }

  async extractChats(): Promise<NormalizedChat[]> {
    const chatRows = this.queryAll(SELECTORS.chatRows);
    this.log(`Found ${chatRows.length} chat rows`);

    if (chatRows.length === 0) {
      this.log("No chat rows found. Selectors tried:", SELECTORS.chatRows);
      this.log("Sidebar HTML preview:", document.querySelector("#pane-side")?.innerHTML?.slice(0, 500));
      return [];
    }

    const chats: NormalizedChat[] = [];

    for (const row of chatRows) {
      const nameEl = this.queryFirst(SELECTORS.chatName, row);
      const name = nameEl?.textContent?.trim() || nameEl?.getAttribute("title")?.trim();
      if (!name) continue;

      const id = `whatsapp-${sanitizeId(name)}`;

      chats.push({
        id,
        platform: "whatsapp",
        name,
        type: "individual",
        participants: [{ id: "self", name: this.currentUser }],
        messageCount: 0,
      });
    }

    this.log(`Extracted ${chats.length} chat names:`, chats.map((c) => c.name));
    return chats;
  }

  async extractMessages(
    chatId: string,
    _options?: ExtractionOptions
  ): Promise<NormalizedMessage[]> {
    const chatName = chatId.replace("whatsapp-", "").replace(/-/g, " ");
    this.log(`Opening chat: "${chatName}"`);

    const opened = await this.openChat(chatName);
    if (!opened) {
      this.log(`Failed to open chat: "${chatName}"`);
      return [];
    }

    // Wait for messages to render
    await this.delay(1500);

    // Scroll up to load more history (limited)
    const panel = this.queryFirst(SELECTORS.messagePanel);
    if (panel) {
      this.log("Scrolling to load message history...");
      await this.scrollToLoadHistory(panel, 5, 800);
    } else {
      this.log("No message panel found. Selectors tried:", SELECTORS.messagePanel);
    }

    // Parse visible messages
    const messages = this.parseVisibleMessages(chatId, chatName);
    this.log(`Extracted ${messages.length} messages from "${chatName}"`);

    return messages;
  }

  private async openChat(name: string): Promise<boolean> {
    const chatRows = this.queryAll(SELECTORS.chatRows);
    this.log(`Searching for "${name}" in ${chatRows.length} chat rows`);

    for (const row of chatRows) {
      const nameEl = this.queryFirst(SELECTORS.chatName, row);
      const rowName = nameEl?.textContent?.trim() || nameEl?.getAttribute("title")?.trim() || "";

      if (rowName.toLowerCase() === name.toLowerCase()) {
        this.log(`Found chat row for "${name}", clicking...`);
        await this.clickAndWait(row, 1000);

        // Verify conversation panel appeared
        const panel = await this.findFirst(SELECTORS.messagePanel, 5000);
        if (panel) {
          this.log("Conversation panel loaded");
          return true;
        }
        this.log("Conversation panel did not appear after clicking");
        return false;
      }
    }

    this.log(`Chat "${name}" not found in sidebar`);
    return false;
  }

  private parseVisibleMessages(
    chatId: string,
    chatName: string
  ): NormalizedMessage[] {
    const messageEls = this.queryAll(SELECTORS.messageRows);
    this.log(`Found ${messageEls.length} message elements`);

    if (messageEls.length === 0) {
      this.log("Selectors tried:", SELECTORS.messageRows);
      // Debug: dump what's in the message panel
      const panel = this.queryFirst(SELECTORS.messagePanel);
      if (panel) {
        this.log("Message panel child count:", panel.children.length);
        this.log("First few children:", Array.from(panel.children).slice(0, 3).map(
          (c) => `${c.tagName}.${c.className.slice(0, 40)}`
        ));
      }
      return [];
    }

    const messages: NormalizedMessage[] = [];

    for (const el of messageEls) {
      const msg = this.parseOneMessage(el, chatId, chatName);
      if (msg) messages.push(msg);
    }

    return messages;
  }

  private parseOneMessage(
    el: Element,
    chatId: string,
    chatName: string
  ): NormalizedMessage | null {
    // Determine direction
    const isOutgoing =
      el.classList.contains("message-out") ||
      el.closest(".message-out") !== null ||
      el.querySelector('[data-testid="msg-dblcheck"]') !== null ||
      el.querySelector('[data-testid="msg-check"]') !== null;

    // Extract text - try multiple strategies
    let text = "";
    for (const sel of SELECTORS.messageText) {
      const textEl = el.querySelector(sel);
      if (textEl?.textContent?.trim()) {
        text = textEl.textContent.trim();
        break;
      }
    }

    if (!text) {
      // Last resort: get all text from the message bubble, excluding metadata
      const clone = el.cloneNode(true) as Element;
      // Remove timestamp and metadata elements
      clone.querySelectorAll('[data-testid="msg-time"], [data-testid="msg-meta"]').forEach((e) => e.remove());
      text = clone.textContent?.trim() || "";
    }

    if (!text) return null;

    // Extract timestamp
    let timestamp = new Date().toISOString();
    for (const sel of SELECTORS.messageTime) {
      const timeEl = el.querySelector(sel);
      if (timeEl) {
        // Check data-pre-plain-text attribute (most reliable)
        const prePlain = timeEl.getAttribute("data-pre-plain-text");
        if (prePlain) {
          timestamp = parsePrePlainText(prePlain);
          break;
        }
        const timeText = timeEl.textContent?.trim();
        if (timeText && /\d{1,2}:\d{2}/.test(timeText)) {
          timestamp = parseTimeText(timeText);
          break;
        }
      }
    }

    // Also check parent for data-pre-plain-text
    const prePlainEl = el.querySelector("[data-pre-plain-text]");
    if (prePlainEl) {
      const attr = prePlainEl.getAttribute("data-pre-plain-text") || "";
      if (attr) timestamp = parsePrePlainText(attr);
    }

    // Sender
    let senderName = isOutgoing ? this.currentUser : chatName;
    if (prePlainEl) {
      const attr = prePlainEl.getAttribute("data-pre-plain-text") || "";
      const match = attr.match(/\]\s*(.+?):\s*$/);
      if (match) senderName = match[1];
    }

    const sender: Participant = {
      id: isOutgoing ? "self" : sanitizeId(senderName),
      name: senderName,
    };

    // Links
    const links: string[] = [];
    el.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href?.startsWith("http")) links.push(href);
    });

    // Media detection
    const media: NormalizedMessage["media"] = [];
    if (el.querySelector('img[src*="blob:"], img[src*="base64"]'))
      media.push({ type: "image" });
    if (el.querySelector("video")) media.push({ type: "video" });
    if (el.querySelector("audio, [data-testid*='audio']"))
      media.push({ type: "audio" });

    const id = `wa-${hashCode(chatId + timestamp + text.slice(0, 100))}`;

    return {
      id,
      platform: "whatsapp",
      chatId,
      chatName,
      chatType: "individual",
      sender,
      timestamp,
      content: { text, links, mentions: [] },
      media: media.length > 0 ? media : undefined,
    };
  }

  // ── Selector helpers ──

  /** Try multiple selectors, return first match */
  private queryFirst(
    selectors: readonly string[],
    root: Element | Document = document
  ): Element | null {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  /** Try multiple selectors, return all matches from first working selector */
  private queryAll(
    selectors: readonly string[],
    root: Element | Document = document
  ): Element[] {
    for (const sel of selectors) {
      const els = root.querySelectorAll(sel);
      if (els.length > 0) {
        this.log(`Selector matched: "${sel}" -> ${els.length} elements`);
        return Array.from(els);
      }
    }
    return [];
  }

  /** Wait for first matching selector to appear */
  private async findFirst(
    selectors: readonly string[],
    timeout = 10000
  ): Promise<Element | null> {
    // Check immediately
    const immediate = this.queryFirst(selectors);
    if (immediate) return immediate;

    // Wait with observer
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const el = this.queryFirst(selectors);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(this.queryFirst(selectors));
      }, timeout);
    });
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
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Parse WhatsApp's data-pre-plain-text: "[HH:MM, DD/MM/YYYY] Sender: " */
function parsePrePlainText(attr: string): string {
  const match = attr.match(
    /\[(\d{1,2}:\d{2}(?:\s*[AP]M)?),?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\]/i
  );
  if (match) {
    const [, time, date] = match;
    const parts = date.split("/");
    // Could be DD/MM/YYYY or MM/DD/YYYY depending on locale
    const dateStr = parts.length === 3
      ? `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
      : date;
    try {
      const d = new Date(`${dateStr}T${time.replace(/\s/g, "")}`);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch { /* fall through */ }
  }
  return new Date().toISOString();
}

/** Parse "HH:MM" or "HH:MM AM/PM" into ISO timestamp */
function parseTimeText(timeText: string): string {
  const now = new Date();
  const parts = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (parts) {
    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    if (parts[3]?.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (parts[3]?.toUpperCase() === "AM" && hours === 12) hours = 0;
    now.setHours(hours, minutes, 0, 0);
  }
  return now.toISOString();
}

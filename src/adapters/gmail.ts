import { BaseAdapter } from "./base";
import type {
  NormalizedChat,
  NormalizedMessage,
  ExtractionOptions,
  Participant,
} from "@/types";

/**
 * Gmail Adapter
 *
 * Strategy: Gmail's DOM is heavily obfuscated with short changing class names.
 * We rely on:
 * 1. ARIA roles and labels (most stable)
 * 2. Structural patterns (table rows for thread list)
 * 3. data-* attributes where available
 * 4. Known class name patterns as last resort
 *
 * The adapter works on the CURRENT VIEW - whatever inbox/label/search
 * the user has open. It extracts visible threads and their messages.
 *
 * Debugging: All operations log to console with [CC:GM] prefix.
 */

const SELECTORS = {
  // Main content area
  main: [
    'div[role="main"]',
    ".nH.bkK",
    "#\\:2",
  ],
  // Thread list rows (in inbox/label view)
  threadRows: [
    'tr.zA',
    'table.F tbody tr',
    'div[role="main"] table[role="grid"] tr',
    'div[role="main"] tbody > tr',
  ],
  // Subject in thread row
  threadSubject: [
    'span.bog',
    'td.xY span.y2',
    'span[data-thread-id]',
    'td:nth-child(5) span',
  ],
  // Sender in thread row
  threadSender: [
    'span[email]',
    'td.yX span.yW span',
    'span.bA4 span[name]',
    'td:nth-child(4) span span',
  ],
  // Date in thread row
  threadDate: [
    'td.xW span[title]',
    'td:last-child span[title]',
    'td.xW span',
  ],
  // Thread view (after clicking into a thread)
  threadView: [
    'div[role="list"]',
    'div.nH.if',
    'div[data-thread-perm-id]',
  ],
  // Individual emails within a thread
  emailContainers: [
    'div[role="listitem"]',
    'div.gs',
    'div[data-message-id]',
    'table.cf.gJ',
  ],
  // Email body
  emailBody: [
    'div.ii.gt',
    'div[data-message-id] div.ii',
    'div.a3s',
    'div[dir="ltr"]',
  ],
  // Email sender
  emailSender: [
    'span.gD',
    'span[email]',
    'h3.iw span',
    'td.gH span[email]',
  ],
  // Email date
  emailDate: [
    'span.g3',
    'td.gH span[title]',
    'span[data-tooltip]',
  ],
  // Email subject (in thread view header)
  emailSubject: [
    'h2[data-thread-perm-id]',
    'h2.hP',
    'div[role="main"] h2',
  ],
  // Back button to return to thread list
  backButton: [
    'div[data-tooltip="Back to Inbox"]',
    'div[data-tooltip*="Back"]',
    '.aq.ar',
    'div[role="button"][title*="Back"]',
  ],
  // Expand collapsed emails
  expandCollapsed: [
    'div.kQ',
    'span[role="button"][style*="inline"]',
    'img[alt="Show trimmed content"]',
    '[aria-label="Show trimmed content"]',
  ],
} as const;

export class GmailAdapter extends BaseAdapter {
  platform = "gmail" as const;
  private log = (...args: unknown[]) => console.log("[CC:GM]", ...args);

  canHandle(url: string): boolean {
    return url.includes("mail.google.com");
  }

  async initialize(): Promise<void> {
    this.log("Initializing Gmail adapter...");
    const main = await this.findFirst(SELECTORS.main, 15000);
    if (!main) {
      throw new Error(
        "Gmail not loaded. Please make sure you are logged in and your inbox is visible."
      );
    }
    this.log("Main content found:", main.tagName, main.className.slice(0, 60));
  }

  async extractChats(): Promise<NormalizedChat[]> {
    const rows = this.queryAll(SELECTORS.threadRows);
    this.log(`Found ${rows.length} thread rows`);

    if (rows.length === 0) {
      this.log("No thread rows found. Trying to dump main area structure...");
      const main = this.queryFirst(SELECTORS.main);
      if (main) {
        this.log("Main children:", main.children.length);
        this.log("Tables found:", main.querySelectorAll("table").length);
        this.log("TRs found:", main.querySelectorAll("tr").length);
        // Log first few TRs
        const trs = main.querySelectorAll("tr");
        for (let i = 0; i < Math.min(3, trs.length); i++) {
          this.log(`TR ${i} classes:`, trs[i].className);
        }
      }
      return [];
    }

    const chats: NormalizedChat[] = [];

    for (const row of rows) {
      const subjectEl = this.queryFirst(SELECTORS.threadSubject, row);
      const subject =
        subjectEl?.textContent?.trim() || "(no subject)";

      const senderEl = this.queryFirst(SELECTORS.threadSender, row);
      const senderName = senderEl?.textContent?.trim() || "Unknown";
      const senderEmail = senderEl?.getAttribute("email") || "";

      const dateEl = this.queryFirst(SELECTORS.threadDate, row);
      const dateTitle = dateEl?.getAttribute("title") || dateEl?.textContent?.trim() || "";

      const id = `gmail-${hashCode(senderEmail + subject)}`;

      chats.push({
        id,
        platform: "gmail",
        name: subject,
        type: "thread",
        participants: [
          {
            id: sanitizeId(senderEmail || senderName),
            name: senderName,
            email: senderEmail || undefined,
          },
        ],
        messageCount: 0,
        lastMessage: dateTitle
          ? { timestamp: dateTitle, preview: subject }
          : undefined,
      });
    }

    this.log(`Extracted ${chats.length} thread subjects:`, chats.slice(0, 5).map((c) => c.name));
    return chats;
  }

  async extractMessages(
    chatId: string,
    _options?: ExtractionOptions
  ): Promise<NormalizedMessage[]> {
    this.log(`Opening thread: ${chatId}`);

    const opened = await this.openThread(chatId);
    if (!opened) {
      this.log("Failed to open thread");
      return [];
    }

    await this.delay(2000);
    await this.expandAllMessages();

    const messages = this.parseThreadEmails(chatId);
    this.log(`Extracted ${messages.length} emails from thread`);

    await this.goBack();
    return messages;
  }

  private async openThread(chatId: string): Promise<boolean> {
    const rows = this.queryAll(SELECTORS.threadRows);

    for (const row of rows) {
      const subjectEl = this.queryFirst(SELECTORS.threadSubject, row);
      const subject = subjectEl?.textContent?.trim() || "";
      const senderEl = this.queryFirst(SELECTORS.threadSender, row);
      const senderEmail = senderEl?.getAttribute("email") || "";
      const rowId = `gmail-${hashCode(senderEmail + subject)}`;

      if (rowId === chatId) {
        this.log(`Found matching thread row, clicking...`);
        await this.clickAndWait(row, 2000);

        // Wait for thread view
        const threadView = await this.findFirst(SELECTORS.threadView, 5000);
        if (!threadView) {
          // Might already be in thread view (single email)
          const emailBody = this.queryFirst(SELECTORS.emailBody);
          if (emailBody) {
            this.log("Single email view loaded");
            return true;
          }
          this.log("Thread view did not load");
          return false;
        }
        this.log("Thread view loaded");
        return true;
      }
    }

    this.log("Thread not found in list");
    return false;
  }

  private async expandAllMessages(): Promise<void> {
    // Expand collapsed emails in thread
    const expanders = this.queryAll(SELECTORS.expandCollapsed);
    for (const btn of expanders) {
      await this.clickAndWait(btn, 500);
    }
    this.log(`Expanded ${expanders.length} collapsed sections`);
  }

  private parseThreadEmails(chatId: string): NormalizedMessage[] {
    const messages: NormalizedMessage[] = [];

    // Get subject
    const subjectEl = this.queryFirst(SELECTORS.emailSubject);
    const subject = subjectEl?.textContent?.trim() || "(no subject)";

    // Try to find email containers first
    let emailContainers = this.queryAll(SELECTORS.emailContainers);
    this.log(`Found ${emailContainers.length} email containers`);

    // If no containers found, treat the whole view as one email
    if (emailContainers.length === 0) {
      const body = this.queryFirst(SELECTORS.emailBody);
      if (body) {
        emailContainers = [body.closest("div[role='listitem']") || body];
      }
    }

    for (let i = 0; i < emailContainers.length; i++) {
      const container = emailContainers[i];

      // Body text
      const bodyEl = container.querySelector("div.ii.gt") ||
                     container.querySelector("div.a3s") ||
                     container.querySelector('div[dir="ltr"]');
      const text = bodyEl?.textContent?.trim() || "";
      if (!text) continue;

      // Sender
      const senderEl = this.queryFirst(SELECTORS.emailSender, container);
      const senderName = senderEl?.textContent?.trim() || "Unknown";
      const senderEmail =
        senderEl?.getAttribute("email") ||
        senderEl?.getAttribute("data-hovercard-id") ||
        senderName;

      const sender: Participant = {
        id: sanitizeId(senderEmail),
        name: senderName,
        email: senderEmail,
      };

      // Date
      const dateEl = this.queryFirst(SELECTORS.emailDate, container);
      const dateText =
        dateEl?.getAttribute("title") ||
        dateEl?.getAttribute("data-tooltip") ||
        dateEl?.textContent?.trim() || "";
      const timestamp = parseGmailDate(dateText);

      // Links
      const links: string[] = [];
      (bodyEl || container).querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (href?.startsWith("http")) links.push(href);
      });

      const id = `gm-${hashCode(chatId + timestamp + text.slice(0, 50))}`;

      messages.push({
        id,
        platform: "gmail",
        chatId,
        chatName: subject,
        chatType: "thread",
        sender,
        timestamp,
        content: { text, links, mentions: [] },
      });
    }

    return messages;
  }

  private async goBack(): Promise<void> {
    const backBtn = this.queryFirst(SELECTORS.backButton);
    if (backBtn) {
      this.log("Clicking back button");
      await this.clickAndWait(backBtn, 1500);
    } else {
      this.log("No back button found, using history.back()");
      history.back();
      await this.delay(1500);
    }
  }

  // ── Selector helpers ──

  private queryFirst(
    selectors: readonly string[],
    root: Element | Document = document
  ): Element | null {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch { /* invalid selector in this context */ }
    }
    return null;
  }

  private queryAll(
    selectors: readonly string[],
    root: Element | Document = document
  ): Element[] {
    for (const sel of selectors) {
      try {
        const els = root.querySelectorAll(sel);
        if (els.length > 0) {
          this.log(`Selector matched: "${sel}" -> ${els.length} elements`);
          return Array.from(els);
        }
      } catch { /* invalid selector */ }
    }
    return [];
  }

  private async findFirst(
    selectors: readonly string[],
    timeout = 10000
  ): Promise<Element | null> {
    const immediate = this.queryFirst(selectors);
    if (immediate) return immediate;

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
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseGmailDate(dateText: string): string {
  if (!dateText) return new Date().toISOString();
  try {
    const d = new Date(dateText);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* fall through */ }
  return new Date().toISOString();
}

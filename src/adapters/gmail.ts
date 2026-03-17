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
 * Extracts email threads from mail.google.com.
 * Gmail's DOM is heavily obfuscated with short class names that change.
 * We rely on ARIA attributes, roles, and structural patterns.
 *
 * Strategy:
 * 1. Parse the thread list from the current view (inbox, label, etc.)
 * 2. Click into each thread to extract individual emails
 * 3. Parse sender, date, subject, and body from the thread view
 *
 * Known stable selectors:
 * - Thread rows: tr.zA (may change, but role="row" is stable)
 * - Thread subject: spans inside the row
 * - Email body in thread: div.ii.gt (Gmail's content class)
 * - Sender name: span.gD (or h3.iw span[email])
 * - Expand all: span[aria-label="Show trimmed content"]
 */

const S = {
  threadListRows: 'tr[role="row"]',
  threadRowSubject: ".bog span",
  threadRowSender: ".yW span[email]",
  threadRowDate: ".xW span[title]",
  emailBody: "div.ii.gt",
  emailSender: "span.gD",
  emailSenderAttr: "email",
  emailDate: "span.g3",
  emailSubject: 'h2[data-thread-perm-id], h2.hP',
  expandAll: '[aria-label="Show trimmed content"]',
  threadView: 'div[role="list"]',
  backToInbox: ".aq.ar",
  mainContent: 'div[role="main"]',
} as const;

export class GmailAdapter extends BaseAdapter {
  platform = "gmail" as const;

  canHandle(url: string): boolean {
    return url.includes("mail.google.com");
  }

  async initialize(): Promise<void> {
    const main = await this.waitForElement(S.mainContent, 15000);
    if (!main) {
      throw new Error(
        "Gmail not loaded. Please make sure you are logged in."
      );
    }
  }

  async extractChats(): Promise<NormalizedChat[]> {
    const rows = document.querySelectorAll(S.threadListRows);
    const chats: NormalizedChat[] = [];

    for (const row of rows) {
      const subjectEl = row.querySelector(S.threadRowSubject);
      const subject = this.getText(subjectEl, "(no subject)");

      const senderEl = row.querySelector(S.threadRowSender);
      const senderName = this.getText(senderEl, "Unknown");
      const senderEmail = senderEl?.getAttribute("email") ?? "";

      const dateEl = row.querySelector(S.threadRowDate);
      const dateTitle = dateEl?.getAttribute("title") ?? "";

      const id = `gmail-${sanitizeId(subject)}-${hashCode(senderEmail + subject)}`;

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

    return chats;
  }

  async extractMessages(
    chatId: string,
    _options?: ExtractionOptions
  ): Promise<NormalizedMessage[]> {
    // Find the thread row and open it
    const opened = await this.openThread(chatId);
    if (!opened) return [];

    await this.delay(1500);

    // Expand all collapsed messages
    await this.expandAllMessages();

    // Parse all emails in the thread
    const messages = this.parseThreadEmails(chatId);

    // Navigate back to thread list
    await this.goBack();

    return messages;
  }

  private async openThread(chatId: string): Promise<boolean> {
    const rows = document.querySelectorAll(S.threadListRows);

    for (const row of rows) {
      const subjectEl = row.querySelector(S.threadRowSubject);
      const subject = this.getText(subjectEl, "");
      const senderEl = row.querySelector(S.threadRowSender);
      const senderEmail = senderEl?.getAttribute("email") ?? "";
      const id = `gmail-${sanitizeId(subject)}-${hashCode(senderEmail + subject)}`;

      if (id === chatId) {
        await this.clickAndWait(row, 1500);
        return true;
      }
    }

    return false;
  }

  private async expandAllMessages(): Promise<void> {
    // Click "Show trimmed content" and collapsed message expanders
    const expanders = document.querySelectorAll(S.expandAll);
    for (const btn of expanders) {
      await this.clickAndWait(btn, 300);
    }

    // Also click collapsed email headers in thread to expand them
    const collapsed = document.querySelectorAll(
      '.kv [role="button"][aria-expanded="false"]'
    );
    for (const btn of collapsed) {
      await this.clickAndWait(btn, 500);
    }
  }

  private parseThreadEmails(chatId: string): NormalizedMessage[] {
    const messages: NormalizedMessage[] = [];

    // Get the thread subject
    const subjectEl = document.querySelector(S.emailSubject);
    const subject = this.getText(subjectEl, "(no subject)");

    // Parse each email in the thread view
    const emailBodies = document.querySelectorAll(S.emailBody);
    const senderEls = document.querySelectorAll(S.emailSender);
    const dateEls = document.querySelectorAll(S.emailDate);

    for (let i = 0; i < emailBodies.length; i++) {
      const body = emailBodies[i];
      const text = body?.textContent?.trim() ?? "";
      if (!text) continue;

      // Sender
      const senderEl = senderEls[i];
      const senderName = this.getText(senderEl, "Unknown");
      const senderEmail =
        senderEl?.getAttribute(S.emailSenderAttr) ?? senderName;

      const sender: Participant = {
        id: sanitizeId(senderEmail),
        name: senderName,
        email: senderEmail,
      };

      // Date
      const dateEl = dateEls[i];
      const dateText = dateEl?.getAttribute("title") ?? this.getText(dateEl);
      const timestamp = parseGmailDate(dateText);

      // Links
      const links: string[] = [];
      body.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("http")) links.push(href);
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
        content: {
          text,
          links,
          mentions: [],
        },
      });
    }

    return messages;
  }

  private async goBack(): Promise<void> {
    // Use browser back or find back button
    const backBtn = document.querySelector(S.backToInbox);
    if (backBtn) {
      await this.clickAndWait(backBtn, 1000);
    } else {
      history.back();
      await this.delay(1000);
    }
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
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseGmailDate(dateText: string): string {
  try {
    const d = new Date(dateText);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
    // Fall through
  }
  return new Date().toISOString();
}

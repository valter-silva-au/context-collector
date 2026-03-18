import { getAdapterForUrl } from "@/adapters/registry";
import { onMessage } from "@/shared/messaging";
import type {
  NormalizedChat,
  NormalizedMessage,
  ExtractionOptions,
} from "@/types";

/**
 * Content script - injected into supported platform pages.
 *
 * Listens for extraction commands from the background service worker
 * and delegates to the appropriate platform adapter.
 */

const log = (...args: unknown[]) => console.log("[CC:Content]", ...args);

let extractionAborted = false;

onMessage((message, _sender, sendResponse) => {
  switch (message.type) {
    case "EXTRACT_PLATFORM": {
      const { options } = message.payload as {
        options?: ExtractionOptions;
      };
      log("Received EXTRACT_PLATFORM command", options);
      handleExtraction(options)
        .then((result) => {
          log("Extraction result:", {
            chats: result.chats.length,
            messages: result.messages.length,
            error: result.error,
          });
          sendResponse(result);
        })
        .catch((err) => {
          log("Extraction error:", err);
          sendResponse({
            chats: [],
            messages: [],
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true; // async response
    }

    case "CANCEL_EXTRACTION": {
      extractionAborted = true;
      sendResponse({ cancelled: true });
      return false;
    }

    case "GET_STATE": {
      const adapter = getAdapterForUrl(window.location.href);
      sendResponse({
        platform: adapter?.platform ?? null,
        url: window.location.href,
        ready: adapter !== null,
      });
      return false;
    }
  }
});

async function handleExtraction(options?: ExtractionOptions): Promise<{
  chats: NormalizedChat[];
  messages: NormalizedMessage[];
  error?: string;
}> {
  extractionAborted = false;
  const adapter = getAdapterForUrl(window.location.href);

  if (!adapter) {
    return {
      chats: [],
      messages: [],
      error: `No adapter for ${window.location.hostname}`,
    };
  }

  log(`Using ${adapter.platform} adapter for ${window.location.hostname}`);

  try {
    await adapter.initialize();
    log("Adapter initialized");

    const chats = await adapter.extractChats();
    log(`Found ${chats.length} chats`);

    const allMessages: NormalizedMessage[] = [];

    for (let i = 0; i < chats.length; i++) {
      const chat = chats[i];
      if (extractionAborted) {
        log("Extraction aborted by user");
        break;
      }

      log(`Extracting chat ${i + 1}/${chats.length}: "${chat.name}"`);

      // Report progress
      chrome.runtime.sendMessage({
        type: "EXTRACTION_PROGRESS",
        payload: {
          platform: adapter.platform,
          currentChat: chat.name,
          completedChats: i,
          totalChats: chats.length,
          extractedMessages: allMessages.length,
        },
      }).catch(() => {});

      try {
        const messages = await adapter.extractMessages(chat.id, options);
        allMessages.push(...messages);
        chat.messageCount = messages.length;
        log(`  -> ${messages.length} messages extracted`);
      } catch (err) {
        log(`  -> Error extracting "${chat.name}":`, err);
      }

      // Rate limiting between chats
      await new Promise((r) => setTimeout(r, 500));
    }

    adapter.cleanup();
    log(`Extraction complete: ${chats.length} chats, ${allMessages.length} messages`);

    return { chats, messages: allMessages };
  } catch (err) {
    adapter.cleanup();
    const msg = err instanceof Error ? err.message : String(err);
    log("Extraction failed:", msg);
    return { chats: [], messages: [], error: msg };
  }
}

log(`Content script loaded for ${window.location.hostname} (${window.location.href})`);

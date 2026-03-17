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

let extractionAborted = false;

onMessage((message, _sender, sendResponse) => {
  switch (message.type) {
    case "EXTRACT_PLATFORM": {
      const { options } = message.payload as {
        options?: ExtractionOptions;
      };
      handleExtraction(options)
        .then((result) => sendResponse(result))
        .catch((err) =>
          sendResponse({
            error: err instanceof Error ? err.message : String(err),
          })
        );
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

  try {
    await adapter.initialize();

    // Extract chat list
    const chats = await adapter.extractChats();
    const allMessages: NormalizedMessage[] = [];

    // Extract messages from each chat
    for (const chat of chats) {
      if (extractionAborted) break;

      // Report progress
      chrome.runtime.sendMessage({
        type: "EXTRACTION_PROGRESS",
        payload: {
          platform: adapter.platform,
          currentChat: chat.name,
          completedChats: allMessages.length > 0 ? chats.indexOf(chat) : 0,
          totalChats: chats.length,
        },
      });

      const messages = await adapter.extractMessages(chat.id, options);
      allMessages.push(...messages);

      // Update chat message count
      chat.messageCount = messages.length;

      // Rate limiting between chats
      await new Promise((r) => setTimeout(r, 500));
    }

    adapter.cleanup();

    return { chats, messages: allMessages };
  } catch (err) {
    adapter.cleanup();
    return {
      chats: [],
      messages: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Signal that content script is ready
console.log("[Context Collector] Content script loaded for", window.location.hostname);

import type {
  Platform,
  ExtractionState,
  PlatformProgress,
  ExtractSettings,
  DEFAULT_SETTINGS,
  NormalizedChat,
  NormalizedMessage,
} from "@/types";

/**
 * Background service worker - orchestrates extraction across tabs.
 *
 * Flow:
 * 1. Popup sends START_EXTRACTION with settings
 * 2. Service worker finds tabs matching enabled platforms
 * 3. Sends EXTRACT_PLATFORM to each tab's content script
 * 4. Collects results and forwards progress to popup
 * 5. When complete, sends EXTRACTION_COMPLETE with all data
 */

let extractionState: ExtractionState = {
  status: "idle",
  platforms: [],
};

// Platform URL patterns for tab matching
const PLATFORM_URLS: Record<Platform, string> = {
  whatsapp: "https://web.whatsapp.com",
  telegram: "https://web.telegram.org",
  gmail: "https://mail.google.com",
  linkedin: "https://www.linkedin.com",
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) return;

  switch (message.type) {
    case "START_EXTRACTION": {
      const settings = message.payload as ExtractSettings;
      startExtraction(settings);
      sendResponse({ started: true });
      return false;
    }

    case "CANCEL_EXTRACTION": {
      cancelExtraction();
      sendResponse({ cancelled: true });
      return false;
    }

    case "GET_STATE": {
      sendResponse(extractionState);
      return false;
    }

    case "EXTRACTION_PROGRESS": {
      // Forward progress from content script to popup
      const progress = message.payload as Partial<PlatformProgress>;
      updatePlatformProgress(progress);

      // Broadcast to popup
      broadcastToPopup("EXTRACTION_PROGRESS", extractionState);
      return false;
    }
  }
});

async function startExtraction(settings: ExtractSettings): Promise<void> {
  extractionState = {
    status: "extracting",
    platforms: settings.enabledPlatforms.map((p) => ({
      platform: p,
      status: "idle",
      totalChats: 0,
      completedChats: 0,
      totalMessages: 0,
      extractedMessages: 0,
    })),
    startedAt: new Date().toISOString(),
  };

  broadcastToPopup("EXTRACTION_PROGRESS", extractionState);

  const allResults = new Map<
    Platform,
    { chats: NormalizedChat[]; messages: NormalizedMessage[] }
  >();

  for (const platform of settings.enabledPlatforms) {
    if (extractionState.status === "cancelled") break;

    // Update platform status
    updatePlatformStatus(platform, "extracting");

    try {
      // Find tab for this platform
      const tab = await findPlatformTab(platform);

      if (!tab?.id) {
        updatePlatformStatus(platform, "error", `No open ${platform} tab found. Please open ${PLATFORM_URLS[platform]} and log in.`);
        continue;
      }

      // Send extraction command to content script
      const result = await chrome.tabs.sendMessage(tab.id, {
        type: "EXTRACT_PLATFORM",
        payload: {
          options: {
            since: getDateFromRange(settings.dateRange),
          },
        },
      }) as { chats: NormalizedChat[]; messages: NormalizedMessage[]; error?: string };

      if (result.error) {
        updatePlatformStatus(platform, "error", result.error);
      } else {
        allResults.set(platform, {
          chats: result.chats,
          messages: result.messages,
        });

        const pp = extractionState.platforms.find(
          (p) => p.platform === platform
        );
        if (pp) {
          pp.status = "complete";
          pp.totalChats = result.chats.length;
          pp.completedChats = result.chats.length;
          pp.totalMessages = result.messages.length;
          pp.extractedMessages = result.messages.length;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updatePlatformStatus(platform, "error", msg);
    }

    broadcastToPopup("EXTRACTION_PROGRESS", extractionState);
  }

  // All done
  extractionState.status =
    extractionState.status === "cancelled" ? "cancelled" : "complete";
  extractionState.completedAt = new Date().toISOString();

  broadcastToPopup("EXTRACTION_COMPLETE", {
    state: extractionState,
    results: Object.fromEntries(allResults),
    settings,
  });
}

function cancelExtraction(): void {
  extractionState.status = "cancelled";
  broadcastToPopup("EXTRACTION_PROGRESS", extractionState);
}

async function findPlatformTab(platform: Platform): Promise<chrome.tabs.Tab | undefined> {
  const url = PLATFORM_URLS[platform];
  const tabs = await chrome.tabs.query({ url: `${url}/*` });
  return tabs[0];
}

function updatePlatformStatus(
  platform: Platform,
  status: PlatformProgress["status"],
  error?: string
): void {
  const pp = extractionState.platforms.find((p) => p.platform === platform);
  if (pp) {
    pp.status = status;
    if (error) pp.error = error;
  }
}

function updatePlatformProgress(progress: Partial<PlatformProgress>): void {
  if (!progress.platform) return;
  const pp = extractionState.platforms.find(
    (p) => p.platform === progress.platform
  );
  if (pp) {
    Object.assign(pp, progress);
  }
}

function broadcastToPopup(type: string, payload: unknown): void {
  chrome.runtime.sendMessage({ type, payload }).catch(() => {
    // Popup might not be open - that's fine
  });
}

function getDateFromRange(range: string): Date | undefined {
  const now = new Date();
  switch (range) {
    case "last_7_days":
      return new Date(now.getTime() - 7 * 86400000);
    case "last_30_days":
      return new Date(now.getTime() - 30 * 86400000);
    case "last_90_days":
      return new Date(now.getTime() - 90 * 86400000);
    default:
      return undefined;
  }
}

import type {
  Platform,
  ExtractionState,
  PlatformProgress,
  ExtractSettings,
  NormalizedChat,
  NormalizedMessage,
} from "@/types";

/**
 * Background service worker - orchestrates extraction across tabs.
 *
 * Flow:
 * 1. Popup sends START_EXTRACTION with settings
 * 2. Service worker finds tabs matching enabled platforms
 * 3. Ensures content script is injected (programmatic fallback)
 * 4. Sends EXTRACT_PLATFORM to each tab's content script
 * 5. Collects results and forwards progress to popup
 * 6. When complete, sends EXTRACTION_COMPLETE with all data
 */

let extractionState: ExtractionState = {
  status: "idle",
  platforms: [],
};

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
      const progress = message.payload as Partial<PlatformProgress>;
      updatePlatformProgress(progress);
      broadcastToPopup("EXTRACTION_PROGRESS", extractionState);
      return false;
    }
  }
});

/**
 * Ensure the content script is loaded in a tab.
 * If the tab was opened before the extension was installed,
 * the declarative content_scripts won't have injected it.
 * We use chrome.scripting.executeScript as a fallback.
 */
async function ensureContentScript(tabId: number): Promise<boolean> {
  // First, try pinging the content script
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "GET_STATE",
      payload: {},
    });
    if (response?.ready !== undefined) {
      console.log(`[CC] Content script already loaded in tab ${tabId}`);
      return true;
    }
  } catch {
    // Content script not loaded - inject it
    console.log(`[CC] Content script not found in tab ${tabId}, injecting...`);
  }

  // Programmatic injection fallback - find the content script filename from the manifest
  try {
    const manifest = chrome.runtime.getManifest();
    const contentScriptFiles = manifest.content_scripts?.[0]?.js ?? [];
    console.log(`[CC] Injecting content script files:`, contentScriptFiles);

    if (contentScriptFiles.length > 0) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: contentScriptFiles,
      });
      await new Promise((r) => setTimeout(r, 1000));
      console.log(`[CC] Content script injected into tab ${tabId}`);
      return true;
    }
  } catch (err) {
    console.error(`[CC] Failed to inject content script:`, err);
  }

  return false;
}

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

    updatePlatformStatus(platform, "extracting");
    broadcastToPopup("EXTRACTION_PROGRESS", extractionState);

    try {
      const tab = await findPlatformTab(platform);

      if (!tab?.id) {
        updatePlatformStatus(
          platform,
          "error",
          `No open ${platform} tab found. Please open ${PLATFORM_URLS[platform]} and log in.`
        );
        continue;
      }

      // Ensure content script is loaded
      const scriptReady = await ensureContentScript(tab.id);
      if (!scriptReady) {
        updatePlatformStatus(
          platform,
          "error",
          `Could not load extraction script in ${platform} tab. Try refreshing the tab and extracting again.`
        );
        continue;
      }

      // Send extraction command
      const result = (await chrome.tabs.sendMessage(tab.id, {
        type: "EXTRACT_PLATFORM",
        payload: {
          options: {
            since: getDateFromRange(settings.dateRange),
          },
        },
      })) as {
        chats: NormalizedChat[];
        messages: NormalizedMessage[];
        error?: string;
      };

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

async function findPlatformTab(
  platform: Platform
): Promise<chrome.tabs.Tab | undefined> {
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
    // Popup might not be open
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

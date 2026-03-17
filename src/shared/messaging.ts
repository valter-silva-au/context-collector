import type { ExtensionMessage, MessageType } from "@/types";

/** Send a message to the background service worker */
export function sendToBackground<T>(
  type: MessageType,
  payload: T
): Promise<unknown> {
  return chrome.runtime.sendMessage({ type, payload });
}

/** Send a message to a specific tab's content script */
export function sendToTab<T>(
  tabId: number,
  type: MessageType,
  payload: T
): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, { type, payload });
}

/** Type-safe message listener */
export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => boolean | void
): void {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && typeof msg.type === "string") {
      return handler(msg as ExtensionMessage, sender, sendResponse);
    }
  });
}

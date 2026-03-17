import type {
  PlatformAdapter,
  Platform,
  NormalizedChat,
  NormalizedMessage,
  ExtractionOptions,
} from "@/types";

/** Base class for platform adapters with shared utilities */
export abstract class BaseAdapter implements PlatformAdapter {
  abstract platform: Platform;
  abstract canHandle(url: string): boolean;
  abstract initialize(): Promise<void>;
  abstract extractChats(): Promise<NormalizedChat[]>;
  abstract extractMessages(
    chatId: string,
    options?: ExtractionOptions
  ): Promise<NormalizedMessage[]>;

  cleanup(): void {
    // Override in subclass if needed
  }

  /** Wait for a DOM element to appear */
  protected waitForElement(
    selector: string,
    timeout = 10000
  ): Promise<Element | null> {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver((_mutations, obs) => {
        const found = document.querySelector(selector);
        if (found) {
          obs.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /** Wait for multiple elements matching selector */
  protected waitForElements(
    selector: string,
    minCount = 1,
    timeout = 10000
  ): Promise<Element[]> {
    return new Promise((resolve) => {
      const els = document.querySelectorAll(selector);
      if (els.length >= minCount) return resolve(Array.from(els));

      const observer = new MutationObserver((_mutations, obs) => {
        const found = document.querySelectorAll(selector);
        if (found.length >= minCount) {
          obs.disconnect();
          resolve(Array.from(found));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(Array.from(document.querySelectorAll(selector)));
      }, timeout);
    });
  }

  /** Delay execution (for rate limiting) */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Scroll an element to top to trigger loading, returns when stable */
  protected async scrollToLoadHistory(
    container: Element,
    maxScrolls = 50,
    delayMs = 500
  ): Promise<void> {
    let prevHeight = container.scrollHeight;
    let stableCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
      container.scrollTop = 0;
      await this.delay(delayMs);

      const newHeight = container.scrollHeight;
      if (newHeight === prevHeight) {
        stableCount++;
        if (stableCount >= 3) break; // No new content loaded
      } else {
        stableCount = 0;
      }
      prevHeight = newHeight;
    }
  }

  /** Extract text from an element, with fallback */
  protected getText(el: Element | null, fallback = ""): string {
    return el?.textContent?.trim() ?? fallback;
  }

  /** Click an element and wait */
  protected async clickAndWait(el: Element, waitMs = 300): Promise<void> {
    (el as HTMLElement).click();
    await this.delay(waitMs);
  }
}

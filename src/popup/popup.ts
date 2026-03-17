import type {
  Platform,
  ExtractionState,
  ExtractSettings,
  DateRange,
  NormalizedChat,
  NormalizedMessage,
} from "@/types";
import { packageToZip, downloadBlob } from "@/pipeline/packager";

// ── State ──

type View = "onboarding" | "idle" | "extracting" | "complete" | "error";

let currentView: View = "idle";
let onboardingStep = 1;
let extractionStartTime = 0;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let lastResults: Map<
  Platform,
  { chats: NormalizedChat[]; messages: NormalizedMessage[] }
> | null = null;
let lastSettings: ExtractSettings | null = null;

// ── DOM Refs ──

const views = {
  onboarding: document.getElementById("view-onboarding")!,
  idle: document.getElementById("view-idle")!,
  extracting: document.getElementById("view-extracting")!,
  complete: document.getElementById("view-complete")!,
  error: document.getElementById("view-error")!,
};

// ── Init ──

document.addEventListener("DOMContentLoaded", async () => {
  const { onboarded } = await chrome.storage.local.get("onboarded");
  showView(onboarded ? "idle" : "onboarding");
  bindEvents();
  listenForMessages();
});

// ── View Management ──

function showView(view: View): void {
  currentView = view;
  for (const [name, el] of Object.entries(views)) {
    el.classList.toggle("hidden", name !== view);
  }
}

// ── Event Binding ──

function bindEvents(): void {
  // Onboarding
  document.getElementById("btn-onboarding-next")!.addEventListener("click", handleOnboardingNext);

  // Extract
  document.getElementById("btn-extract")!.addEventListener("click", handleExtract);

  // Cancel
  document.getElementById("btn-cancel")!.addEventListener("click", handleCancel);

  // Download
  document.getElementById("btn-download")!.addEventListener("click", handleDownload);
  document.getElementById("btn-download-partial")?.addEventListener("click", handleDownload);

  // Extract again
  document.getElementById("btn-extract-again")!.addEventListener("click", () => showView("idle"));

  // Retry
  document.getElementById("btn-retry")?.addEventListener("click", handleExtract);

  // Settings
  document.getElementById("btn-settings")!.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Platform row click toggles checkbox
  document.querySelectorAll(".platform-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("label")) return;
      const input = row.querySelector("input[type=checkbox]") as HTMLInputElement;
      if (input && !input.disabled) input.checked = !input.checked;
    });
  });
}

// ── Onboarding ──

function handleOnboardingNext(): void {
  const steps = document.querySelectorAll(".onboarding-step");
  const dots = document.querySelectorAll(".step-dot");
  const btn = document.getElementById("btn-onboarding-next") as HTMLButtonElement;

  if (onboardingStep < 3) {
    steps[onboardingStep - 1].classList.add("hidden");
    onboardingStep++;
    steps[onboardingStep - 1].classList.remove("hidden");

    dots.forEach((d, i) => {
      d.classList.toggle("bg-cc-green", i < onboardingStep);
      d.classList.toggle("bg-gray-700", i >= onboardingStep);
    });

    if (onboardingStep === 2) btn.textContent = "Continue";
    if (onboardingStep === 3) btn.textContent = "Start Extracting";
  } else {
    chrome.storage.local.set({ onboarded: true });
    showView("idle");
  }
}

// ── Extraction ──

function getSettings(): ExtractSettings {
  const enabledPlatforms: Platform[] = [];
  document.querySelectorAll<HTMLInputElement>("[data-platform-toggle]").forEach((el) => {
    if (el.checked) enabledPlatforms.push(el.dataset.platformToggle as Platform);
  });

  const dateRange = (document.getElementById("select-date-range") as HTMLSelectElement).value as DateRange;
  const mode = (document.querySelector<HTMLInputElement>('input[name="mode"]:checked'))?.value as "full" | "incremental";

  return {
    enabledPlatforms,
    dateRange,
    excludedChats: { whatsapp: [], telegram: [], gmail: [], linkedin: [] },
    extractionMode: mode ?? "full",
  };
}

function handleExtract(): void {
  const settings = getSettings();
  lastSettings = settings;

  if (settings.enabledPlatforms.length === 0) return;

  showView("extracting");
  extractionStartTime = Date.now();
  startElapsedTimer();

  // Clear progress area
  document.getElementById("platform-progress")!.innerHTML = settings.enabledPlatforms
    .map(
      (p) => `
    <div class="progress-card" data-progress-platform="${p}">
      <div class="flex items-center justify-between mb-1">
        <span class="platform-name">${platformLabel(p)}</span>
        <span class="platform-status">Waiting...</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
    </div>
  `
    )
    .join("");

  // Send to background
  chrome.runtime.sendMessage({
    type: "START_EXTRACTION",
    payload: settings,
  });
}

function handleCancel(): void {
  chrome.runtime.sendMessage({ type: "CANCEL_EXTRACTION" });
  stopElapsedTimer();
  showView("idle");
}

// ── Download ──

async function handleDownload(): Promise<void> {
  if (!lastResults || !lastSettings) return;

  const btn = (document.getElementById("btn-download") ??
    document.getElementById("btn-download-partial")) as HTMLButtonElement;
  const origText = btn.textContent;
  btn.textContent = "Packaging...";
  btn.disabled = true;

  try {
    const blob = await packageToZip(lastResults, {
      mode: lastSettings.extractionMode,
      dateRange: lastSettings.dateRange,
    });
    downloadBlob(blob);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
}

// ── Message Listener ──

function listenForMessages(): void {
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg?.type) return;

    switch (msg.type) {
      case "EXTRACTION_PROGRESS": {
        const state = msg.payload as ExtractionState;
        updateProgress(state);
        break;
      }
      case "EXTRACTION_COMPLETE": {
        const { state, results, settings } = msg.payload as {
          state: ExtractionState;
          results: Record<Platform, { chats: NormalizedChat[]; messages: NormalizedMessage[] }>;
          settings: ExtractSettings;
        };
        stopElapsedTimer();
        lastResults = new Map(Object.entries(results) as [Platform, { chats: NormalizedChat[]; messages: NormalizedMessage[] }][]);
        lastSettings = settings;

        const hasErrors = state.platforms.some((p) => p.status === "error");
        const hasSuccess = state.platforms.some((p) => p.status === "complete");

        if (hasErrors && !hasSuccess) {
          showError(state);
        } else if (hasErrors && hasSuccess) {
          showError(state); // partial
        } else {
          showComplete(state);
        }
        break;
      }
    }
  });
}

// ── Progress Updates ──

function updateProgress(state: ExtractionState): void {
  if (currentView !== "extracting") return;

  for (const pp of state.platforms) {
    const card = document.querySelector(`[data-progress-platform="${pp.platform}"]`);
    if (!card) continue;

    const statusEl = card.querySelector(".platform-status") as HTMLElement;
    const fillEl = card.querySelector(".progress-fill") as HTMLElement;

    if (pp.status === "extracting") {
      const pct = pp.totalChats > 0 ? Math.round((pp.completedChats / pp.totalChats) * 100) : 0;
      statusEl.textContent = pp.currentChat
        ? `${pp.completedChats}/${pp.totalChats} chats - ${pp.currentChat}`
        : `${pp.completedChats}/${pp.totalChats} chats`;
      fillEl.style.width = `${pct}%`;
    } else if (pp.status === "complete") {
      statusEl.innerHTML = `<span class="text-cc-green">&#10003;</span> ${pp.extractedMessages} messages`;
      fillEl.style.width = "100%";
    } else if (pp.status === "error") {
      statusEl.innerHTML = `<span class="text-cc-red">&#10007;</span> ${pp.error ?? "Failed"}`;
      fillEl.style.width = "0%";
      fillEl.classList.replace("bg-cc-green", "bg-cc-red");
    }
  }

  // Overall
  const total = state.platforms.reduce((s, p) => s + p.totalChats, 0);
  const done = state.platforms.reduce((s, p) => s + p.completedChats, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const overallLabel = document.getElementById("overall-label");
  const overallPct = document.getElementById("overall-pct");
  const overallBar = document.getElementById("overall-bar");

  if (overallLabel) overallLabel.textContent = `Overall: ${done} of ${total} chats`;
  if (overallPct) overallPct.textContent = `${pct}%`;
  if (overallBar) overallBar.style.width = `${pct}%`;
}

function showComplete(state: ExtractionState): void {
  showView("complete");

  const totalMsgs = state.platforms.reduce((s, p) => s + p.extractedMessages, 0);
  const totalChats = state.platforms.reduce((s, p) => s + p.completedChats, 0);
  const platformCount = state.platforms.filter((p) => p.status === "complete").length;

  const summary = document.getElementById("results-summary")!;
  let html = `
    <div class="font-mono text-xs text-gray-400">${totalMsgs} messages extracted</div>
    <div class="font-mono text-xs text-gray-400">from ${totalChats} conversations</div>
    <div class="font-mono text-xs text-gray-400">across ${platformCount} platform${platformCount > 1 ? "s" : ""}</div>
    <div class="border-t border-subtle mt-2 pt-2 space-y-1">
  `;

  for (const pp of state.platforms) {
    if (pp.status === "complete") {
      html += `<div class="text-xs text-gray-400">${platformLabel(pp.platform)}: ${pp.completedChats} chats &middot; ${pp.extractedMessages} msg</div>`;
    }
  }

  html += "</div>";
  summary.innerHTML = html;
}

function showError(state: ExtractionState): void {
  showView("error");

  const details = document.getElementById("error-details")!;
  let html = "";

  for (const pp of state.platforms) {
    if (pp.status === "error") {
      html += `<div class="text-cc-amber text-xs"><span class="font-medium">${platformLabel(pp.platform)}:</span> ${pp.error ?? "Unknown error"}</div>`;
    }
    if (pp.status === "complete") {
      html += `<div class="text-cc-green text-xs"><span class="font-medium">${platformLabel(pp.platform)}:</span> ${pp.extractedMessages} messages (OK)</div>`;
    }
  }

  details.innerHTML = html;
}

// ── Elapsed Timer ──

function startElapsedTimer(): void {
  stopElapsedTimer();
  elapsedTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - extractionStartTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    const el = document.getElementById("elapsed-time");
    if (el) el.textContent = `Elapsed: ${min}:${sec.toString().padStart(2, "0")}`;
  }, 1000);
}

function stopElapsedTimer(): void {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

// ── Helpers ──

function platformLabel(p: Platform): string {
  const labels: Record<Platform, string> = {
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    gmail: "Gmail",
    linkedin: "LinkedIn",
  };
  return labels[p];
}

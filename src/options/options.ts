/** Options page logic - save/load settings from chrome.storage */

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  bindEvents();
});

async function loadSettings(): Promise<void> {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings) return;

  const dateRange = document.getElementById("opt-date-range") as HTMLSelectElement;
  if (settings.dateRange) dateRange.value = settings.dateRange;

  const modeRadio = document.querySelector<HTMLInputElement>(
    `input[name="opt-mode"][value="${settings.extractionMode ?? "full"}"]`
  );
  if (modeRadio) modeRadio.checked = true;
}

function bindEvents(): void {
  // Auto-save on change
  document.getElementById("opt-date-range")!.addEventListener("change", saveSettings);
  document.querySelectorAll('input[name="opt-mode"]').forEach((el) => {
    el.addEventListener("change", saveSettings);
  });

  // Reset onboarding
  document.getElementById("btn-reset-onboarding")!.addEventListener("click", async () => {
    await chrome.storage.local.remove("onboarded");
    const btn = document.getElementById("btn-reset-onboarding") as HTMLButtonElement;
    btn.textContent = "Done!";
    setTimeout(() => (btn.textContent = "Reset"), 2000);
  });
}

async function saveSettings(): Promise<void> {
  const dateRange = (document.getElementById("opt-date-range") as HTMLSelectElement).value;
  const mode = document.querySelector<HTMLInputElement>('input[name="opt-mode"]:checked')?.value ?? "full";

  const { settings: existing } = await chrome.storage.local.get("settings");
  const updated = {
    ...(existing ?? {}),
    dateRange,
    extractionMode: mode,
  };

  await chrome.storage.local.set({ settings: updated });
}

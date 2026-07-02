import {} from "./state/store.js";
import { logger } from "./utils/logger.js";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/inter/400.css";
import "./style.css";

// Global error boundaries
window.addEventListener("error", (event) => {
  logger.error("Uncaught exception", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection", { reason: event.reason });
});

import { applyTheme } from "./ui/theme.js";

export async function init() {
  if (import.meta.env.DEV) {
    try {
      const { worker } = await import("./mocks/browser.js");
      await worker.start({ onUnhandledRequest: "bypass" });
    } catch (e) {
      logger.error("Failed to start MSW", { error: e.message });
    }
  }

  // Hydrate user preferences
  applyTheme();
}

document.addEventListener("DOMContentLoaded", init);

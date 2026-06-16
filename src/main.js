import { state } from "./state/store.js";
import { logger } from "./utils/logger.js";

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
import { fetchEvents } from "./api/client.js";
import { applyTheme } from "./ui/theme.js";
import {
  initDOM,
  initTabs,
  initControls,
  renderSidebar,
  renderDashboard,
} from "./ui/ui.js";

export async function init() {
  if (import.meta.env.DEV) {
    try {
      const { worker } = await import("./mocks/browser.js");
      await worker.start({ onUnhandledRequest: "bypass" });
    } catch (e) {
      logger.error("Failed to start MSW", { error: e.message });
    }
  }

  initDOM();
  applyTheme(state.isDarkMode);
  initTabs();

  async function loadDashboard() {
    try {
      const data = await fetchEvents("lens");
      if (data.status === "success" || data.length > 0) {
        // MSW returns an array directly in our mock
        state.allEvents = data.events || data;
        initControls();
      } else {
        throw new Error("Invalid Response");
      }
    } catch (error) {
      logger.error("Error fetching data", { error: error.message });
    }
  }

  loadDashboard();
}

document.addEventListener("DOMContentLoaded", init);

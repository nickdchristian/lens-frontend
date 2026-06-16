import { state } from "./state.js?v=100";
import { fetchEvents } from "./api.js?v=100";
import { applyTheme } from "./theme.js?v=100";
import {
  initDOM,
  initTabs,
  initControls,
  renderSidebar,
  renderDashboard,
} from "./ui.js?v=103";

export async function init() {
  initDOM();
  applyTheme(state.isDarkMode);
  initTabs();

  async function loadDashboard() {
    try {
      const data = await fetchEvents("lens");
      if (data.status === "success") {
        state.allEvents = data.events;
        initControls();
        renderSidebar();
        renderDashboard();
      } else {
        throw new Error("Invalid Response");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  loadDashboard();
}


document.addEventListener("DOMContentLoaded", init);

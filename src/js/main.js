import { state } from "./state.js?v=100";
import { fetchEvents, checkAuthStatus, logout } from "./api.js?v=100";
import { applyTheme } from "./theme.js?v=100";
import {
  initDOM,
  initTabs,
  initControls,
  initModal,
  renderSidebar,
  renderDashboard,
} from "./ui.js?v=103";
import { getPublicSettings } from "./api.js?v=100";

let isSetupMode = false;

export async function init() {
  initDOM();
  applyTheme(state.isDarkMode);
  initTabs();
  initModal(refreshData);

  // Check Auth Status
  const status = await checkAuthStatus();
  isSetupMode = status.setup_required;
  state.isLoggedIn = status.logged_in;
  state.username = status.username;

  const authCloseBtn = document.getElementById("auth-close-btn");
  const navLoginBtn = document.getElementById("nav-login-btn");
  const navSettingsBtn = document.getElementById("nav-settings-btn");
  const authUsername = document.getElementById("auth-username");
  const authPassword = document.getElementById("auth-password");

  // Close Modal
  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", () => {
      document.body.style.overflow = "";
    });
  }

  // Show Modal
  if (navLoginBtn) {
    navLoginBtn.addEventListener("click", () => {
      showAuthModal();
    });
  }

  const btnSettingsLogin = document.getElementById("btn-settings-login");
  if (btnSettingsLogin) {
    btnSettingsLogin.addEventListener("click", () => {
      showAuthModal();
    });
  }

  function showAuthModal() {
    // Auth disabled
  }

  async function loadDashboard() {
    if (navSettingsBtn) navSettingsBtn.style.display = "flex";

    const navUserLabel = document.getElementById("nav-user-label");

    if (state.isLoggedIn) {
      if (navLoginBtn) navLoginBtn.style.display = "none";
      if (navUserLabel) {
        navUserLabel.textContent = `Logged in as ${state.username}`;
        navUserLabel.style.display = "block";
      }
    } else {
      if (navLoginBtn) navLoginBtn.style.display = "block";
      if (navUserLabel) {
        navUserLabel.style.display = "none";
      }
    }

    try {
      const publicSettings = await getPublicSettings();
      if (publicSettings) {
        state.appMode = publicSettings.default_dashboard_view;
        const targetBtn = document.querySelector(
          `.top-nav-btn[data-mode="${state.appMode}"]`
        );
        if (targetBtn) {
          document
            .querySelectorAll(".top-nav-btn")
            .forEach((b) => b.classList.remove("active"));
          targetBtn.classList.add("active");
        }
      }

      const data = await fetchEvents();
      if (data.status === "success") {
        let events = data.events;
        if (publicSettings && publicSettings.default_timeframe_days) {
          const cutoff = new Date();
          cutoff.setDate(
            cutoff.getDate() - publicSettings.default_timeframe_days
          );
          events = events.filter((e) => new Date(e.timestamp) >= cutoff);
        }

        state.allEvents = events;
        initControls(refreshData);
        renderSidebar();
        renderDashboard();
      } else {
        throw new Error("Invalid Response");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await logout();
      state.isLoggedIn = false;
      authUsername.value = "";
      authPassword.value = "";

      // Switch to Dashboard tab
      document.querySelector('.top-nav-btn[data-mode="repositories"]').click();
      loadDashboard();
    });
  }

  if (isSetupMode) {
    showAuthModal();
  }
  loadDashboard();
}

export async function refreshData() {
  try {
    const data = await fetchEvents();
    if (data.status === "success") {
      state.allEvents = data.events;
      renderSidebar();
      renderDashboard();
    }
  } catch (error) {
    console.error("Error refreshing data:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);

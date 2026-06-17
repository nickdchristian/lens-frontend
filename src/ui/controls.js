import { html, render } from "lit";
import { state } from "../state/store.js";
import { DOM } from "./dom.js";
import { debounce } from "../utils/formatters.js";
import { applyTheme } from "./theme.js";

export function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const logoBtn = document.getElementById("logo-btn");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (DOM.viewHeader) DOM.viewHeader.style.display = "block";

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  if (logoBtn) {
    logoBtn.addEventListener("click", () => {
      state.currentRepo = null;
      state.currentGroupVal = null;
      state.currentArtifact = null;
      state.currentPage = 1;

      if (state.appMode === "settings") {
        document
          .querySelector('.top-nav-btn[data-mode="repositories"]')
          ?.click();
      }

      DOM.overviewBtn?.click();
    });
  }

  const topNavBtns = document.querySelectorAll(".top-nav-btn");
  topNavBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;

      if (state.appMode === mode) return;

      state.appMode = mode;
      state.currentRepo = null;
      state.currentGroupVal = null;
      state.currentArtifact = null;

      topNavBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (DOM.settingsBtn) DOM.settingsBtn.classList.remove("active");

      DOM.overviewBtn?.click();
    });
  });
}

export function initControls() {
  const tagKeys = new Set();
  state.allEvents.forEach((e) => {
    if (e.tags) {
      Object.keys(e.tags).forEach((k) => tagKeys.add(k));
    }
  });

  const dropdownTrigger = document.getElementById("group-dropdown-trigger");
  const dropdownMenu = document.getElementById("group-dropdown-menu");
  const dropdownLabel = document.getElementById("group-dropdown-label");
  const dropdownContainer = document.getElementById("group-dropdown");

  if (dropdownContainer && dropdownMenu) {
    const onDropdownClick = (e) => {
      if (e.target.classList.contains("dropdown-item")) {
        const val = e.target.dataset.value;

        dropdownMenu
          .querySelectorAll(".dropdown-item")
          .forEach((el) => el.classList.remove("active"));
        e.target.classList.add("active");
        dropdownLabel.textContent = e.target.textContent;
        dropdownContainer.classList.remove("open");
        dropdownTrigger.setAttribute("aria-expanded", "false");

        state.currentGroupKey = val === "none" ? null : val;
        state.currentGroupVal = null;
        state.currentRepo = null;
        state.currentArtifact = null;
      }
    };

    const template = html`
      <button
        class="dropdown-item active"
        data-value="none"
        role="option"
        aria-selected=${state.currentGroupKey === null ? "true" : "false"}
      >
        Group By: None
      </button>
      ${Array.from(tagKeys)
        .sort()
        .map(
          (key) => html`
            <button
              class="dropdown-item"
              data-value="${key}"
              role="option"
              aria-selected=${state.currentGroupKey === key ? "true" : "false"}
            >
              Group By: ${key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          `
        )}
    `;

    render(template, dropdownMenu);

    dropdownMenu.addEventListener("click", onDropdownClick);

    dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdownContainer.classList.toggle("open");
      dropdownTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    dropdownTrigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dropdownTrigger.click();
      } else if (e.key === "Escape") {
        dropdownContainer.classList.remove("open");
        dropdownTrigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdownContainer.contains(e.target)) {
        dropdownContainer.classList.remove("open");
        dropdownTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (DOM.searchInput) {
    DOM.searchInput.addEventListener(
      "input",
      debounce(() => {
        state.searchQuery = DOM.searchInput.value.toLowerCase();
        state.currentPage = 1;
      }, 100)
    );
  }

  if (DOM.historySearch) {
    DOM.historySearch.addEventListener(
      "input",
      debounce(() => {
        state.historySearchQuery = DOM.historySearch.value.toLowerCase();
        state.currentPage = 1;
      }, 200)
    );
  }

  if (DOM.settingsBtn) {
    DOM.settingsBtn.addEventListener("click", () => {
      if (state.appMode !== "settings") {
        state.appMode = "settings";
        const storedTheme = localStorage.getItem("theme") || "system";
        if (DOM.themeSelect) DOM.themeSelect.value = storedTheme;
        if (DOM.apiHostInput)
          DOM.apiHostInput.value = localStorage.getItem("apiHost") || "";

        document
          .querySelectorAll(".top-nav-btn")
          .forEach((b) => b.classList.remove("active"));
        DOM.settingsBtn.classList.add("active");
      }
    });
  }

  if (DOM.saveSettings) {
    DOM.saveSettings.addEventListener("click", () => {
      const selectedTheme = DOM.themeSelect.value;
      localStorage.setItem("theme", selectedTheme);

      if (selectedTheme === "dark") {
        state.isDarkMode = true;
      } else if (selectedTheme === "light") {
        state.isDarkMode = false;
      } else {
        state.isDarkMode =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      applyTheme(state.isDarkMode);

      const host = DOM.apiHostInput.value.trim();
      if (host) {
        localStorage.setItem("apiHost", host);
      } else {
        localStorage.removeItem("apiHost");
      }

      if (window.lensApiHost !== host) {
        window.location.reload();
      } else {
        document
          .querySelector('.top-nav-btn[data-mode="repositories"]')
          ?.click();
      }
    });
  }

  const settingsTabs = document.querySelectorAll("[data-settings-tab]");
  settingsTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.settingsTab;

      settingsTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".settings-group").forEach((g) => {
        g.style.display = "none";
      });

      const targetGroup = document.getElementById(`settings-group-${targetId}`);
      if (targetGroup) targetGroup.style.display = "block";
    });
  });
}

import { state } from "./state.js?v=100";
import {
  updateEventReq,
  deleteEventReq,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  getSettings,
  updateSettings,
} from "./api.js?v=100";
import { applyTheme, getAccentColor } from "./theme.js?v=100";
import { renderOverview } from "./charts.js?v=101";

let refreshDataCallback = null;

const escapeHtml = (unsafe) =>
  String(unsafe ?? "").replace(
    /[&<"'>]/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m]
  );

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(args), wait);
  };
};

const DOM = {};
export function initDOM() {
  DOM.sidebarList = document.getElementById("sidebar-list");
  DOM.groupControl = document.getElementById("sidebar-group-control");
  DOM.optionsContainer = document.getElementById("group-options-container");
  DOM.searchInput = document.getElementById("search-input");
  DOM.historySearch = document.getElementById("history-search");
  DOM.themeToggle = document.getElementById("theme-toggle");
  DOM.apiKeyInput = document.getElementById("api-key-input");
  DOM.viewTitle = document.getElementById("view-title");
  DOM.viewSubtitle = document.getElementById("view-subtitle");
  DOM.overviewBtn = document.querySelector('.tab-btn[data-tab="overview"]');
  DOM.navSettingsBtn = document.getElementById("nav-settings-btn");
  DOM.editModal = document.getElementById("edit-modal");
  DOM.traceTimeline = document.getElementById("artifact-trace-timeline");
  DOM.traceDetails = document.getElementById("trace-details-panel");
  DOM.panelTitle = document.getElementById("panel-title");
  DOM.panelBody = document.getElementById("panel-body");
}

export function renderArtifactTrace(versionQuery) {
  const container = document.getElementById("artifact-trace-timeline");
  if (!container) return;

  const detailsPanel = document.getElementById("trace-details-panel");
  if (detailsPanel) detailsPanel.style.display = "none";

  const matches = state.allEvents.filter(
    (e) =>
      e.artifact_version &&
      e.artifact_version.toLowerCase() === versionQuery.toLowerCase()
  );

  if (matches.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No lifecycle events found for version "<strong>${versionQuery}</strong>".</p></div>`;
    return;
  }

  matches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let html = "";
  matches.forEach((event, index) => {
    let stage = event.workflow_name;
    if (event.custom_data && event.custom_data.lifecycle_stage) {
      stage = event.custom_data.lifecycle_stage;
    }

    const dateStr = new Date(event.timestamp).toLocaleString();

    let hash = 0;
    for (let i = 0; i < stage.length; i++) {
      hash = stage.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % 10;
    const accentColor = getAccentColor(colorIdx);

    let nodeHtml = `
            <div class="trace-node node-dynamic" onclick="window.selectTraceNode(${index})" id="trace-node-${index}" style="--node-accent: ${accentColor}">
                <div class="trace-node-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${escapeHtml(stage.replace(/_/g, " "))}
                </div>
                <div class="trace-node-body">
                    <div class="trace-repo-name">${escapeHtml(event.repository)}</div>
                    <div class="trace-time">${escapeHtml(dateStr)}</div>
                </div>
            </div>
        `;

    html += nodeHtml;

    if (index < matches.length - 1) {
      html += `
                <div class="trace-connector">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
            `;
    }
  });

  window.currentTraceEvents = matches;
  container.innerHTML = html;

  if (matches.length > 0) {
    const detailsPanel = document.getElementById("trace-details-panel");
    const panelTitle = document.getElementById("panel-title");
    const panelBody = document.getElementById("panel-body");
    if (detailsPanel && panelTitle && panelBody) {
      panelTitle.textContent = "Event Details";
      panelBody.innerHTML = getEmptyPanelHtml();
      detailsPanel.style.display = "flex";
    }
  }
}

const getEmptyPanelHtml = () => `
    <div style="text-align: center; margin-top: 3rem; color: var(--text-secondary);">
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p style="margin: 0; font-size: 0.95rem;">Select an artifact node above to view its trace details.</p>
    </div>
`;

const formatDictionary = (data) => {
  if (!data || Object.keys(data).length === 0)
    return '<div class="empty-state" style="font-size: 0.85rem; color: var(--text-secondary);">None</div>';
  return `<div style="display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem; margin-top: 0.75rem;">${Object.entries(
    data
  )
    .map(([k, v]) => {
      const displayVal = typeof v === "object" ? JSON.stringify(v) : v;
      return `<div style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(k.replace(/_/g, " "))}</div><div style="font-family: monospace; font-size: 0.85rem; word-break: break-all; color: var(--text-primary);">${escapeHtml(displayVal)}</div>`;
    })
    .join("")}</div>`;
};

window.selectTraceNode = function (index) {
  if (!window.currentTraceEvents || !window.currentTraceEvents[index]) return;

  const activeNode = document.getElementById(`trace-node-${index}`);
  const isActive = activeNode && activeNode.classList.contains("active-node");

  const panelTitle = document.getElementById("panel-title");
  const panelBody = document.getElementById("panel-body");
  const detailsPanel = document.getElementById("trace-details-panel");
  if (!detailsPanel || !panelTitle || !panelBody) return;

  document
    .querySelectorAll(".trace-node")
    .forEach((node) => node.classList.remove("active-node"));

  if (isActive) {
    panelTitle.textContent = "Event Details";
    panelBody.innerHTML = getEmptyPanelHtml();
    return;
  }

  if (activeNode) activeNode.classList.add("active-node");

  const event = window.currentTraceEvents[index];

  panelTitle.textContent = `Details: ${escapeHtml(event.repository)} (${event.workflow_name || "Workflow"})`;

  let contentHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            <div class="details-section">
                <h4 style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Tags</h4>
                ${formatDictionary(event.tags)}
            </div>
            <div class="details-section">
                <h4 style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Custom Data</h4>
                ${formatDictionary(event.custom_data)}
            </div>
            <div class="details-section">
                <h4 style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Metrics</h4>
                ${formatDictionary(event.metrics)}
            </div>
        </div>
    `;

  panelBody.innerHTML = contentHtml;
  detailsPanel.style.display = "flex";
};

export function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const contentHeader = document.querySelector(".content-header");
  const navSettingsBtn = document.getElementById("nav-settings-btn");
  const logoBtn = document.getElementById("logo-btn");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.body.classList.remove("settings-active");
      contentHeader.style.display = "block";
      const settingsBtn = document.getElementById("nav-settings-btn");
      if (settingsBtn) settingsBtn.classList.remove("active");

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  if (navSettingsBtn) {
    navSettingsBtn.addEventListener("click", () => {
      document.body.classList.add("settings-active");
      document
        .querySelectorAll(".nav-item, .group-header")
        .forEach((b) => b.classList.remove("active"));
      tabBtns.forEach((b) => b.classList.remove("active"));
      navSettingsBtn.classList.add("active");

      contentHeader.style.display = "none";
      tabContents.forEach((c) => c.classList.remove("active"));
      document.getElementById("tab-settings").classList.add("active");
    });
  }

  if (logoBtn) {
    logoBtn.addEventListener("click", () => {
      document.body.classList.remove("settings-active");
      state.currentRepo = null;
      state.currentGroupVal = null;
      state.currentArtifact = null;

      const overviewBtn = document.querySelector(
        '.tab-btn[data-tab="overview"]'
      );
      if (overviewBtn) overviewBtn.click();

      renderSidebar();
      renderDashboard();
    });
  }

  const topNavBtns = document.querySelectorAll(".top-nav-btn");
  topNavBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      const isSettingsActive =
        document.body.classList.contains("settings-active");

      if (state.appMode === mode && !isSettingsActive) return;

      state.appMode = mode;
      state.currentRepo = null;
      state.currentGroupVal = null;
      state.currentArtifact = null;

      topNavBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const overviewBtn = document.querySelector(
        '.tab-btn[data-tab="overview"]'
      );
      if (overviewBtn) overviewBtn.click();

      document.body.classList.remove("settings-active");
      const settingsBtn = document.getElementById("nav-settings-btn");
      if (settingsBtn) settingsBtn.classList.remove("active");

      renderSidebar();
      renderDashboard();
    });
  });

  const settingsTabs = document.querySelectorAll("[data-settings-tab]");
  settingsTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.settingsTab;
      const titleEl = document.getElementById("settings-title");

      // Update active state in sidebar
      settingsTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Update title
      if (titleEl) titleEl.textContent = btn.textContent;

      // Show corresponding group
      document.querySelectorAll(".settings-group").forEach((g) => {
        g.style.display = "none";
        g.classList.remove("active");
      });
      const targetGroup = document.getElementById(`settings-group-${targetId}`);
      if (targetGroup) {
        targetGroup.style.display = "block";
        // Small timeout to allow display: block to apply before animation class
        setTimeout(() => targetGroup.classList.add("active"), 10);
      }
    });
  });
}

export function initControls(refreshCb) {
  refreshDataCallback = refreshCb;
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

  if (dropdownContainer) {
    dropdownMenu.innerHTML = "";

    const noneBtn = document.createElement("button");
    noneBtn.className = "dropdown-item active";
    noneBtn.dataset.value = "none";
    noneBtn.textContent = "Group By: None";
    dropdownMenu.appendChild(noneBtn);

    Array.from(tagKeys)
      .sort()
      .forEach((key) => {
        const opt = document.createElement("button");
        opt.className = "dropdown-item";
        opt.dataset.value = key;
        opt.textContent = `Group By: ${key.charAt(0).toUpperCase() + key.slice(1)}`;
        dropdownMenu.appendChild(opt);
      });

    dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownContainer.classList.toggle("open");
    });

    dropdownMenu.addEventListener("click", (e) => {
      if (e.target.classList.contains("dropdown-item")) {
        const val = e.target.dataset.value;

        dropdownMenu
          .querySelectorAll(".dropdown-item")
          .forEach((el) => el.classList.remove("active"));
        e.target.classList.add("active");
        dropdownLabel.textContent = e.target.textContent;
        dropdownContainer.classList.remove("open");

        state.currentGroupKey = val === "none" ? null : val;
        state.currentGroupVal = null;
        state.currentRepo = null;
        state.currentArtifact = null;
        renderSidebar();
        renderDashboard();
      }
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!dropdownContainer.contains(e.target)) {
        dropdownContainer.classList.remove("open");
      }
    });
  }

  if (DOM.searchInput) {
    DOM.searchInput.addEventListener(
      "input",
      debounce(() => {
        state.searchQuery = DOM.searchInput.value.toLowerCase();
        renderSidebar();
      }, 100)
    );
  }

  if (DOM.historySearch) {
    DOM.historySearch.addEventListener(
      "input",
      debounce(() => {
        state.historySearchQuery = DOM.historySearch.value.toLowerCase();
        renderDashboard();
      }, 200)
    );
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.checked = state.isDarkMode;
    themeToggle.addEventListener("change", (e) => {
      state.isDarkMode = e.target.checked;
      localStorage.setItem("theme", state.isDarkMode ? "dark" : "light");
      applyTheme(state.isDarkMode);
      renderDashboard(true);
    });
  }

  const apiKeysList = document.getElementById("api-keys-list");
  const btnCreateKey = document.getElementById("btn-create-key");
  const newKeyAlert = document.getElementById("new-key-alert");
  const newKeyDisplay = document.getElementById("new-key-display");

  async function refreshActionKeys() {
    const actionKeysCard = document.getElementById("action-keys-card");
    const logoutCard = document.getElementById("logout-card");
    const loginCard = document.getElementById("login-card");

    if (!state.isLoggedIn) {
      if (actionKeysCard) actionKeysCard.style.display = "none";
      if (logoutCard) logoutCard.style.display = "none";
      if (loginCard) loginCard.style.display = "block";
      return;
    } else {
      if (actionKeysCard) actionKeysCard.style.display = "block";
      if (logoutCard) logoutCard.style.display = "block";
      if (loginCard) loginCard.style.display = "none";
    }

    const keys = await fetchApiKeys();
    if (!keys || !actionKeysCard || !apiKeysList) {
      if (actionKeysCard) actionKeysCard.style.display = "none";
      return;
    }

    actionKeysCard.style.display = "block";
    apiKeysList.innerHTML = keys
      .map(
        (k) => `
          <tr>
              <td>${escapeHtml(k.name)}</td>
              <td><code>${escapeHtml(k.prefix)}...</code></td>
              <td class="timestamp">${new Date(k.created_at).toLocaleString()}</td>
              <td>
                  <span class="status-badge ${k.is_active ? "success" : "error"}">
                      ${k.is_active ? "Active" : "Revoked"}
                  </span>
              </td>
              <td>
                  ${k.is_active ? `<button class="btn btn-danger btn-sm" onclick="window.revokeActionKey(${k.id})">Revoke</button>` : ""}
              </td>
          </tr>
      `
      )
      .join("");
  }

  window.revokeActionKey = async (id) => {
    if (
      confirm(
        "Are you sure you want to revoke this key? This cannot be undone."
      )
    ) {
      if (await revokeApiKey(id)) {
        await refreshActionKeys();
      } else {
        alert("Failed to revoke key.");
      }
    }
  };

  if (btnCreateKey) {
    btnCreateKey.addEventListener("click", async () => {
      const name = prompt(
        "Enter a description for this Action Key (e.g. 'Deploy Action'):"
      );
      if (!name) return;

      const newKey = await createApiKey(name);
      if (newKey) {
        newKeyDisplay.textContent = newKey.raw_key;
        newKeyAlert.style.display = "block";
        await refreshActionKeys();
      } else {
        alert("Failed to create key.");
      }
    });
  }

  async function refreshSystemSettings() {
    const systemNav = document.getElementById("settings-system-nav");
    if (!state.isLoggedIn) {
      if (systemNav) systemNav.style.display = "none";
      return;
    }
    if (systemNav) systemNav.style.display = "block";

    const config = await getSettings();
    if (!config) return;

    document.getElementById("setting-retention-days").value =
      config.retention_days;
    document.getElementById("setting-rate-limit-events").value =
      config.rate_limit_events;
    document.getElementById("setting-rate-limit-api").value =
      config.rate_limit_api;
    document.getElementById("setting-default-view").value =
      config.default_dashboard_view;
    document.getElementById("setting-default-timeframe").value =
      config.default_timeframe_days;
  }

  const btnSaveSystemSettings = document.getElementById(
    "btn-save-system-settings"
  );
  if (btnSaveSystemSettings) {
    btnSaveSystemSettings.addEventListener("click", async () => {
      const payload = {
        retention_days: parseInt(
          document.getElementById("setting-retention-days").value,
          10
        ),
        rate_limit_events: document.getElementById("setting-rate-limit-events")
          .value,
        rate_limit_api: document.getElementById("setting-rate-limit-api").value,
        default_dashboard_view: document.getElementById("setting-default-view")
          .value,
        default_timeframe_days: parseInt(
          document.getElementById("setting-default-timeframe").value,
          10
        ),
      };

      const updated = await updateSettings(payload);
      if (updated) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings.");
      }
    });
  }

  refreshActionKeys();
  refreshSystemSettings();
}

function eventMatchesSearch(e, q) {
  if (!q) return true;

  if (e.repository?.toLowerCase().includes(q)) return true;
  if (e.artifact_version?.toLowerCase().includes(q)) return true;

  const searchDict = (dict) =>
    Object.entries(dict ?? {}).some(
      ([k, v]) =>
        String(k).toLowerCase().includes(q) ||
        String(v).toLowerCase().includes(q)
    );

  return searchDict(e.tags) || searchDict(e.custom_data);
}

function historyEventMatchesSearch(e, q) {
  if (!q) return true;

  if (
    String(e.id ?? "")
      .toLowerCase()
      .includes(q)
  )
    return true;
  if (e.repository?.toLowerCase().includes(q)) return true;
  if (e.commit_sha?.toLowerCase().includes(q)) return true;
  if (e.artifact_version?.toLowerCase().includes(q)) return true;

  const searchDict = (dict) =>
    Object.entries(dict ?? {}).some(
      ([k, v]) =>
        String(k).toLowerCase().includes(q) ||
        String(v).toLowerCase().includes(q)
    );

  return (
    searchDict(e.tags) || searchDict(e.custom_data) || searchDict(e.metrics)
  );
}

function getFilteredEventsForSidebar() {
  if (!state.searchQuery) return state.allEvents;
  return state.allEvents.filter((e) =>
    eventMatchesSearch(e, state.searchQuery)
  );
}

export function renderSidebar() {
  const sidebarList = document.getElementById("sidebar-list");
  const groupControl = document.getElementById("sidebar-group-control");
  if (!sidebarList) return;

  sidebarList.innerHTML = "";
  const filteredEvents = getFilteredEventsForSidebar();
  let firstItemSet = false;

  if (state.appMode === "repositories") {
    if (groupControl) groupControl.style.display = "block";

    if (!state.currentGroupKey) {
      const repos = new Set();
      filteredEvents.forEach((e) => repos.add(e.repository));

      Array.from(repos)
        .sort()
        .forEach((repo) => {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.className = "nav-item";

          if (!state.currentRepo && !state.currentGroupVal && !firstItemSet) {
            state.currentRepo = repo;
            firstItemSet = true;
          }
          if (state.currentRepo === repo) btn.classList.add("active");

          btn.textContent = repo.split("/").pop() || repo;

          btn.addEventListener("click", () => {
            state.currentRepo = repo;
            state.currentGroupVal = null;
            state.currentArtifact = null;
            renderSidebar();
            renderDashboard();
          });
          li.appendChild(btn);
          sidebarList.appendChild(li);
        });
    } else {
      const groups = {};
      filteredEvents.forEach((e) => {
        if (e.tags && e.tags[state.currentGroupKey]) {
          const gVal = e.tags[state.currentGroupKey];
          if (!groups[gVal]) groups[gVal] = new Set();
          groups[gVal].add(e.repository);
        }
      });

      Object.keys(groups)
        .sort()
        .forEach((gVal) => {
          const groupLi = document.createElement("li");

          const groupBtn = document.createElement("button");
          groupBtn.className = "group-header";
          if (state.currentGroupVal === gVal && !state.currentRepo)
            groupBtn.classList.add("active");
          groupBtn.textContent = String(gVal).toUpperCase();

          if (!state.currentRepo && !state.currentGroupVal && !firstItemSet) {
            state.currentGroupVal = gVal;
            groupBtn.classList.add("active");
            firstItemSet = true;
          }

          groupBtn.addEventListener("click", () => {
            state.currentGroupVal = gVal;
            state.currentRepo = null;
            renderSidebar();
            renderDashboard();
          });
          groupLi.appendChild(groupBtn);

          const nestedUl = document.createElement("ul");
          nestedUl.className = "nested-list";
          Array.from(groups[gVal])
            .sort()
            .forEach((repo) => {
              const rLi = document.createElement("li");
              const rBtn = document.createElement("button");
              rBtn.className = "nav-item";
              if (state.currentRepo === repo) rBtn.classList.add("active");
              rBtn.textContent = repo.split("/").pop() || repo;

              rBtn.addEventListener("click", () => {
                state.currentRepo = repo;
                state.currentGroupVal = gVal;
                state.currentArtifact = null;
                renderSidebar();
                renderDashboard();
              });

              rLi.appendChild(rBtn);
              nestedUl.appendChild(rLi);
            });

          groupLi.appendChild(nestedUl);
          sidebarList.appendChild(groupLi);
        });
    }
  } else if (state.appMode === "artifacts") {
    if (groupControl) groupControl.style.display = "none";

    const artifacts = new Set();
    filteredEvents.forEach((e) => {
      if (e.artifact_version) artifacts.add(e.artifact_version);
    });

    Array.from(artifacts)
      .sort()
      .forEach((art) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "nav-item";

        if (!state.currentArtifact && !firstItemSet) {
          state.currentArtifact = art;
          firstItemSet = true;
        }
        if (state.currentArtifact === art) btn.classList.add("active");

        btn.textContent = art;

        btn.addEventListener("click", () => {
          state.currentArtifact = art;
          state.currentRepo = null;
          state.currentGroupVal = null;
          renderSidebar();
          renderDashboard();
        });
        li.appendChild(btn);
        sidebarList.appendChild(li);
      });
  }
}

export function renderDashboard(keepSettingsOpen = false) {
  const navSettingsBtn = document.getElementById("nav-settings-btn");
  if (
    !keepSettingsOpen &&
    navSettingsBtn &&
    navSettingsBtn.classList.contains("active")
  ) {
    const overviewBtn = document.querySelector('.tab-btn[data-tab="overview"]');
    if (overviewBtn) overviewBtn.click();
  }

  let dashboardEvents = state.allEvents;
  let title =
    state.appMode === "repositories" ? "All Repositories" : "All Artifacts";
  let subtitle = "Overview of all aggregated data";

  if (state.appMode === "artifacts") {
    if (state.currentArtifact) {
      dashboardEvents = state.allEvents.filter(
        (e) => e.artifact_version === state.currentArtifact
      );
      title = `Artifact: ${state.currentArtifact}`;
      subtitle = `Tracing artifacts across all repositories`;
    }
  } else {
    if (state.currentRepo) {
      dashboardEvents = state.allEvents.filter(
        (e) => e.repository === state.currentRepo
      );
      title = state.currentRepo;
      subtitle = `Detailed overview for ${state.currentRepo}`;
    } else if (state.currentGroupVal && state.currentGroupKey) {
      dashboardEvents = state.allEvents.filter(
        (e) => e.tags && e.tags[state.currentGroupKey] === state.currentGroupVal
      );
      title = `Group: ${state.currentGroupVal}`;
      subtitle = `Aggregated data for all repositories where ${state.currentGroupKey} = ${state.currentGroupVal}`;
    }
  }

  document.getElementById("view-title").textContent = title;
  document.getElementById("view-subtitle").textContent = subtitle;

  renderOverview(
    dashboardEvents,
    !!state.currentRepo || !!state.currentGroupVal
  );

  let gridEvents = dashboardEvents;
  if (state.historySearchQuery) {
    gridEvents = dashboardEvents.filter((e) =>
      historyEventMatchesSearch(e, state.historySearchQuery)
    );
  }

  renderDataGrid(gridEvents);
}

export function renderDataGrid(events) {
  const thead = document.getElementById("data-table-head");
  const tbody = document.getElementById("data-table-body");

  thead.innerHTML = "";
  tbody.innerHTML = "";
  if (events.length === 0) return;

  const columns = ["id", "repository", "commit_sha"];

  const trHead = document.createElement("tr");

  const thToggle = document.createElement("th");
  thToggle.style.width = "30px";
  trHead.appendChild(thToggle);

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.replace(/_/g, " ");
    trHead.appendChild(th);
  });

  thead.appendChild(trHead);

  events
    .slice(-100)
    .reverse()
    .forEach((event) => {
      const tr = document.createElement("tr");
      tr.className = "grid-row-master";

      const tdToggle = document.createElement("td");
      tdToggle.innerHTML = `<span class="chevron">&#9654;</span>`;
      tdToggle.className = "toggle-cell";
      tr.appendChild(tdToggle);

      columns.forEach((col) => {
        const td = document.createElement("td");
        let val = event[col];
        if (val === undefined || val === null) val = "-";
        if (col === "commit_sha" && typeof val === "string" && val.length > 7)
          val = val.substring(0, 7);
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);

      const formatDictionaryRow = (data) => {
        if (!data || Object.keys(data).length === 0)
          return '<span class="empty-state">None</span>';
        return `<dl class="data-list">${Object.entries(data)
          .map(([k, v]) => {
            const displayVal = typeof v === "object" ? JSON.stringify(v) : v;
            return `<div class="data-row"><dt>${escapeHtml(k.replace(/_/g, " "))}</dt><dd>${escapeHtml(displayVal)}</dd></div>`;
          })
          .join("")}</dl>`;
      };

      const detailsTr = document.createElement("tr");
      detailsTr.className = "grid-row-details";
      detailsTr.style.display = "none";

      const detailsTd = document.createElement("td");
      detailsTd.colSpan = columns.length + 1;

      detailsTd.innerHTML = `
            <div class="details-pane">
                <div class="details-content">
                    <div class="details-section">
                        <h4>Tags</h4>
                        ${formatDictionaryRow(event.tags)}
                    </div>
                    <div class="details-section">
                        <h4>Custom Data</h4>
                        ${formatDictionaryRow(event.custom_data)}
                    </div>
                    <div class="details-section">
                        <h4>Metrics</h4>
                        ${formatDictionaryRow(event.metrics)}
                    </div>
                </div>
                ${
                  state.isLoggedIn
                    ? `
                <div class="details-actions">
                    <button class="action-btn edit-btn">Edit</button>
                    <button class="action-btn delete-btn delete">Delete</button>
                </div>
                `
                    : ""
                }
            </div>
        `;

      if (state.isLoggedIn) {
        const editBtn = detailsTd.querySelector(".edit-btn");
        editBtn.addEventListener("click", () => openEditModal(event.id));

        const deleteBtn = detailsTd.querySelector(".delete-btn");
        deleteBtn.addEventListener("click", () => deleteEvent(event.id));
      }

      detailsTr.appendChild(detailsTd);
      tbody.appendChild(detailsTr);

      tr.addEventListener("click", () => {
        const isExpanded = detailsTr.style.display === "table-row";
        detailsTr.style.display = isExpanded ? "none" : "table-row";
        tr.classList.toggle("expanded", !isExpanded);
        tdToggle
          .querySelector(".chevron")
          .classList.toggle("expanded", !isExpanded);
      });
    });
}

export function initModal(refreshCb) {
  refreshDataCallback = refreshCb;
  const modal = document.getElementById("edit-modal");
  const closeBtn = document.getElementById("modal-close");
  const cancelBtn = document.getElementById("modal-cancel");
  const form = document.getElementById("edit-form");

  const closeFn = () => (modal.style.display = "none");
  closeBtn.addEventListener("click", closeFn);
  cancelBtn.addEventListener("click", closeFn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-event-id").value;
    const tagsRaw = document.getElementById("edit-tags").value;
    const dataRaw = document.getElementById("edit-custom-data").value;
    const metricsRaw = document.getElementById("edit-metrics").value;

    try {
      const payload = {
        tags: tagsRaw ? JSON.parse(tagsRaw) : null,
        custom_data: dataRaw ? JSON.parse(dataRaw) : null,
        metrics: metricsRaw ? JSON.parse(metricsRaw) : null,
      };

      const ok = await updateEventReq(id, payload);

      if (ok) {
        closeFn();
        if (refreshDataCallback) await refreshDataCallback();
      } else {
        alert("Failed to update event");
      }
    } catch (err) {
      alert("Invalid JSON format or network error: " + err.message);
    }
  });
}

export function openEditModal(id) {
  const event = state.allEvents.find((e) => e.id === id);
  if (!event) return;

  document.getElementById("edit-event-id").value = event.id;
  document.getElementById("edit-tags").value = event.tags
    ? JSON.stringify(event.tags, null, 2)
    : "";
  document.getElementById("edit-custom-data").value = event.custom_data
    ? JSON.stringify(event.custom_data, null, 2)
    : "";
  document.getElementById("edit-metrics").value = event.metrics
    ? JSON.stringify(event.metrics, null, 2)
    : "";

  document.getElementById("edit-modal").style.display = "flex";
}

export async function deleteEvent(id) {
  if (!confirm("Are you sure you want to delete this event?")) return;

  try {
    const ok = await deleteEventReq(id);
    if (ok) {
      if (refreshDataCallback) await refreshDataCallback();
    } else {
      alert("Failed to delete event");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

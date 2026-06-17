import { html, render } from "lit";
import { state, subscribe } from "../state/store.js";
import { applyTheme, getAccentColor } from "./theme.js";
import { renderOverview } from "./charts.js";
import {
  escapeHtml,
  debounce,
  formatDictionary,
  formatDictionaryRow,
} from "../utils/formatters.js";

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
  DOM.editModal = document.getElementById("edit-modal");
  DOM.traceTimeline = document.getElementById("artifact-trace-timeline");
  DOM.traceDetails = document.getElementById("trace-details-panel");
  DOM.panelTitle = document.getElementById("panel-title");
  DOM.panelBody = document.getElementById("panel-body");

  subscribe(() => {
    renderSidebar();
    renderDashboard();
  });
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
  const logoBtn = document.getElementById("logo-btn");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      contentHeader.style.display = "block";

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  if (logoBtn) {
    logoBtn.addEventListener("click", () => {
      // state.currentRepo = null; removed to prevent All Repos view
      state.currentGroupVal = null;
      state.currentArtifact = null;

      const overviewBtn = document.querySelector(
        '.tab-btn[data-tab="overview"]'
      );
      if (overviewBtn) overviewBtn.click();
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

      const overviewBtn = document.querySelector(
        '.tab-btn[data-tab="overview"]'
      );
      if (overviewBtn) overviewBtn.click();
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

  if (dropdownContainer) {
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

    // Close on click outside
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

  const filteredEvents = getFilteredEventsForSidebar();
  let firstItemSet = false;

  let template;

  if (state.appMode === "repositories") {
    if (groupControl) groupControl.style.display = "block";

    if (!state.currentGroupKey) {
      const repos = new Set();
      filteredEvents.forEach((e) => repos.add(e.repository));

      template = html`
        ${Array.from(repos)
          .sort()
          .map((repo) => {
            if (!state.currentRepo && !state.currentGroupVal && !firstItemSet) {
              state.currentRepo = repo;
              firstItemSet = true;
            }
            const isActive = state.currentRepo === repo;
            const label = repo.split("/").pop() || repo;
            const onClick = () => {
              state.currentRepo = repo;
              state.currentGroupVal = null;
              state.currentArtifact = null;
            };
            return html`
              <li>
                <button
                  class="nav-item ${isActive ? "active" : ""}"
                  @click=${onClick}
                >
                  ${label}
                </button>
              </li>
            `;
          })}
      `;
    } else {
      const groups = {};
      filteredEvents.forEach((e) => {
        if (e.tags && e.tags[state.currentGroupKey]) {
          const gVal = e.tags[state.currentGroupKey];
          if (!groups[gVal]) groups[gVal] = new Set();
          groups[gVal].add(e.repository);
        }
      });

      template = html`
        ${Object.keys(groups)
          .sort()
          .map((gVal) => {
            if (!state.currentRepo && !firstItemSet) {
              state.currentGroupVal = gVal;
              // Auto-select the first repo in this group instead of an aggregate view
              state.currentRepo = Array.from(groups[gVal]).sort()[0];
              firstItemSet = true;
            }

            return html`
              <li>
                <div class="group-header">${String(gVal).toUpperCase()}</div>
                <ul class="nested-list">
                  ${Array.from(groups[gVal])
                    .sort()
                    .map((repo) => {
                      const isActive = state.currentRepo === repo;
                      const label = repo.split("/").pop() || repo;
                      const onRepoClick = () => {
                        state.currentRepo = repo;
                        state.currentGroupVal = gVal;
                        state.currentArtifact = null;
                      };
                      return html`
                        <li>
                          <button
                            class="nav-item ${isActive ? "active" : ""}"
                            @click=${onRepoClick}
                          >
                            ${label}
                          </button>
                        </li>
                      `;
                    })}
                </ul>
              </li>
            `;
          })}
      `;
    }
  } else if (state.appMode === "artifacts") {
    if (groupControl) groupControl.style.display = "none";

    const artifacts = new Set();
    filteredEvents.forEach((e) => {
      if (e.artifact_version) artifacts.add(e.artifact_version);
    });

    template = html`
      ${Array.from(artifacts)
        .sort()
        .map((art) => {
          if (!state.currentArtifact && !firstItemSet) {
            state.currentArtifact = art;
            firstItemSet = true;
          }
          const isActive = state.currentArtifact === art;
          const onClick = () => {
            state.currentArtifact = art;
            state.currentRepo = null;
            state.currentGroupVal = null;
          };
          return html`
            <li>
              <button
                class="nav-item ${isActive ? "active" : ""}"
                @click=${onClick}
              >
                ${art}
              </button>
            </li>
          `;
        })}
    `;
  }

  render(template, sidebarList);
}

export function renderDashboard() {
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
    if (state.currentGroupVal && state.currentGroupKey) {
      dashboardEvents = dashboardEvents.filter(
        (e) => e.tags && e.tags[state.currentGroupKey] === state.currentGroupVal
      );
    }

    if (state.currentRepo) {
      dashboardEvents = dashboardEvents.filter(
        (e) => e.repository === state.currentRepo
      );
      title = state.currentRepo;
      if (state.currentGroupVal) {
        subtitle = `Detailed overview for ${state.currentRepo} in ${state.currentGroupVal}`;
      } else {
        subtitle = `Detailed overview for ${state.currentRepo}`;
      }
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

  if (events.length === 0) {
    render(html``, thead);
    render(html``, tbody);
    return;
  }

  const columns = ["id", "repository", "commit_sha"];

  const headTemplate = html`
    <tr>
      <th style="width: 30px;"></th>
      ${columns.map((col) => html`<th>${col.replace(/_/g, " ")}</th>`)}
    </tr>
  `;
  render(headTemplate, thead);

  const toggleRow = (e) => {
    const tr = e.currentTarget;
    const detailsTr = tr.nextElementSibling;
    const isExpanded = detailsTr.style.display === "table-row";
    detailsTr.style.display = isExpanded ? "none" : "table-row";
    tr.classList.toggle("expanded", !isExpanded);
    const chevron = tr.querySelector(".chevron");
    if (chevron) chevron.classList.toggle("expanded", !isExpanded);
  };

  const bodyTemplate = html`
    ${events
      .slice(-100)
      .reverse()
      .map((event) => {
        return html`
          <tr class="grid-row-master" @click=${toggleRow}>
            <td class="toggle-cell"><span class="chevron">&#9654;</span></td>
            ${columns.map((col) => {
              let val = event[col] ?? "-";
              if (
                col === "commit_sha" &&
                typeof val === "string" &&
                val.length > 7
              ) {
                val = val.substring(0, 7);
              }
              return html`<td>${val}</td>`;
            })}
          </tr>
          <tr class="grid-row-details" style="display: none;">
            <td colspan="${columns.length + 1}">
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
              </div>
            </td>
          </tr>
        `;
      })}
  `;
  render(bodyTemplate, tbody);
}

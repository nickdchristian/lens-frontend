import { state } from "../state/store.js";
import { applyTheme, getAccentColor } from "./theme.js";
import { renderOverview } from "./charts.js";
import { escapeHtml, debounce, formatDictionary, formatDictionaryRow } from "../utils/formatters.js";

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

      renderSidebar();
      renderDashboard();
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

            </div>
        `;

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

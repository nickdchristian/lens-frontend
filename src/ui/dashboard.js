import { html, render } from "lit";
import { state } from "../state/store.js";
import { DOM } from "./dom.js";
import { renderOverview } from "./charts.js";
import { formatDictionary } from "../utils/formatters.js";

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

export function renderDashboard() {
  if (!DOM.tabOverview || !DOM.tabHistory || !DOM.tabSettings) return;

  if (state.appMode === "settings") {
    if (DOM.viewHeader) DOM.viewHeader.style.display = "none";
    DOM.tabOverview.style.display = "none";
    DOM.tabHistory.style.display = "none";
    if (DOM.tabArtifact) DOM.tabArtifact.style.display = "none";
    DOM.tabSettings.style.display = "block";
    DOM.tabSettings.classList.add("active");
    return;
  } else {
    if (DOM.viewHeader) DOM.viewHeader.style.display = "block";
    DOM.tabSettings.style.display = "none";
    DOM.tabSettings.classList.remove("active");
    // Restore default tab display
    document.querySelectorAll(".tab-content").forEach((c) => {
      if (c.id !== "tab-settings") {
        c.style.display = ""; // remove inline display block/none
      }
    });
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
    if (state.currentGroupVal && state.currentGroupKey) {
      const repoToGroup = {};
      state.allEvents.forEach((e) => {
        if (
          !repoToGroup[e.repository] &&
          e.tags &&
          e.tags[state.currentGroupKey]
        ) {
          repoToGroup[e.repository] = e.tags[state.currentGroupKey];
        }
      });

      const reposInGroup = new Set();
      Object.entries(repoToGroup).forEach(([repo, gVal]) => {
        if (gVal === state.currentGroupVal) reposInGroup.add(repo);
      });

      dashboardEvents = dashboardEvents.filter((e) =>
        reposInGroup.has(e.repository)
      );
      if (!state.currentRepo) {
        title = `Group: ${state.currentGroupVal}`;
        subtitle = `Aggregated overview of repositories in ${state.currentGroupVal}`;
      }
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

  DOM.viewTitle.textContent = title;
  DOM.viewSubtitle.textContent = subtitle;

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
  const thead = DOM.dataTableHead;
  const tbody = DOM.dataTableBody;
  const paginationControls = DOM.paginationControls;

  if (events.length === 0) {
    if (thead) render(html``, thead);
    if (tbody) render(html``, tbody);
    if (paginationControls) render(html``, paginationControls);
    return;
  }

  const columns = ["id", "repository", "commit_sha"];

  const headTemplate = html`
    <tr>
      <th style="width: 30px;"></th>
      ${columns.map((col) => html`<th>${col.replace(/_/g, " ")}</th>`)}
    </tr>
  `;
  if (thead) render(headTemplate, thead);

  const toggleRow = (e) => {
    const tr = e.currentTarget;
    const detailsTr = tr.nextElementSibling;
    const isExpanded = detailsTr.style.display === "table-row";
    detailsTr.style.display = isExpanded ? "none" : "table-row";
    tr.classList.toggle("expanded", !isExpanded);
    const chevron = tr.querySelector(".chevron");
    if (chevron) chevron.classList.toggle("expanded", !isExpanded);
  };

  const totalEvents = events.length;
  const totalPages = Math.ceil(totalEvents / state.eventsPerPage) || 1;

  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIndex = (state.currentPage - 1) * state.eventsPerPage;
  const paginatedEvents = events.slice(
    startIndex,
    startIndex + state.eventsPerPage
  );

  const bodyTemplate = html`
    ${paginatedEvents.map((event) => {
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
              <div
                class="details-content"
                style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;"
              >
                <div class="details-section">
                  <h4
                    style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
                  >
                    Tags
                  </h4>
                  ${formatDictionary(event.tags)}
                </div>
                <div class="details-section">
                  <h4
                    style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
                  >
                    Custom Data
                  </h4>
                  ${formatDictionary(event.custom_data)}
                </div>
                <div class="details-section">
                  <h4
                    style="margin: 0; color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
                  >
                    Metrics
                  </h4>
                  ${formatDictionary(event.metrics)}
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })}
  `;
  if (tbody) render(bodyTemplate, tbody);

  if (paginationControls) {
    if (totalEvents > state.eventsPerPage) {
      const onPrev = () => {
        if (state.currentPage > 1) state.currentPage--;
      };
      const onNext = () => {
        if (state.currentPage < totalPages) state.currentPage++;
      };

      const paginationTemplate = html`
        <span class="pagination-info"
          >Page ${state.currentPage} of ${totalPages} (${totalEvents}
          events)</span
        >
        <div class="pagination-buttons">
          <button
            class="icon-btn"
            ?disabled=${state.currentPage === 1}
            @click=${onPrev}
            aria-label="Previous page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            class="icon-btn"
            ?disabled=${state.currentPage === totalPages}
            @click=${onNext}
            aria-label="Next page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      `;
      render(paginationTemplate, paginationControls);
    } else {
      render(html``, paginationControls);
    }
  }
}

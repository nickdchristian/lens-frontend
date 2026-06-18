import { html, render } from "lit";
import { state } from "../state/store.js";
import { DOM } from "./dom.js";

function eventMatchesSearch(e, q) {
  if (!q) return true;

  if (e.repository?.toLowerCase().includes(q)) return true;
  if (e.artifact?.name?.toLowerCase().includes(q)) return true;
  if (e.artifact?.version?.toLowerCase().includes(q)) return true;

  const searchDict = (dict) =>
    Object.entries(dict ?? {}).some(
      ([k, v]) =>
        String(k).toLowerCase().includes(q) ||
        String(v).toLowerCase().includes(q)
    );

  return searchDict(e.tags) || searchDict(e.custom_data);
}

function getFilteredEventsForSidebar() {
  if (!state.searchQuery) return state.allEvents;
  return state.allEvents.filter((e) =>
    eventMatchesSearch(e, state.searchQuery)
  );
}

export function renderSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const repoNav = DOM.sidebarNavRepo;
  const artifactNav = DOM.sidebarNavArtifacts;
  const settingsNav = DOM.sidebarNavSettings;

  if (!sidebar || !repoNav) return;

  if (state.appMode === "settings") {
    repoNav.style.display = "none";
    if (artifactNav) artifactNav.style.display = "none";
    if (settingsNav) settingsNav.style.display = "block";
    return;
  } else {
    sidebar.style.display = "flex";
    if (settingsNav) settingsNav.style.display = "none";
    if (state.appMode === "artifacts" && artifactNav) {
      repoNav.style.display = "none";
      artifactNav.style.display = "block";
    } else {
      repoNav.style.display = "block";
      if (artifactNav) artifactNav.style.display = "none";
    }
  }

  const sidebarSectionTitle = DOM.sidebarSectionTitle;
  if (sidebarSectionTitle) {
    if (state.appMode === "artifacts") {
      sidebarSectionTitle.textContent = "Artifacts";
    } else {
      sidebarSectionTitle.textContent = "Repositories";
    }
  }

  const sidebarList = DOM.sidebarList;
  const groupControl = DOM.groupControl;
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
              state.currentPage = 1;
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
      const repoToGroup = {};

      filteredEvents.forEach((e) => {
        if (
          !repoToGroup[e.repository] &&
          e.tags &&
          e.tags[state.currentGroupKey]
        ) {
          repoToGroup[e.repository] = e.tags[state.currentGroupKey];
        }
      });

      Object.entries(repoToGroup).forEach(([repo, gVal]) => {
        if (!groups[gVal]) groups[gVal] = new Set();
        groups[gVal].add(repo);
      });

      template = html`
        ${Object.keys(groups)
          .sort()
          .map((gVal) => {
            if (!state.currentRepo && !state.currentGroupVal && !firstItemSet) {
              state.currentGroupVal = gVal;
              state.currentRepo = null; // Auto-select group aggregate view
              firstItemSet = true;
            }

            const isGroupActive =
              state.currentGroupVal === gVal && !state.currentRepo;
            const onGroupClick = () => {
              state.currentGroupVal = gVal;
              state.currentRepo = null;
              state.currentArtifact = null;
              state.currentPage = 1;
            };

            return html`
              <li>
                <button
                  class="group-header ${isGroupActive ? "active" : ""}"
                  style="width: 100%; text-align: left; cursor: pointer; border: none;"
                  @click=${onGroupClick}
                >
                  ${String(gVal).toUpperCase()}
                </button>
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
                        state.currentPage = 1;
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

    const artifactsByName = {};
    filteredEvents.forEach((e) => {
      if (e.artifact && e.artifact.name && e.artifact.version) {
        if (!artifactsByName[e.artifact.name]) {
          artifactsByName[e.artifact.name] = new Set();
        }
        artifactsByName[e.artifact.name].add(e.artifact.version);
      }
    });

    template = html`
      ${Object.keys(artifactsByName)
        .sort()
        .map((artName) => {
          return html`
            <li>
              <div
                class="group-header"
                style="width: 100%; text-align: left; border: none; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;"
              >
                ${artName}
              </div>
              <ul class="nested-list">
                ${Array.from(artifactsByName[artName])
                  .sort()
                  .map((artVersion) => {
                    const isActive =
                      state.currentArtifact?.name === artName &&
                      state.currentArtifact?.version === artVersion;

                    if (!state.currentArtifact && !firstItemSet) {
                      state.currentArtifact = {
                        name: artName,
                        version: artVersion,
                      };
                      firstItemSet = true;
                    }

                    const onClick = () => {
                      state.currentArtifact = {
                        name: artName,
                        version: artVersion,
                      };
                      state.currentRepo = null;
                      state.currentGroupVal = null;
                      state.currentPage = 1;
                    };
                    return html`
                      <li>
                        <button
                          class="nav-item ${isActive ? "active" : ""}"
                          @click=${onClick}
                        >
                          ${artVersion}
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

  render(template, sidebarList);
}

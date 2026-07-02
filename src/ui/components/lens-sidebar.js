import { LitElement, html } from "lit";
import { state, StoreController } from "../../state/store.js";

export class LensSidebar extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      isDropdownOpen: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.storeController = new StoreController(this);
    this.isDropdownOpen = false;

    // Handle clicks outside the dropdown
    this._handleWindowClick = (e) => {
      if (this.isDropdownOpen) {
        const dropdown = this.querySelector("#group-dropdown");
        if (dropdown && !dropdown.contains(e.target)) {
          this.isDropdownOpen = false;
        }
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("click", this._handleWindowClick);
  }

  get appMode() {
    return state.appMode;
  }
  get searchQuery() {
    return state.searchQuery;
  }
  get currentRepo() {
    return state.currentRepo;
  }
  get currentGroupKey() {
    return state.currentGroupKey;
  }
  get currentGroupVal() {
    return state.currentGroupVal;
  }
  get currentArtifact() {
    return state.currentArtifact;
  }
  get events() {
    return state.allEvents;
  }
  get repositories() {
    return state.repositories;
  }
  get globalEvents() {
    return state.globalEvents || [];
  }
  get isOpen() {
    return state.isSidebarOpen;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("click", this._handleWindowClick);
  }

  willUpdate() {
    this.classList.toggle("open", state.isSidebarOpen);
  }

  eventMatchesSearch(e, q) {
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

  getFilteredRepositories() {
    if (!this.searchQuery) return this.repositories || [];
    const q = this.searchQuery.toLowerCase();
    return (this.repositories || []).filter((repo) =>
      repo.toLowerCase().includes(q)
    );
  }

  handleSearchInput(e) {
    state.searchQuery = e.target.value.toLowerCase();
  }

  toggleDropdown(e) {
    e.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  renderRepoList() {
    const filteredRepos = this.getFilteredRepositories();

    if (this.appMode === "repositories") {
      if (!this.currentGroupKey) {
        return html`
          ${filteredRepos.sort().map((repo) => {
            const isActive = this.currentRepo === repo;
            const repoName = repo.split("/").pop() || repo;
            return html`
              <li>
                <a
                  href="/repositories/${encodeURIComponent(repo)}"
                  class="nav-item ${isActive ? "active" : ""}"
                  style="display: block; text-decoration: none;"
                >
                  ${repoName}
                </a>
              </li>
            `;
          })}
        `;
      } else {
        const groups = {};
        const repoToGroup = {};

        this.globalEvents.forEach((e) => {
          if (
            !repoToGroup[e.repository] &&
            e.tags &&
            e.tags[this.currentGroupKey]
          ) {
            repoToGroup[e.repository] = e.tags[this.currentGroupKey];
          }
        });

        Object.entries(repoToGroup).forEach(([repo, gVal]) => {
          if (!groups[gVal]) groups[gVal] = new Set();
          groups[gVal].add(repo);
        });

        return html`
          ${Object.keys(groups)
            .sort()
            .map((gVal) => {
              const isGroupActive =
                this.currentGroupVal === gVal && !this.currentRepo;
              const hrefGroup = `/group/${encodeURIComponent(this.currentGroupKey)}/${encodeURIComponent(gVal)}`;

              return html`
                <li>
                  <a
                    href="${hrefGroup}"
                    class="group-header ${isGroupActive ? "active" : ""}"
                    style="display: block; text-decoration: none;"
                  >
                    ${String(gVal).toUpperCase()}
                  </a>
                  <ul class="nested-list">
                    ${Array.from(groups[gVal])
                      .sort()
                      .map((repo) => {
                        const isActive = this.currentRepo === repo;
                        const label = repo.split("/").pop() || repo;
                        const hrefRepo = `/group/${encodeURIComponent(this.currentGroupKey)}/${encodeURIComponent(gVal)}/${encodeURIComponent(repo)}`;
                        return html`
                          <li>
                            <a
                              href="${hrefRepo}"
                              class="nav-item ${isActive ? "active" : ""}"
                              style="display: block; text-decoration: none;"
                            >
                              ${label}
                            </a>
                          </li>
                        `;
                      })}
                  </ul>
                </li>
              `;
            })}
        `;
      }
    } else if (this.appMode === "artifacts") {
      const artifactsByName = {};
      this.globalEvents.forEach((e) => {
        if (e.artifact && e.artifact.name && e.artifact.version) {
          if (!artifactsByName[e.artifact.name]) {
            artifactsByName[e.artifact.name] = new Set();
          }
          artifactsByName[e.artifact.name].add(e.artifact.version);
        }
      });

      return html`
        ${Object.keys(artifactsByName)
          .sort()
          .map((artName) => {
            return html`
              <li>
                <a
                  href="/artifacts/${encodeURIComponent(artName)}"
                  class="group-header ${this.currentArtifact?.name ===
                    artName && !this.currentArtifact?.version
                    ? "active"
                    : ""}"
                  style="display: block; text-decoration: none;"
                >
                  ${String(artName).toUpperCase()}
                </a>
                <ul class="nested-list">
                  ${Array.from(artifactsByName[artName])
                    .sort()
                    .reverse()
                    .map((artVersion) => {
                      const isActive =
                        this.currentArtifact?.name === artName &&
                        this.currentArtifact?.version === artVersion;

                      const hrefVersion = `/artifacts/${encodeURIComponent(artName)}/${encodeURIComponent(artVersion)}`;
                      return html`
                        <li>
                          <a
                            href="${hrefVersion}"
                            class="nav-item ${isActive ? "active" : ""}"
                            style="display: block; text-decoration: none;"
                          >
                            ${artVersion}
                          </a>
                        </li>
                      `;
                    })}
                </ul>
              </li>
            `;
          })}
      `;
    }
  }

  render() {
    const isSettings = this.appMode === "settings";
    const isArtifacts = this.appMode === "artifacts";

    const getDisplayGroup = (key) => {
      switch (key) {
        case "env":
          return "Environment";
        case "region":
          return "Region";
        case "team":
          return "Team";
        default:
          return key.charAt(0).toUpperCase() + key.slice(1);
      }
    };

    const tagKeys = new Set();
    this.globalEvents.forEach((e) => {
      if (e.tags) Object.keys(e.tags).forEach((k) => tagKeys.add(k));
    });

    return html`
      <!-- Mobile Navigation -->
      <div
        class="mobile-nav-links mobile-only"
        style="padding: var(--space-4) var(--space-4) 0 var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);"
      >
        <a
          href="/repositories"
          class="top-nav-btn mobile-sidebar-btn ${!isArtifacts && !isSettings
            ? "active"
            : ""}"
          @click=${() => {
            state.isSidebarOpen = false;
          }}
          style="text-decoration: none;"
        >
          Repositories
        </a>
        <a
          href="/artifacts"
          class="top-nav-btn mobile-sidebar-btn ${isArtifacts ? "active" : ""}"
          @click=${() => {
            state.isSidebarOpen = false;
          }}
          style="text-decoration: none;"
        >
          Artifacts
        </a>
        <a
          href="/settings"
          id="mobile-settings-btn"
          class="top-nav-btn mobile-sidebar-btn ${isSettings ? "active" : ""}"
          @click=${() => {
            state.isSidebarOpen = false;
          }}
          style="text-decoration: none;"
        >
          Settings
        </a>
        <hr
          style="border: 0; border-bottom: 1px solid var(--border-color); margin: var(--space-2) 0;"
        />
      </div>

      <nav
        class="sidebar-nav"
        id="sidebar-nav-dashboard"
        style="${isSettings ? "display: none;" : ""}"
      >
        <div class="sidebar-controls">
          <input
            type="text"
            id="search-input"
            class="lens-input lens-input-sm"
            placeholder="Find..."
            aria-label="Search repositories and artifacts"
            .value=${this.searchQuery || ""}
            @input=${this.handleSearchInput}
          />
        </div>

        <div
          class="nav-section"
          id="sidebar-group-control"
          style="flex-shrink: 0; ${isArtifacts ? "display: none;" : ""}"
        >
          <div class="group-control">
            <div
              class="custom-dropdown ${this.isDropdownOpen ? "open" : ""}"
              id="group-dropdown"
            >
              <button
                type="button"
                class="lens-input lens-input-sm dropdown-trigger"
                @click=${this.toggleDropdown}
                aria-haspopup="listbox"
                aria-expanded="${this.isDropdownOpen}"
                aria-label="Group by criteria"
              >
                <span class="dropdown-value"
                  >${this.currentGroupKey
                    ? `Group By: ${getDisplayGroup(this.currentGroupKey)}`
                    : "Group By: None"}</span
                >
                <svg
                  class="dropdown-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="dropdown-menu" role="menu">
                <a
                  href="/repositories"
                  class="dropdown-item ${!this.currentGroupKey ? "active" : ""}"
                  role="menuitem"
                  style="display: block; text-decoration: none;"
                  @click=${() => {
                    this.isDropdownOpen = false;
                  }}
                >
                  Group By: None
                </a>
                ${Array.from(tagKeys)
                  .sort()
                  .map(
                    (key) => html`
                      <a
                        href="/group/${encodeURIComponent(key)}"
                        class="dropdown-item ${this.currentGroupKey === key
                          ? "active"
                          : ""}"
                        role="menuitem"
                        style="display: block; text-decoration: none;"
                        @click=${() => {
                          this.isDropdownOpen = false;
                        }}
                      >
                        Group By: ${getDisplayGroup(key)}
                      </a>
                    `
                  )}
              </div>
            </div>
          </div>
        </div>

        <div
          class="nav-section"
          style="flex: 1; min-height: 0; display: flex; flex-direction: column;"
        >
          <h4
            id="sidebar-section-title"
            style="margin-bottom: var(--space-2); color: var(--text-secondary); font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.05em;"
          >
            ${isArtifacts ? "ARTIFACTS" : "REPOSITORIES"}
          </h4>
          <ul class="repo-list" id="sidebar-list">
            ${this.renderRepoList()}
          </ul>
        </div>
      </nav>

      <nav
        class="sidebar-nav"
        id="sidebar-nav-settings"
        style="${!isSettings
          ? "display: none;"
          : ""} margin-top: var(--space-6)"
      >
        <div class="nav-section">
          <h4
            style="margin-bottom: var(--space-2); color: var(--text-secondary); font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.05em;"
          >
            PREFERENCES
          </h4>
          <ul class="repo-list">
            <li>
              <button
                type="button"
                class="nav-item ${state.settingsGroup === "appearance"
                  ? "active"
                  : ""}"
                @click=${() => (state.settingsGroup = "appearance")}
              >
                Appearance
              </button>
            </li>
            <li>
              <button
                type="button"
                class="nav-item ${state.settingsGroup === "system"
                  ? "active"
                  : ""}"
                @click=${() => (state.settingsGroup = "system")}
              >
                System
              </button>
            </li>
          </ul>
        </div>
      </nav>
    `;
  }
}

customElements.define("lens-sidebar", LensSidebar);

import { LitElement, html } from "lit";
import { Chart } from "chart.js";
import { state, StoreController, syncUrlToState, createUrl } from "../../state/store.js";
import {
  fetchEvents,
  fetchRepositories,
  fetchAvailableMetrics,
} from "../../api/client.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../toast.js";
import "./lens-sidebar.js";
import "./lens-dashboard.js";
import "./lens-settings.js";

export class LensApp extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      expandedChartConfig: { type: Object, state: true },
    };
  }

  constructor() {
    super();
    this.storeController = new StoreController(this);

    // We will track previous fetch parameters to know when to re-fetch
    this._lastFetchParams = {};
  }

  connectedCallback() {
    super.connectedCallback();
    this._handleKeyDown = (e) => {
      if (e.key === "Escape" && this.expandedChartConfig) {
        this._closeChartModal();
      }
    };
    document.addEventListener("keydown", this._handleKeyDown);

    this._handleLinkClick = (e) => {
      const anchor = e.target.closest("a");
      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.hasAttribute("download") &&
        anchor.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        const url = new URL(anchor.href);
        window.history.pushState(null, "", url.pathname + url.search);
        syncUrlToState();

        // Auto-close sidebar on mobile navigation
        if (state.isSidebarOpen) {
          state.isSidebarOpen = false;
        }
      }
    };
    document.addEventListener("click", this._handleLinkClick);

    this._handleChartEnlarge = (e) => {
      this.expandedChartConfig = e.detail;
    };
    this.addEventListener("chart-enlarge", this._handleChartEnlarge);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this._handleKeyDown);
    document.removeEventListener("click", this._handleLinkClick);
    this.removeEventListener("chart-enlarge", this._handleChartEnlarge);
  }

  _closeChartModal() {
    this.expandedChartConfig = null;
    if (this.expandedChartInstance) {
      this.expandedChartInstance.destroy();
      this.expandedChartInstance = null;
    }
  }

  async loadDashboardData() {
    state.isLoading = true;
    state.allEvents = [];

    try {
      let limit = state.eventsPerPage || 25;
      let skip = (state.currentPage - 1) * limit;

      // 1. Always ensure repositories are loaded globally
      if (!state.repositories || state.repositories.length === 0) {
        const repos = await fetchRepositories();
        state.repositories = [...new Set(repos)];
      }

      const currentRepoQuery =
        state.currentRepo && state.currentRepo !== "All"
          ? state.currentRepo
          : null;

      // 2. Fetch available metrics for the current view
      const metrics = await fetchAvailableMetrics(currentRepoQuery);
      state.availableMetrics = metrics;

      // 3. Fetch history events paginated for the table
      const data = await fetchEvents(
        currentRepoQuery,
        limit,
        skip,
        state.historySearchQuery,
        state.currentGroupKey,
        state.currentGroupVal
      );

      if (data && (data.status === "success" || data.length >= 0)) {
        state.allEvents = data.events || data;
      } else {
        throw new Error("Invalid Response");
      }

      // 4. In the background, ensure we have a robust set of global events
      // for client-side analytics (top repos, artifacts, tags)
      if (!state.hasFetchedGlobalEvents) {
        state.hasFetchedGlobalEvents = true; // Set immediately to prevent concurrent fetches
        fetchEvents(null, 5000, 0, null, null, null)
          .then((globalRes) => {
            const gData = globalRes.events || globalRes;
            state.globalEvents = gData;
          })
          .catch((e) => {
            logger.warn("Failed to fetch global analytics events", e);
            state.hasFetchedGlobalEvents = false; // Reset on failure
          });
      }
    } catch (error) {
      logger.error("Error fetching data", { error: error.message });
      showToast("Failed to fetch dashboard data. Please try again.", "error");
    } finally {
      state.isLoading = false;
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    // Orchestrate fetching if route/state parameters change
    const {
      currentRepo,
      currentPage,
      historySearchQuery,
      currentGroupKey,
      currentGroupVal,
    } = state;

    if (
      this._lastFetchParams.repo !== currentRepo ||
      this._lastFetchParams.page !== currentPage ||
      this._lastFetchParams.search !== historySearchQuery ||
      this._lastFetchParams.groupKey !== currentGroupKey ||
      this._lastFetchParams.groupVal !== currentGroupVal
    ) {
      this._lastFetchParams = {
        repo: currentRepo,
        page: currentPage,
        search: historySearchQuery,
        groupKey: currentGroupKey,
        groupVal: currentGroupVal,
      };
      // Fetch async
      this.loadDashboardData();
    }

    if (changedProperties.has("expandedChartConfig")) {
      if (this.expandedChartConfig) {
        const canvas = document.getElementById("expanded-chart-canvas");
        if (canvas && !this.expandedChartInstance) {
          const { config, datasets, scales } = this.expandedChartConfig;
          const ctx = canvas.getContext("2d");
          // To make the expanded chart look good, we need to pass true to legend display
          // and increase the hit radius/point radius slightly. But using the given datasets is fine.
          this.expandedChartInstance = new Chart(ctx, {
            type: config.type,
            data: { datasets: datasets },
            options: {
              animation: false,
              maintainAspectRatio: false,
              responsive: true,
              interaction: { intersect: false, mode: "x" },
              hover: { mode: "x", intersect: false },
              plugins: {
                tooltip: {
                  enabled: true,
                  mode: "x",
                  intersect: false,
                  caretPadding: 15,
                },
                legend: {
                  display: false,
                },
              },
              scales: scales,
            },
          });
        }
      } else {
        if (this.expandedChartInstance) {
          this.expandedChartInstance.destroy();
          this.expandedChartInstance = null;
        }
      }
    }
  }

  renderAppLayout() {
    const isRepositories = state.appMode === "repositories";
    const isArtifacts = state.appMode === "artifacts";

    return html`
      <header class="top-bar">
        <div class="top-bar-left">
          <button
            type="button"
            class="icon-btn mobile-menu-btn mobile-only"
            id="mobile-menu-btn"
            aria-label="Toggle navigation menu"
            aria-expanded="false"
            @click=${() => (state.isSidebarOpen = !state.isSidebarOpen)}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1
            class="logo logo-btn"
            id="logo-btn"
            @click=${() => {
              window.history.pushState(null, "", createUrl({ mode: 'repositories', repo: null, groupKey: null, groupVal: null }));
              syncUrlToState();
            }}
          >
            Lens.
          </h1>
        </div>

        <div class="top-bar-right">
          <nav class="top-nav">
            <a
              href="${createUrl({ mode: 'repositories' })}"
              class="top-nav-btn ${isRepositories ? "active" : ""}"
            >
              Repositories
            </a>
            <a
              href="${createUrl({ mode: 'artifacts' })}"
              class="top-nav-btn ${isArtifacts ? "active" : ""}"
              >Artifacts</a
            >
          </nav>
          <div class="top-bar-actions">
            <a
              href="${createUrl({ mode: 'settings' })}"
              class="icon-btn"
              aria-label="Settings"
              title="Settings"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                ></path>
              </svg>
            </a>
          </div>
        </div>
      </header>
      <div class="app-layout">
        ${
          state.isSidebarOpen
            ? html`<div
                class="sidebar-backdrop show"
                id="sidebar-backdrop"
                @click=${() => (state.isSidebarOpen = false)}
              ></div>`
            : ""
        }
        <lens-sidebar></lens-sidebar>
        ${
          state.appMode === "settings"
            ? html`<lens-settings id="lens-settings"></lens-settings>`
            : html`<lens-dashboard></lens-dashboard>`
        }
      </div>

      <!-- Chart Modal -->
      ${
        this.expandedChartConfig
          ? html`
              <div
                id="chart-modal"
                class="modal-overlay"
                style="display: flex;"
                @click=${(e) => {
                  if (e.target.id === "chart-modal") this._closeChartModal();
                }}
              >
                <div class="modal-content modal-content-inner">
                  <div class="modal-header">
                    <h3
                      id="modal-chart-title"
                      style="display: flex; align-items: center; gap: 0.75rem;"
                    >
                      ${this.expandedChartConfig.metricKey.replace(/_/g, " ")}
                      ${this.expandedChartConfig.isGlobalView ? html`<span style="font-size: 0.8rem; font-weight: normal; color: var(--text-secondary); background: var(--bg-secondary); padding: 2px 8px; border-radius: 12px;">Showing Top 10</span>` : ""}
                    </h3>
                    <button
                      type="button"
                      id="close-chart-modal-btn"
                      class="icon-btn modal-close-btn"
                      @click=${this._closeChartModal}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div class="modal-body">
                    <canvas id="expanded-chart-canvas"></canvas>
                  </div>
                  ${
                    this.expandedChartConfig.datasets &&
                    this.expandedChartConfig.datasets.length > 0
                      ? html`
                          <div
                            class="custom-legend"
                            style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-top: 1.5rem;"
                          >
                            ${this.expandedChartConfig.datasets.map(
                              (ds) => html`
                                <div
                                  class="legend-item"
                                  style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);"
                                  title="${ds.label}"
                                >
                                  <span
                                    class="legend-color"
                                    style="width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background-color: ${ds.pointBackgroundColor || ds.borderColor}"
                                  ></span>
                                  <span
                                    class="legend-label"
                                    style="word-break: break-word;"
                                    >${ds.label}</span
                                  >
                                </div>
                              `
                            )}
                          </div>
                        `
                      : ""
                  }
                </div>
              </div>
            `
          : ""
      }
    `;
  }

  render() {
    return this.renderAppLayout();
  }
}

customElements.define("lens-app", LensApp);

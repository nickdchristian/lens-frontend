import { LitElement, html } from "lit";
import { state, StoreController } from "../../state/store.js";
import "./artifact-trace.js";
import "./lens-history-table.js";
import "./lens-overview-charts.js";
import "./lens-metadata-panel.js";
import "./lens-recent-artifacts.js";

export class LensDashboard extends LitElement {
  // Use Light DOM so global CSS and document.getElementById still work
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      activeTab: { type: String },
    };
  }

  constructor() {
    super();
    this.storeController = new StoreController(this);
    this.activeTab = "overview";
  }

  get events() {
    return state.allEvents;
  }
  get globalEvents() {
    return state.globalEvents || [];
  }
  get timePeriod() {
    return state.timePeriod;
  }
  get currentRepo() {
    return state.currentRepo;
  }
  get appMode() {
    return state.appMode;
  }
  get historySearchQuery() {
    return state.historySearchQuery;
  }
  get currentPage() {
    return state.currentPage;
  }
  get eventsPerPage() {
    return state.eventsPerPage;
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
  get activeTraceIndex() {
    return state.activeTraceIndex;
  }
  get isLoading() {
    return state.isLoading;
  }

  getDashboardEvents() {
    const now = new Date();
    let cutoffDate = new Date();
    if (this.timePeriod === "day") cutoffDate.setDate(now.getDate() - 1);
    else if (this.timePeriod === "week") cutoffDate.setDate(now.getDate() - 7);
    else if (this.timePeriod === "month")
      cutoffDate.setMonth(now.getMonth() - 1);
    else if (this.timePeriod === "year")
      cutoffDate.setFullYear(now.getFullYear() - 1);

    const activeEvents = this.events || [];

    let dashboardEvents =
      this.appMode === "artifacts"
        ? activeEvents
        : activeEvents.filter((e) => new Date(e.timestamp) >= cutoffDate);

    if (this.appMode === "repositories") {
      dashboardEvents = dashboardEvents.filter(
        (e) => e.metrics && Object.keys(e.metrics).length > 0
      );
    } else if (this.appMode === "artifacts") {
      if (this.currentArtifact) {
        if (this.currentArtifact.version) {
          dashboardEvents = activeEvents.filter(
            (e) =>
              e.artifact?.name === this.currentArtifact.name &&
              e.artifact?.version === this.currentArtifact.version
          );
        } else {
          dashboardEvents = activeEvents.filter(
            (e) => e.artifact?.name === this.currentArtifact.name
          );
        }
      } else {
        dashboardEvents = dashboardEvents.filter(
          (e) => e.artifact && e.artifact.name && e.artifact.version
        );
      }
    }

    return dashboardEvents;
  }

  render() {
    const isSettings = this.appMode === "settings";
    const isLocalPagination = !this.currentRepo;
    let paginatedEvents;
    let hasNextPage = false;
    let dashboardEvents;

    if (this.appMode === "repositories" || this.appMode === "artifacts") {
      dashboardEvents = this.getDashboardEvents();

      if (isLocalPagination) {
        const start = (this.currentPage - 1) * this.eventsPerPage;
        const end = start + this.eventsPerPage;
        paginatedEvents = dashboardEvents.slice(start, end);
        hasNextPage = dashboardEvents.length > end;
      } else {
        paginatedEvents = dashboardEvents;
        hasNextPage = this.events && this.events.length === this.eventsPerPage;
      }
    } else {
      dashboardEvents = this.globalEvents || [];
      paginatedEvents = dashboardEvents.slice(0, 50);
    }

    let title;
    if (this.appMode === "artifacts") {
      title = this.currentArtifact
        ? `${this.currentArtifact.name} ${this.currentArtifact.version || ""}`
        : "Recent Artifacts";
    } else if (!this.currentRepo && !this.currentGroupVal) {
      title = "All Repositories";
    } else if (this.currentGroupVal) {
      title = `${this.currentGroupKey.toUpperCase()}: ${this.currentGroupVal}`;
    } else {
      title = this.currentRepo;
    }

    // Prepare metadata if applicable
    let metadata = null;
    if (this.currentRepo && dashboardEvents.length > 0) {
      const latest = dashboardEvents[0];
      if (
        (latest.tags && Object.keys(latest.tags).length > 0) ||
        (latest.custom_data && Object.keys(latest.custom_data).length > 0)
      ) {
        metadata = {
          tags: latest.tags,
          custom_data: latest.custom_data,
        };
      }
    }

    return html`
      <header class="dashboard-header">
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);"
        >
          <h2
            id="view-title"
            style="display: flex; align-items: center; gap: var(--space-3); margin: 0;"
          >
            ${title}
            ${this.isLoading
              ? html`
                  <div
                    class="lens-loader"
                    aria-busy="true"
                    role="status"
                    aria-label="Loading telemetry data"
                  >
                    <div class="bar bar1"></div>
                    <div class="bar bar2"></div>
                    <div class="bar bar3"></div>
                    <style>
                      .lens-loader {
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        gap: 4px;
                        height: 20px;
                      }
                      .lens-loader .bar {
                        width: 4px;
                        height: 100%;
                        background-color: var(--color-primary);
                        border-radius: 2px;
                        animation: telemetry-bounce 1s
                          cubic-bezier(0.4, 0, 0.2, 1) infinite;
                        transform-origin: bottom;
                      }
                      .lens-loader .bar1 {
                        animation-delay: 0s;
                      }
                      .lens-loader .bar2 {
                        animation-delay: 0.2s;
                      }
                      .lens-loader .bar3 {
                        animation-delay: 0.4s;
                      }
                      @keyframes telemetry-bounce {
                        0%,
                        100% {
                          transform: scaleY(0.3);
                          opacity: 0.4;
                        }
                        50% {
                          transform: scaleY(1);
                          opacity: 1;
                        }
                      }
                    </style>
                  </div>
                `
              : ""}
          </h2>
        </div>

        <!-- Tabs -->
        <nav
          class="tabs"
          id="repo-tabs"
          role="tablist"
          aria-label="Dashboard Views"
          style="margin-bottom: var(--space-8);"
        >
          <button
            type="button"
            class="tab-btn ${this.activeTab === "overview" ? "active" : ""}"
            id="tab-btn-overview"
            role="tab"
            data-tab="overview"
            aria-selected="${this.activeTab === "overview"}"
            @click=${() => (this.activeTab = "overview")}
          >
            Overview
          </button>
          <button
            type="button"
            class="tab-btn ${this.activeTab === "history" ? "active" : ""}"
            id="tab-btn-history"
            role="tab"
            data-tab="history"
            aria-selected="${this.activeTab === "history"}"
            @click=${() => (this.activeTab = "history")}
          >
            History
          </button>
        </nav>
      </header>

      <!-- OVERVIEW TAB -->
      <div
        class="tab-content ${this.activeTab === "overview" ? "active" : ""}"
        role="tabpanel"
        style="${isSettings || this.activeTab !== "overview"
          ? "display: none;"
          : ""} transition: opacity 0.3s ease; opacity: ${this.isLoading
          ? "0.5"
          : "1"}; pointer-events: ${this.isLoading ? "none" : "auto"};"
      >
        ${metadata
          ? html`<lens-metadata-panel
              .metadata=${metadata}
              .isLoading=${this.isLoading}
            ></lens-metadata-panel>`
          : ""}
        ${this.appMode === "artifacts" && !this.currentArtifact
          ? html`<lens-recent-artifacts
              .events=${dashboardEvents}
            ></lens-recent-artifacts>`
          : this.appMode === "artifacts" &&
              this.currentArtifact &&
              this.currentArtifact.version
            ? html`<lens-artifact-trace
                .events=${this.events}
                .artifactObj=${this.currentArtifact}
                .activeTraceIndex=${this.activeTraceIndex}
                @node-click=${(e) => {
                  const index = e.detail.index;
                  const isCurrentlyActive = this.activeTraceIndex === index;
                  state.activeTraceIndex = isCurrentlyActive ? null : index;
                }}
              ></lens-artifact-trace>`
            : html`<lens-overview-charts
                .events=${dashboardEvents}
                .timePeriod=${this.timePeriod}
                .hasScope=${!!this.currentRepo || !!this.currentGroupVal}
                .isLoading=${this.isLoading}
              >
              </lens-overview-charts>`}
      </div>

      <!-- HISTORY TAB -->
      <div
        class="tab-content ${this.activeTab === "history" ? "active" : ""}"
        role="tabpanel"
        style="${isSettings || this.activeTab !== "history"
          ? "display: none;"
          : ""} transition: opacity 0.3s ease; opacity: ${this.isLoading
          ? "0.5"
          : "1"}; pointer-events: ${this.isLoading ? "none" : "auto"};"
      >
        <lens-history-table
          .events=${paginatedEvents}
          .columns=${this.appMode === "artifacts"
            ? ["artifact", "repository", "workflow_name", "timestamp"]
            : ["repository", "commit_sha", "workflow_name", "timestamp"]}
          .currentPage=${this.currentPage}
          .eventsPerPage=${this.eventsPerPage}
          .historySearchQuery=${this.historySearchQuery}
          .isLocalPagination=${isLocalPagination}
          .hasNextPage=${hasNextPage}
        ></lens-history-table>
      </div>
    `;
  }
}

customElements.define("lens-dashboard", LensDashboard);

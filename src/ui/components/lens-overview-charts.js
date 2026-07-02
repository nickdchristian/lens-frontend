import { LitElement, html } from "lit";
import { state } from "../../state/store.js";
import "./chart-card.js";

export class LensOverviewCharts extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      events: { type: Array },
      timePeriod: { type: String },
      hasScope: { type: Boolean },
      isLoading: { type: Boolean },
    };
  }

  get numericKeys() {
    const isArtifactRepoView =
      state.appMode === "artifacts" &&
      state.currentArtifact &&
      !state.currentArtifact.version;

    const doraMetrics = [
      "lead_time_minutes",
      "deployment_count",
      "change_failure_rate",
    ];

    let keys = state.availableMetrics || [];

    if (isArtifactRepoView) {
      keys = keys.filter((k) => doraMetrics.includes(k));
      // Ensure they exist in Artifact Repo view
      doraMetrics.forEach((m) => {
        if (!keys.includes(m)) keys.push(m);
      });
    }

    return keys;
  }

  render() {
    const isGlobalView = !state.currentRepo && !state.currentArtifact;
    const keys = this.numericKeys;

    return html`
      <div
        id="telemetry-header"
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);"
      >
        <h3
          style="font-size: var(--text-lg); font-weight: var(--font-medium); margin: 0;"
        >
          Telemetry
        </h3>
        <div
          class="segmented-control"
          id="time-period-selector"
          role="group"
          aria-label="Select Time Period"
        >
          <button
            type="button"
            class="segment-btn ${this.timePeriod === "day" ? "active" : ""}"
            @click=${() => (state.timePeriod = "day")}
          >
            Day
          </button>
          <button
            type="button"
            class="segment-btn ${this.timePeriod === "week" ? "active" : ""}"
            @click=${() => (state.timePeriod = "week")}
          >
            Week
          </button>
          <button
            type="button"
            class="segment-btn ${this.timePeriod === "month" ? "active" : ""}"
            @click=${() => (state.timePeriod = "month")}
          >
            Month
          </button>
          <button
            type="button"
            class="segment-btn ${this.timePeriod === "year" ? "active" : ""}"
            @click=${() => (state.timePeriod = "year")}
          >
            Year
          </button>
        </div>
      </div>

      <div class="dynamic-charts-grid" id="dynamic-charts">
        ${!this.events || this.events.length === 0
          ? this.isLoading
            ? html`<div style="min-height: 300px; grid-column: 1/-1;"></div>`
            : html`<div
                style="grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--text-secondary);"
              >
                No telemetry data found for the selected time period. Try
                expanding your search.
              </div>`
          : keys.map(
              (key) => html`
                <lens-chart-card
                  .metricKey=${key}
                  .events=${this.events}
                  .isGlobalView=${isGlobalView}
                ></lens-chart-card>
              `
            )}
      </div>
    `;
  }
}

customElements.define("lens-overview-charts", LensOverviewCharts);

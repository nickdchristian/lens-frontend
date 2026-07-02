import { LitElement, html, css, unsafeCSS } from "lit";
import globalStyles from "../../style.css?inline";
import {
  Chart,
  LineController,
  BarController,
  ScatterController,
  BubbleController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";

import { state, StoreController } from "../../state/store.js";
import { getChartConfig, getChartScales, colorMix } from "../chart-config.js";
import { getActiveSingleLine, getGridLine, getAccentColor } from "../theme.js";
import { fetchAggregatedMetrics } from "../../api/client.js";

Chart.register(
  LineController,
  BarController,
  ScatterController,
  BubbleController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

export class LensChartCard extends LitElement {
  static get properties() {
    return {
      metricKey: { type: String },
      events: { type: Array },
      isGlobalView: { type: Boolean },
      datasets: { type: Array, state: true },
      config: { type: Object, state: true },
      scales: { type: Object, state: true },
      layoutPaddingTop: { type: Number, state: true },
      hideLegend: { type: Boolean, state: true },
      emptyMessage: { type: String },
      chartLoading: { type: Boolean, state: true },
    };
  }

  static get styles() {
    return [
      unsafeCSS(globalStyles),
      css`
        * {
          box-sizing: border-box;
        }
        .chart-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
          height: 100%;
          box-sizing: border-box;
          cursor: pointer;
        }
        .chart-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: capitalize;
        }
        .top-tag {
          font-size: 0.75rem;
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 12px;
          color: var(--text-secondary);
        }
        .empty-message {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 250px;
          color: var(--text-secondary);
          font-style: italic;
          font-size: 0.9rem;
        }
        .custom-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.75rem;
          justify-content: center;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-label {
          word-break: break-word;
        }
        canvas {
          max-height: 250px;
          width: 100%;
        }
      `,
    ];
  }

  constructor() {
    super();
    this.storeController = new StoreController(this);
    this.datasets = [];
    this.layoutPaddingTop = 0;
    this.emptyMessage = "No information to be displayed";
    this.events = [];
    this.metricKey = "";
    this.isGlobalView = false;
    this.chartLoading = false;
    this._currentFetchId = 0;
  }

  willUpdate(changedProperties) {
    if (
      changedProperties.has("events") ||
      changedProperties.has("metricKey") ||
      this._lastLoadedRepo !== state.currentRepo
    ) {
      this._lastLoadedRepo = state.currentRepo;
      this.loadData();
    }
  }

  updated(changedProperties) {
    if (
      changedProperties.has("datasets") ||
      changedProperties.has("config") ||
      changedProperties.has("scales") ||
      changedProperties.has("chartLoading")
    ) {
      this.renderChart();
    }
  }

  async loadData() {
    if (!this.metricKey || (!this.events && !state.currentRepo)) return;

    this.chartLoading = true;
    const fetchId = ++this._currentFetchId;

    this.config = getChartConfig(this.metricKey, null, null);
    this.scales = getChartScales(state.timePeriod, this.config);
    const isSingleRepo = !!state.currentRepo && state.currentRepo !== "All";
    let queries = []; // Array of { repo, artifact, label, colorIdx }
    this.hideLegend = isSingleRepo; // Default for single repo, will update if multiple artifacts found

    if (isSingleRepo) {
      let eventsToGroup = this.events || [];
      eventsToGroup = eventsToGroup.filter(
        (e) => e.metrics && e.metrics[this.metricKey] !== undefined
      );

      const uniqueArtifacts = new Set();
      eventsToGroup.forEach((e) => {
        if (e.artifact && e.artifact.name) uniqueArtifacts.add(e.artifact.name);
      });

      if (uniqueArtifacts.size > 1) {
        this.hideLegend = false;
        Array.from(uniqueArtifacts)
          .sort()
          .forEach((art, idx) => {
            queries.push({
              repo: state.currentRepo,
              artifact: art,
              label: art,
              colorIdx: idx,
            });
          });
      } else {
        queries.push({
          repo: state.currentRepo,
          artifact: null,
          label: state.currentRepo,
          colorIdx: 0,
        });
      }
    } else {
      let eventsToGroup = this.events || [];

      // To differentiate artifacts on global view:
      const uniqueTargetsMap = {};
      eventsToGroup.forEach((e) => {
        const targetKey =
          e.artifact && e.artifact.name
            ? `${e.repository}::${e.artifact.name}`
            : e.repository;
        if (!uniqueTargetsMap[targetKey]) uniqueTargetsMap[targetKey] = [];
        uniqueTargetsMap[targetKey].push(e);
      });

      let targetsForKey = Object.keys(uniqueTargetsMap).filter((key) => {
        return uniqueTargetsMap[key].some(
          (e) =>
            e.metrics?.[this.metricKey] !== undefined &&
            e.metrics?.[this.metricKey] !== null
        );
      });

      if (targetsForKey.length > 10) {
        targetsForKey = targetsForKey
          .sort((a, b) => {
            const aCount = uniqueTargetsMap[a].filter(
              (e) => e.metrics?.[this.metricKey] !== undefined
            ).length;
            const bCount = uniqueTargetsMap[b].filter(
              (e) => e.metrics?.[this.metricKey] !== undefined
            ).length;
            return bCount - aCount;
          })
          .slice(0, 10);
      }

      const uniqueTargets = Object.keys(uniqueTargetsMap).sort();
      const targetColorMap = {};
      uniqueTargets.forEach((target, idx) => {
        targetColorMap[target] = idx;
      });

      targetsForKey.forEach((target) => {
        let repo, artifact, label;
        if (target.includes("::")) {
          [repo, artifact] = target.split("::");
          // It's part of a monorepo or an artifact deployment
          label = `${repo.split("/").pop()} (${artifact})`;
        } else {
          repo = target;
          artifact = null;
          label = repo.split("/").pop() || repo;
        }

        queries.push({
          repo: repo,
          artifact: artifact,
          label: label,
          colorIdx: targetColorMap[target],
        });
      });
    }

    const promises = queries.map(async (query) => {
      const rIdx = query.colorIdx;
      const isSum = this.config.type === "bar";

      const data = await fetchAggregatedMetrics(
        query.repo,
        this.metricKey,
        state.timePeriod,
        isSum,
        query.artifact
      );

      if (data && data.length > 0) {
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        const shiftedData = data
          .map((d) => ({ x: d.x + tzOffset, y: d.y }))
          .filter((d) => d.x >= this.scales.x.min && d.x <= this.scales.x.max);

        const isMultipleLines = queries.length > 1;
        const color = !isMultipleLines
          ? getActiveSingleLine()
          : getAccentColor(rIdx % 10);
        const bgColor = !isMultipleLines ? color : getAccentColor(rIdx % 10);

        return {
          label: query.label,
          data: shiftedData,
          parsing: false,
          normalized: true,
          borderColor: color,
          backgroundColor:
            this.config.type === "bar"
              ? colorMix(bgColor, 0.8)
              : this.config.fill
                ? colorMix(bgColor, 0.2)
                : bgColor,
          pointBackgroundColor: bgColor,
          pointBorderColor: getGridLine(),
          pointBorderWidth: 1,
          borderWidth: this.config.type === "bar" ? 0 : 2,
          hoverBorderWidth: this.config.type === "bar" ? 0 : 3,
          tension: this.config.tension !== undefined ? this.config.tension : 0,
          pointRadius:
            this.config.type === "bar"
              ? 0
              : this.config.type === "scatter" || this.config.type === "bubble"
                ? 4
                : 2,
          pointHoverRadius:
            this.config.type === "bar"
              ? 0
              : this.config.type === "scatter" || this.config.type === "bubble"
                ? 6
                : 5,
          hitRadius: 10,
          fill: isMultipleLines ? false : this.config.fill,
          order: 1,
        };
      }
      return null;
    });

    const results = await Promise.all(promises);

    // Discard results if a newer fetch was initiated
    if (this._currentFetchId !== fetchId) {
      return;
    }

    this.datasets = results.filter((r) => r !== null);
    this.chartLoading = false;
  }

  _handleClick() {
    if (!this.datasets || this.datasets.length === 0) return;
    this.dispatchEvent(
      new CustomEvent("chart-enlarge", {
        detail: {
          metricKey: this.metricKey,
          config: this.config,
          datasets: this.datasets,
          scales: this.scales,
          isGlobalView: this.isGlobalView,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  renderChart() {
    const hasData =
      this.datasets &&
      this.datasets.some((ds) => ds.data && ds.data.length > 0);
    if (!hasData) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      return;
    }

    const canvas = this.shadowRoot.getElementById("chartCanvas");
    if (!canvas) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const compactDatasets = this.datasets.slice(0, 5);

    const ctx = canvas.getContext("2d");
    this.chartInstance = new Chart(ctx, {
      type: this.config.type,
      data: { datasets: compactDatasets },
      options: {
        animation: false,
        layout: { padding: { top: this.layoutPaddingTop } },
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "x" },
        hover: { mode: "x", intersect: false },
        plugins: {
          tooltip: {
            enabled: true,
            mode: "x",
            intersect: false,
          },
          legend: {
            display: false,
          },
        },
        scales: this.scales,
      },
    });
  }

  render() {
    const title = this.metricKey
      ? this.metricKey.replace(/_/g, " ")
      : this.title;
    return html`
      <div
        class="chart-card"
        @click=${this._handleClick}
        style="${
          this.chartLoading ? "opacity: 0.5; pointer-events: none;" : ""
        }"
      >
        <div class="header">
          <h3>${title}</h3>
          ${this.isGlobalView ? html`<span class="top-tag">Top 5</span>` : ""}
        </div>
        ${(() => {
          const hasData =
            this.datasets &&
            this.datasets.some((ds) => ds.data && ds.data.length > 0);
          const compactDatasets = this.datasets
            ? this.datasets.slice(0, 5)
            : [];
          return hasData
            ? html`<div style="height: 250px; position: relative;">
                  <canvas
                    id="chartCanvas"
                    role="img"
                    aria-label="${title || "Data chart"}"
                  ></canvas>
                </div>
                ${
                  !this.hideLegend && compactDatasets.length > 0
                    ? html`
                        <div class="custom-legend">
                          ${compactDatasets.map(
                            (ds) => html`
                              <div class="legend-item" title="${ds.label}">
                                <span
                                  class="legend-color"
                                  style="background-color: ${ds.pointBackgroundColor || ds.borderColor}"
                                ></span>
                                <span class="legend-label">${ds.label}</span>
                              </div>
                            `
                          )}
                        </div>
                      `
                    : ""
                } `
            : html`<div class="empty-message">${this.emptyMessage}</div>`;
        })()}
      </div>
    `;
  }
}
customElements.define("lens-chart-card", LensChartCard);

import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";
import { html, render } from "lit";
import { state } from "../state/store.js";
import {
  getNeutralLine,
  getActiveSingleLine,
  getGridLine,
  getTextColor,
  getAccentColor,
} from "./theme.js";
import { renderArtifactTrace } from "./artifacts.js";
import { groupEventsByRepository, getTopRepositoriesForMetric } from "../utils/data-processing.js";
import { fetchAggregatedMetrics } from "../api/client.js";
import { getChartConfig, getChartScales, colorMix } from "./chart-config.js";
import { DOM } from "./dom.js";

export function renderOverview(events, isSpecificView) {
  const metadataSection = document.getElementById("metadata-section");
  const tagsList = document.getElementById("current-tags");
  const customDataList = document.getElementById("current-custom-data");
  const chartsGrid = document.getElementById("dynamic-charts");
  const kpiGrid = document.getElementById("kpi-grid");

  state.activeChartInstances.forEach((c) => {
    try {
      c.destroy();
    } catch {
      // ignore
    }
  });
  state.activeChartInstances = [];

  if (chartsGrid) render(html``, chartsGrid);
  if (kpiGrid) render(html``, kpiGrid);
  if (tagsList) render(html``, tagsList);
  if (customDataList) render(html``, customDataList);

  const overviewCharts = document.getElementById("overview-charts");
  const timelineContainer = document.getElementById("artifact-trace-container");

  if (state.currentArtifact) {
    if (metadataSection) metadataSection.style.display = "none";
    if (overviewCharts) overviewCharts.style.display = "none";
    if (timelineContainer) timelineContainer.style.display = "flex";
    renderArtifactTrace(state.currentArtifact);
    return;
  } else {
    if (overviewCharts) overviewCharts.style.display = "block";
    if (timelineContainer) timelineContainer.style.display = "none";
    const telemetryHeader = document.getElementById("telemetry-header");
    if (telemetryHeader) {
      telemetryHeader.style.display = "flex";
      const h3 = telemetryHeader.querySelector("h3");
      if (h3) h3.textContent = "Telemetry";
    }
  }

  if (events.length === 0) {
    if (chartsGrid) {
      render(
        html`<div style="grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--text-secondary);">
          No telemetry data found for the selected time period. Try expanding your search.
        </div>`,
        chartsGrid
      );
    }
    return;
  }

  const uniqueReposMap = groupEventsByRepository(events);
  let uniqueRepos = Object.keys(uniqueReposMap).sort();

  if (isSpecificView && metadataSection && tagsList && customDataList) {
    metadataSection.style.display = "block";

    const renderList = (dataObj, el) => {
      if (!dataObj || Object.keys(dataObj).length === 0) {
        render(html`<li><span class="metadata-key">None</span></li>`, el);
        return;
      }
      const items = Object.entries(dataObj).map(
        ([k, v]) => html`<li><span class="metadata-key">${k}</span><span class="metadata-val">${v}</span></li>`
      );
      render(items, el);
    };

    if (state.currentRepo) {
      const latestEvent = events[0];
      renderList(latestEvent.tags, tagsList);
      renderList(latestEvent.custom_data, customDataList);
    } else {
      let intersectedTags = null;
      let intersectedData = null;

      uniqueRepos.forEach((repo) => {
        const repoEvents = uniqueReposMap[repo];
        const latest = repoEvents[0];
        const latestTags = latest.tags ?? {};
        const latestData = latest.custom_data ?? {};

        if (!intersectedTags) intersectedTags = { ...latestTags };
        else {
          Object.keys(intersectedTags).forEach((k) => {
            if (latestTags[k] !== intersectedTags[k]) delete intersectedTags[k];
          });
        }

        if (!intersectedData) intersectedData = { ...latestData };
        else {
          Object.keys(intersectedData).forEach((k) => {
            if (latestData[k] !== intersectedData[k]) delete intersectedData[k];
          });
        }
      });

      renderList(intersectedTags, tagsList);
      renderList(intersectedData, customDataList);
    }
  } else if (metadataSection) {
    metadataSection.style.display = "none";
  }

  const numericKeys = new Set();
  events.forEach((e) => {
    Object.entries(e.metrics ?? {}).forEach(([k, v]) => {
      if (typeof v === "number") numericKeys.add(k);
    });
  });

  if (Chart.defaults.font) {
    Chart.defaults.font.family = "'Inter', 'DM Sans', sans-serif";
    Chart.defaults.color = getTextColor();
  } else if (Chart.defaults.global) {
    Chart.defaults.global.defaultFontFamily = "'Inter', 'DM Sans', sans-serif";
    Chart.defaults.global.defaultFontColor = getTextColor();
  }

  // Render Chart HTML Cards
  if (chartsGrid) {
    const chartCards = Array.from(numericKeys).map((key, index) => {
      return html`
        <div class="chart-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h3>${key.replace(/_/g, " ")}</h3>
            ${!state.currentRepo
              ? html`<span style="font-size: 0.75rem; background: var(--bg-secondary); padding: 2px 8px; border-radius: 12px; color: var(--text-secondary);">Top 5 Repos</span>`
              : ""}
          </div>
          <canvas id="chart-${index}"></canvas>
        </div>
      `;
    });
    render(chartCards, chartsGrid);
  }

  // Assign global colors to repos
  const repoColorMap = {};
  uniqueRepos.forEach((repo, idx) => {
    repoColorMap[repo] = idx;
  });

  Array.from(numericKeys).forEach(async (key, index) => {
    const config = getChartConfig(key);
    const buildDatasets = async (limit) => {
      const reposForKey = getTopRepositoriesForMetric(uniqueReposMap, key, !state.currentRepo, limit);

      const promises = reposForKey.map(async (repo) => {
        const rIdx = repoColorMap[repo];
        const isSum = config.type === "bar";
        
        const data = await fetchAggregatedMetrics(repo, key, state.timePeriod, isSum);

        if (data && data.length > 0) {
          const isSingleRepo = !!state.currentRepo;
          const color = isSingleRepo ? getActiveSingleLine() : getAccentColor(rIdx % 10);
          const bgColor = isSingleRepo ? color : getAccentColor(rIdx % 10);
          
          return {
            label: repo.split("/").pop() || repo,
            data: data,
            clip: false,
            parsing: false,
            normalized: true,
            borderColor: isSingleRepo && config.type !== "bar" ? getActiveSingleLine() : color,
            backgroundColor: config.fill ? colorMix(bgColor, 0.2) : bgColor,
            pointBackgroundColor: bgColor,
            pointBorderColor: getGridLine(),
            pointBorderWidth: 1,
            borderWidth: config.type === "bar" ? 0 : 2,
            hoverBorderWidth: config.type === "bar" ? 0 : 3,
            tension: config.type === "bar" ? 0 : 0.4,
            pointRadius: config.type === "bar" ? 0 : 2,
            pointHoverRadius: 5,
            hitRadius: 10,
            fill: config.fill,
            order: 1,
          };
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      return results.filter((r) => r !== null);
    };

    const datasets = await buildDatasets(5);

    if (datasets.length === 0) return;

    const canvas = document.getElementById(`chart-${index}`);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const scales = getChartScales(state.timePeriod, config);

    const chart = new Chart(ctx, {
      type: config.type,
      data: { datasets: datasets },
      options: {
        animation: false,
        layout: { padding: { top: !state.currentRepo ? 0 : 10 } },
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
            display: !state.currentRepo,
            position: "bottom",
            align: "center",
            padding: { top: 20 },
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
            },
          },
        },
        scales: scales,
        onClick: async (e) => {
          if (!DOM.chartModal) return;
          if (DOM.modalChartTitle) DOM.modalChartTitle.textContent = key;
          DOM.chartModal.style.display = "flex";
          
          if (window.expandedChartInstance) {
            window.expandedChartInstance.destroy();
          }
          
          const expandedCtx = DOM.expandedChartCanvas.getContext("2d");
          const expandedScales = getChartScales(state.timePeriod, config);
          const expandedDatasets = await buildDatasets(20);
          
          window.expandedChartInstance = new Chart(expandedCtx, {
            type: config.type,
            data: { datasets: expandedDatasets },
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
                  display: true,
                  position: "bottom",
                  align: "center",
                  padding: { top: 20 },
                  labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 8,
                    boxHeight: 8,
                  },
                },
              },
              scales: expandedScales,
            },
          });
        },
      },
    });
    state.activeChartInstances.push(chart);
  });
}

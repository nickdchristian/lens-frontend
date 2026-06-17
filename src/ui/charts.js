import Chart from "chart.js/auto";
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

export function renderOverview(events, isSpecificView) {
  const metadataSection = document.getElementById("metadata-section");
  const tagsList = document.getElementById("current-tags");
  const customDataList = document.getElementById("current-custom-data");
  const chartsGrid = document.getElementById("dynamic-charts");

  state.activeChartInstances.forEach((c) => {
    try {
      c.destroy();
    } catch {
      // ignore
    }
  });
  state.activeChartInstances = [];

  if (chartsGrid) render(html``, chartsGrid);
  if (tagsList) render(html``, tagsList);
  if (customDataList) render(html``, customDataList);

  const overviewCharts = document.getElementById("overview-charts");
  const timelineContainer = document.getElementById("artifact-trace-container");

  if (state.currentArtifact) {
    if (metadataSection) metadataSection.style.display = "none";
    if (overviewCharts) overviewCharts.style.display = "none";
    if (timelineContainer) timelineContainer.style.display = "block";
    renderArtifactTrace(state.currentArtifact);
    return;
  } else {
    if (overviewCharts) overviewCharts.style.display = "block";
    if (timelineContainer) timelineContainer.style.display = "none";
  }

  if (events.length === 0) return;

  const uniqueReposMap = {};
  events.forEach((e) => {
    if (!uniqueReposMap[e.repository]) uniqueReposMap[e.repository] = [];
    uniqueReposMap[e.repository].push(e);
  });
  const uniqueRepos = Object.keys(uniqueReposMap).sort();

  if (isSpecificView && metadataSection && tagsList && customDataList) {
    metadataSection.style.display = "block";

    const renderList = (dataObj, el) => {
      if (!dataObj || Object.keys(dataObj).length === 0) {
        render(html`<li><span class="metadata-key">None</span></li>`, el);
        return;
      }

      const items = Object.entries(dataObj).map(
        ([k, v]) =>
          html`<li>
            <span class="metadata-key">${k}</span
            ><span class="metadata-val">${v}</span>
          </li>`
      );
      render(items, el);
    };

    if (state.currentRepo) {
      const latestEvent = events[events.length - 1];
      renderList(latestEvent.tags, tagsList);
      renderList(latestEvent.custom_data, customDataList);
    } else {
      let intersectedTags = null;
      let intersectedData = null;

      uniqueRepos.forEach((repo) => {
        const repoEvents = uniqueReposMap[repo];
        const latest = repoEvents[repoEvents.length - 1];

        const latestTags = latest.tags ?? {};
        const latestData = latest.custom_data ?? {};

        if (!intersectedTags) {
          intersectedTags = { ...latestTags };
        } else {
          Object.keys(intersectedTags).forEach((k) => {
            if (latestTags[k] !== intersectedTags[k]) delete intersectedTags[k];
          });
        }

        if (!intersectedData) {
          intersectedData = { ...latestData };
        } else {
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
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.color = getTextColor();
  } else if (Chart.defaults.global) {
    Chart.defaults.global.defaultFontFamily = "'DM Sans', sans-serif";
    Chart.defaults.global.defaultFontColor = getTextColor();
  }

  let maxEvents = 0;
  uniqueRepos.forEach((repo) => {
    const repoEventCount = Math.min(100, uniqueReposMap[repo].length);
    if (repoEventCount > maxEvents) maxEvents = repoEventCount;
  });

  const labels = Array.from({ length: maxEvents }, (_, i) => `#${i + 1}`);

  if (chartsGrid) {
    const chartCards = Array.from(numericKeys).map((key, index) => {
      return html`
        <div class="chart-card">
          <h3>${key.replace(/_/g, " ")}</h3>
          <canvas id="chart-${index}"></canvas>
        </div>
      `;
    });

    render(chartCards, chartsGrid);
  }

  Array.from(numericKeys).forEach((key, index) => {
    const datasets = [];

    uniqueRepos.forEach((repo, rIdx) => {
      const repoEvents = uniqueReposMap[repo].slice(-100);
      const data = repoEvents.map((e) => e.metrics?.[key] ?? null);

      if (!data.every((v) => v === null)) {
        const color = state.currentRepo
          ? getActiveSingleLine()
          : getAccentColor(rIdx % 10);
        datasets.push({
          label: repo.split("/").pop() || repo,
          data: data,
          borderColor: state.currentRepo
            ? getActiveSingleLine()
            : getNeutralLine(),
          backgroundColor: color,
          pointBackgroundColor: color,
          pointBorderColor: getGridLine(),
          pointBorderWidth: 1,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverBorderColor: color,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          hitRadius: 10,
          fill: false,
          order: 1,
        });
      }
    });

    if (datasets.length === 0) return;

    const canvas = document.getElementById(`chart-${index}`);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        interaction: { intersect: false, mode: "index" },
        hover: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
          },
          legend: {
            display: !state.currentRepo,
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
              sort: (a, b) => a.datasetIndex - b.datasetIndex,
            },
            onHover: function (e, legendItem, legend) {
              const ci = legend.chart;
              const hoveredDatasetIndex = legendItem.datasetIndex;
              ci.data.datasets.forEach((d, i) => {
                if (i === hoveredDatasetIndex) {
                  d.borderWidth = 3;
                  d.borderColor = d.backgroundColor;
                  d.order = 0;
                } else {
                  d.borderWidth = 1;
                  d.borderColor = getNeutralLine();
                  d.order = 1;
                }
              });
              ci.update();
            },
            onLeave: function (e, legendItem, legend) {
              const ci = legend.chart;
              ci.data.datasets.forEach((d) => {
                d.borderWidth = 2;
                d.borderColor = state.currentRepo
                  ? getActiveSingleLine()
                  : getNeutralLine();
                d.order = 1;
              });
              ci.update();
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            grid: { color: getGridLine() },
            border: { display: false },
          },
        },
      },
    });
    state.activeChartInstances.push(chart);
  });
}

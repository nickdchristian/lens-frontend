import Chart from "chart.js/auto";
import { state } from "./state.js?v=100";
import {
  getNeutralLine,
  getActiveSingleLine,
  getGridLine,
  getTextColor,
  getAccentColor,
} from "./theme.js?v=100";
import { renderArtifactTrace } from "./ui.js?v=100";

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
  chartsGrid.innerHTML = "";
  tagsList.innerHTML = "";
  customDataList.innerHTML = "";

  const overviewCharts = document.getElementById("overview-charts");
  const timelineContainer = document.getElementById("artifact-trace-container");

  if (state.currentArtifact) {
    metadataSection.style.display = "none";
    overviewCharts.style.display = "none";
    if (timelineContainer) timelineContainer.style.display = "block";
    renderArtifactTrace(state.currentArtifact);
    return;
  } else {
    overviewCharts.style.display = "block";
    if (timelineContainer) timelineContainer.style.display = "none";
  }

  if (events.length === 0) return;

  const uniqueReposMap = {};
  events.forEach((e) => {
    if (!uniqueReposMap[e.repository]) uniqueReposMap[e.repository] = [];
    uniqueReposMap[e.repository].push(e);
  });
  const uniqueRepos = Object.keys(uniqueReposMap).sort();

  if (isSpecificView) {
    metadataSection.style.display = "block";

    const renderList = (dataObj, el) => {
      if (!dataObj || Object.keys(dataObj).length === 0) {
        el.innerHTML = '<li><span class="metadata-key">None</span></li>';
        return;
      }
      Object.entries(dataObj).forEach(([k, v]) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="metadata-key">${k}</span><span class="metadata-val">${v}</span>`;
        el.appendChild(li);
      });
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
  } else {
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
          vibrantColor: color,
          borderColor: state.currentRepo
            ? getActiveSingleLine()
            : getNeutralLine(),
          backgroundColor: color,
          pointBackgroundColor: color,
          pointBorderColor: getGridLine(),
          pointBorderWidth: 1,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 0,
          hitRadius: 20,
          fill: false,
          order: 1,
        });
      }
    });

    if (datasets.length === 0) return;

    const card = document.createElement("div");
    card.className = "chart-card";
    card.innerHTML = `<h3>${key.replace(/_/g, " ")}</h3><canvas id="chart-${index}"></canvas>`;
    chartsGrid.appendChild(card);

    const canvas = document.getElementById(`chart-${index}`);
    const ctx = canvas.getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        interaction: { intersect: false, mode: "index" },
        onHover: (e, activeElements, chart) => {
          if (chart.isHoveringLegend) return;
          let hoveredDatasetIndex = null;
          let minGlobalDist = Infinity;
          chart.data.datasets.forEach((dataset, idx) => {
            const meta = chart.getDatasetMeta(idx);
            if (meta.hidden) return;
            const points = meta.data;
            if (!points || points.length === 0) return;
            let closestDistForDataset = Infinity;
            for (let i = 0; i < points.length - 1; i++) {
              const p1 = points[i],
                p2 = points[i + 1];
              if (
                typeof p1.x !== "number" ||
                typeof p1.y !== "number" ||
                typeof p2.x !== "number" ||
                typeof p2.y !== "number"
              )
                continue;
              if (e.x >= p1.x && e.x <= p2.x) {
                const ratio = p2.x === p1.x ? 0 : (e.x - p1.x) / (p2.x - p1.x);
                const expectedY = p1.y + ratio * (p2.y - p1.y);
                const verticalDist = Math.abs(e.y - expectedY);
                if (verticalDist < closestDistForDataset)
                  closestDistForDataset = verticalDist;
              }
            }
            if (closestDistForDataset === Infinity) {
              const first = points[0],
                last = points[points.length - 1];
              if (
                first &&
                typeof first.x === "number" &&
                typeof first.y === "number" &&
                e.x <= first.x
              ) {
                closestDistForDataset = Math.sqrt(
                  (e.x - first.x) ** 2 + (e.y - first.y) ** 2
                );
              }
              if (
                last &&
                typeof last.x === "number" &&
                typeof last.y === "number" &&
                e.x >= last.x
              ) {
                closestDistForDataset = Math.sqrt(
                  (e.x - last.x) ** 2 + (e.y - last.y) ** 2
                );
              }
            }
            if (closestDistForDataset < minGlobalDist) {
              minGlobalDist = closestDistForDataset;
              if (minGlobalDist < 25) hoveredDatasetIndex = idx;
            }
          });
          chart.hoveredDatasetIndex = hoveredDatasetIndex;
          chart.data.datasets.forEach((dataset, i) => {
            if (hoveredDatasetIndex === null) {
              dataset.borderWidth = 2;
              dataset.borderColor = state.currentRepo
                ? getActiveSingleLine()
                : getNeutralLine();
              dataset.order = 1;
            } else if (i === hoveredDatasetIndex) {
              dataset.borderWidth = 2.5;
              dataset.borderColor = dataset.vibrantColor;
              dataset.order = 0;
            } else {
              dataset.borderWidth = 1;
              dataset.borderColor = getNeutralLine();
              dataset.order = 1;
            }
          });
          chart.update();
        },
        plugins: {
          tooltip: {
            enabled: true,
            filter: function (tooltipItem) {
              return (
                tooltipItem.chart.hoveredDatasetIndex !== null &&
                tooltipItem.datasetIndex ===
                  tooltipItem.chart.hoveredDatasetIndex
              );
            },
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
              ci.isHoveringLegend = true;
              const hoveredDatasetIndex = legendItem.datasetIndex;
              ci.data.datasets.forEach((d, i) => {
                if (i === hoveredDatasetIndex) {
                  d.borderWidth = 2.5;
                  d.borderColor = d.vibrantColor;
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
              ci.isHoveringLegend = false;
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

    canvas.addEventListener("mouseleave", () => {
      chart.isHoveringLegend = false;
      chart.data.datasets.forEach((dataset) => {
        dataset.borderWidth = 2;
        dataset.borderColor = state.currentRepo
          ? getActiveSingleLine()
          : getNeutralLine();
        dataset.order = 1;
      });
      chart.update();
    });
  });
}

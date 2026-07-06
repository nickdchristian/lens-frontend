import { formatDate } from "./formatters.js";

const escapeHTML = (str) => {
  if (str == null) return "";
  if (typeof str !== "string") str = String(str);
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag]
  );
};

function getWindows(timePeriod) {
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  let days = 1;
  if (timePeriod === "week") days = 7;
  else if (timePeriod === "month") days = 30;
  else if (timePeriod === "year") days = 365;

  const currentStart = new Date(now.getTime() - days * DAY_MS);
  const previousStart = new Date(now.getTime() - 2 * days * DAY_MS);

  return { currentStart, previousStart, now };
}

export function generateHighLevelReportHTML(
  events,
  availableMetrics,
  timePeriod
) {
  const { currentStart, previousStart, now } = getWindows(timePeriod);

  const currentEvents = [];
  const previousEvents = [];

  (events || []).forEach((e) => {
    const t = new Date(e.timestamp);
    if (t >= currentStart && t <= now) {
      currentEvents.push(e);
    } else if (t >= previousStart && t < currentStart) {
      previousEvents.push(e);
    }
  });

  const repoEventCounts = {};
  const repoArtifactCounts = {};

  const metricContext = {};
  const artifactsMap = new Map();

  const dora = {
    current: {
      deployCount: 0,
      leadTimeSum: 0,
      leadTimeCount: 0,
      failureCount: 0,
    },
    previous: {
      deployCount: 0,
      leadTimeSum: 0,
      leadTimeCount: 0,
      failureCount: 0,
    },
  };

  const processDora = (e, target) => {
    const env =
      (e.tags && (e.tags.env || e.tags.environment || e.tags.Environment)) ||
      "";
    if (env.toLowerCase() === "production" || env.toLowerCase() === "prod") {
      target.deployCount += 1;

      if (e.metrics) {
        if (typeof e.metrics.lead_time_minutes === "number") {
          target.leadTimeSum += e.metrics.lead_time_minutes;
          target.leadTimeCount += 1;
        }
        if (
          typeof e.metrics.is_failure === "number" &&
          e.metrics.is_failure === 1
        ) {
          target.failureCount += 1;
        }
      }
    }
  };

  // Process current events
  currentEvents.forEach((e) => {
    processDora(e, dora.current);

    if (e.repository) {
      repoEventCounts[e.repository] = (repoEventCounts[e.repository] || 0) + 1;
    }

    if (e.artifact && e.artifact.name && e.artifact.version) {
      const artKey = `${e.artifact.name}@${e.artifact.version}`;
      if (!artifactsMap.has(artKey)) {
        artifactsMap.set(artKey, {
          ...e.artifact,
          timestamp: e.timestamp,
          repo: e.repository,
        });

        if (e.repository) {
          repoArtifactCounts[e.repository] =
            (repoArtifactCounts[e.repository] || 0) + 1;
        }
      }
    }

    const env =
      e.tags && (e.tags.env || e.tags.environment || e.tags.Environment);

    if (e.metrics) {
      Object.entries(e.metrics).forEach(([k, v]) => {
        if (typeof v === "number") {
          if (!metricContext[k]) {
            const isCount =
              k.toLowerCase().includes("count") ||
              k.toLowerCase().includes("total");
            metricContext[k] = {
              name: k
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              isCount,
              globalTotal: 0,
              globalCount: 0,
              prevGlobalTotal: 0,
              prevGlobalCount: 0,
              repoValues: {},
              repoCounts: {},
              envValues: {},
              envCounts: {},
            };
          }

          const ctx = metricContext[k];
          ctx.globalTotal += v;
          ctx.globalCount += 1;

          if (e.repository) {
            ctx.repoValues[e.repository] =
              (ctx.repoValues[e.repository] || 0) + v;
            ctx.repoCounts[e.repository] =
              (ctx.repoCounts[e.repository] || 0) + 1;
          }

          if (env) {
            ctx.envValues[env] = (ctx.envValues[env] || 0) + v;
            ctx.envCounts[env] = (ctx.envCounts[env] || 0) + 1;
          }
        }
      });
    }
  });

  // Process previous events for delta baseline
  previousEvents.forEach((e) => {
    processDora(e, dora.previous);

    if (e.metrics) {
      Object.entries(e.metrics).forEach(([k, v]) => {
        if (typeof v === "number" && metricContext[k]) {
          metricContext[k].prevGlobalTotal += v;
          metricContext[k].prevGlobalCount += 1;
        }
      });
    }
  });

  // Anomaly Detection pass
  const abnormalities = [];
  currentEvents.forEach((e) => {
    if (e.metrics) {
      // 1. Explicit Failures
      if (e.metrics.is_failure === 1) {
        abnormalities.push({
          timestamp: e.timestamp,
          repo: e.repository || "Unknown",
          workflow: e.workflow_name || "Unknown",
          detail: "Explicit Failure: 'is_failure' metric emitted as 1",
          severity: "high",
        });
      }

      // 2. Performance Outliers
      Object.entries(e.metrics).forEach(([k, v]) => {
        const ctx = metricContext[k];
        const repo = e.repository;
        if (
          ctx &&
          !ctx.isCount &&
          repo &&
          ctx.repoCounts[repo] > 0 &&
          typeof v === "number"
        ) {
          const repoAvg = ctx.repoValues[repo] / ctx.repoCounts[repo];
          // Flag if the value is > 2.0x the repository average
          if (repoAvg > 0 && v > repoAvg * 2.0) {
            const metricLabel = escapeHTML(ctx.name);
            const percentOver = (((v - repoAvg) / repoAvg) * 100).toFixed(0);
            abnormalities.push({
              timestamp: e.timestamp,
              repo: repo,
              workflow: e.workflow_name || "Unknown",
              detail: `Outlier: <strong>${metricLabel}</strong> was ${v.toFixed(1)} (exceeded repository average of ${repoAvg.toFixed(1)} by +${percentOver}%)`,
              severity: "medium",
            });
          }
        }
      });
    }
  });

  const severityWeight = { high: 2, medium: 1, low: 0 };
  const sortedAbnormalities = abnormalities
    .sort((a, b) => {
      const weightA = severityWeight[a.severity] || 0;
      const weightB = severityWeight[b.severity] || 0;
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    })
    .slice(0, 25);

  const topActiveRepos = Object.entries(repoEventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([repo, count]) => {
      return { repo, count, artifacts: repoArtifactCounts[repo] || 0 };
    });

  const recentArtifacts = Array.from(artifactsMap.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  const calculatePercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? "+100.0" : "0.0";
    const delta = (((current - previous) / previous) * 100).toFixed(1);
    return delta > 0 ? `+${delta}` : delta;
  };

  const generateDeltaHTML = (deltaStr) => {
    const deltaIcon = deltaStr.startsWith("+")
      ? "▲"
      : deltaStr === "0.0"
        ? "-"
        : "▼";
    return `<span style="font-weight: var(--font-medium);">${deltaStr}% ${deltaIcon}</span>`;
  };

  // DORA Metrics Calculation
  const daysInPeriod = Math.max(
    1,
    Math.round((now - currentStart) / (1000 * 60 * 60 * 24))
  );

  const currentDF = (dora.current.deployCount / daysInPeriod).toFixed(2);
  const prevDF = (dora.previous.deployCount / daysInPeriod).toFixed(2);

  const currentLeadTime =
    dora.current.leadTimeCount > 0
      ? (dora.current.leadTimeSum / dora.current.leadTimeCount).toFixed(1)
      : "N/A";
  const prevLeadTime =
    dora.previous.leadTimeCount > 0
      ? (dora.previous.leadTimeSum / dora.previous.leadTimeCount).toFixed(1)
      : "0";

  const currentCFR =
    dora.current.deployCount > 0
      ? ((dora.current.failureCount / dora.current.deployCount) * 100).toFixed(
          1
        )
      : "N/A";
  const prevCFR =
    dora.previous.deployCount > 0
      ? (
          (dora.previous.failureCount / dora.previous.deployCount) *
          100
        ).toFixed(1)
      : "0";

  const doraData = [
    {
      name: "Deployment Frequency",
      type: "Daily Average",
      value: currentDF,
      delta: generateDeltaHTML(
        calculatePercentChange(Number(currentDF), Number(prevDF))
      ),
    },
    {
      name: "Lead Time for Changes",
      type: "Mean Time (Minutes)",
      value: currentLeadTime,
      delta:
        currentLeadTime !== "N/A"
          ? generateDeltaHTML(
              calculatePercentChange(
                Number(currentLeadTime),
                Number(prevLeadTime)
              )
            )
          : "N/A",
    },
    {
      name: "Change Failure Rate",
      type: "Failure Rate (%)",
      value: currentCFR !== "N/A" ? `${currentCFR}%` : "N/A",
      delta:
        currentCFR !== "N/A"
          ? generateDeltaHTML(
              calculatePercentChange(Number(currentCFR), Number(prevCFR))
            )
          : "N/A",
    },
  ];

  // Formatting metrics
  const formattedMetrics = Object.values(metricContext)
    .map((ctx) => {
      // Skip DORA metrics from the generic table to avoid duplication
      if (
        ["lead time minutes", "is failure", "recovery time minutes"].includes(
          ctx.name.toLowerCase()
        )
      ) {
        return null;
      }

      const getValue = (total, count) =>
        ctx.isCount ? total : count === 0 ? 0 : (total / count).toFixed(2);

      const globalValue = getValue(ctx.globalTotal, ctx.globalCount);
      const prevGlobalValue = getValue(
        ctx.prevGlobalTotal,
        ctx.prevGlobalCount
      );

      const deltaStr = calculatePercentChange(
        Number(globalValue),
        Number(prevGlobalValue)
      );

      return {
        name: ctx.name,
        type: ctx.isCount ? "Aggregate Total" : "Period Average",
        globalValue: globalValue,
        delta: generateDeltaHTML(deltaStr),
      };
    })
    .filter(Boolean);

  const generateDateRange = () => {
    return `${formatDate(currentStart.toISOString())} - ${formatDate(
      now.toISOString()
    )}`;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Lens Summary</title>
      <style>
        :root {
          --space-1: 0.25rem;
          --space-2: 0.5rem;
          --space-3: 0.75rem;
          --space-4: 1rem;
          --space-5: 1.25rem;
          --space-6: 1.5rem;
          --space-8: 2rem;

          --text-xs: 0.75rem;
          --text-sm: 0.875rem;
          --text-base: 1rem;
          --text-lg: 1.125rem;
          --text-xl: 1.5rem;
          --text-2xl: 2rem;

          --font-normal: 400;
          --font-medium: 500;
          --font-semibold: 600;

          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-full: 9999px;

          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

          --blue-500: #2563eb;
          --red-500: #ef4444;
          --gold-500: #f59e0b;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-500: #6b7280;
          --gray-900: #111827;
          --white: #ffffff;

          --bg-color: #f6f8fa;
          --text-primary: var(--gray-900);
          --text-secondary: var(--gray-500);
          --border-color: var(--gray-200);
          --card-bg: var(--white);
          --theme-primary: var(--blue-500);
          --theme-accent: var(--gold-500);
        }

        /* Light/Dark Mode Matching Lens Standards */
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #121212;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --border-color: #333333;
            --card-bg: #1e1e1e;
            --theme-primary: #60a5fa;
            --theme-accent: #fbbf24;
            --gray-100: #2a2a2a;
          }
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--bg-color);
          color: var(--text-primary);
          line-height: 1.6;
          padding: var(--space-8);
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
        }

        header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: var(--space-6);
          margin-bottom: var(--space-8);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .title-block h1 {
          font-size: var(--text-2xl);
          font-weight: var(--font-semibold);
          margin-bottom: var(--space-2);
          color: var(--text-primary);
        }

        .title-block p {
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }

        .print-btn {
          background-color: var(--card-bg);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s;
        }
        
        .print-btn:hover {
          background-color: var(--gray-100);
          border-color: var(--text-secondary);
        }

        section {
          margin-bottom: var(--space-8);
        }

        h2 {
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-4);
          letter-spacing: 0.025em;
        }

        .footnote {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: var(--space-2);
          font-style: italic;
        }

        /* Tables matching data-table */
        table {
          width: 100%;
          border-collapse: collapse;
          background: var(--card-bg);
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }

        th {
          text-align: left;
          padding: var(--space-4);
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        td {
          padding: var(--space-4);
          font-size: var(--text-sm);
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .tag-pill {
          display: inline-flex;
          align-items: center;
          background-color: var(--gray-100);
          color: var(--text-primary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          border: 1px solid var(--border-color);
        }
        
        .anomaly-badge-high {
          background-color: var(--red-500);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .anomaly-badge-medium {
          background-color: var(--theme-accent);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        @page {
          margin: 0;
        }

        @media print {
          body {
            background-color: transparent;
            padding: 1in;
            color: black;
          }
          .container {
            max-width: 100%;
          }
          table {
            border: 1px solid #ccc;
            box-shadow: none;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          td, th {
            border-bottom: 1px solid #ccc;
          }
          .print-btn {
            display: none;
          }
          .anomaly-badge-high {
            color: var(--red-500);
            background: transparent;
            border: 1px solid var(--red-500);
          }
          .anomaly-badge-medium {
            color: var(--gold-500);
            background: transparent;
            border: 1px solid var(--gold-500);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div class="title-block">
            <h1>Lens Summary</h1>
            <p>Reporting Period: ${generateDateRange()} (${
              timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
            })</p>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <button class="print-btn" onclick="downloadReport()">Download HTML</button>
            <button class="print-btn" onclick="window.print()">Print Report</button>
          </div>
        </header>

        <section>
          <h2>DORA Metrics</h2>
          <table>
            <colgroup>
              <col style="width: 50%;">
              <col style="width: 25%;">
              <col style="width: 25%;">
            </colgroup>
            <thead>
              <tr>
                <th>Metric</th>
                <th style="text-align: right;">Aggregate Value</th>
                <th style="text-align: right;">Period-over-Period Trend</th>
              </tr>
            </thead>
            <tbody>
              ${doraData
                .map(
                  (m) => `
                <tr>
                  <td>
                    <div style="font-weight: var(--font-semibold);">${escapeHTML(m.name)}</div>
                    <div style="font-size: var(--text-xs); color: var(--text-secondary);">${escapeHTML(m.type)}</div>
                  </td>
                  <td style="font-size: var(--text-lg); font-weight: var(--font-semibold); text-align: right;">${escapeHTML(m.value.toString())}</td>
                  <td style="text-align: right;">${m.delta}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="footnote">* Note: These metrics represent the aggregate average across all repositories for the selected period. Time to Restore Service (MTTR) is deliberately excluded as it requires specialized incident management data outside the scope of CI/CD. DORA metrics are calculated exclusively from events tagged with <strong>env: production</strong> (or similar variations). Ensure your CI/CD pipelines emit this tag to be included in these calculations.</div>
        </section>

        ${
          formattedMetrics.length > 0
            ? `
        <section>
          <h2>Operational Metrics</h2>
          <table>
            <colgroup>
              <col style="width: 50%;">
              <col style="width: 25%;">
              <col style="width: 25%;">
            </colgroup>
            <thead>
              <tr>
                <th>Metric</th>
                <th style="text-align: right;">Aggregate Value</th>
                <th style="text-align: right;">Period-over-Period Trend</th>
              </tr>
            </thead>
            <tbody>
              ${formattedMetrics
                .map(
                  (m) => `
                <tr>
                  <td>
                    <div style="font-weight: var(--font-semibold);">${escapeHTML(m.name)}</div>
                    <div style="font-size: var(--text-xs); color: var(--text-secondary);">${escapeHTML(m.type)}</div>
                  </td>
                  <td style="font-size: var(--text-lg); font-weight: var(--font-semibold); text-align: right;">${escapeHTML(m.globalValue.toString())}</td>
                  <td style="text-align: right;">${m.delta}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="footnote">* Note: These metrics represent the aggregate average across all repositories for the selected period.</div>
        </section>
        `
            : ""
        }

        <section>
          <h2>Recent Artifact Releases</h2>
          <table>
            <colgroup>
              <col style="width: 25%;">
              <col style="width: 35%;">
              <col style="width: 15%;">
              <col style="width: 25%;">
            </colgroup>
            <thead>
              <tr>
                <th>Repository</th>
                <th>Artifact</th>
                <th>Version</th>
                <th style="text-align: right;">Release Date</th>
              </tr>
            </thead>
            <tbody>
              ${recentArtifacts
                .map(
                  (art) => `
                <tr>
                  <td>${escapeHTML(art.repo)}</td>
                  <td style="font-weight: var(--font-semibold);">${escapeHTML(art.name)}</td>
                  <td><span class="tag-pill">${escapeHTML(art.version)}</span></td>
                  <td style="text-align: right; color: var(--text-secondary);">${formatDate(
                    art.timestamp
                  )}</td>
                </tr>
              `
                )
                .join("")}
              ${
                recentArtifacts.length === 0
                  ? '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No release data available for this period.</td></tr>'
                  : ""
              }
            </tbody>
          </table>
        </section>

        <section>
          <h2>Repository Activity Overview</h2>
          <table>
            <colgroup>
              <col style="width: 50%;">
              <col style="width: 25%;">
              <col style="width: 25%;">
            </colgroup>
            <thead>
              <tr>
                <th>Repository</th>
                <th style="text-align: right;">Total Activity Events</th>
                <th style="text-align: right;">Artifact Releases</th>
              </tr>
            </thead>
            <tbody>
              ${topActiveRepos
                .map(
                  (repo) => `
                <tr>
                  <td style="font-weight: var(--font-medium);">${escapeHTML(repo.repo)}</td>
                  <td style="text-align: right;">${repo.count}</td>
                  <td style="text-align: right;">${repo.artifacts}</td>
                </tr>
              `
                )
                .join("")}
              ${
                topActiveRepos.length === 0
                  ? '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No repository activity recorded for this period.</td></tr>'
                  : ""
              }
            </tbody>
          </table>
        </section>
        
        <section>
          <h2>System Abnormalities & Outliers</h2>
          <p class="footnote" style="margin-bottom: var(--space-4);">Flags workflows that have explicitly failed or produced performance metrics significantly exceeding (2x+) the repository average.</p>
          <table>
            <colgroup>
              <col style="width: 15%;">
              <col style="width: 25%;">
              <col style="width: 20%;">
              <col style="width: 40%;">
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Repository</th>
                <th>Workflow</th>
                <th>Anomaly Details</th>
              </tr>
            </thead>
            <tbody>
              ${sortedAbnormalities
                .map(
                  (e) => `
                <tr>
                  <td style="color: var(--text-secondary); font-size: 12px; vertical-align: middle;">${formatDate(e.timestamp)}</td>
                  <td style="font-weight: var(--font-medium); word-break: break-word; vertical-align: middle;">${escapeHTML(e.repo)}</td>
                  <td style="word-break: break-word; vertical-align: middle;">${escapeHTML(e.workflow)}</td>
                  <td style="vertical-align: middle;">
                    <span class="anomaly-badge-${e.severity}" style="margin-right: 6px;">${e.severity === "high" ? "Failure" : "Outlier"}</span>
                    <span style="font-size: var(--text-sm);">${e.detail}</span>
                  </td>
                </tr>
              `
                )
                .join("")}
              ${
                sortedAbnormalities.length === 0
                  ? '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No system abnormalities detected in this period. Everything is healthy!</td></tr>'
                  : ""
              }
            </tbody>
          </table>
        </section>

      </div>
      <script>
        function downloadReport() {
          const docClone = document.documentElement.cloneNode(true);
          const scripts = docClone.querySelectorAll('script');
          scripts.forEach(s => s.remove());
          
          // Re-attach the print btn in the clone so we don't accidentally save it with display:none permanently if print CSS is applied somehow,
          // Actually, just save the outerHTML.
          const htmlContent = "<!DOCTYPE html>\\n" + docClone.outerHTML;
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'lens-summary.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      </script>
    </body>
    </html>
  `;
}

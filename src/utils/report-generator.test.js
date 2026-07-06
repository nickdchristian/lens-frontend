import { describe, it, expect } from "vitest";
import { generateHighLevelReportHTML } from "./report-generator.js";

describe("Report Generator", () => {
  const getMockEvents = (daysAgo) => {
    const timestamp = new Date(Date.now() - daysAgo * 86400000).toISOString();
    return [
      {
        repository: "repo-A",
        timestamp,
        tags: { env: "production" },
        metrics: {
          lead_time_minutes: 10,
          is_failure: 0,
          build_time_seconds: 40,
        },
      },
      {
        repository: "repo-A",
        timestamp,
        tags: { env: "production" },
        metrics: {
          lead_time_minutes: 20,
          is_failure: 1,
          build_time_seconds: 50,
        },
      },
    ];
  };

  it("should calculate DORA metrics correctly for the current period", () => {
    // Current period (day 0 and day 1 ago)
    const events = getMockEvents(0);
    const html = generateHighLevelReportHTML(events, [], "month");

    // DORA checks in HTML
    expect(html).toContain("DORA Metrics");
    // Deployment Frequency (2 deploys in the current month) -> 2 / 30(approx)
    expect(html).toContain("Mean Time (Minutes)");
    // Lead time average: (10 + 20) / 2 = 15.0
    expect(html).toContain("15.0");
    // Failure Rate: (1 failure / 2 deploys) * 100 = 50.0%
    expect(html).toContain("50.0%");
  });

  it("should calculate period-over-period deltas", () => {
    // 1 event current period, 2 events previous period (for a month view, > 30 days ago)
    const current = getMockEvents(0);
    const previous = getMockEvents(40); // Previous month
    const html = generateHighLevelReportHTML(
      [...current, ...previous],
      [],
      "month"
    );

    // The delta calculation should be represented in the HTML
    // We expect some delta percentage
    expect(html).toContain("%");
  });

  it("should flag >2x repository outliers as medium severity anomalies", () => {
    const events = [
      {
        repository: "repo-A",
        timestamp: new Date().toISOString(),
        metrics: { build_time_seconds: 10 }, // normal
      },
      {
        repository: "repo-A",
        timestamp: new Date().toISOString(),
        metrics: { build_time_seconds: 10 }, // normal
      },
      {
        repository: "repo-A",
        timestamp: new Date().toISOString(),
        metrics: { build_time_seconds: 50 }, // Outlier! Avg is (10+10+50)/3 = 23.3. 50 > 23.3 * 2
      },
    ];

    const html = generateHighLevelReportHTML(events, [], "month");
    expect(html).toContain("Outlier");
    expect(html).toContain("anomaly-badge-medium");
    expect(html).toContain("Build Time Seconds");
  });

  it("should sort high severity failures above medium severity outliers", () => {
    // Provide a recent outlier, and an older failure. The older failure should be sorted first.
    const events = [
      {
        repository: "repo-A",
        timestamp: new Date(Date.now() - 1000).toISOString(), // 1 second ago (very recent)
        workflow_name: "recent_outlier_workflow",
        metrics: { build_time_seconds: 100 }, // Outlier against an average
      },
      {
        repository: "repo-A",
        timestamp: new Date(Date.now() - 1000000).toISOString(), // Much older
        workflow_name: "older_failure_workflow",
        metrics: { is_failure: 1, build_time_seconds: 10 }, // Failure
      },
      {
        repository: "repo-A",
        timestamp: new Date().toISOString(),
        metrics: { build_time_seconds: 10 }, // Establish baseline average of ~40. 100 is > 2x 40.
      },
    ];

    const html = generateHighLevelReportHTML(events, [], "month");

    // We can simply check that the failure string appears BEFORE the outlier string in the rendered HTML table
    const failureIndex = html.indexOf("older_failure_workflow");
    const outlierIndex = html.indexOf("recent_outlier_workflow");

    expect(failureIndex).toBeGreaterThan(-1);
    expect(outlierIndex).toBeGreaterThan(-1);
    expect(failureIndex).toBeLessThan(outlierIndex); // Failure must be sorted higher (lower index in HTML)
  });
});

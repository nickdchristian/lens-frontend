import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { html, render } from "lit";
import "./artifact-trace.js";

describe("LensArtifactTrace Web Component", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      container.remove();
    }
  });

  it("should render empty state if no matching events are found", async () => {
    const mockArtifact = { name: "test-app", version: "v1.0" };
    const noMatchEvents = [
      { artifact: { name: "other-app", version: "v2.0" } },
    ];

    render(
      html`<lens-artifact-trace
        .events=${noMatchEvents}
        .artifactObj=${mockArtifact}
      ></lens-artifact-trace>`,
      container
    );

    await new Promise((r) => setTimeout(r, 0));

    const element = container.querySelector("lens-artifact-trace");
    const shadowRoot = element.shadowRoot;

    const emptyState = shadowRoot.querySelector(".empty-state");
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain("No lifecycle events found");
    expect(emptyState.textContent).toContain("test-app (v1.0)");
  });

  it("should render timeline nodes and details panel for matching events", async () => {
    const mockArtifact = { name: "test-app", version: "v1.0" };
    const matchingEvents = [
      {
        repository: "test/repo",
        timestamp: "2024-01-01T12:00:00Z",
        workflow_name: "Build",
        artifact: mockArtifact,
        tags: { env: "prod" },
      },
      {
        repository: "test/repo",
        timestamp: "2024-01-01T12:05:00Z",
        workflow_name: "Deploy",
        artifact: mockArtifact,
        metrics: { time: 5 },
      },
    ];

    render(
      html`<lens-artifact-trace
        .events=${matchingEvents}
        .artifactObj=${mockArtifact}
        .activeTraceIndex=${1}
      ></lens-artifact-trace>`,
      container
    );

    await new Promise((r) => setTimeout(r, 0));

    const element = container.querySelector("lens-artifact-trace");
    const shadowRoot = element.shadowRoot;

    // Check timeline items are rendered
    const timelineItems = shadowRoot.querySelectorAll(".trace-timeline-item");
    expect(timelineItems).toHaveLength(2);

    // Check active node styling
    const nodes = shadowRoot.querySelectorAll(".trace-node");
    expect(nodes[0].classList.contains("active-node")).toBe(false);
    expect(nodes[1].classList.contains("active-node")).toBe(true);

    // Check details panel rendering
    const panelHeader = shadowRoot.querySelector(".panel-header h3");
    expect(panelHeader.textContent).toContain("test/repo (Deploy)");

    const detailsSections = shadowRoot.querySelectorAll(".details-section");
    expect(detailsSections.length).toBeGreaterThan(0);
  });
});

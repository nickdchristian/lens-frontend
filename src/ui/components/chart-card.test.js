import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { html, render } from "lit";

const { mockChart } = vi.hoisted(() => {
  const chartFn = vi.fn().mockImplementation(function () {
    return { destroy: vi.fn() };
  });
  chartFn.defaults = { color: "#000" };
  chartFn.register = vi.fn();
  return { mockChart: chartFn };
});

vi.mock("chart.js", () => {
  return {
    Chart: mockChart,
    LineController: {},
    BarController: {},
    ScatterController: {},
    BubbleController: {},
    LineElement: {},
    BarElement: {},
    PointElement: {},
    LinearScale: {},
    TimeScale: {},
    Tooltip: {},
    Legend: {},
    Filler: {},
  };
});
vi.mock("chartjs-adapter-date-fns", () => ({}));

import "./chart-card.js"; // This defines the custom element

describe("LensChartCard Web Component", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      container.remove();
    }
    vi.clearAllMocks();
  });

  it("should render empty state message when no datasets provided", async () => {
    render(
      html`<lens-chart-card
        .title=${"Test Chart"}
        .emptyMessage=${"No data"}
      ></lens-chart-card>`,
      container
    );

    // Wait for Lit's update cycle
    await new Promise((r) => setTimeout(r, 0));

    const element = container.querySelector("lens-chart-card");
    expect(element).toBeTruthy();

    const shadowRoot = element.shadowRoot;
    const titleEl = shadowRoot.querySelector("h3");
    expect(titleEl.textContent).toBe("Test Chart");

    const emptyMsgEl = shadowRoot.querySelector(".empty-message");
    expect(emptyMsgEl).toBeTruthy();
    expect(emptyMsgEl.textContent).toBe("No data");

    const canvas = shadowRoot.querySelector("canvas");
    expect(canvas).toBeNull();
  });

  it("should render canvas and instantiate Chart when datasets exist", async () => {
    const mockDatasets = [{ label: "Test", data: [1, 2, 3] }];
    const mockConfig = { type: "bar" };

    render(
      html`<lens-chart-card
        .title=${"Active Chart"}
        .datasets=${mockDatasets}
        .config=${mockConfig}
      ></lens-chart-card>`,
      container
    );

    await new Promise((r) => setTimeout(r, 0));

    const element = container.querySelector("lens-chart-card");
    const shadowRoot = element.shadowRoot;

    const emptyMsgEl = shadowRoot.querySelector(".empty-message");
    expect(emptyMsgEl).toBeNull();

    const canvas = shadowRoot.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(canvas.id).toBe("chartCanvas");

    expect(mockChart).toHaveBeenCalledTimes(1);
    expect(mockChart.mock.calls[0][1].type).toBe("bar");
    expect(mockChart.mock.calls[0][1].data.datasets).toEqual(mockDatasets);
  });
});

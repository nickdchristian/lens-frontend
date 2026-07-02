import { describe, it, expect, vi, beforeEach } from "vitest";
import { state, subscribe, unsubscribe } from "./store.js";

describe("store", () => {
  beforeEach(() => {
    // Reset state to defaults before each test
    state.appMode = "repositories";
    state.currentRepo = null;
    state.currentGroupKey = null;
    state.currentGroupVal = null;
    state.currentArtifact = null;
    state.searchQuery = "";
    state.historySearchQuery = "";
    state.currentPage = 1;
    state.timePeriod = "month";
    state.isDarkMode = false;
  });

  it("should update state properties via actions", () => {
    state.appMode = "artifacts";
    expect(state.appMode).toBe("artifacts");

    state.currentRepo = "my-repo";
    expect(state.currentRepo).toBe("my-repo");

    state.timePeriod = "week";
    expect(state.timePeriod).toBe("week");

    state.searchQuery = "error";
    expect(state.searchQuery).toBe("error");
  });

  it("should support subscribing to state changes", async () => {
    const callback = vi.fn();
    subscribe(callback);

    state.appMode = "artifacts";

    // Wait for the requestAnimationFrame to process notifications
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(callback).toHaveBeenCalled();
    unsubscribe(callback);
  });

  it("should not notify unsubscribed callbacks", async () => {
    const callback = vi.fn();
    subscribe(callback);
    unsubscribe(callback);

    state.appMode = "settings";

    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(callback).not.toHaveBeenCalled();
  });

  it("should only schedule one notification per frame", async () => {
    const callback = vi.fn();
    subscribe(callback);

    state.appMode = "artifacts";
    state.currentRepo = "test";
    state.searchQuery = "foo";

    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe(callback);
  });
});

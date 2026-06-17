import { expect, test, describe } from "vitest";

import { state, subscribe, unsubscribe } from "./store.js";

describe("Global State", () => {
  test("should initialize with default values", () => {
    expect(state).toBeDefined();
    expect(state.currentTab).toBe("dashboard");
    expect(state.allEvents).toEqual([]);
    expect(state.selectedRepository).toBe("All");
    expect(state.searchQuery).toBe("");
    expect(state.groupBy).toBe("None");
    expect(state.historySearchQuery).toBe("");
  });

  test("should be mutable", () => {
    state.currentTab = "settings";
    expect(state.currentTab).toBe("settings");

    state.allEvents = [{ id: 1, name: "test" }];
    expect(state.allEvents.length).toBe(1);
    expect(state.allEvents[0].id).toBe(1);
  });
});

describe("State Reactivity", () => {
  test("should notify subscribers when state changes", async () => {
    return new Promise((resolve) => {
      const callback = (newState) => {
        expect(newState.searchQuery).toBe("test query");
        unsubscribe(callback);
        resolve();
      };
      subscribe(callback);
      state.searchQuery = "test query";
    });
  });

  test("should unsubscribe properly", async () => {
    let callCount = 0;
    const callback = () => {
      callCount++;
    };
    subscribe(callback);
    unsubscribe(callback);

    state.groupBy = "Repository";

    // Wait a tick for the rAF to potentially fire
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(callCount).toBe(0);
  });
});

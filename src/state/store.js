const subscribers = new Set();
export const subscribe = (cb) => {
  subscribers.add(cb);
  return () => unsubscribe(cb);
};
export const unsubscribe = (cb) => subscribers.delete(cb);

const notify = () => {
  subscribers.forEach((cb) => {
    try {
      cb(state);
    } catch (error) {
      console.error("Subscriber error:", error);
    }
  });
};

let renderScheduled = false;
const scheduleNotify = () => {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    try {
      notify();
    } finally {
      renderScheduled = false;
    }
  });
};

/**
 * @typedef {import('../api/client.js').LensEvent} LensEvent
 */

/**
 * @typedef {Object} AppState
 * @property {boolean} isDarkMode
 * @property {string} apiHost
 * @property {string} currentTab
 * @property {LensEvent[]} allEvents
 * @property {string} selectedRepository
 * @property {string} searchQuery
 * @property {string} groupBy
 * @property {string} historySearchQuery
 * @property {string} appMode
 * @property {string} settingsGroup
 * @property {string|null} currentRepo
 * @property {string|null} currentGroupKey
 * @property {string|null} currentGroupVal
 * @property {Object|null} currentArtifact
 * @property {number|null} activeTraceIndex
 * @property {Object[]} activeChartInstances
 * @property {number} currentPage
 * @property {number} eventsPerPage
 * @property {string} timePeriod
 * @property {boolean} isLoading
 * @property {boolean} isSidebarOpen
 */

/** @type {AppState} */
const initialState = {
  isDarkMode: (() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  })(),
  apiHost:
    typeof window !== "undefined" ? localStorage.getItem("apiHost") || "" : "",
  currentTab: "overview",
  allEvents: [],
  globalEvents: [],
  selectedRepository: "",
  searchQuery: "",
  groupBy: "none",
  historySearchQuery: "",
  appMode: "repositories",
  settingsGroup: "appearance",
  currentRepo: null,
  currentGroupKey: null,
  currentGroupVal: null,
  currentArtifact: null,
  activeTraceIndex: null,
  activeChartInstances: [],
  currentPage: 1,
  eventsPerPage: 25,
  isSidebarOpen: false,
  timePeriod: (() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("defaultTimePeriod") || "month";
    }
    return "month";
  })(),
  isLoading: false,
  hasFetchedGlobalEvents: false,
  repositories: [],
  availableMetrics: [],
};

export const state = new Proxy(initialState, {
  set(target, prop, value) {
    if (target[prop] !== value) {
      target[prop] = value;
      scheduleNotify();
    }
    return true;
  },
});

export class StoreController {
  constructor(host) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    this.unsubscribe = subscribe(() => {
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

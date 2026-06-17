const subscribers = new Set();
export const subscribe = (cb) => subscribers.add(cb);
export const unsubscribe = (cb) => subscribers.delete(cb);

const notify = () => {
  subscribers.forEach((cb) => cb(state));
};

let renderScheduled = false;
const scheduleNotify = () => {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    notify();
    renderScheduled = false;
  });
};

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
  currentTab: "dashboard",
  allEvents: [],
  selectedRepository: "All",
  searchQuery: "",
  groupBy: "None",
  historySearchQuery: "",
  appMode: "repositories",
  currentRepo: null,
  currentGroupKey: null,
  currentGroupVal: null,
  currentArtifact: null,
  activeChartInstances: [],
  currentPage: 1,
  eventsPerPage: 25,
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

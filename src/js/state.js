export const state = {
  isDarkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  currentTab: "dashboard", // 'dashboard' or 'settings'
  allEvents: [],
  selectedRepository: "All",
  searchQuery: "",
  groupBy: "None",
  historySearchQuery: "",
};

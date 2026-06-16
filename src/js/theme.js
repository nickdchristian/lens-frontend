import { state } from "./state.js?v=2";

export function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function getNeutralLine() {
  return state.isDarkMode ? "#555555" : "#a3a3a3";
}
export function getActiveSingleLine() {
  const val = getComputedStyle(document.documentElement).getPropertyValue(
    "--theme-primary"
  );
  return (val ? val.toString().trim() : "") || "#2563eb";
}
export function getFadedLine() {
  return state.isDarkMode ? "#222222" : "#e5e5e5";
}
export function getGridLine() {
  return state.isDarkMode ? "#333333" : "#eaeaea";
}
export function getTextColor() {
  return state.isDarkMode ? "#a0a0a0" : "#737373";
}

export function getAccentColor(index) {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--accent-${index + 1}`)
      .trim() || "#147df5"
  );
}

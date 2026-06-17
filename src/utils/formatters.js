import { html } from "https://unpkg.com/lit-html?module";

export const escapeHtml = (unsafe) =>
  String(unsafe ?? "").replace(
    /[&<"'>]/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m]
  );

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(args), wait);
  };
};

export const formatDictionaryRow = (data) => {
  if (!data || Object.keys(data).length === 0) return "";
  return Object.entries(data).map(
    ([key, val]) =>
      html`<span class="tag-badge"
        ><strong>${key}:</strong> ${String(val)}</span
      > `
  );
};

export const formatDictionary = (data) => {
  if (!data || Object.keys(data).length === 0)
    return html`<span class="empty-state">None</span>`;

  return html`<dl class="data-list">
    ${Object.entries(data).map(([key, val]) => {
      const displayVal = typeof val === "object" ? JSON.stringify(val) : val;
      return html`<div class="data-row">
        <dt>${key.replace(/_/g, " ")}</dt>
        <dd>${displayVal}</dd>
      </div>`;
    })}
  </dl>`;
};

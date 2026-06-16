import { html } from "lit";

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

import { html } from "lit";

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
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

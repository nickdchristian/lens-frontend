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
  return Object.entries(data)
    .map(
      ([key, val]) =>
        `<span class="tag-badge"><strong>${escapeHtml(
          key
        )}:</strong> ${escapeHtml(String(val))}</span>`
    )
    .join(" ");
};

export const formatDictionary = (data) => {
  if (!data || Object.keys(data).length === 0)
    return `<span class="empty-state">None</span>`;

  return `<dl class="data-list">
    ${Object.entries(data)
      .map(([key, val]) => {
        const displayVal = typeof val === "object" ? JSON.stringify(val) : val;
        return `<div class="data-row">
            <dt>${escapeHtml(key.replace(/_/g, " "))}</dt>
            <dd>${escapeHtml(displayVal)}</dd>
        </div>`;
      })
      .join("")}
  </dl>`;
};

import { getGridLine } from "./theme.js";

export function getChartConfig(
  metricKey,
  actionOverrideType = null,
  localOverrideType = null
) {
  const finalType = localOverrideType || actionOverrideType;
  const key = metricKey.toLowerCase();

  let type = "line";
  let fill = false;
  let stacked = false;
  let max = undefined;
  const tension = 0; // SWD: No spline interpolation for time-series data

  if (key === "change_failure_rate") {
    max = 100;
  } else if (
    key.includes("rate") ||
    key.includes("percentage") ||
    key.includes("percent") ||
    key.includes("coverage")
  ) {
    max = 100;
  } else if (key.includes("count") || key.includes("frequency")) {
    type = "bar";
  }

  const supportedCartesianTypes = ["line", "bar", "scatter", "bubble", "area"];

  if (finalType) {
    if (supportedCartesianTypes.includes(finalType)) {
      if (finalType === "area") {
        type = "line";
        fill = true;
      } else {
        type = finalType;
      }
    } else {
      console.warn(
        `[Lens] Chart type '${finalType}' is not supported for time-series data. Falling back to default.`
      );
    }
  }

  return { type, fill, stacked, max, tension };
}

export function getChartScales(timePeriod, config) {
  const timeUnit =
    timePeriod === "day"
      ? "hour"
      : timePeriod === "week"
        ? "day"
        : timePeriod === "month"
          ? "day"
          : "month";

  const tooltipFormat =
    timePeriod === "day"
      ? "MMM d, HH:mm 'UTC'"
      : timePeriod === "year"
        ? "MMM yyyy"
        : "MMM d";

  const now = new Date();
  let cutoffDate = new Date();
  if (timePeriod === "day") cutoffDate.setDate(now.getDate() - 1);
  else if (timePeriod === "week") cutoffDate.setDate(now.getDate() - 7);
  else if (timePeriod === "month") cutoffDate.setMonth(now.getMonth() - 1);
  else if (timePeriod === "year") cutoffDate.setFullYear(now.getFullYear() - 1);

  const tzOffset = now.getTimezoneOffset() * 60000;

  const scales = {
    x: {
      type: "time",
      min: cutoffDate.getTime() + tzOffset,
      max: now.getTime() + tzOffset,
      display: true,
      ticks: {
        display: true,
        maxRotation: 0,
        maxTicksLimit: 6,
      },
      time: {
        unit: timeUnit,
        tooltipFormat: tooltipFormat,
        displayFormats: {
          minute: "HH:mm",
          hour: "HH:mm",
          day: "MMM d",
          month: "MMM yyyy",
        },
      },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      stacked: config.stacked,
      grid: { color: getGridLine() },
      border: { display: false },
      ticks: { precision: 0 },
    },
  };

  if (config.max !== undefined) scales.y.max = config.max;
  if (config.min !== undefined) scales.y.min = config.min;

  return scales;
}

export function colorMix(hex, alpha) {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.startsWith("#")) {
    const h = hex.replace("#", "");
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length === 6) {
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    }
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

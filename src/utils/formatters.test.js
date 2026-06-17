import { expect, test, describe } from "vitest";
import { formatDate, formatDuration } from "./formatters.js";

describe("Formatters", () => {
  describe("formatDate", () => {
    test("should return N/A for null/undefined date", () => {
      expect(formatDate(null)).toBe("N/A");
      expect(formatDate(undefined)).toBe("N/A");
      expect(formatDate("")).toBe("N/A");
    });

    test("should correctly format a valid date string", () => {
      const dateStr = "2023-10-01T12:00:00Z";
      const formatted = formatDate(dateStr);
      expect(formatted).not.toBe("N/A");
      expect(formatted).toContain("2023"); // Depends on local timezone but should contain the year
    });
  });

  describe("formatDuration", () => {
    test("should return N/A for invalid or missing inputs", () => {
      expect(formatDuration(null)).toBe("N/A");
      expect(formatDuration(undefined)).toBe("N/A");
    });

    test("should format milliseconds under 1000 properly", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    test("should format milliseconds over 1000 as seconds with two decimal precision", () => {
      expect(formatDuration(1000)).toBe("1.00s");
      expect(formatDuration(1500)).toBe("1.50s");
      expect(formatDuration(10550)).toBe("10.55s");
    });
  });
});

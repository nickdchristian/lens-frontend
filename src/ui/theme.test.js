import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyTheme,
  getNeutralLine,
  getActiveSingleLine,
  getFadedLine,
  getGridLine,
  getTextColor,
  getAccentColor,
} from "./theme.js";
import { state } from "../state/store.js";

// Mock the state store
vi.mock("../state/store.js", () => ({
  state: {
    isDarkMode: false,
  },
}));

describe("Theme utilities", () => {
  let originalGetComputedStyle;

  beforeEach(() => {
    // Reset state
    state.isDarkMode = false;
    document.documentElement.removeAttribute("data-theme");

    // Mock getComputedStyle
    originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = vi.fn().mockImplementation(() => ({
      getPropertyValue: (prop) => {
        if (prop === "--theme-primary") return "#mock-primary";
        if (prop === "--accent-1") return "#mock-accent-1";
        return "";
      },
    }));
  });

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
    vi.clearAllMocks();
  });

  describe("applyTheme", () => {
    it("should set data-theme attribute when dark is true", () => {
      applyTheme(true);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("should remove data-theme attribute when dark is false", () => {
      document.documentElement.setAttribute("data-theme", "dark");
      applyTheme(false);
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    });
  });

  describe("Color getters", () => {
    it("should return light mode colors when isDarkMode is false", () => {
      state.isDarkMode = false;
      expect(getNeutralLine()).toBe("#a3a3a3");
      expect(getFadedLine()).toBe("#e5e5e5");
      expect(getGridLine()).toBe("#eaeaea");
      expect(getTextColor()).toBe("#737373");
    });

    it("should return dark mode colors when isDarkMode is true", () => {
      state.isDarkMode = true;
      expect(getNeutralLine()).toBe("#555555");
      expect(getFadedLine()).toBe("#222222");
      expect(getGridLine()).toBe("#333333");
      expect(getTextColor()).toBe("#a0a0a0");
    });

    it("should return computed CSS variables or fallbacks", () => {
      expect(getActiveSingleLine()).toBe("#mock-primary");
      expect(getAccentColor(0)).toBe("#mock-accent-1");
      expect(getAccentColor(5)).toBe("#147df5"); // Falls back when empty
    });
  });
});

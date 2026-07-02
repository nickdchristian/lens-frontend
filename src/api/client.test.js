import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchEvents, fetchAggregatedMetrics } from "./client.js";

// Mock the logger to avoid console output during tests
vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("API Client", () => {
  const originalFetch = global.fetch;
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    global.fetch = vi.fn();

    // Mock localStorage
    const store = { apiHost: "http://mock-api.com" };
    global.localStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value;
      },
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    vi.clearAllMocks();
  });

  describe("fetchEvents", () => {
    it("should fetch events successfully", async () => {
      const mockEvents = { status: "success", events: [{ id: 1 }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      });

      const result = await fetchEvents("test-repo");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toContain(
        "http://mock-api.com/api/v1/events/test-repo"
      );
      expect(result).toEqual(mockEvents);
    });

    it("should retry on failure and eventually succeed", async () => {
      const mockEvents = { status: "success", events: [{ id: 1 }] };
      global.fetch
        .mockRejectedValueOnce(new Error("Network failure 1"))
        .mockRejectedValueOnce(new Error("Network failure 2"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents,
        });

      // We need to use vi.useFakeTimers to speed up the sleep() delays
      vi.useFakeTimers();

      const fetchPromise = fetchEvents("test-repo");

      // Advance timers to trigger retries
      await vi.advanceTimersByTimeAsync(1500); // Wait for first delay (1000)
      await vi.advanceTimersByTimeAsync(2500); // Wait for second delay (2000)

      const result = await fetchPromise;

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockEvents);

      vi.useRealTimers();
    });

    it("should return error status after max retries", async () => {
      global.fetch.mockRejectedValue(new Error("Persistent failure"));

      vi.useFakeTimers();

      const fetchPromise = fetchEvents("test-repo");

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      const result = await fetchPromise;

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ status: "error", events: [] });

      vi.useRealTimers();
    });

    it("should abort previous requests when called rapidly", async () => {
      // Mock fetch to respect the abort signal
      global.fetch.mockImplementation(async (url, options) => {
        if (options && options.signal && options.signal.aborted) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          throw error;
        }

        // Wait a tiny bit to allow the second call to trigger the abort
        await new Promise((r) => setTimeout(r, 10));

        if (options && options.signal && options.signal.aborted) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          throw error;
        }

        return {
          ok: true,
          json: async () => ({ status: "success", events: [{ url }] }),
        };
      });

      // Call twice rapidly
      const promise1 = fetchEvents("test-repo-1");
      const promise2 = fetchEvents("test-repo-2");

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // The first request should have aborted
      expect(result1).toEqual({ status: "aborted", events: [] });
      // The second request should succeed
      expect(result2.status).toEqual("success");
    });
  });

  describe("fetchAggregatedMetrics", () => {
    it("should fetch metrics successfully", async () => {
      const mockData = { data: [{ bucket: "2024", sum: 10 }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchAggregatedMetrics(
        "repo",
        "metric_1",
        "day",
        true
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toBe(
        "http://mock-api.com/api/v1/events/repo/metrics/aggregated?metric_key=metric_1&time_period=day&is_sum=true"
      );
      expect(result).toEqual(mockData.data);
    });

    it("should return empty array on failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchAggregatedMetrics(
        "repo",
        "metric_1",
        "day",
        true
      );

      expect(result).toEqual([]);
    });
  });
});

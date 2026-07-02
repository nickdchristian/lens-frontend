import { describe, it, expect } from "vitest";
import {
  groupEventsByRepository,
  getTopRepositoriesForMetric,
} from "./data-processing.js";

describe("data-processing utils", () => {
  describe("groupEventsByRepository", () => {
    it("should group events by repository correctly", () => {
      const events = [
        { id: 1, repository: "repo-a" },
        { id: 2, repository: "repo-b" },
        { id: 3, repository: "repo-a" },
      ];

      const result = groupEventsByRepository(events);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["repo-a"]).toHaveLength(2);
      expect(result["repo-b"]).toHaveLength(1);
      expect(result["repo-a"][0].id).toBe(1);
      expect(result["repo-a"][1].id).toBe(3);
    });

    it("should handle empty array", () => {
      const result = groupEventsByRepository([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("getTopRepositoriesForMetric", () => {
    it("should filter repositories that contain the metric", () => {
      const map = {
        "repo-a": [{ metrics: { a: 1 } }],
        "repo-b": [{ metrics: { b: 2 } }],
      };
      const result = getTopRepositoriesForMetric(map, "a", false);
      expect(result).toEqual(["repo-a"]);
    });

    it("should limit results if isGlobalView is true and sort by volume of metric", () => {
      const map = {
        "repo-a": [{ metrics: { a: 1 } }],
        "repo-b": [
          { metrics: { a: 1 } },
          { metrics: { a: 2 } },
          { metrics: { a: 3 } },
        ],
        "repo-c": [{ metrics: { a: 1 } }, { metrics: { a: 2 } }],
      };

      const result = getTopRepositoriesForMetric(map, "a", true, 2);
      // Expected order: repo-b (3), repo-c (2). repo-a (1) is omitted
      expect(result).toEqual(["repo-b", "repo-c"]);
    });

    it("should not limit results if isGlobalView is false", () => {
      const map = {
        "repo-a": [{ metrics: { a: 1 } }],
        "repo-b": [{ metrics: { a: 1 } }],
        "repo-c": [{ metrics: { a: 1 } }],
      };

      const result = getTopRepositoriesForMetric(map, "a", false, 2);
      // Even though limit is 2, isGlobalView is false
      expect(result).toHaveLength(3);
      expect(result).toContain("repo-a");
      expect(result).toContain("repo-b");
      expect(result).toContain("repo-c");
    });
  });
});

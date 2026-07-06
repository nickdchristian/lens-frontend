import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/v1/events/lens", () => {
    return HttpResponse.json([
      {
        repository: "forgejo/lens-test-repo",
        timestamp: new Date().toISOString(),
        workflow_name: "deploy_prod",
        artifact_version: "v1.1.0",
        tags: { env: "production", region: "us-east" },
        custom_data: { lifecycle_stage: "deploy" },
        metrics: {
          build_time_seconds: 45,
          bundle_size_mb: 2.4,
          lead_time_minutes: 120,
          is_failure: 0,
        },
      },
      {
        repository: "forgejo/lens-test-repo",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        workflow_name: "deploy_prod",
        artifact_version: "v1.0.0",
        tags: { env: "production", region: "us-east" },
        custom_data: { lifecycle_stage: "deploy" },
        metrics: {
          build_time_seconds: 42,
          bundle_size_mb: 2.3,
          lead_time_minutes: 80,
          is_failure: 1,
          recovery_time_minutes: 45,
        },
      },
      {
        repository: "forgejo/lens-action",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        workflow_name: "test_build",
        artifact_version: "v0.9.0",
        tags: { env: "staging", region: "us-east" },
        custom_data: { lifecycle_stage: "build" },
        metrics: { build_time_seconds: 42, bundle_size_mb: 2.3 },
      },
      {
        repository: "forgejo/lens-action",
        timestamp: new Date().toISOString(),
        workflow_name: "test_build",
        artifact_version: "v0.9.1",
        tags: { env: "staging", region: "us-east" },
        custom_data: { lifecycle_stage: "build" },
        metrics: { build_time_seconds: 350, bundle_size_mb: 2.3 }, // Massive outlier
      },
    ]);
  }),
  http.get("/api/v1/events/repositories", () => {
    return HttpResponse.json(["forgejo/lens-test-repo", "forgejo/lens-action"]);
  }),
  http.get("/api/v1/events/metrics", () => {
    return HttpResponse.json([
      "build_time_seconds",
      "bundle_size_mb",
      "lead_time_minutes",
      "is_failure",
      "recovery_time_minutes",
    ]);
  }),
];

/**
 * Unit tests for src/services/api.ts
 *
 * Tests cover:
 * - API_ENDPOINTS: structure/completeness
 * - ApiClient: token management, request construction
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock import.meta.env before importing api.ts
vi.stubGlobal("localStorage", {
  _store: {} as Record<string, string>,
  getItem(key: string) {
    return this._store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this._store[key] = value;
  },
  removeItem(key: string) {
    delete this._store[key];
  },
  clear() {
    this._store = {};
  },
});

// ============================================================
// API_ENDPOINTS structure
// ============================================================

describe("API_ENDPOINTS", () => {
  it("has health endpoint", async () => {
    const { API_ENDPOINTS } = await import("@/services/api");
    expect(API_ENDPOINTS.HEALTH).toBe("/health");
  });

  it("has auth endpoints", async () => {
    const { API_ENDPOINTS } = await import("@/services/api");
    expect(API_ENDPOINTS.AUTH.SIGNUP).toBe("/auth/signup");
    expect(API_ENDPOINTS.AUTH.SIGNIN).toBe("/auth/signin");
    expect(API_ENDPOINTS.AUTH.GOOGLE_LOGIN).toBe("/auth/google/login");
    expect(API_ENDPOINTS.AUTH.GOOGLE_CALLBACK).toBe("/auth/google/callback");
  });

  it("has video endpoints", async () => {
    const { API_ENDPOINTS } = await import("@/services/api");
    expect(API_ENDPOINTS.VIDEO.PROCESS).toBe("/video/process");
    expect(API_ENDPOINTS.VIDEO.STATUS).toBe("/video/status");
    expect(API_ENDPOINTS.VIDEO.HISTORY).toBe("/video/history");
    expect(API_ENDPOINTS.VIDEO.DETAILS).toBe("/video/details");
  });

  it("has analysis endpoints", async () => {
    const { API_ENDPOINTS } = await import("@/services/api");
    expect(API_ENDPOINTS.ANALYSIS.CHAT_START).toBe("/analysis/chat/start");
    expect(API_ENDPOINTS.ANALYSIS.CHAT_MESSAGE).toBe("/analysis/chat/message");
    expect(API_ENDPOINTS.ANALYSIS.CHAT_SESSION).toBe("/analysis/chat/session");
  });

  it("has telemetry endpoints", async () => {
    const { API_ENDPOINTS } = await import("@/services/api");
    expect(API_ENDPOINTS.TELEMETRY.MODULE_CLICK).toBe("/telemetry/module-click");
  });

  it("all endpoint values are strings starting with /", async () => {
    const { API_ENDPOINTS } = await import("@/services/api");

    function checkEndpoints(obj: Record<string, unknown>, path: string) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
          expect(value, `${path}.${key}`).toMatch(/^\//);
        } else if (typeof value === "object" && value !== null) {
          checkEndpoints(value as Record<string, unknown>, `${path}.${key}`);
        }
      }
    }

    checkEndpoints(API_ENDPOINTS as unknown as Record<string, unknown>, "API_ENDPOINTS");
  });
});

// ============================================================
// ApiClient token management
// ============================================================

describe("ApiClient token management", () => {
  beforeEach(() => {
    (localStorage as unknown as { _store: Record<string, string> })._store = {};
    vi.restoreAllMocks();
  });

  it("setToken stores in localStorage", async () => {
    const { apiClient } = await import("@/services/api");
    apiClient.setToken("test-token-123");
    expect(localStorage.getItem("access_token")).toBe("test-token-123");
  });

  it("clearToken removes from localStorage", async () => {
    const { apiClient } = await import("@/services/api");
    apiClient.setToken("to-be-cleared");
    apiClient.clearToken();
    expect(localStorage.getItem("access_token")).toBeNull();
  });
});

// ============================================================
// ApiClient request construction
// ============================================================

describe("ApiClient HTTP methods", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (localStorage as unknown as { _store: Record<string, string> })._store = {};
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET request uses correct URL and method", async () => {
    const { apiClient } = await import("@/services/api");
    await apiClient.get("/health");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("/health");
    expect(options.method).toBe("GET");
  });

  it("POST request sends JSON body", async () => {
    const { apiClient } = await import("@/services/api");
    await apiClient.post("/auth/signin", { email: "a@b.com", password: "pw" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, options] = fetchSpy.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ email: "a@b.com", password: "pw" }));
  });

  it("includes Content-Type: application/json for JSON requests", async () => {
    const { apiClient } = await import("@/services/api");
    await apiClient.get("/health");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("includes Authorization header when token is set", async () => {
    const { apiClient } = await import("@/services/api");
    apiClient.setToken("my-token");
    await apiClient.get("/health");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer my-token");
  });

  it("throws error on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ detail: "Resource not found" }),
    });

    const { apiClient } = await import("@/services/api");
    await expect(apiClient.get("/missing")).rejects.toThrow("Resource not found");
  });

  it("throws with status text when error body has no detail", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("bad json")),
    });

    const { apiClient } = await import("@/services/api");
    await expect(apiClient.get("/broken")).rejects.toThrow("Internal Server Error");
  });

  it("postFormData does not set Content-Type header", async () => {
    const { apiClient } = await import("@/services/api");
    const formData = new FormData();
    formData.append("file", "test");
    await apiClient.postFormData("/upload", formData);

    const [, options] = fetchSpy.mock.calls[0];
    // FormData requests should NOT have Content-Type set (browser sets it with boundary)
    expect(options.headers["Content-Type"]).toBeUndefined();
  });
});

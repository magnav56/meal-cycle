import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import after stubbing fetch
const { api } = await import("@/lib/api");

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json", ...headers }),
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("api.get", () => {
  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([{ id: "1" }]));
    const result = await api.get<{ id: string }[]>("/api/test");
    expect(result).toEqual([{ id: "1" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("does not send Content-Type header", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.get("/api/test");
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("throws on non-ok response with error message", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "Not found" }, 404),
    );
    await expect(api.get("/api/missing")).rejects.toThrow("Not found");
  });

  it("throws generic message when error body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: () => Promise.reject(new Error("not json")),
    });
    await expect(api.get("/api/broken")).rejects.toThrow("Request failed: 500");
  });
});

describe("api.post", () => {
  it("sends JSON body with Content-Type", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "new" }, 201));
    const result = await api.post("/api/items", { name: "Test" });
    expect(result).toEqual({ id: "new" });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe(JSON.stringify({ name: "Test" }));
  });
});

describe("api.patch", () => {
  it("sends PATCH request", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1", name: "Updated" }));
    await api.patch("/api/items/1", { name: "Updated" });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("PATCH");
  });
});

describe("api.delete", () => {
  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ "content-length": "0" }),
      json: () => Promise.reject(new Error("no body")),
    });
    const result = await api.delete("/api/items/1");
    expect(result).toBeUndefined();
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("DELETE");
  });
});

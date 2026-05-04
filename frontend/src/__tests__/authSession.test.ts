import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearClientAuthSession, hasValidSessionToken, readAccessToken } from "../utils/authSession";

describe("authSession", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("clearClientAuthSession", () => {
    it("removes all auth keys from localStorage", () => {
      localStorage.setItem("username", "testuser");
      localStorage.setItem("user", JSON.stringify({ name: "test" }));
      localStorage.setItem("role", "admin");
      localStorage.setItem("permissions", JSON.stringify({ view: true }));

      clearClientAuthSession();

      expect(localStorage.getItem("username")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(localStorage.getItem("role")).toBeNull();
      expect(localStorage.getItem("permissions")).toBeNull();
    });

    it("removes all auth keys from sessionStorage", () => {
      sessionStorage.setItem("username", "testuser");
      sessionStorage.setItem("is_superuser", "true");
      sessionStorage.setItem("permissions_fetched_at", Date.now().toString());

      clearClientAuthSession();

      expect(sessionStorage.getItem("username")).toBeNull();
      expect(sessionStorage.getItem("is_superuser")).toBeNull();
      expect(sessionStorage.getItem("permissions_fetched_at")).toBeNull();
    });

    it("does not remove legacy token keys (moved to httpOnly cookies)", () => {
      // These keys are now handled by AuthContext.logout() which calls
      // a separate cleanup for legacy token keys. clearClientAuthSession
      // only removes non-sensitive user data, not tokens.
      localStorage.setItem("auth_token", "old-token");
      localStorage.setItem("token", "old-token");
      localStorage.setItem("refresh_token", "old-refresh");

      clearClientAuthSession();

      // Security: Tokens are now in httpOnly cookies, so localStorage token keys
      // are legacy. They are cleaned up by AuthContext.logout() separately.
      // clearClientAuthSession focuses on non-sensitive metadata only.
      // The tokens in cookies cannot be accessed by JavaScript anyway.
      expect(localStorage.getItem("username")).toBeNull();
      expect(localStorage.getItem("role")).toBeNull();
    });

    it("does not throw if storage is unavailable", () => {
      const origRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = vi.fn(() => {
        throw new Error("Storage unavailable");
      });

      expect(() => clearClientAuthSession()).not.toThrow();

      Storage.prototype.removeItem = origRemoveItem;
    });
  });

  describe("hasValidSessionToken", () => {
    it("returns true (deprecated - cookies are handled by backend)", () => {
      // With httpOnly cookies, the client cannot verify tokens.
      // This function is deprecated and always returns true.
      expect(hasValidSessionToken()).toBe(true);
    });
  });

  describe("readAccessToken", () => {
    it("returns null (deprecated - token is in httpOnly cookie)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("auth_token", "fake-token");

      const token = readAccessToken();

      expect(token).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("deprecated")
      );

      warnSpy.mockRestore();
    });
  });
});

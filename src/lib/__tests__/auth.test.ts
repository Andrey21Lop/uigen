// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: mockSet,
      get: mockGet,
      delete: mockDelete,
    })
  ),
}));

vi.mock("server-only", () => ({}));

const MOCK_TOKEN = "mock.jwt.token";

vi.mock("jose", () => {
  const sign = vi.fn().mockResolvedValue(MOCK_TOKEN);
  const setIssuedAt = vi.fn().mockReturnThis();
  const setExpirationTime = vi.fn().mockReturnThis();
  const setProtectedHeader = vi.fn().mockReturnThis();

  const SignJWT = vi.fn().mockImplementation(() => ({
    setProtectedHeader,
    setExpirationTime,
    setIssuedAt,
    sign,
  }));

  const jwtVerify = vi.fn().mockResolvedValue({
    payload: { userId: "user-123", email: "test@example.com" },
  });

  return { SignJWT, jwtVerify };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets an httpOnly cookie named auth-token", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [name, token, options] = mockSet.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(token).toBe(MOCK_TOKEN);
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession cookie expires ~7 days from now", async () => {
  const { createSession } = await import("@/lib/auth");
  const before = Date.now();

  await createSession("user-123", "test@example.com");

  const [, , options] = mockSet.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(options.expires.getTime()).toBeLessThanOrEqual(Date.now() + sevenDaysMs + 1000);
});

test("createSession signs JWT with userId and email in payload", async () => {
  const { SignJWT } = await import("jose");
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(SignJWT).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "user-123", email: "test@example.com" })
  );
});

test("createSession uses HS256 algorithm", async () => {
  const { SignJWT } = await import("jose");
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  const instance = (SignJWT as ReturnType<typeof vi.fn>).mock.results[0].value;
  expect(instance.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  expect(instance.setExpirationTime).toHaveBeenCalledWith("7d");
});

test("createSession secure flag is true only in production", async () => {
  const { createSession } = await import("@/lib/auth");

  vi.stubEnv("NODE_ENV", "production");
  await createSession("u1", "a@b.com");
  expect(mockSet.mock.calls[0][2].secure).toBe(true);

  vi.clearAllMocks();

  vi.stubEnv("NODE_ENV", "test");
  await createSession("u1", "a@b.com");
  expect(mockSet.mock.calls[0][2].secure).toBe(false);

  vi.unstubAllEnvs();
});

// getSession tests

test("getSession returns null when no cookie is present", async () => {
  const { getSession } = await import("@/lib/auth");
  mockGet.mockReturnValue(undefined);

  const result = await getSession();

  expect(result).toBeNull();
});

test("getSession returns the session payload when token is valid", async () => {
  const { jwtVerify } = await import("jose");
  const { getSession } = await import("@/lib/auth");

  const expectedPayload = { userId: "user-123", email: "test@example.com", expiresAt: new Date() };
  (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ payload: expectedPayload });
  mockGet.mockReturnValue({ value: MOCK_TOKEN });

  const result = await getSession();

  expect(result).toEqual(expectedPayload);
  expect(jwtVerify).toHaveBeenCalledWith(MOCK_TOKEN, expect.any(Uint8Array));
});

test("getSession returns null when token verification fails", async () => {
  const { jwtVerify } = await import("jose");
  const { getSession } = await import("@/lib/auth");

  (jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("invalid token"));
  mockGet.mockReturnValue({ value: "bad.token" });

  const result = await getSession();

  expect(result).toBeNull();
});

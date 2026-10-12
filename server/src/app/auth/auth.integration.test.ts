import request from "supertest";
import { describe, expect, it } from "vitest";
import { createServerApplication } from "../index.js";

const app = createServerApplication();

function responseCookies(response: { headers: Record<string, string | string[] | undefined> }): string[] {
  const value = response.headers["set-cookie"];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

describe("authentication API", () => {
  it("registers a user, sets HttpOnly cookies, and returns the safe profile from /me", async () => {
    const agent = request.agent(app);
    const registration = await agent.post("/register").send({
      name: "Asha",
      email: "ASHA@example.com",
      password: "password8",
    });

    expect(registration.status).toBe(201);
    expect(registration.body.data.user).toMatchObject({ name: "Asha", email: "asha@example.com" });
    expect(registration.body.data.user.passwordHash).toBeUndefined();
    const cookies = responseCookies(registration);
    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining("accessToken="), expect.stringContaining("refreshToken=")]),
    );
    expect(cookies.join(";")).toContain("HttpOnly");

    const profile = await agent.get("/me").expect(200);
    expect(profile.body.data.user).toMatchObject({ name: "Asha", email: "asha@example.com" });
  });

  it("rejects short passwords and duplicate email addresses with the shared error envelope", async () => {
    const agent = request.agent(app);
    const shortPassword = await agent.post("/register").send({
      name: "Asha",
      email: "asha@example.com",
      password: "short",
    }).expect(400);
    expect(shortPassword.body.error).toMatchObject({ code: "VALIDATION_ERROR" });

    await agent.post("/register").send({ name: "Asha", email: "asha@example.com", password: "password8" }).expect(201);
    const duplicate = await agent.post("/register").send({ name: "Asha", email: "ASHA@example.com", password: "password8" }).expect(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
  });

  it("rotates refresh cookies and prevents reuse of the previous refresh token", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/register").send({
      name: "Session User",
      email: "session@example.com",
      password: "password8",
    }).expect(201);
    const setCookies = responseCookies(login);
    const oldRefreshCookie = setCookies.find((cookie) => cookie.startsWith("refreshToken="));
    expect(oldRefreshCookie).toBeDefined();

    const refreshed = await agent.post("/refresh").expect(200);
    const refreshedCookie = responseCookies(refreshed).find((cookie) => cookie.startsWith("refreshToken="));
    expect(refreshedCookie).toBeDefined();
    expect(refreshedCookie!.split(";")[0]).not.toBe(oldRefreshCookie!.split(";")[0]);
    await request(app).post("/refresh").set("Cookie", oldRefreshCookie!.split(";")[0]!).expect(401);

    await agent.post("/logout").expect(204);
    await agent.post("/refresh").expect(401);
  });

  it("requires authentication for /me", async () => {
    const response = await request(app).get("/me").expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});

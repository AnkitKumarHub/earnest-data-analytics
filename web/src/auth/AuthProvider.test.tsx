import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./auth-context";

const authApiMock = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ authApi: authApiMock }));

function SessionState() {
  const { status, user } = useAuth();
  return <p>{status}:{user?.name ?? "no user"}</p>;
}

describe("session restoration", () => {
  beforeEach(() => {
    authApiMock.me.mockReset();
  });

  it("restores the signed-in profile from the current-user endpoint", async () => {
    authApiMock.me.mockResolvedValue({ id: 1, name: "Asha Sharma", email: "asha@example.com" });
    render(<AuthProvider><SessionState /></AuthProvider>);

    await waitFor(() => expect(screen.getByText("signed-in:Asha Sharma")).toBeInTheDocument());
    expect(authApiMock.me).toHaveBeenCalledOnce();
  });

  it("clears the user when the session expires", async () => {
    authApiMock.me.mockResolvedValue({ id: 1, name: "Asha Sharma", email: "asha@example.com" });
    render(<AuthProvider><SessionState /></AuthProvider>);
    await screen.findByText("signed-in:Asha Sharma");

    window.dispatchEvent(new Event("auth:expired"));
    expect(await screen.findByText("signed-out:no user")).toBeInTheDocument();
  });
});

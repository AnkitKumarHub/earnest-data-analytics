import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthPage } from "./AuthPage";

const authMock = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("@/auth/auth-context", () => ({
  useAuth: () => authMock,
}));

function renderAuth(ui: ReactElement, path: string) {
  return render(
    <ThemeProvider defaultTheme="dark" storageKey="daymark-theme-test">
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe("authentication forms", () => {
  beforeEach(() => {
    authMock.login.mockReset().mockResolvedValue(undefined);
    authMock.register.mockReset().mockResolvedValue(undefined);
  });

  it("submits sign-in credentials and provides the password visibility control", async () => {
    const user = userEvent.setup();
    renderAuth(<AuthPage mode="login" />, "/login");

    await user.type(screen.getByLabelText("Email address"), "asha@example.com");
    const password = screen.getByLabelText("Password");
    await user.type(password, "password123");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(authMock.login).toHaveBeenCalledWith("asha@example.com", "password123"));
  });

  it("shows registration fields and sends a trimmed name", async () => {
    const user = userEvent.setup();
    renderAuth(<AuthPage mode="register" />, "/register");

    await user.type(screen.getByLabelText("Your name"), "  Asha Sharma  ");
    await user.type(screen.getByLabelText("Email address"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /create your account/i }));

    await waitFor(() => expect(authMock.register).toHaveBeenCalledWith("Asha Sharma", "asha@example.com", "password123"));
  });

  it("shows field-level errors before sending invalid credentials", async () => {
    const user = userEvent.setup();
    renderAuth(<AuthPage mode="login" />, "/login");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters long.")).toBeInTheDocument();
    expect(authMock.login).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthFlow } from "../src/features/auth/auth-flow";

const handlers = {
  onLogin: vi.fn(async () => ({ ok: true, message: "ok" })),
  onSignup: vi.fn(async () => ({ ok: true, message: "ok" })),
  onResetPassword: vi.fn(async () => ({ ok: true, message: "ok" })),
};

describe("autenticação", () => {
  it("valida o e-mail antes de pedir senha", () => {
    render(<AuthFlow {...handlers} />);
    const email = screen.getByLabelText(/e-mail/i);
    fireEvent.change(email, { target: { value: "invalido" } });
    fireEvent.submit(email.closest("form")!);
    expect(screen.getByText(/digite um e-mail válido/i)).toBeInTheDocument();
    expect(handlers.onLogin).not.toHaveBeenCalled();
  });

  it("oferece criação de conta e recuperação de senha", () => {
    render(<AuthFlow {...handlers} />);
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeEnabled();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "produtor@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(screen.getByRole("button", { name: /esqueci minha senha/i })).toBeEnabled();
  });
});

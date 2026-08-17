import { describe, expect, it } from "vitest";
import { isAuthCallbackUrl } from "../src/services/supabase";

describe("retorno da recuperação de senha", () => {
  it("reconhece o callback web com código PKCE", () => {
    expect(isAuthCallbackUrl("https://agro.exemplo.com/auth/recovery?code=abc123")).toBe(true);
  });

  it("reconhece o callback Android com sessão e ignora páginas comuns", () => {
    expect(isAuthCallbackUrl("br.com.hydraagro.app://auth/recovery#access_token=abc&refresh_token=def&type=recovery")).toBe(true);
    expect(isAuthCallbackUrl("https://agro.exemplo.com/perfil")).toBe(false);
  });
});

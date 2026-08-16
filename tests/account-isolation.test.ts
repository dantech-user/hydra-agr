import { describe, expect, it } from "vitest";
import { createEmptyAccount } from "../src/lib/hydra-types";
import { accountCacheKey, accountPendingKey } from "../src/hooks/use-hydra-store";

describe("isolamento entre contas", () => {
  it("cria coleções privadas novas para cada usuário", () => {
    const accountA = createEmptyAccount({ id: "user-a", email: "a@example.com", name: "A" });
    const accountB = createEmptyAccount({ id: "user-b", email: "b@example.com", name: "B" });

    accountA.animals.push({
      id: "animal-a",
      identification: "A-1",
      species: "Bovino",
      status: "Ativo",
    });
    accountA.property.name = "Fazenda A";

    expect(accountB.animals).toEqual([]);
    expect(accountB.property.name).toBe("");
    expect(accountA.animals).not.toBe(accountB.animals);
    expect(accountA.property).not.toBe(accountB.property);
  });

  it("nunca concede função administrativa no cliente", () => {
    const ownerEmail = createEmptyAccount({ id: "owner", email: "danqxy7@gmail.com" });
    expect(ownerEmail.role).toBe("user");
  });

  it("usa cache e fila diferentes para cada UUID", () => {
    expect(accountCacheKey("user-a")).not.toBe(accountCacheKey("user-b"));
    expect(accountPendingKey("user-a")).not.toBe(accountPendingKey("user-b"));
    expect(accountCacheKey("user-a")).not.toBe(accountPendingKey("user-a"));
  });
});

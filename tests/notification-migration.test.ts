import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608160002_notifications_and_preferences.sql"), "utf8");

describe("persistência segura das notificações", () => {
  it("adiciona preferências sem recriar o banco", () => {
    expect(migration).toContain("property_alerts boolean");
    expect(migration).toContain("admin_notices boolean");
    expect(migration).toContain("notification_reads");
    expect(migration).not.toMatch(/\b(drop table|truncate)\b/i);
  });

  it("isola leituras por auth.uid e mantém campos protegidos", () => {
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke update on public.profiles");
    expect(migration).not.toMatch(/grant update \(.*\b(banned_at|role|plan)\b/is);
  });
});

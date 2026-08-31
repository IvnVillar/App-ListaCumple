import { describe, expect, it } from "vitest";
import { normalizeListRow } from "../domain/normalizeListRow";
import type { ListRow } from "../domain/types";

const base: ListRow = {
  id: "1",
  owner_id: "2",
  title: "Test",
  occasion_type: "cumpleanos",
  event_date: null,
  expires_at: null,
  share_token: "3",
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("normalizeListRow", () => {
  it("convierte un event_date que llegó como Date (driver de Postgres) a AAAA-MM-DD", () => {
    const row = { ...base, event_date: new Date("2026-12-24T00:00:00.000Z") as unknown as string };
    expect(normalizeListRow(row).event_date).toBe("2026-12-24");
  });

  it("deja event_date null tal cual", () => {
    expect(normalizeListRow(base).event_date).toBeNull();
  });

  it("no toca expires_at (TIMESTAMPTZ, debe quedarse como timestamp completo)", () => {
    const row = { ...base, expires_at: "2026-12-25T00:00:00.000Z" };
    expect(normalizeListRow(row).expires_at).toBe("2026-12-25T00:00:00.000Z");
  });
});

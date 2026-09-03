import { OCCASION_EMOJI, OCCASION_LABELS, OCCASIONS } from "./occasions";

describe("occasions", () => {
  it("no ofrece 'guardado' como ocasión elegible al crear una lista a mano", () => {
    // 'guardado' es la de "Mis guardados", gestionada por el backend — si
    // alguien la vuelve a añadir a SELECTABLE_OCCASIONS por error, este test
    // debe fallar.
    expect(OCCASIONS.some((o) => o.value === "guardado")).toBe(false);
  });

  it("tiene 5 ocasiones elegibles, cada una con su etiqueta y emoji", () => {
    expect(OCCASIONS).toHaveLength(5);
    for (const occasion of OCCASIONS) {
      expect(occasion.label).toBe(OCCASION_LABELS[occasion.value]);
      expect(occasion.emoji).toBe(OCCASION_EMOJI[occasion.value]);
    }
  });
});

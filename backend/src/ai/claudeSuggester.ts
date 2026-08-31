import Anthropic from "@anthropic-ai/sdk";
import type { GiftSuggestion, SavedItemSignal, Suggester } from "../services/suggestions";

const MODEL = "claude-sonnet-5";

function buildPrompt(items: SavedItemSignal[]): string {
  const list = items
    .map((item) => `- ${item.title}${item.store_name ? ` (${item.store_name})` : ""}${item.notes ? ` — ${item.notes}` : ""}`)
    .join("\n");

  return `Estos son artículos que una persona ha guardado en su lista de deseos:
${list}

Sugiere entre 3 y 5 ideas de regalo NUEVAS relacionadas con sus gustos (no repitas ninguno de los artículos ya guardados). Para cada una, da un título corto y concreto y una razón breve (una frase) de por qué encaja con sus gustos.

Responde ÚNICAMENTE con un array JSON, sin texto adicional, con este formato exacto:
[{"title": "...", "reason": "..."}]`;
}

function parseSuggestions(text: string): GiftSuggestion[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const parsed: unknown = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (entry): entry is GiftSuggestion =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as GiftSuggestion).title === "string" &&
        typeof (entry as GiftSuggestion).reason === "string"
    )
    .slice(0, 5);
}

/**
 * Sin ANTHROPIC_API_KEY configurada (p. ej. en local o antes de añadirla en
 * Render), la función devuelve simplemente "sin sugerencias" en vez de
 * fallar — coherente con que suggestGiftsForFriend ya trata cualquier fallo
 * de la IA como "no hay sugerencias ahora", nunca como un error de la API.
 */
export const claudeSuggester: Suggester = async (items) => {
  if (!process.env.ANTHROPIC_API_KEY) return [];

  const client = new Anthropic();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: buildPrompt(items) }],
  });

  const text = message.content.find((block) => block.type === "text")?.text ?? "";
  return parseSuggestions(text);
};

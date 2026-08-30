import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db";
import { requireAuth } from "../auth/middleware";
import { extractMetadata as defaultExtractMetadata } from "../extractMetadata";
import { FetchError } from "../fetchHtml";
import type { ExtractedMetadata } from "../types";
import {
  addItem,
  createList,
  deleteItem,
  deleteList,
  getItemsForOwner,
  getListForOwner,
  listListsForOwner,
  resolveItemFields,
  sanitizeExtractedMetadata,
  updateItem,
  type UpdateItemInput,
} from "../services/ownerLists";

export type MetadataExtractor = (url: string) => Promise<ExtractedMetadata>;

const OCCASION_TYPES = ["cumpleanos", "boda", "baby_shower", "navidad", "puntual"] as const;

const createListSchema = z.object({
  title: z.string().trim().min(1).max(200),
  occasion_type: z.enum(OCCASION_TYPES),
  event_date: z.string().date().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

// title es opcional a nivel de esquema porque puede rellenarse desde source_url
// (opción "a" de la spec: pegar un link); el refine de abajo exige uno de los dos.
const createItemSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    image_url: z.string().url().optional().nullable(),
    price: z.number().nonnegative().optional().nullable(),
    currency: z.string().length(3).optional().nullable(),
    source_url: z.string().url().optional().nullable(),
    store_name: z.string().max(120).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    is_group_gift: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.title || data.source_url), {
    message: "Indica un título o una URL de la que extraerlo",
  });

const updateItemSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    image_url: z.string().url().optional().nullable(),
    price: z.number().nonnegative().optional().nullable(),
    currency: z.string().length(3).optional().nullable(),
    source_url: z.string().url().optional().nullable(),
    store_name: z.string().max(120).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    is_group_gift: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No hay ningún campo que actualizar" });

async function summarizeList(db: Db, listId: string) {
  const items = await getItemsForOwner(db, listId);
  const withDestination = items.filter((item) => item.has_destination).length;
  return { items, itemsTotal: items.length, itemsWithDestination: withDestination };
}

export function createOwnerListsRouter(db: Db, extractMetadata: MetadataExtractor = defaultExtractMetadata): Router {
  const router = Router();
  router.use(requireAuth);

  router.post("/", async (req, res) => {
    const parsed = createListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const list = await createList(db, req.userId!, {
      title: parsed.data.title,
      occasionType: parsed.data.occasion_type,
      eventDate: parsed.data.event_date,
      expiresAt: parsed.data.expires_at,
    });
    return res.status(201).json(list);
  });

  router.get("/", async (req, res) => {
    const lists = await listListsForOwner(db, req.userId!);
    return res.json(lists);
  });

  router.get("/:listId", async (req, res) => {
    const list = await getListForOwner(db, req.userId!, req.params.listId);
    if (!list) return res.status(404).json({ error: "Lista no encontrada" });

    const { items, itemsTotal, itemsWithDestination } = await summarizeList(db, list.id);
    return res.json({
      ...list,
      items_total: itemsTotal,
      items_with_destination: itemsWithDestination,
      items,
    });
  });

  router.delete("/:listId", async (req, res) => {
    const deleted = await deleteList(db, req.userId!, req.params.listId);
    if (!deleted) return res.status(404).json({ error: "Lista no encontrada" });
    return res.status(204).send();
  });

  router.post("/:listId/items", async (req, res) => {
    const list = await getListForOwner(db, req.userId!, req.params.listId);
    if (!list) return res.status(404).json({ error: "Lista no encontrada" });

    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const manual = parsed.data;

    let extracted: ExtractedMetadata | null = null;
    if (manual.source_url) {
      try {
        extracted = sanitizeExtractedMetadata(await extractMetadata(manual.source_url));
      } catch (err) {
        if (!(err instanceof FetchError)) throw err;
        extracted = null;
      }
    }

    const resolved = resolveItemFields(manual, extracted);
    if (!resolved.ok) {
      return res.status(422).json({
        error: "No se pudo extraer el título automáticamente. Indícalo manualmente.",
        warnings: extracted?.warnings ?? [],
      });
    }

    const item = await addItem(db, list.id, resolved.input);

    return res.status(201).json({
      ...item,
      extraction: extracted ? { strategy_used: extracted.strategy_used, warnings: extracted.warnings } : null,
    });
  });

  router.patch("/:listId/items/:itemId", async (req, res) => {
    const list = await getListForOwner(db, req.userId!, req.params.listId);
    if (!list) return res.status(404).json({ error: "Lista no encontrada" });

    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const d = parsed.data;
    const updateInput: UpdateItemInput = {};
    if ("title" in d) updateInput.title = d.title;
    if ("image_url" in d) updateInput.imageUrl = d.image_url;
    if ("price" in d) updateInput.price = d.price;
    if ("currency" in d) updateInput.currency = d.currency;
    if ("source_url" in d) updateInput.sourceUrl = d.source_url;
    if ("store_name" in d) updateInput.storeName = d.store_name;
    if ("notes" in d) updateInput.notes = d.notes;
    if ("is_group_gift" in d) updateInput.isGroupGift = d.is_group_gift;

    const updated = await updateItem(db, list.id, req.params.itemId, updateInput);
    if (!updated) return res.status(404).json({ error: "Artículo no encontrado" });
    return res.json(updated);
  });

  router.delete("/:listId/items/:itemId", async (req, res) => {
    const list = await getListForOwner(db, req.userId!, req.params.listId);
    if (!list) return res.status(404).json({ error: "Lista no encontrada" });

    const deleted = await deleteItem(db, list.id, req.params.itemId);
    if (!deleted) return res.status(404).json({ error: "Artículo no encontrado" });
    return res.status(204).send();
  });

  return router;
}

import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db";
import { requireAuth } from "../auth/middleware";
import {
  addItem,
  createList,
  deleteItem,
  deleteList,
  getItemsForOwner,
  getListForOwner,
  listListsForOwner,
} from "../services/ownerLists";

const OCCASION_TYPES = ["cumpleanos", "boda", "baby_shower", "navidad", "puntual"] as const;

const createListSchema = z.object({
  title: z.string().trim().min(1).max(200),
  occasion_type: z.enum(OCCASION_TYPES),
  event_date: z.string().date().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

const createItemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  image_url: z.string().url().optional().nullable(),
  price: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  source_url: z.string().url().optional().nullable(),
  store_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_group_gift: z.boolean().optional(),
});

async function summarizeList(db: Db, listId: string) {
  const items = await getItemsForOwner(db, listId);
  const withDestination = items.filter((item) => item.has_destination).length;
  return { items, itemsTotal: items.length, itemsWithDestination: withDestination };
}

export function createOwnerListsRouter(db: Db): Router {
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

    const item = await addItem(db, list.id, {
      title: parsed.data.title,
      imageUrl: parsed.data.image_url,
      price: parsed.data.price,
      currency: parsed.data.currency,
      sourceUrl: parsed.data.source_url,
      storeName: parsed.data.store_name,
      notes: parsed.data.notes,
      isGroupGift: parsed.data.is_group_gift,
    });
    return res.status(201).json(item);
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

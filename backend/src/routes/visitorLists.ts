import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Db } from "../db";
import {
  ConflictError,
  ExpiredError,
  InvalidOperationError,
  NotFoundError,
  contributeToItem,
  getListForVisitor,
  reserveItem,
} from "../services/visitorLists";

const aliasSchema = z.object({
  alias: z.string().trim().min(1).max(80),
});

const contributeSchema = aliasSchema.extend({
  amount: z.number().positive(),
});

function handleError(err: unknown, res: import("express").Response) {
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  if (err instanceof ExpiredError) return res.status(410).json({ error: err.message });
  if (err instanceof ConflictError) return res.status(409).json({ error: err.message });
  if (err instanceof InvalidOperationError) return res.status(400).json({ error: err.message });
  throw err;
}

export function createVisitorListsRouter(db: Db, writeActionLimiter: RequestHandler): Router {
  const router = Router();

  router.get("/:shareToken", async (req, res) => {
    try {
      const { list, items } = await getListForVisitor(db, req.params.shareToken);
      return res.json({
        title: list.title,
        occasion_type: list.occasion_type,
        event_date: list.event_date,
        items,
      });
    } catch (err) {
      return handleError(err, res);
    }
  });

  router.post("/:shareToken/items/:itemId/reserve", writeActionLimiter, async (req, res) => {
    const parsed = aliasSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      await reserveItem(db, req.params.shareToken, req.params.itemId, parsed.data.alias);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  router.post("/:shareToken/items/:itemId/contribute", writeActionLimiter, async (req, res) => {
    const parsed = contributeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      await contributeToItem(
        db,
        req.params.shareToken,
        req.params.itemId,
        parsed.data.alias,
        parsed.data.amount
      );
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  return router;
}

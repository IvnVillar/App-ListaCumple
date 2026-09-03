import { Router, type Response } from "express";
import { z } from "zod";
import type { Db } from "../db";
import { requireAuth } from "../auth/middleware";
import { usernameSchema } from "../domain/username";
import { writeActionLimiter } from "../rateLimit";
import {
  ConflictError,
  ForbiddenError,
  InvalidOperationError,
  NotFoundError,
  acceptFriendRequest,
  getFriendLists,
  listFriends,
  listPendingRequests,
  removeFriendship,
  removePendingRequest,
  sendFriendRequest,
} from "../services/friends";
import { suggestGiftsForFriend, type Suggester } from "../services/suggestions";
import { claudeSuggester } from "../ai/claudeSuggester";

const usernameBodySchema = z.object({ username: usernameSchema });

function handleError(err: unknown, res: Response) {
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  if (err instanceof ConflictError) return res.status(409).json({ error: err.message });
  if (err instanceof InvalidOperationError) return res.status(400).json({ error: err.message });
  if (err instanceof ForbiddenError) return res.status(403).json({ error: err.message });
  throw err;
}

export function createFriendsRouter(db: Db, suggester: Suggester = claudeSuggester): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (req, res) => {
    const friends = await listFriends(db, req.userId!);
    return res.json(friends);
  });

  router.get("/requests", async (req, res) => {
    const requests = await listPendingRequests(db, req.userId!);
    return res.json(requests);
  });

  router.post("/requests", writeActionLimiter, async (req, res) => {
    const parsed = usernameBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      const result = await sendFriendRequest(db, req.userId!, parsed.data.username);
      return res.status(201).json(result);
    } catch (err) {
      return handleError(err, res);
    }
  });

  router.post("/requests/:id/accept", async (req, res) => {
    try {
      const friendship = await acceptFriendRequest(db, req.userId!, req.params.id);
      return res.json(friendship);
    } catch (err) {
      return handleError(err, res);
    }
  });

  router.delete("/requests/:id", async (req, res) => {
    try {
      await removePendingRequest(db, req.userId!, req.params.id);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  router.delete("/:friendshipId", async (req, res) => {
    try {
      await removeFriendship(db, req.userId!, req.params.friendshipId);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  router.get("/:friendUserId/lists", async (req, res) => {
    try {
      const lists = await getFriendLists(db, req.userId!, req.params.friendUserId);
      return res.json(lists);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Ideas de regalo con IA (spec de sugerencias "onsite"): se basan en lo que
  // el AMIGO tiene guardado, así que nunca se le muestran a él mismo — solo
  // a quien las pide sobre un amigo suyo.
  router.get("/:friendUserId/suggestions", async (req, res) => {
    try {
      const suggestions = await suggestGiftsForFriend(db, suggester, req.userId!, req.params.friendUserId);
      return res.json({ suggestions });
    } catch (err) {
      return handleError(err, res);
    }
  });

  return router;
}

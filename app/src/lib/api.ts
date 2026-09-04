import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error ?? `Error ${res.status}`, res.status);
  }
  return body as T;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export function register(email: string, username: string, password: string) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Para las cuentas ya existentes cuando se añadió el username (spec de
// amigos), que se quedaron con uno autogenerado ilegible.
export function updateUsername(token: string, username: string) {
  return request<{ username: string }>("/api/auth/username", {
    method: "PATCH",
    token,
    body: JSON.stringify({ username }),
  });
}

// 'guardado' es la ocasión de "Mis guardados": la crea sola el backend
// (ver getDefaultList), no es seleccionable al crear una lista a mano.
export type OccasionType = "cumpleanos" | "boda" | "baby_shower" | "navidad" | "puntual" | "guardado";

export interface ListSummary {
  id: string;
  title: string;
  occasion_type: OccasionType;
  event_date: string | null;
  expires_at: string | null;
  share_token: string;
  is_default: boolean;
  created_at: string;
}

export interface OwnerItem {
  id: string;
  list_id: string;
  title: string;
  image_url: string | null;
  price: string | null;
  currency: string | null;
  source_url: string | null;
  store_name: string | null;
  notes: string | null;
  is_group_gift: boolean;
  created_at: string;
  has_destination: boolean;
}

export interface ListDetail extends ListSummary {
  items_total: number;
  items_with_destination: number;
  items: OwnerItem[];
}

export function createList(
  token: string,
  input: { title: string; occasion_type: OccasionType; event_date?: string | null; expires_at?: string | null }
) {
  return request<ListSummary>("/api/lists", { method: "POST", token, body: JSON.stringify(input) });
}

export function listLists(token: string) {
  return request<ListSummary[]>("/api/lists", { token });
}

// "Mis guardados": la crea el backend la primera vez que se pide (spec de
// guardado libre), para que pegar un link nunca obligue a elegir ocasión.
export function getDefaultList(token: string) {
  return request<ListSummary>("/api/lists/default", { token });
}

export function getList(token: string, listId: string) {
  return request<ListDetail>(`/api/lists/${listId}`, { token });
}

export function deleteList(token: string, listId: string) {
  return request<void>(`/api/lists/${listId}`, { method: "DELETE", token });
}

export interface ItemInput {
  title?: string;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  source_url?: string | null;
  store_name?: string | null;
  notes?: string | null;
  is_group_gift?: boolean;
}

export interface CreatedItem extends OwnerItem {
  extraction: { strategy_used: string; warnings: string[] } | null;
}

export function addItem(token: string, listId: string, input: ItemInput) {
  return request<CreatedItem>(`/api/lists/${listId}/items`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export function updateItem(token: string, listId: string, itemId: string, input: ItemInput) {
  return request<OwnerItem>(`/api/lists/${listId}/items/${itemId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export function deleteItem(token: string, listId: string, itemId: string) {
  return request<void>(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE", token });
}

export interface ExtractedMetadata {
  title: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  store_name: string | null;
  source_url: string;
  strategy_used: string;
  warnings: string[];
}

export function extractMetadata(token: string, url: string) {
  return request<ExtractedMetadata>("/api/extract-metadata", {
    method: "POST",
    token,
    body: JSON.stringify({ url }),
  });
}

// Repliegue cuando la tienda bloquea la IP del servidor (spec): el HTML ya
// lo trajo el propio móvil (ver lib/clientFetch.ts), aquí solo se analiza.
export function extractMetadataFromHtml(token: string, url: string, html: string, finalUrl?: string) {
  return request<ExtractedMetadata>("/api/extract-metadata-from-html", {
    method: "POST",
    token,
    body: JSON.stringify({ url, html, final_url: finalUrl }),
  });
}

export interface VisitorItem {
  id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  source_url: string | null;
  store_name: string | null;
  notes: string | null;
  is_group_gift: boolean;
  status: "available" | "reserved";
  reserver_alias: string | null;
  group_gift: { total_contributed: number; remaining: number | null } | null;
}

export interface VisitorList {
  title: string;
  occasion_type: OccasionType;
  event_date: string | null;
  items: VisitorItem[];
}

export function getListByShareToken(shareToken: string) {
  return request<VisitorList>(`/api/l/${shareToken}`);
}

export function reserveItem(shareToken: string, itemId: string, alias: string) {
  return request<void>(`/api/l/${shareToken}/items/${itemId}/reserve`, {
    method: "POST",
    body: JSON.stringify({ alias }),
  });
}

export function contributeToItem(shareToken: string, itemId: string, alias: string, amount: number) {
  return request<void>(`/api/l/${shareToken}/items/${itemId}/contribute`, {
    method: "POST",
    body: JSON.stringify({ alias, amount }),
  });
}

// "Re-guardar" (spec tipo Pinterest): copia un artículo visto en una lista
// ajena a "Mis guardados", requiere sesión (por eso vive en /api/lists, no
// junto a reserveItem/contributeToItem que son de visitante sin login).
export function saveItemToDefaultList(token: string, shareToken: string, itemId: string) {
  return request<OwnerItem>("/api/lists/default/save", {
    method: "POST",
    token,
    body: JSON.stringify({ share_token: shareToken, item_id: itemId }),
  });
}

export interface Friend {
  friendship_id: string;
  user_id: string;
  username: string;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  responded_at: string | null;
}

export function listFriends(token: string) {
  return request<Friend[]>("/api/friends", { token });
}

export function listFriendRequests(token: string) {
  return request<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>("/api/friends/requests", { token });
}

export function sendFriendRequest(token: string, username: string) {
  return request<{ status: "pending" | "accepted"; friendship: Friendship }>("/api/friends/requests", {
    method: "POST",
    token,
    body: JSON.stringify({ username }),
  });
}

export function acceptFriendRequest(token: string, requestId: string) {
  return request<Friendship>(`/api/friends/requests/${requestId}/accept`, { method: "POST", token });
}

export function rejectFriendRequest(token: string, requestId: string) {
  return request<void>(`/api/friends/requests/${requestId}`, { method: "DELETE", token });
}

export function removeFriendship(token: string, friendshipId: string) {
  return request<void>(`/api/friends/${friendshipId}`, { method: "DELETE", token });
}

export function getFriendLists(token: string, friendUserId: string) {
  return request<ListSummary[]>(`/api/friends/${friendUserId}/lists`, { token });
}

export interface GiftSuggestion {
  title: string;
  reason: string;
}

// Ideas de regalo con IA (spec de sugerencias "onsite"): se basan en lo que
// EL AMIGO tiene guardado, así que solo tiene sentido pedirlas sobre un
// amigo, nunca sobre uno mismo.
export function getFriendSuggestions(token: string, friendUserId: string) {
  return request<{ suggestions: GiftSuggestion[] }>(`/api/friends/${friendUserId}/suggestions`, { token });
}

export interface FriendActivityItem {
  item_id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  store_name: string | null;
  created_at: string;
  list_id: string;
  list_title: string;
  list_share_token: string;
  friend_user_id: string;
  friend_username: string;
}

// Inicio de la app (spec de dashboard): lo que tus amigos han guardado
// recientemente, en vez del "próximamente" que había antes.
export function getFriendsActivity(token: string) {
  return request<FriendActivityItem[]>("/api/friends/activity", { token });
}

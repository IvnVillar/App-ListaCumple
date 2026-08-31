export type OccasionType = "cumpleanos" | "boda" | "baby_shower" | "navidad" | "puntual";

export interface ListRow {
  id: string;
  owner_id: string;
  title: string;
  occasion_type: OccasionType;
  event_date: string | null;
  expires_at: string | null;
  share_token: string;
  created_at: string;
}

export interface ItemRow {
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
}

/** Fila de item para el DUEÑO: sólo trae si hay destino, nunca quién ni cuánto. */
export interface OwnerItemRow extends ItemRow {
  has_destination: boolean;
}

export interface ReservationRow {
  id: string;
  item_id: string;
  reserver_alias: string;
  created_at: string;
}

export interface ContributionRow {
  id: string;
  item_id: string;
  reservation_id: string;
  contributor_alias: string;
  amount: string;
  created_at: string;
}

export type FriendshipStatus = "pending" | "accepted";

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

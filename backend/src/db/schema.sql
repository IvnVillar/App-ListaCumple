CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  occasion_type TEXT NOT NULL CHECK (occasion_type IN (
    'cumpleanos', 'boda', 'baby_shower', 'navidad', 'puntual'
  )),
  event_date DATE,
  expires_at TIMESTAMPTZ,
  share_token UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lists_owner_id ON lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_lists_share_token ON lists(share_token);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC(10, 2),
  currency TEXT,
  source_url TEXT,
  store_name TEXT,
  notes TEXT,
  is_group_gift BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_list_id ON items(list_id);

-- Un item solo puede tener una reserva activa (constraint UNIQUE en item_id).
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  reserver_alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  contributor_alias TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributions_reservation_id ON contributions(reservation_id);

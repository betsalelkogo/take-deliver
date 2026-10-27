-- Take & Deliver schema for Neon (Postgres). Every statement is idempotent,
-- so this file is safe to re-run: `npm run db:schema`.

CREATE TABLE IF NOT EXISTS communities (
  id           text PRIMARY KEY,
  name         text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  -- Offered up front in the forms. Other areas/destinations come from use.
  areas        text[] NOT NULL DEFAULT '{}',
  destinations text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS communities_name_key ON communities (lower(name));

CREATE TABLE IF NOT EXISTS packages (
  id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  community_id   text NOT NULL REFERENCES communities (id) ON DELETE CASCADE,
  area           text NOT NULL,
  store          text NOT NULL DEFAULT '',
  description    text NOT NULL DEFAULT '',
  package_number text NOT NULL DEFAULT '',
  owner_name     text NOT NULL,
  owner_phone    text NOT NULL,
  notes          text NOT NULL DEFAULT '',
  urgent         boolean NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed')),
  courier_name   text,
  courier_phone  text,
  -- Leaderboard key of the courier, so releasing a package can undo the score.
  courier_id     text,
  courier_note   text NOT NULL DEFAULT '',
  -- Publish→claim time, so releasing a package can undo it from the average.
  close_ms       bigint,
  created_at     timestamptz NOT NULL DEFAULT now(),
  claimed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS packages_community_created_idx
  ON packages (community_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stores (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  community_id text NOT NULL REFERENCES communities (id) ON DELETE CASCADE,
  area         text NOT NULL,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stores_community_area_name_key
  ON stores (community_id, area, lower(name));

CREATE TABLE IF NOT EXISTS transfers (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  community_id text NOT NULL REFERENCES communities (id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('request', 'trip')),
  destination  text NOT NULL,
  description  text NOT NULL DEFAULT '',
  when_text    text NOT NULL DEFAULT '',
  for_whom     text NOT NULL DEFAULT '',
  notes        text NOT NULL DEFAULT '',
  urgent       boolean NOT NULL DEFAULT false,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'closed')),
  owner_name   text NOT NULL,
  owner_phone  text NOT NULL,
  rider_name   text,
  rider_phone  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  matched_at   timestamptz
);

CREATE INDEX IF NOT EXISTS transfers_community_created_idx
  ON transfers (community_id, created_at DESC);

-- Packages ever collected (never decreases on delete) and the running
-- sum/count of publish→claim times.
CREATE TABLE IF NOT EXISTS community_stats (
  community_id   text PRIMARY KEY REFERENCES communities (id) ON DELETE CASCADE,
  collected      integer NOT NULL DEFAULT 0 CHECK (collected >= 0),
  close_total_ms bigint  NOT NULL DEFAULT 0 CHECK (close_total_ms >= 0),
  close_count    integer NOT NULL DEFAULT 0 CHECK (close_count >= 0)
);

-- Leaderboards, keyed by phone (else name) so a person maps to one row.
CREATE TABLE IF NOT EXISTS scores (
  community_id text NOT NULL REFERENCES communities (id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('collector', 'publisher')),
  person_id    text NOT NULL,
  name         text NOT NULL DEFAULT '',
  count        integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (community_id, kind, person_id)
);

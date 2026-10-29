create table if not exists homes (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  slug text unique not null,
  host_name text not null default '我家',
  family jsonb not null default '{}'::jsonb,
  layout_id text,
  scan jsonb,
  furniture jsonb not null default '{}'::jsonb,
  inventory jsonb not null default '{}'::jsonb,
  battery jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists photos (
  id text primary key,
  user_id uuid not null references homes(user_id) on delete cascade,
  blob_url text not null,
  caption text not null default '',
  stamp text not null default '',
  at bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists photos_user_at_idx on photos (user_id, at desc);

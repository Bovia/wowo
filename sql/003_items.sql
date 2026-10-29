-- 物品：每样东西一行。以前整屋的库存塞在 homes.inventory 一个 json 里，
-- 两台设备同时改会互相覆盖，也放不下价格、买的时间、品类这些。
create table if not exists items (
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  id text not null,
  room text not null,
  name text not null,
  count int,
  note text,
  color text not null,
  warn boolean not null default false,
  category text,
  price numeric(10, 2),
  bought_at date,
  source text not null default 'manual',
  extra jsonb not null default '{}'::jsonb,
  -- 毫秒时间戳，两边谁新听谁的；deleted 是删除记录，好让别的设备也删掉
  updated_at bigint not null,
  deleted boolean not null default false,
  primary key (user_id, id)
);

create index if not exists items_user_live_idx on items (user_id) where not deleted;

-- 把旧的 json 库存搬过来。样板间自带的东西 id 是 seed-0 这种，各屋会重，前面拼上屋子
insert into items (user_id, id, room, name, count, note, color, warn, updated_at)
select
  h.user_id,
  case when it->>'id' like 'seed-%' then r.key || '#' || (it->>'id') else it->>'id' end,
  r.key,
  it->>'name',
  (it->>'count')::int,
  it->>'note',
  coalesce(it->>'color', '#e9e4da'),
  coalesce((it->>'warn')::boolean, false),
  (extract(epoch from h.updated_at) * 1000)::bigint
from homes h
cross join lateral jsonb_each(coalesce(h.inventory, '{}'::jsonb)) as r(key, value)
cross join lateral jsonb_array_elements(r.value) as it
where jsonb_typeof(r.value) = 'array' and it ? 'id' and it ? 'name'
on conflict (user_id, id) do nothing;

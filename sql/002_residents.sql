-- 居民：镇上的你。跟账号分开，门牌号公开，账号（邮箱）不公开。
create table if not exists residents (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9][a-z0-9_-]{2,19}$'),
  created_at timestamptz not null default now()
);

-- 已经存过家的人，先随机发一个门牌号，之后自己改
insert into residents (user_id, handle)
select user_id, 'wo' || substr(md5(random()::text || user_id::text), 1, 6)
from homes
on conflict (user_id) do nothing;

-- 家的可见范围：private 只有自己，link 知道门牌号就能来，public 以后上小镇地图
alter table homes add column if not exists visibility text not null default 'link'
  check (visibility in ('private', 'link', 'public'));

-- 旧的 slug 用邮箱前缀拼的，不再用；先放开 not null，确认没人读了再删
alter table homes alter column slug drop not null;

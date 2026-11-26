-- Existing homes keep using their original account-scoped local cache.
alter table homes add column if not exists instance_id uuid;
alter table homes alter column instance_id set default gen_random_uuid();

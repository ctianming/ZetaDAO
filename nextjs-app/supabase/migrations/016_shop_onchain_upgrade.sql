begin;

-- Admin address registry for multi-admin contract support
create table if not exists shop_contract_admins (
  address text primary key,
  user_uid uuid references users(uid) on delete set null,
  label text,
  active boolean not null default true,
  added_by uuid references users(uid) on delete set null,
  added_tx_hash text,
  revoked_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shop_contract_admins_active on shop_contract_admins(active);
create trigger trg_shop_contract_admins_updated
  before update on shop_contract_admins
  for each row execute function set_updated_at();

-- Extend products for on-chain metadata
alter table if exists shop_products
  add column if not exists onchain_id numeric(78,0),
  add column if not exists metadata_uri text,
  add column if not exists last_synced_block numeric(78,0);

alter table if exists shop_products
  alter column stock type bigint using stock::bigint;

alter table if exists shop_products
  alter column status set default 'inactive';

create unique index if not exists uq_shop_products_onchain_id on shop_products(onchain_id) where onchain_id is not null;

-- Transition orders to on-chain identifiers
-- Drop legacy order sequencing artifacts
alter table if exists shop_orders drop constraint if exists shop_orders_order_no_key;
alter table if exists shop_orders drop constraint if exists shop_orders_order_seq_key;

alter table if exists shop_orders drop column if exists order_no;
alter table if exists shop_orders drop column if exists order_seq;
alter table if exists shop_orders drop column if exists expires_at;

-- Ensure foreign key aligns with nullable products (orders may live beyond product archival)
alter table if exists shop_orders alter column product_id drop not null;

drop index if exists idx_shop_orders_user;
drop index if exists idx_shop_orders_expires_at;

alter table if exists shop_orders rename column user_uid to buyer_uid;

alter table if exists shop_orders
  add column if not exists onchain_id numeric(78,0),
  add column if not exists product_onchain_id numeric(78,0),
  add column if not exists unit_price_wei numeric(78,0),
  add column if not exists metadata_hash text,
  add column if not exists last_status_note text,
  add column if not exists last_event_tx_hash text,
  add column if not exists paid_tx_hash text,
  add column if not exists refund_tx_hash text,
  add column if not exists shipped_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists offchain_metadata jsonb default '{}'::jsonb;

alter table if exists shop_orders
  alter column quantity type bigint using quantity::bigint;

alter table if exists shop_orders
  rename column amount_wei to total_price_wei;

update shop_orders
  set unit_price_wei = case when quantity <> 0 then total_price_wei / quantity else total_price_wei end
  where unit_price_wei is null;

alter table if exists shop_orders
  alter column unit_price_wei set not null,
  alter column total_price_wei type numeric(78,0);

alter table if exists shop_orders drop constraint if exists shop_orders_status_check;
update shop_orders set status = 'created' where status = 'pending';
update shop_orders set status = 'completed' where status = 'fulfilled';

alter table if exists shop_orders
  alter column status set default 'created';

alter table if exists shop_orders
  add constraint shop_orders_status_check check (status in ('created','paid','shipped','completed','cancelled','refunded'));

create unique index if not exists uq_shop_orders_onchain_id on shop_orders(onchain_id) where onchain_id is not null;
create index if not exists idx_shop_orders_buyer_uid on shop_orders(buyer_uid);
create index if not exists idx_shop_orders_status on shop_orders(status);
create index if not exists idx_shop_orders_product_onchain_id on shop_orders(product_onchain_id);

-- Optional external metadata hook for shipping/contact fields (store hashed payloads in metadata_hash)
-- Preserve existing shipping columns but widen semantics to mirror contract lifecycle

-- Clean up legacy sequence
DROP SEQUENCE IF EXISTS shop_order_seq;

drop function if exists shop_create_order_reserve(
  uuid,
  text,
  uuid,
  integer,
  text,
  text,
  text,
  integer
);
drop function if exists shop_release_expired();

commit;

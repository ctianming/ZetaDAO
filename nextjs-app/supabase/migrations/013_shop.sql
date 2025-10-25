-- Shop module: products, orders, addresses

-- Products table
create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  price_wei numeric(78,0) not null check (price_wei >= 0), -- store as integer wei
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders table
create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  user_uid text not null,
  product_id uuid not null references shop_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  amount_wei numeric(78,0) not null check (amount_wei >= 0),
  shipping_contact text not null,
  shipping_phone text not null,
  shipping_address text not null,
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled')),
  buyer_address text,
  chain_id integer,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User shipping addresses
create table if not exists shop_addresses (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null,
  contact_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_shop_products_status on shop_products(status);
create index if not exists idx_shop_orders_user on shop_orders(user_uid);
create index if not exists idx_shop_orders_status on shop_orders(status);
create index if not exists idx_shop_addresses_user on shop_addresses(user_uid);

-- Simple RLS policies (optional: adapt to your RLS setup)
-- Note: If your project enforces RLS by default, uncomment below and adjust.
-- alter table shop_products enable row level security;
-- alter table shop_orders enable row level security;
-- alter table shop_addresses enable row level security;
--
-- -- Products: public can read active products; only service role updates
-- create policy shop_products_select_active on shop_products
--   for select using (status = 'active');
--
-- -- Orders: user can read own orders
-- create policy shop_orders_select_own on shop_orders
--   for select using (auth.uid()::text = user_uid);
--
-- -- Addresses: user can read/write own addresses
-- create policy shop_addresses_rw_own on shop_addresses
--   for all using (auth.uid()::text = user_uid) with check (auth.uid()::text = user_uid);

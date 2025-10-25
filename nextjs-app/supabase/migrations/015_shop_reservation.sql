-- Reservation-based inventory: hold on order, release on timeout

-- 1) Add expires_at to orders (15-minute default)
alter table if exists shop_orders
  add column if not exists expires_at timestamptz not null default (now() + interval '15 minutes');

create index if not exists idx_shop_orders_expires_at on shop_orders(expires_at);

-- 2) Atomic reserve + create order function
create or replace function shop_create_order_reserve(
  p_user_uid text,
  p_order_no text,
  p_product_id uuid,
  p_qty integer,
  p_shipping_contact text,
  p_shipping_phone text,
  p_shipping_address text,
  p_expire_minutes integer default 15
) returns shop_orders
language plpgsql
as $$
declare
  v_order shop_orders;
  v_price numeric(78,0);
  v_amount numeric(78,0);
  v_exp timestamptz := now() + make_interval(mins => coalesce(p_expire_minutes, 15));
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  -- lock product row for update to avoid race
  select price_wei into v_price from shop_products where id = p_product_id and status = 'active' for update;
  if v_price is null then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  -- ensure stock
  update shop_products set stock = stock - p_qty, updated_at = now()
  where id = p_product_id and stock >= p_qty;
  if not found then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  v_amount := v_price * p_qty;

  insert into shop_orders(
    order_no, user_uid, product_id, quantity, amount_wei,
    shipping_contact, shipping_phone, shipping_address, status, expires_at
  ) values (
    p_order_no, p_user_uid, p_product_id, p_qty, v_amount,
    p_shipping_contact, p_shipping_phone, p_shipping_address, 'pending', v_exp
  ) returning * into v_order;

  return v_order;
end;
$$;

-- 3) Release expired pending orders and restock
create or replace function shop_release_expired()
returns integer
language plpgsql
as $$
declare
  r record;
  released_count integer := 0;
begin
  for r in select id, product_id, quantity from shop_orders where status = 'pending' and expires_at <= now() loop
    update shop_orders set status = 'cancelled', updated_at = now() where id = r.id;
    update shop_products set stock = stock + r.quantity, updated_at = now() where id = r.product_id;
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;

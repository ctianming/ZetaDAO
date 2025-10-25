-- Add numeric order sequence and stock decrement function

-- Sequence for numeric on-chain order IDs
create sequence if not exists shop_order_seq start with 1 increment by 1;

-- Add order_seq column to orders
alter table if exists shop_orders
  add column if not exists order_seq bigint not null default nextval('shop_order_seq');

-- Ensure uniqueness
create unique index if not exists uq_shop_orders_order_seq on shop_orders(order_seq);

-- Backfill existing rows that might have nulls (if any)
update shop_orders set order_seq = nextval('shop_order_seq') where order_seq is null;

-- Stock decrement function (atomic best-effort)
create or replace function shop_decrement_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
as $$
begin
  update shop_products
    set stock = stock - p_qty,
        updated_at = now()
    where id = p_product_id and stock >= p_qty;
end;
$$;

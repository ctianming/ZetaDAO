-- Article categories table with admin-managed lifecycle

create table if not exists article_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Basic index for name search
create index if not exists idx_article_categories_name on article_categories(name);

-- Trigger to auto update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_article_categories_updated
before update on article_categories
for each row execute function set_updated_at();

-- Optional: reference from published_content for integrity (no cascade to avoid data loss)
-- alter table published_content add constraint fk_published_article_category
--   foreign key (article_category) references article_categories(slug);

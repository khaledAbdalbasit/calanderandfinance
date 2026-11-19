-- Product access for the personal dashboard.
-- Run this file once in the Supabase SQL Editor before deploying the application changes.

create table if not exists public.user_products (
  user_id uuid primary key references auth.users(id) on delete cascade,
  finance_enabled boolean not null default true,
  todo_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_products_at_least_one_enabled
    check (finance_enabled or todo_enabled)
);

alter table public.user_products enable row level security;

drop policy if exists "Users can view their own product access" on public.user_products;
create policy "Users can view their own product access"
on public.user_products
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their own product access" on public.user_products;
create policy "Users can update their own product access"
on public.user_products
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and (finance_enabled or todo_enabled));

create or replace function public.create_user_product_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_products jsonb;
  enable_finance boolean;
  enable_todo boolean;
begin
  selected_products := new.raw_user_meta_data -> 'products';

  if jsonb_typeof(selected_products) = 'array' then
    enable_finance := selected_products ? 'finance';
    enable_todo := selected_products ? 'todo';
  else
    -- Keep legacy or non-standard signups working with both products enabled.
    enable_finance := true;
    enable_todo := true;
  end if;

  if not coalesce(enable_finance, false) and not coalesce(enable_todo, false) then
    enable_finance := true;
    enable_todo := true;
  end if;

  insert into public.user_products (user_id, finance_enabled, todo_enabled)
  values (new.id, enable_finance, enable_todo)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_product_access on auth.users;
create trigger on_auth_user_created_product_access
after insert on auth.users
for each row execute function public.create_user_product_access();

-- Existing accounts retain access to both products.
insert into public.user_products (user_id, finance_enabled, todo_enabled)
select id, true, true
from auth.users
on conflict (user_id) do nothing;

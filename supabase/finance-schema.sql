create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  entry_mode text not null check (entry_mode in ('package','detailed')),
  category text not null check (length(trim(category)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  details jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_details_array check (jsonb_typeof(details) = 'array')
);

create index if not exists finance_transactions_user_date_idx
  on public.finance_transactions (user_id, transaction_date desc);
create index if not exists finance_transactions_user_category_idx
  on public.finance_transactions (user_id, category);

alter table public.finance_transactions enable row level security;

drop policy if exists "Users manage their own finance transactions" on public.finance_transactions;
create policy "Users manage their own finance transactions"
on public.finance_transactions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_finance_transaction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_transactions_updated_at on public.finance_transactions;
create trigger finance_transactions_updated_at
before update on public.finance_transactions
for each row execute function public.set_finance_transaction_updated_at();

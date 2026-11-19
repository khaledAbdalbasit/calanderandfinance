create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (length(trim(category)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  budget_month smallint not null check (budget_month between 1 and 12),
  budget_year smallint not null check (budget_year between 2000 and 2200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_budgets_user_category_period_unique unique (user_id, category, budget_month, budget_year)
);

create index if not exists finance_budgets_user_period_idx
  on public.finance_budgets (user_id, budget_year, budget_month);

alter table public.finance_budgets enable row level security;

drop policy if exists "Users manage their own finance budgets" on public.finance_budgets;
create policy "Users manage their own finance budgets"
on public.finance_budgets
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_finance_budget_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_budgets_updated_at on public.finance_budgets;
create trigger finance_budgets_updated_at
before update on public.finance_budgets
for each row execute function public.set_finance_budget_updated_at();

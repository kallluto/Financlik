-- Миграция: таблица транзакций
-- Выполнить в Supabase Dashboard -> SQL Editor
create table transactions (
  id bigint generated always as identity primary key,
  user_id bigint not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  comment text default '',
  date date not null default current_date
);

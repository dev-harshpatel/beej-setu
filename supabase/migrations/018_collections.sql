-- Collections: records payments received from dealers by staff

create table collections (
  id              uuid primary key default gen_random_uuid(),
  dealer_id       uuid not null references dealers(id),
  staff_id        uuid not null references profiles(id),
  payment_mode    text not null check (payment_mode in ('CASH','BANK_TRANSFER','UPI','CHEQUE')),
  amount          numeric(12,2) not null check (amount > 0),
  collection_date date not null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table collections enable row level security;

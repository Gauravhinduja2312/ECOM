-- Enable extensions
create extension if not exists "pgcrypto";

-- Users profile table (linked to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  razorpay_account_id text,
  upi_id text,
  upi_qr_url text
);

alter table public.users add column if not exists razorpay_account_id text;
alter table public.users add column if not exists upi_id text;
alter table public.users add column if not exists upi_qr_url text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists phone text;
alter table public.users drop constraint if exists users_email_ves_domain_check;
alter table public.users
  add constraint users_email_ves_domain_check
  check (
    email ~* '^[^@]+@ves\\.ac\\.in$'
    or lower(email) = 'gauravhinduja99@gmail.com'
  );

create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  category text,
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  seller_id uuid references public.users(id) on delete set null,
  seller_pickup_location text,
  seller_pickup_time timestamptz,
  handover_status text not null default 'pending' check (handover_status in ('pending', 'confirmed', 'rescheduled', 'rejected')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  admin_review_note text,
  proposed_price numeric(10,2) check (proposed_price is null or proposed_price >= 0),
  price_offer_status text not null default 'none' check (price_offer_status in ('none', 'pending_student_response', 'accepted', 'rejected')),
  final_price numeric(10,2) check (final_price is null or final_price >= 0),
  commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  listing_number integer check (listing_number is null or listing_number > 0),
  listing_fee numeric(10,2) not null default 0 check (listing_fee >= 0),
  is_sponsored boolean not null default false,
  sponsored_fee numeric(10,2) not null default 0 check (sponsored_fee >= 0),
  sponsored_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected'));
alter table public.products add column if not exists admin_review_note text;
alter table public.products add column if not exists proposed_price numeric(10,2) check (proposed_price is null or proposed_price >= 0);
alter table public.products add column if not exists price_offer_status text not null default 'none' check (price_offer_status in ('none', 'pending_student_response', 'accepted', 'rejected'));
alter table public.products add column if not exists final_price numeric(10,2) check (final_price is null or final_price >= 0);
alter table public.products add column if not exists commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100);
alter table public.products add column if not exists listing_number integer check (listing_number is null or listing_number > 0);
alter table public.products add column if not exists listing_fee numeric(10,2) not null default 0 check (listing_fee >= 0);
alter table public.products add column if not exists seller_pickup_location text;
alter table public.products add column if not exists seller_pickup_time timestamptz;
alter table public.products add column if not exists handover_status text not null default 'pending';
alter table public.products add column if not exists is_sponsored boolean not null default false;
alter table public.products add column if not exists sponsored_fee numeric(10,2) not null default 0 check (sponsored_fee >= 0);
alter table public.products add column if not exists sponsored_until timestamptz;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

create or replace function public.apply_listing_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_listing_count integer := 0;
  per_listing_fee numeric(10,2) := 10;
begin
  if new.seller_id is null then
    new.listing_number := null;
    new.listing_fee := coalesce(new.listing_fee, 0);
    return new;
  end if;

  select count(*)
  into existing_listing_count
  from public.products
  where seller_id = new.seller_id;

  new.listing_number := existing_listing_count + 1;

  if existing_listing_count >= 1 then
    new.listing_fee := per_listing_fee;
  else
    new.listing_fee := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists before_product_insert_apply_listing_fee on public.products;
create trigger before_product_insert_apply_listing_fee
before insert on public.products
for each row
execute function public.apply_listing_fee();

create or replace function public.apply_sponsored_listing_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  per_sponsored_fee numeric(10,2) := 49;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.is_sponsored, false) then
      new.sponsored_fee := per_sponsored_fee;
      new.sponsored_until := now() + interval '7 days';
    else
      new.sponsored_fee := 0;
      new.sponsored_until := null;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(new.is_sponsored, false) and not coalesce(old.is_sponsored, false) then
      new.sponsored_fee := per_sponsored_fee;
      new.sponsored_until := now() + interval '7 days';
    elsif not coalesce(new.is_sponsored, false) then
      new.sponsored_fee := 0;
      new.sponsored_until := null;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists before_product_upsert_apply_sponsored_listing_meta on public.products;
create trigger before_product_upsert_apply_sponsored_listing_meta
before insert or update on public.products
for each row
execute function public.apply_sponsored_listing_meta();

create table if not exists public.cart (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  unique(user_id, product_id)
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  total_price numeric(10,2) not null check (total_price >= 0),
  status text not null default 'order_placed' check (status in ('order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed')),
  pickup_location text,
  pickup_time timestamptz,
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Add missing columns to orders if they don't exist
alter table public.orders add column if not exists pickup_location text;
alter table public.orders add column if not exists pickup_time timestamptz;
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 0;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists status_updated_at timestamptz not null default now();

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  commission_rate numeric(5,2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0),
  seller_earning numeric(10,2) not null default 0 check (seller_earning >= 0),
  payout_status text not null default 'unpaid' check (payout_status in ('unpaid', 'paid')),
  payout_paid_at timestamptz,
  payout_reference text
);

alter table public.order_items add column if not exists commission_rate numeric(5,2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100);
alter table public.order_items add column if not exists commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0);
alter table public.order_items add column if not exists seller_earning numeric(10,2) not null default 0 check (seller_earning >= 0);
alter table public.order_items add column if not exists payout_status text not null default 'unpaid' check (payout_status in ('unpaid', 'paid'));
alter table public.order_items add column if not exists payout_paid_at timestamptz;
alter table public.order_items add column if not exists payout_reference text;

-- Order logistics table for pickup/fulfillment tracking
create table if not exists public.order_logistics (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  seller_id uuid references public.users(id) on delete set null,
  seller_pickup_location text,
  listing_number integer,
  pickup_location text not null,
  pickup_time timestamptz not null,
  pickup_confirmed_at timestamptz,
  pickup_completed_at timestamptz,
  status text not null default 'pending_pickup' check (status in ('pending_pickup', 'pickup_confirmed', 'picked_up', 'delivery_in_progress', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_fee_payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  listing_fee numeric(10,2) not null default 0 check (listing_fee >= 0),
  sponsored_fee numeric(10,2) not null default 0 check (sponsored_fee >= 0),
  total_fee numeric(10,2) not null default 0 check (total_fee >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'waived', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Create profile record automatically on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or (
    new.email !~* '^[^@]+@ves\.ac\.in$'
    and lower(new.email) <> 'gauravhinduja99@gmail.com'
  ) then
    raise exception 'Only @ves.ac.in email IDs are allowed (except configured admin email)';
  end if;

  if lower(new.email) = 'gauravhinduja99@gmail.com' then
    insert into public.users (id, email, full_name, phone, role)
    values (
      new.id,
      lower(new.email),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
      'admin'
    )
    on conflict (id) do nothing;
    return new;
  end if;

  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    lower(new.email),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Optional helper to make first admin
-- update public.users set role = 'admin' where email = 'your_admin_email@example.com';

-- Enable RLS
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.cart enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.listing_fee_payments enable row level security;
alter table public.leads enable row level security;

-- Utility: check current user admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
      and lower(email) = 'gauravhinduja99@gmail.com'
  );
$$;

-- Users policies
create policy "Users can view own profile" on public.users
for select using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile" on public.users
for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users
for insert with check (auth.uid() = id or public.is_admin());

-- Products policies
drop policy if exists "Anyone can view products" on public.products;
create policy "Users can view verified or owned products" on public.products
for select using (
  verification_status = 'verified'
  or auth.uid() = seller_id
  or public.is_admin()
);

drop policy if exists "Only admin can insert products" on public.products;
drop policy if exists "Authenticated users can insert own products" on public.products;
create policy "Only admin can insert products" on public.products
for insert with check (public.is_admin());

drop policy if exists "Only admin can update products" on public.products;
drop policy if exists "Owners or admin can update products" on public.products;
create policy "Owners can edit own pending listings" on public.products
for update using (auth.uid() = seller_id)
with check (
  auth.uid() = seller_id
  and verification_status = 'pending'
  and price_offer_status = 'none'
  and proposed_price is null
);

create policy "Admin can update any product" on public.products
for update using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Only admin can delete products" on public.products;
create policy "Owners or admin can delete products" on public.products
for delete using (auth.uid() = seller_id or public.is_admin());

-- Cart policies
create policy "Users can view own cart" on public.cart
for select using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own cart" on public.cart
for insert with check (auth.uid() = user_id);

create policy "Users can update own cart" on public.cart
for update using (auth.uid() = user_id);

create policy "Users can delete own cart" on public.cart
for delete using (auth.uid() = user_id or public.is_admin());

-- Orders policies
create policy "Users can view own orders" on public.orders
for select using (auth.uid() = user_id or public.is_admin());

create policy "Users can create own orders" on public.orders
for insert with check (auth.uid() = user_id or public.is_admin());

create policy "Admin can update orders" on public.orders
for update using (public.is_admin());

-- Order items policies
create policy "Users can view order items for own orders" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

create policy "Users can create order items for own orders" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

-- Order logistics policies
alter table public.order_logistics enable row level security;

create policy "Users can view order logistics for own orders" on public.order_logistics
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

create policy "Admin and sellers can create order logistics" on public.order_logistics
for insert with check (
  public.is_admin() or (
    auth.uid() = seller_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id
    )
  )
);

create policy "Admin and sellers can update own order logistics" on public.order_logistics
for update using (
  public.is_admin() or auth.uid() = seller_id
);

-- Listing fee payment policies
drop policy if exists "Users can view own listing fee payments" on public.listing_fee_payments;
create policy "Users can view own listing fee payments" on public.listing_fee_payments
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Only admin can insert listing fee payments" on public.listing_fee_payments;
create policy "Only admin can insert listing fee payments" on public.listing_fee_payments
for insert with check (public.is_admin());

drop policy if exists "Only admin can update listing fee payments" on public.listing_fee_payments;
create policy "Only admin can update listing fee payments" on public.listing_fee_payments
for update using (public.is_admin())
with check (public.is_admin());

-- Leads policies
create policy "Anyone can insert leads" on public.leads
for insert with check (true);

create policy "Only admin can view leads" on public.leads
for select using (public.is_admin());

-- Storage setup for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "Admin can upload product images" on storage.objects;
create policy "Authenticated users can upload product images" on storage.objects
for insert with check (bucket_id = 'product-images' and auth.uid() is not null);

drop policy if exists "Admin can update product images" on storage.objects;
create policy "Owner or admin can update product images" on storage.objects
for update using (bucket_id = 'product-images' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "Admin can delete product images" on storage.objects;
create policy "Owner or admin can delete product images" on storage.objects
for delete using (bucket_id = 'product-images' and (owner = auth.uid() or public.is_admin()));

-- Enable tracking of loyalty points
alter table public.users add column if not exists loyalty_points integer not null default 0 check (loyalty_points >= 0);
alter table public.users add column if not exists loyalty_tier text not null default 'bronze' check (loyalty_tier in ('bronze', 'silver', 'gold'));

create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.returns (
  id bigint generated always as identity primary key,
  order_item_id bigint not null references public.order_items(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  admin_note text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'received', 'refunded', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  change_type text not null check (change_type in ('sale', 'restock', 'return', 'adjustment')),
  quantity_changed integer not null,
  previous_stock integer not null check (previous_stock >= 0),
  new_stock integer not null check (new_stock >= 0),
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS for new tables
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.returns enable row level security;
alter table public.inventory_logs enable row level security;

-- Support Tickets Policies
create policy "Users can view own tickets" on public.support_tickets for select using (auth.uid() = user_id or public.is_admin());
create policy "Users can insert own tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
create policy "Users can update own tickets" on public.support_tickets for update using (auth.uid() = user_id or public.is_admin());

-- Ticket Messages Policies
create policy "Users can view own ticket messages" on public.ticket_messages for select using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin())
  )
);
create policy "Users can insert own ticket messages" on public.ticket_messages for insert with check (auth.uid() = sender_id);

-- Returns Policies
create policy "Users can view own returns" on public.returns for select using (auth.uid() = user_id or public.is_admin());
create policy "Users can insert own returns" on public.returns for insert with check (auth.uid() = user_id);
create policy "Admin can update returns" on public.returns for update using (public.is_admin());

-- Inventory Logs Policies
create policy "Only admin can view inventory logs" on public.inventory_logs for select using (public.is_admin());
create policy "Only admin can insert inventory logs" on public.inventory_logs for insert with check (public.is_admin());


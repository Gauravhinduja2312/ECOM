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

create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  category text,
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  seller_id uuid references public.users(id) on delete set null,
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
  pickup_confirmed_by_seller boolean not null default false,
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed'));
alter table public.orders alter column status set default 'order_placed';
alter table public.orders add column if not exists pickup_location text;
alter table public.orders add column if not exists pickup_time timestamptz;
alter table public.orders add column if not exists pickup_confirmed_by_seller boolean not null default false;
alter table public.orders add column if not exists status_updated_at timestamptz not null default now();

update public.orders
set status = case
  when status = 'pending' then 'order_placed'
  when status = 'paid' then 'processing'
  when status = 'delivered' then 'completed'
  else status
end
where status in ('pending', 'paid', 'delivered');

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

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  message text not null,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, product_id, user_id)
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
alter table public.notifications enable row level security;
alter table public.product_reviews enable row level security;

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
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users
for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users
for insert with check (auth.uid() = id or public.is_admin());

-- Products policies
drop policy if exists "Anyone can view products" on public.products;
drop policy if exists "Users can view verified or owned products" on public.products;
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
drop policy if exists "Owners can edit own pending listings" on public.products;
create policy "Owners can edit own pending listings" on public.products
for update using (auth.uid() = seller_id)
with check (
  auth.uid() = seller_id
  and verification_status = 'pending'
  and price_offer_status = 'none'
  and proposed_price is null
);

drop policy if exists "Admin can update any product" on public.products;
create policy "Admin can update any product" on public.products
for update using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Only admin can delete products" on public.products;
drop policy if exists "Owners or admin can delete products" on public.products;
create policy "Owners or admin can delete products" on public.products
for delete using (auth.uid() = seller_id or public.is_admin());

-- Cart policies
drop policy if exists "Users can view own cart" on public.cart;
create policy "Users can view own cart" on public.cart
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own cart" on public.cart;
create policy "Users can insert own cart" on public.cart
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own cart" on public.cart;
create policy "Users can update own cart" on public.cart
for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own cart" on public.cart;
create policy "Users can delete own cart" on public.cart
for delete using (auth.uid() = user_id or public.is_admin());

-- Orders policies
drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders" on public.orders
for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders" on public.orders
for update using (public.is_admin());

-- Order items policies
drop policy if exists "Users can view order items for own orders" on public.order_items;
create policy "Users can view order items for own orders" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Users can create order items for own orders" on public.order_items;
create policy "Users can create order items for own orders" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
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
drop policy if exists "Anyone can insert leads" on public.leads;
create policy "Anyone can insert leads" on public.leads
for insert with check (true);

drop policy if exists "Only admin can view leads" on public.leads;
create policy "Only admin can view leads" on public.leads
for select using (public.is_admin());

-- Notifications policies
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admin can insert notifications" on public.notifications;
create policy "Admin can insert notifications" on public.notifications
for insert with check (public.is_admin());

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications" on public.notifications
for delete using (auth.uid() = user_id or public.is_admin());

-- Product review policies
drop policy if exists "Anyone can view product reviews" on public.product_reviews;
create policy "Anyone can view product reviews" on public.product_reviews
for select using (true);

drop policy if exists "Users can insert own completed-order reviews" on public.product_reviews;
create policy "Users can insert own completed-order reviews" on public.product_reviews
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.user_id = auth.uid()
      and o.status = 'completed'
  )
  and exists (
    select 1 from public.order_items oi
    where oi.order_id = order_id
      and oi.product_id = product_id
  )
);

drop policy if exists "Users can update own reviews" on public.product_reviews;
create policy "Users can update own reviews" on public.product_reviews
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can delete own reviews" on public.product_reviews;
create policy "Users can delete own reviews" on public.product_reviews
for delete using (auth.uid() = user_id or public.is_admin());

-- Storage setup for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images" on storage.objects
for insert with check (bucket_id = 'product-images' and auth.uid() is not null);

drop policy if exists "Admin can update product images" on storage.objects;
drop policy if exists "Owner or admin can update product images" on storage.objects;
create policy "Owner or admin can update product images" on storage.objects
for update using (bucket_id = 'product-images' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "Admin can delete product images" on storage.objects;
drop policy if exists "Owner or admin can delete product images" on storage.objects;
create policy "Owner or admin can delete product images" on storage.objects
for delete using (bucket_id = 'product-images' and (owner = auth.uid() or public.is_admin()));

-- Enable extensions
create extension if not exists "pgcrypto";

-- Users profile table (linked to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin'))
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
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  admin_review_note text,
  proposed_price numeric(10,2) check (proposed_price is null or proposed_price >= 0),
  price_offer_status text not null default 'none' check (price_offer_status in ('none', 'pending_student_response', 'accepted', 'rejected')),
  final_price numeric(10,2) check (final_price is null or final_price >= 0),
  commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected'));
alter table public.products add column if not exists admin_review_note text;
alter table public.products add column if not exists proposed_price numeric(10,2) check (proposed_price is null or proposed_price >= 0);
alter table public.products add column if not exists price_offer_status text not null default 'none' check (price_offer_status in ('none', 'pending_student_response', 'accepted', 'rejected'));
alter table public.products add column if not exists final_price numeric(10,2) check (final_price is null or final_price >= 0);
alter table public.products add column if not exists commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100);
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

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
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  commission_rate numeric(5,2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0),
  seller_earning numeric(10,2) not null default 0 check (seller_earning >= 0)
);

alter table public.order_items add column if not exists commission_rate numeric(5,2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100);
alter table public.order_items add column if not exists commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0);
alter table public.order_items add column if not exists seller_earning numeric(10,2) not null default 0 check (seller_earning >= 0);

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
  insert into public.users (id, email, role)
  values (new.id, new.email, 'user')
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
alter table public.leads enable row level security;

-- Utility: check current user admin
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Users policies
create policy "Users can view own profile" on public.users
for select using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile" on public.users
for update using (auth.uid() = id);

-- Products policies
drop policy if exists "Anyone can view products" on public.products;
create policy "Users can view verified or owned products" on public.products
for select using (
  verification_status = 'verified'
  or auth.uid() = seller_id
  or public.is_admin()
);

drop policy if exists "Only admin can insert products" on public.products;
create policy "Authenticated users can insert own products" on public.products
for insert with check (
  (
    auth.uid() = seller_id
    and auth.uid() is not null
    and verification_status = 'pending'
    and price_offer_status = 'none'
    and proposed_price is null
  )
  or public.is_admin()
);

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

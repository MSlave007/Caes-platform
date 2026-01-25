-- Supabase Schema for CAES Platform
-- Run this in the Supabase SQL Editor

-- 1. Profiles Table (Extends Auth)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'installer', -- 'installer' | 'admin'
  company_name text,
  nif text unique,
  name text not null,
  email text not null,
  phone text,
  address text,
  city text,
  postal_code text,
  default_admin_margin_percent numeric default 65,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.profiles enable row level security;

create policy "Installers view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Installers update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'installer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Projects Table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  installer_id uuid not null references public.profiles(id) on delete cascade,
  installer_name text, -- Snapshot of installer name
  
  -- Metadata
  client_name text not null,
  client_email text,
  client_nif text,
  address text, -- Installation address
  project_date timestamp default now(),
  status text not null default 'draft', -- draft, submitted, in_review, approved, rejected
  
  -- Documents (JSONB for flexibility)
  documents jsonb default '{}'::jsonb,

  -- Old System
  old_heater_make text,
  old_heater_model text,
  old_heater_type text,
  old_consumption_kwh_year numeric,
  old_cost_annual_eur numeric,
  
  -- New System (Renamed to match frontend)
  make text,      -- formerly new_heater_make
  model text,     -- formerly new_heater_model
  new_heater_type text,
  new_heater_power_kw numeric,
  new_consumption_estimated numeric,
  new_heater_serial text,
  
  -- Results
  savings_kwh_year numeric,
  savings_eur numeric,
  is_eligible boolean,
  
  -- Financials
  installer_margin_percent numeric not null default 0,
  installer_earnings_eur numeric default 0,
  admin_margin_percent numeric,
  admin_earnings_eur numeric,
  
  -- Admin
  admin_id uuid references public.profiles(id),
  admin_notes text,
  approved_at timestamp,
  
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.projects enable row level security;

create policy "Installers view own projects"
  on public.projects for select
  using (installer_id = auth.uid());
  
create policy "Installers insert projects"
  on public.projects for insert
  with check (installer_id = auth.uid());
  
create policy "Installers update own projects"
  on public.projects for update
  using (installer_id = auth.uid());

-- 3. Storage Buckets (Optional, requires enabling Storage extension manually if not present)
-- insert into storage.buckets (id, name, public) values ('project-documents', 'project-documents', false);

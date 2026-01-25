# Supabase Database Schema (Dual-Role Edition)

## Tables & RLS Policies

### 1. `auth.users` (Supabase built-in)
- Managed by Supabase Auth
- Stores email, password hash, email_verified
- Primary key: `id` (UUID)

### 2. `public.profiles`
```sql
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
  
  -- Admin-specific fields
  default_admin_margin_percent numeric default 65, -- Their standard cut
  
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS: Installers see only their own profile
alter table public.profiles enable row level security;
create policy "Installers view own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Installers update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins see all profiles (for installer management)
create policy "Admins view all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

### 3. `public.projects` (The Core)
```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  installer_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Project metadata
  client_name text not null,
  client_email text,
  client_nif text,
  project_date timestamp default now(),
  
  -- Status workflow
  status text not null default 'draft',
  -- Values: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected'
  
  -- Energy data (WHAT CHANGED)
  old_heater_make text,
  old_heater_model text,
  old_heater_type text, -- 'electric' | 'gas' | 'aerothermal' | 'hybrid'
  old_consumption_kwh_year numeric,
  old_cost_annual_eur numeric,
  
  new_heater_make text,
  new_heater_model text,
  new_heater_type text,
  new_heater_power_kw numeric,
  new_consumption_estimated numeric,
  new_heater_serial text,
  
  -- Calculations (THE MAGIC)
  savings_kwh_year numeric,
  savings_eur numeric,
  is_eligible boolean, -- true if >= 20% savings
  
  -- MARGIN SPLIT (Dual Commission Model)
  installer_margin_percent numeric not null, -- 0-30%, installer chooses
  installer_earnings_eur numeric, -- auto-calculated
  
  admin_margin_percent numeric, -- 0-70%, admin chooses (only when approving)
  admin_earnings_eur numeric, -- auto-calculated
  
  -- Review & Approval
  admin_id uuid references public.profiles(id), -- Which admin approved
  admin_notes text, -- "Please resubmit clearer photo"
  admin_margin_set_at timestamp, -- When admin set their margin
  approved_at timestamp, -- When approved
  
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS: Installers see only their own projects
alter table public.projects enable row level security;
create policy "Installers view own projects"
  on public.projects for select
  using (installer_id = auth.uid());
  
create policy "Installers update draft projects"
  on public.projects for update
  using (installer_id = auth.uid() and status = 'draft');
  
create policy "Installers insert projects"
  on public.projects for insert
  with check (installer_id = auth.uid());

-- RLS: Admins see all projects
create policy "Admins view all projects"
  on public.projects for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
  
create policy "Admins update any project"
  on public.projects for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

### 4. `public.project_documents`
```sql
create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  
  document_type text not null,
  -- 'invoice' | 'before_photo' | 'heater_specs' | 'rite_certificate'
  
  file_url text not null, -- Supabase Storage URL
  file_size_kb numeric,
  file_name text,
  
  -- AI Extraction Results
  extracted_data jsonb, -- {"make": "Ariston", "model": "Genus One", ...}
  extraction_confidence numeric, -- 0.0 - 1.0
  extraction_notes text,
  
  created_at timestamp default now()
);

alter table public.project_documents enable row level security;
create policy "Users can read documents of their projects"
  on public.project_documents for select
  using (
    project_id in (
      select id from public.projects
      where installer_id = auth.uid()
        or admin_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );
```

### 5. `public.generated_documents`
```sql
create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  
  document_type text not null,
  -- 'caes_agreement' | 'res60_certificate' | 'annex1_summary' | 'installation_summary'
  
  pdf_url text not null, -- Supabase Storage URL
  pdf_generated_at timestamp default now(),
  
  -- E-signature fields (for v2)
  signed_by_installer boolean default false,
  signed_at_installer timestamp,
  signed_by_client boolean default false,
  signed_at_client timestamp,
  
  created_at timestamp default now()
);

alter table public.generated_documents enable row level security;
create policy "Users can read their documents"
  on public.generated_documents for select
  using (
    project_id in (
      select id from public.projects
      where installer_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );
```

### 6. `public.audit_log`
```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  
  action text not null,
  -- 'approved' | 'rejected' | 'requested_changes' | 'edited_field' | 'set_margin'
  
  field_name text, -- Which field was edited (if applicable)
  old_value text, -- Before
  new_value text, -- After
  
  notes text, -- Admin comment
  
  created_at timestamp default now()
);

alter table public.audit_log enable row level security;
create policy "Admins view audit log"
  on public.audit_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

### 7. Storage (Supabase Storage Buckets)
**Bucket 1: "uploaded-documents"**
- `{project_id}/{document_type}/{filename}`
- Example: "8f3a-4b2c-9d1e/invoice/ariston_invoice.pdf"

**Bucket 2: "generated-pdfs"**
- `{project_id}/{document_type}/{filename}`
- Example: "8f3a-4b2c-9d1e/caes_agreement/convegno_cae.pdf"

**Bucket 3: "audit-logs"**
- Backups of audit trail

### Indexes (Performance)
```sql
create index idx_projects_installer_id on public.projects(installer_id);
create index idx_projects_status on public.projects(status);
create index idx_projects_admin_id on public.projects(admin_id);
create index idx_project_documents_project_id on public.project_documents(project_id);
create index idx_generated_documents_project_id on public.generated_documents(project_id);
create index idx_audit_log_admin_id on public.audit_log(admin_id);
create index idx_audit_log_project_id on public.audit_log(project_id);
```

### Views (Optional, for Reporting)
```sql
-- Admin Dashboard KPIs
create view admin_dashboard_kpis as
select
  count(distinct p.id) as total_projects_all_time,
  count(distinct case when p.status = 'approved' then p.id end) as projects_approved,
  count(distinct case when p.status = 'submitted' then p.id end) as projects_pending,
  sum(p.admin_earnings_eur) filter (where p.approved_at >= now() - interval '30 days') as revenue_this_month,
  avg(p.admin_margin_percent) filter (where p.status = 'approved') as avg_admin_margin
from public.projects p;
```

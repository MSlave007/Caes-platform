-- Borradores de expediente — CAES Platform
-- Ejecutar en el SQL Editor de Supabase. Es independiente de schema.sql:
-- se puede lanzar sobre una base ya creada sin tocar nada de lo demás.
--
-- ── POR QUÉ ESTA TABLA ───────────────────────────────────────────────
--
-- Los borradores vivían solo en localStorage. Eso significa que un
-- instalador que empieza un expediente en la oficina no lo encuentra en
-- la obra desde el móvil, y que borrar los datos del navegador se lleva
-- por delante media tarde de trabajo. El borrador es de la cuenta, no
-- del navegador.
--
-- El id lo genera el cliente (formato "b<base36>"), no la base: así el
-- borrador existe y se puede guardar desde el primer segundo, sin
-- esperar a que el servidor conteste. Por eso es `text` y no `uuid`.

create table if not exists public.drafts (
  id           text primary key,
  installer_id uuid not null references auth.users on delete cascade,

  -- Como lo llama quien lo está rellenando. En esta fase el cliente
  -- todavía no tiene nombre — sus datos salen de la factura, que llega
  -- después — así que esto es lo único que distingue dos obras.
  nombre       text not null default '',
  role         text not null default 'installer',
  step         integer not null default 0,

  -- { "<id del apartado>": [ { name, size, storagePath } ] }
  -- Guardamos la REFERENCIA, nunca los bytes: los archivos ya están en
  -- Storage y `storagePath` es su clave.
  files        jsonb not null default '{}'::jsonb,

  notas        text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- La lista se pide siempre por instalador y ordenada por fecha.
create index if not exists drafts_installer_updated_idx
  on public.drafts (installer_id, updated_at desc);

alter table public.drafts enable row level security;

-- Un borrador es privado de quien lo escribe. Ni siquiera la agencia lo
-- ve: hasta que no se envía, no es un expediente, es trabajo a medias.
drop policy if exists "Installers view own drafts" on public.drafts;
create policy "Installers view own drafts"
  on public.drafts for select
  using (installer_id = auth.uid());

drop policy if exists "Installers insert own drafts" on public.drafts;
create policy "Installers insert own drafts"
  on public.drafts for insert
  with check (installer_id = auth.uid());

drop policy if exists "Installers update own drafts" on public.drafts;
create policy "Installers update own drafts"
  on public.drafts for update
  using (installer_id = auth.uid())
  with check (installer_id = auth.uid());

drop policy if exists "Installers delete own drafts" on public.drafts;
create policy "Installers delete own drafts"
  on public.drafts for delete
  using (installer_id = auth.uid());

-- `updated_at` lo pone la base, no el cliente: el reloj del navegador
-- puede ir atrasado y entonces un borrador recién guardado aparecería
-- más viejo que la versión anterior.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists drafts_touch_updated_at on public.drafts;
create trigger drafts_touch_updated_at
  before update on public.drafts
  for each row execute procedure public.touch_updated_at();


-- ── Documentos de la CUENTA, no del expediente ───────────────────────
--
-- El DNI del instalador se pedía en cada expediente. Ya lo tenemos y no
-- cambia: se pide una vez, en el perfil, y de ahí en adelante nadie
-- vuelve a preguntarlo. Estas dos columnas son las que lo guardan.

alter table public.profiles
  add column if not exists dni_path   text,
  add column if not exists dni_nombre text;

-- ════════════════════════════════════════════════════════════════════
--  CAES Platform — completar la base de datos
--
--  QUÉ ES ESTE ARCHIVO
--  Una lista de instrucciones para la base de datos. No es código de la
--  aplicación: es lo que hay que decirle a Supabase UNA VEZ para que las
--  tablas existan y tengan las columnas que la aplicación escribe.
--
--  CÓMO SE LANZA
--  Supabase → SQL Editor → New query → pegar todo esto → Run.
--
--  SE PUEDE LANZAR MÁS DE UNA VEZ SIN ROMPER NADA. Todo está escrito
--  con "if not exists" / "or replace": lo que ya está, se queda como
--  está; lo que falta, se crea. No borra datos.
--
--  ── LO QUE YA HABÍA ──────────────────────────────────────────────
--    profiles   ✓   projects   ✓   registro de usuarios  ✓ (por email)
--
--  ── LO QUE FALTABA, Y ES LO QUE ARREGLA ESTO ─────────────────────
--    1. drafts   — no existía. Los borradores vivían en el navegador
--    2. projects — le faltan columnas que la aplicación SÍ escribe.
--                  Hoy nadie lo nota porque sin sesión se guarda en un
--                  archivo local; con un usuario de verdad, el envío
--                  fallaría
--    3. profiles — las dos columnas del DNI del instalador
--    4. leads    — no existía. Los contactos del calculador público se
--                  perdían en silencio
-- ════════════════════════════════════════════════════════════════════


-- ── 1. BORRADORES ───────────────────────────────────────────────────
--
-- Un instalador tiene varias obras a medias a la vez: empieza una el
-- lunes, le falta el certificado energético, la deja; el miércoles hace
-- otra. Cada una es un borrador con su nombre.
--
-- El id lo genera el navegador (formato "b" + base36), no la base: así
-- el borrador existe desde el primer segundo, sin esperar al servidor.
-- Por eso es `text` y no `uuid`.

create table if not exists public.drafts (
  id           text primary key,
  installer_id uuid not null references auth.users on delete cascade,

  -- Como lo llama quien lo está rellenando. En esta fase el cliente
  -- todavía no tiene nombre — sus datos salen de la factura, que llega
  -- después — así que esto es lo único que distingue dos obras.
  nombre       text not null default '',
  role         text not null default 'installer',
  step         integer not null default 0,

  -- { "<apartado>": [ { name, size, storagePath } ] }
  -- Guardamos la REFERENCIA, nunca los bytes: los archivos ya están en
  -- Storage y `storagePath` es su clave. Por eso un borrador retomado
  -- desde otro móvil encuentra de verdad sus documentos.
  files        jsonb not null default '{}'::jsonb,

  notas        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists drafts_installer_updated_idx
  on public.drafts (installer_id, updated_at desc);

alter table public.drafts enable row level security;

-- Un borrador es privado de quien lo escribe. Ni siquiera la agencia lo
-- ve: hasta que no se envía no es un expediente, es trabajo a medias.
drop policy if exists "Installers view own drafts" on public.drafts;
create policy "Installers view own drafts"
  on public.drafts for select using (installer_id = auth.uid());

drop policy if exists "Installers insert own drafts" on public.drafts;
create policy "Installers insert own drafts"
  on public.drafts for insert with check (installer_id = auth.uid());

drop policy if exists "Installers update own drafts" on public.drafts;
create policy "Installers update own drafts"
  on public.drafts for update
  using (installer_id = auth.uid()) with check (installer_id = auth.uid());

drop policy if exists "Installers delete own drafts" on public.drafts;
create policy "Installers delete own drafts"
  on public.drafts for delete using (installer_id = auth.uid());

-- `updated_at` lo pone la base, no el navegador: un reloj atrasado haría
-- que un borrador recién guardado pareciera más viejo que el anterior.
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


-- ── 2. EXPEDIENTES: las columnas que faltan ─────────────────────────
--
-- La aplicación envía campos que la tabla no tiene. Con un usuario de
-- verdad, `insert into projects` los rechazaría y el envío fallaría
-- entero. Hoy no se ve porque sin sesión se escribe en un archivo local.
--
-- NOTA para quien venga después: hay parejas que dicen casi lo mismo
-- (`installer_pct` / `installer_margin_percent`, `docs` / `documents`,
-- `power_kw` / `new_heater_power_kw`). Las de la izquierda son las que
-- usa el código; las de la derecha vienen del esquema original y no las
-- lee nadie. Conviene retirarlas, pero no en el mismo paso en que se
-- arregla el envío: primero que funcione, después se limpia.

alter table public.projects
  -- 'installer' | 'client' — quién ha abierto el expediente. La cola de
  -- revisión filtra por esto.
  add column if not exists source         text default 'installer',
  -- El reparto, en porcentaje sobre el ahorro certificado.
  add column if not exists installer_pct  numeric,
  add column if not exists agency_pct     numeric,
  -- El ahorro en %, que es lo que tiene que superar el 20 % de la norma.
  add column if not exists savings_pct    numeric,
  add column if not exists power_kw       numeric,
  -- [ { id, name, verified, path } ] — un elemento por archivo subido.
  -- Varios pueden compartir `id`: las tres fotos del equipo instalado
  -- son un solo apartado.
  add column if not exists docs           jsonb default '[]'::jsonb,
  -- Lo que el instalador escribe a mano al subir. Suele explicar por qué
  -- falta algo, así que lo lee quien revisa ANTES de llamarle.
  add column if not exists notas          text,
  -- El nombre que le puso en el borrador, cuando el cliente todavía no
  -- estaba escrito en ninguna parte.
  add column if not exists nombre         text,
  -- { "<campo>": { valor, estado, confianza } }
  -- Lo leído de los documentos, campo a campo, con su estado: extraído,
  -- confirmado o corregido. Vivía solo en la pantalla de quien revisaba:
  -- doce campos comprobados se perdían al recargar la página. Revisar es
  -- trabajo, y se guarda mientras se hace, no al final.
  add column if not exists extraccion     jsonb default '{}'::jsonb,
  -- { retoques: {...}, revisados: {...} }
  -- Lo stato de los tres documentos generados: lo reescrito a mano
  -- dentro del texto y cuáles se han dado por buenos. Una referencia
  -- catastral buscada en el portal del Catastro y escrita a mano se
  -- perdía al recargar la página.
  add column if not exists documentos     jsonb default '{}'::jsonb;


-- ── 3. PERFIL: documentos de la CUENTA ──────────────────────────────
--
-- El DNI del instalador se pedía en cada expediente. Ya lo tenemos y no
-- cambia: se pide una vez, aquí, y de ahí en adelante nadie vuelve a
-- preguntarlo.

alter table public.profiles
  add column if not exists dni_path   text,
  add column if not exists dni_nombre text;


-- ── 4. CONTACTOS del calculador público ─────────────────────────────
--
-- Quien pide una estimación en la web deja nombre y teléfono. La tabla
-- no existía: la llamada devolvía 404 y el contacto se perdía sin que
-- nadie se enterara.

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  email           text,
  postal          text,
  -- 'ya' | '3meses' | 'mirando' — cuánta prisa tiene.
  "when"          text default 'ya',
  sistema         text,
  factura_mensual numeric,
  zona            text,
  -- Lo que le enseñamos: si después cambia el motor de cálculo, queda
  -- registrado qué cifra vio esta persona.
  estimacion      jsonb default '{}'::jsonb,
  status          text not null default 'new',
  installer_name  text,
  created_at      timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Nadie lee los contactos con la clave pública. Son nombres y teléfonos
-- de particulares: se leen desde el servidor, con la clave de servicio,
-- que se salta las políticas. Dejar aquí un "select" abierto significa
-- regalar la lista entera a quien mire el código de la página.
-- Dejar un contacto sí puede cualquiera: quien rellena el calculador en
-- la web no tiene cuenta. Es insert a secas — puede escribir, no puede
-- leer lo que han escrito los demás.
drop policy if exists "Cualquiera deja su contacto" on public.leads;
create policy "Cualquiera deja su contacto"
  on public.leads for insert
  with check (true);

drop policy if exists "Solo la agencia ve los contactos" on public.leads;
create policy "Solo la agencia ve los contactos"
  on public.leads for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );


-- ── COMPROBACIÓN ────────────────────────────────────────────────────
-- Al terminar, esto tiene que devolver cuatro filas.

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'projects', 'drafts', 'leads')
order by table_name;

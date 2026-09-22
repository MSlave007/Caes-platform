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
  add column if not exists documentos     jsonb default '{}'::jsonb,
  -- El sujeto delegado al que se cede el ahorro. No es un detalle
  -- comercial: es la contraparte del Convenio, y con él cambian el NIF,
  -- el código de acreditación y quién firma. El catálogo está en el
  -- código (src/lib/caes/proveedores.ts) porque son identidades
  -- jurídicas y un error aquí invalida contratos.
  add column if not exists proveedor      text,
  -- €/MWh pactados en ESTE expediente. Vacío = la del sujeto. Vale lo
  -- que se firmó ese día, no lo que valga hoy.
  add column if not exists tarifa_eur_mwh numeric,
  -- { convenio: { id, estado, enviado_at, firmado_at, path } , ... }
  -- El estado de la firma electrónica de cada documento. Todavía no se
  -- escribe: la columna se crea ahora para no pedir otra migración
  -- cuando se conecte el proveedor de firma.
  add column if not exists firmas         jsonb default '{}'::jsonb;


-- ── 3. PERFIL: documentos de la CUENTA ──────────────────────────────
--
-- El DNI del instalador se pedía en cada expediente. Ya lo tenemos y no
-- cambia: se pide una vez, aquí, y de ahí en adelante nadie vuelve a
-- preguntarlo.

alter table public.profiles
  add column if not exists dni_path   text,
  add column if not exists dni_nombre text,
  -- La foto de perfil. Vive en el bucket PRIVADO, como los documentos:
  -- es la cara de una persona, y una URL permanente en un bucket
  -- abierto es justo lo que acaba indexado. Se mira con enlace firmado.
  add column if not exists avatar_path text,
  -- La comisión por defecto del INSTALADOR, que no es el margen de la
  -- agencia: `default_admin_margin_percent` ya existía y es otra cosa.
  add column if not exists default_commission numeric default 25,
  -- Idioma de la interfaz: 'es' | 'it' | 'en'. Todavía no se usa —
  -- la columna se crea ahora para no pedir otra migración.
  add column if not exists idioma      text default 'es';


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


-- ════════════════════════════════════════════════════════════════════
--  ⚠️  URGENTE — EL ALMACÉN ESTÁ ABIERTO
--
--  Comprobado el 21 de septiembre de 2026: el bucket `documents` está
--  marcado como privado, PERO un archivo se descarga sin ninguna clave.
--  Probado de verdad: 2,7 MB bajados con una petición sin cabeceras.
--
--      https://<proyecto>.supabase.co/storage/v1/object/public/documents/<archivo>
--
--  Es decir: hay una política que deja pasar a cualquiera por encima
--  del ajuste del bucket. Dentro hay DNIs, facturas y fotos de casas
--  de particulares.
--
--  Lo de abajo la quita. Es lo más importante de este archivo.
-- ════════════════════════════════════════════════════════════════════

-- Las políticas que abren el bucket a cualquiera. Los nombres varían
-- según cómo se creara; se borran las que existan y no pasa nada con
-- las que no.
drop policy if exists "Public Access"                on storage.objects;
drop policy if exists "Public Access documents"      on storage.objects;
drop policy if exists "Give anon users access"       on storage.objects;
drop policy if exists "Enable read access for all users" on storage.objects;

-- Y por si tiene otro nombre: esto enseña TODAS las que quedan sobre
-- el almacén. Si alguna dice `{public}` o `{anon}` en el rol, es esa —
-- bórrala a mano con `drop policy "<nombre>" on storage.objects;`
select policyname, roles, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- Nadie necesita leer el almacén con la clave pública. La aplicación
-- firma enlaces desde el servidor (/api/documents/url), con la clave
-- de servicio y después de comprobar de quién es el archivo.


-- ════════════════════════════════════════════════════════════════════
--  LOS CLIENTES DEL INSTALADOR
--
--  Hasta ahora el cliente no existía: nombre, NIF, teléfono y dirección
--  se escribían DENTRO de cada expediente, copiados otra vez cada vez.
--  El mismo cliente que hace dos obras — la caldera este año, el aire
--  el que viene — eran dos juegos de datos que nadie relacionaba, y una
--  cifra mal puesta en el NIF la segunda vez no la veía nadie.
--
--  Esto no añade una función: arregla algo que ya estaba roto.
--
--  El cliente NO es un usuario: no entra, no tiene contraseña. Es una
--  ficha del instalador. Si algún día tiene que entrar, será otra cosa
--  y se decidirá entonces.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.clientes (
  id           uuid primary key default gen_random_uuid(),
  installer_id uuid not null references auth.users on delete cascade,

  nombre       text not null,
  -- Sin `unique`: dos instaladores distintos pueden tener el mismo
  -- cliente, y es normal. La unicidad que importa es por instalador, y
  -- la lleva el índice de abajo.
  nif          text,
  telefono     text,
  email        text,
  direccion    text,
  notas        text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Un mismo NIF no se repite dentro del mismo instalador: es justo el
-- duplicado que esto viene a evitar. Los que no tienen NIF no chocan.
create unique index if not exists clientes_instalador_nif_idx
  on public.clientes (installer_id, nif)
  where nif is not null and nif <> '';

create index if not exists clientes_instalador_nombre_idx
  on public.clientes (installer_id, nombre);

alter table public.clientes enable row level security;

drop policy if exists "Instaladores ven sus clientes" on public.clientes;
create policy "Instaladores ven sus clientes"
  on public.clientes for select using (installer_id = auth.uid());

drop policy if exists "Instaladores crean sus clientes" on public.clientes;
create policy "Instaladores crean sus clientes"
  on public.clientes for insert with check (installer_id = auth.uid());

drop policy if exists "Instaladores editan sus clientes" on public.clientes;
create policy "Instaladores editan sus clientes"
  on public.clientes for update
  using (installer_id = auth.uid()) with check (installer_id = auth.uid());

drop trigger if exists clientes_touch_updated_at on public.clientes;
create trigger clientes_touch_updated_at
  before update on public.clientes
  for each row execute procedure public.touch_updated_at();

-- El expediente apunta al cliente en vez de recopiarlo. `set null` y no
-- `cascade`: borrar una ficha de cliente no puede llevarse por delante
-- un expediente, que es un documento con valor legal.
alter table public.projects
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

create index if not exists projects_cliente_idx on public.projects (cliente_id);


-- ════════════════════════════════════════════════════════════════════
--  ⚠️  URGENTE — CUALQUIERA PUEDE HACERSE ADMINISTRADOR
--
--  Comprobado el 21 de septiembre de 2026, haciéndolo de verdad:
--  un alta pública con `role: "admin"` en los metadatos crea una cuenta
--  de AGENCIA. Es decir, quien abra
--
--      /register?role=admin
--
--  se da de alta con acceso a la cola de revisión, a todos los
--  expedientes, a los márgenes y a los contactos — nombres y teléfonos
--  de particulares. Deja sin valor toda la separación de roles.
--
--  El motivo: el trigger se creía el rol que venía del navegador.
--
--      coalesce(new.raw_user_meta_data->>'role', 'installer')
--
--  Lo de abajo lo arregla: el alta crea SIEMPRE un instalador, mire lo
--  que mire el navegador. Subir a alguien a agencia se hace a mano:
--
--      update public.profiles set role = 'admin' where email = '...';
--
--  De paso arregla otra cosa: dar de alta sin `full_name` devolvía un
--  500 opaco, porque `profiles.name` es NOT NULL. Ahora, sin nombre, se
--  usa la parte del correo antes de la arroba.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    -- SIEMPRE instalador. El rol no se pide, se concede.
    'installer'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Por si alguien ya se coló antes de este arreglo: esto enseña quién
-- tiene rol de agencia. Debería salir solo la gente que conoces.
select email, role, created_at
from public.profiles
where role = 'admin'
order by created_at;


-- ════════════════════════════════════════════════════════════════════
--  El cliente, elegido al empezar
--
--  Se elige antes de subir los papeles porque ya se sabe quién es: se
--  vuelve de la obra de alguien. Elegirlo al principio significa que al
--  llegar al envío el NIF, el teléfono, el correo y la dirección ya
--  están puestos.
-- ════════════════════════════════════════════════════════════════════

alter table public.drafts
  add column if not exists cliente_id     text,
  add column if not exists cliente_nombre text;


-- ════════════════════════════════════════════════════════════════════
--  Los ajustes de la agencia
--
--  Hasta hoy la pantalla de Ajustes tenía un botón «Guardar cambios»
--  que decía «Guardado» y no guardaba nada. Un control que miente es
--  peor que un control que no está: quien lo usa cree haber hecho algo.
--
--  Una sola fila, siempre la misma, con clave fija. No es una tabla de
--  configuración por usuario: son las reglas de la agencia, y la
--  agencia es una. Si algún día hay varias, esta fila se convierte en
--  una por agencia y cambia la clave, no la forma.
--
--  Lo que NO está aquí, y no debe estarlo: la tarifa CAES, el ahorro
--  mínimo, la comisión máxima y la validez del certificado. Esos los
--  fija la norma, viven en el motor de cálculo y se cambian con una
--  revisión de código, no desde un panel a las once de la noche.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.ajustes (
  -- Clave fija: siempre 'agencia'. Evita que existan dos filas y que
  -- nadie sepa cuál manda.
  id                 text primary key default 'agencia',

  /* La parte que retiene la agencia, sobre lo que queda después de la
     comisión del instalador. Cada expediente puede llevar la suya. */
  margen_pct         integer not null default 65,

  /* El sujeto delegado con el que se trabaja por defecto: sale en el
     Convenio con su NIF y su código de acreditación. Los identificadores
     válidos están en src/lib/caes/proveedores.ts. */
  proveedor          text,

  /* Días hábiles de revisión que se prometen al instalador. Se enseña
     en su panel, así que es una promesa, no una nota interna. */
  dias_revision      integer not null default 5,

  actualizado_en     timestamptz not null default now(),
  actualizado_por    uuid references auth.users on delete set null,

  constraint ajustes_una_sola_fila check (id = 'agencia'),
  constraint ajustes_margen_sensato check (margen_pct between 0 and 100),
  constraint ajustes_dias_sensatos  check (dias_revision between 1 and 30)
);

alter table public.ajustes enable row level security;

-- Leer: cualquiera que haya entrado. El instalador ve los días de
-- revisión que le prometéis, y es justo que los vea.
drop policy if exists "Cualquiera autenticado lee los ajustes" on public.ajustes;
create policy "Cualquiera autenticado lee los ajustes"
  on public.ajustes for select
  to authenticated
  using (true);

-- Escribir: solo la agencia. La comprobación se hace además en el
-- servidor (soloAgencia), pero una regla de fila que no lo diga es una
-- regla que alguien se saltará el día que llame a PostgREST directo.
drop policy if exists "Solo la agencia cambia los ajustes" on public.ajustes;
create policy "Solo la agencia cambia los ajustes"
  on public.ajustes for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- La fila nace con los valores por defecto, para que la pantalla tenga
-- algo que enseñar desde el primer día.
insert into public.ajustes (id) values ('agencia')
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════
--  Lo que el lector acierta, y lo que no
--
--  Cada vez que quien revisa confirma o corrige un campo está diciendo
--  si el modelo acertó. Hasta hoy eso se tiraba: el valor bueno
--  sobrescribía al leído y no quedaba nada.
--
--  Es el único dato que permite decir si la lectura automática
--  funciona, y en qué campos. Sin él solo se puede creer que va bien.
--
--  Lo que abre, cuando haya unos cientos de filas:
--
--    * acierto medido campo por campo, en vez de una impresión
--    * umbral por campo en lugar de uno solo. Hoy es 0,8 para todo:
--      puede que el NIF aguante 0,93 y que el SCOP nunca se libre de
--      una mirada
--    * ejemplos reales para meter en el prompt, que es la forma más
--      barata de que lea mejor
--
--  No guarda el valor en sí cuando es un dato personal: para medir
--  acierto basta saber SI coincidían, no qué ponía. Ver `coincide`.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.lecturas (
  id           uuid primary key default gen_random_uuid(),

  proyecto_id  text not null,
  /* El hueco de documento del que salió: factura, ficha, rite... */
  documento    text not null,
  campo        text not null,

  /* Lo que dijo el modelo y con cuánta seguridad. */
  confianza    numeric(4, 3),
  /* true si el humano lo dio por bueno tal cual; false si lo corrigió. */
  coincide     boolean not null,

  /* Los valores, solo para campos que no son datos personales. En los
     que lo son se queda en null: para medir acierto basta `coincide`, y
     guardar un NIF aquí sería guardarlo dos veces. */
  valor_leido  text,
  valor_final  text,

  /* Quién leyó: gemini, claude... y con qué modelo. Cambiando de
     lector, sin esto no se puede comparar antes y después. */
  lector       text,
  modelo       text,

  revisado_por uuid references auth.users on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists lecturas_campo_idx on public.lecturas (campo, created_at desc);
create index if not exists lecturas_proyecto_idx on public.lecturas (proyecto_id);

alter table public.lecturas enable row level security;

-- Solo la agencia. Es material de calidad interna, y además dice qué
-- expedientes han tenido que corregirse.
drop policy if exists "Solo la agencia ve las lecturas" on public.lecturas;
create policy "Solo la agencia ve las lecturas"
  on public.lecturas for all
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════════════
--  El catálogo de equipos, que se escribe solo
--
--  La ficha RES060 necesita SCOP, SCOP de ACS y potencia. Hoy se leen
--  de la ficha técnica en cada expediente, uno por uno.
--
--  Pero los modelos se repiten: una Daikin Altherma 3 es una Daikin
--  Altherma 3. Cada expediente aprobado deja aquí lo que se confirmó, y
--  al siguiente que monte ese modelo no hay nada que leer: hay que
--  mirar.
--
--  Es lo que más vale a largo plazo. Es más rápido, no cuesta llamadas
--  al modelo, es comprobable — y es una ventaja que quien empiece
--  después no tiene, porque se construye con el uso.
--
--  `veces` es el número de expedientes que han confirmado estos
--  valores: un modelo visto ocho veces se propone con más motivo que
--  uno visto una.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.equipos (
  id            uuid primary key default gen_random_uuid(),

  /* Normalizados en el servidor: sin acentos, sin dobles espacios, en
     mayúsculas. Si no, DAIKIN y Daikin son dos equipos distintos. */
  marca         text not null,
  modelo        text not null,

  scop          numeric(4, 2),
  scop_acs      numeric(4, 2),
  potencia_kw   numeric(6, 2),

  /* Cuántos expedientes han confirmado estos valores. */
  veces         integer not null default 1,

  visto_por_ultima_vez timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  unique (marca, modelo)
);

create index if not exists equipos_busqueda_idx on public.equipos (marca, modelo);

alter table public.equipos enable row level security;

-- Leer lo puede cualquiera que haya entrado: no es un dato de nadie, es
-- una ficha de producto. El instalador se beneficia igual.
drop policy if exists "Cualquiera autenticado lee el catalogo" on public.equipos;
create policy "Cualquiera autenticado lee el catalogo"
  on public.equipos for select
  to authenticated
  using (true);

-- Escribir, solo la agencia: entra al aprobar, con valores que alguien
-- ha verificado mirando la ficha técnica.
drop policy if exists "Solo la agencia escribe el catalogo" on public.equipos;
create policy "Solo la agencia escribe el catalogo"
  on public.equipos for all
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );


-- ════════════════════════════════════════════════════════════════════
--  El enlace que se le da al cliente
--
--  Hoy el cliente final no ve nada. Firma un Convenio cediendo su
--  certificado y luego, silencio: cuando se cansa llama al instalador,
--  que pierde el rato contándole algo que el sistema ya sabe.
--
--  Un enlace, sin cuenta y sin contraseña. Pedirle que se registre para
--  mirar el estado de una ayuda que ya ha firmado es pedirle trabajo a
--  cambio de nada, y no lo haría.
--
--  La seguridad está en que el identificador no se adivina: un uuid v4
--  son 122 bits al azar. No protege de quien reenvía el enlace, y no
--  hace falta: quien lo tiene es el cliente o alguien a quien él se lo
--  ha pasado, y lo que se ve es suyo. Lo que NO se ve está decidido en
--  src/lib/caes/seguimiento.ts, y es casi todo.
-- ════════════════════════════════════════════════════════════════════

alter table public.projects
  add column if not exists seguimiento_token uuid not null default gen_random_uuid();

create unique index if not exists projects_seguimiento_token_idx
  on public.projects (seguimiento_token);

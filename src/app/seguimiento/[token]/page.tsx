import Link from 'next/link'
import { Phone } from 'lucide-react'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { mockDb } from '@/lib/mockDb'
import { vistaParaCliente, type VistaCliente } from '@/lib/caes/seguimiento'
import { eur } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

/**
 * «Tu ayuda, cómo va».
 *
 * ── SENZA ACCOUNT ─────────────────────────────────────────────────────
 *
 * Chiedere al cliente di registrarsi per guardare lo stato di un aiuto
 * che ha già firmato è chiedergli lavoro in cambio di niente, e non lo
 * farebbe. L'indirizzo porta un uuid: 122 bit a caso, non si indovina.
 *
 * Non protegge da chi inoltra il link, e non serve: chi ce l'ha è il
 * cliente o qualcuno a cui l'ha passato lui, e quello che si vede è
 * roba sua. **Quello che NON si vede** è deciso in
 * `src/lib/caes/seguimiento.ts`, e sono quasi tutti i campi.
 *
 * ── PERCHÉ IL SERVER ──────────────────────────────────────────────────
 *
 * Il fascicolo si legge qui e ne esce solo la proiezione. Una pagina
 * client che scarica il progetto intero e ne mostra tre campi manda al
 * browser anche gli altri trenta: basta aprire la rete per vederli.
 */

export const dynamic = 'force-dynamic'

/**
 * Fuori da Google.
 *
 * L'indirizzo non si indovina, e contro chi prova a caso basta. Non
 * basta contro un motore di ricerca che trova il link da qualche parte
 * — una mail inoltrata, un messaggio in un gruppo — perche quello che
 * c'e sopra e l'indirizzo di casa di una persona, chi gli ha fatto il
 * lavoro e quanti soldi gli tocca. Nessuna di queste tre cose e sua
 * intenzione mettere su internet.
 *
 * Il titolo serve a un'altra cosa: questa pagina si tiene nei
 * preferiti, e «CAES — Certificados...» fra venti schede non si
 * ritrova.
 */
export const metadata = {
    title: 'Tu ayuda · CAES',
    description: 'El estado de tu ayuda por la instalación.',
    robots: { index: false, follow: false, nocache: true },
}

/**
 * Il telefono di chi ha fatto il lavoro.
 *
 * Non e' un dato che si sta rivelando: il cliente lo ha gia', ce l'ha
 * in rubrica da quando ha chiamato per il preventivo. Serve solo a non
 * farglielo cercare — la pagina toglie telefonate, ma quando la
 * telefonata serve dev'essere un tocco, non una caccia.
 */
async function telefonoDelInstalador(
    installerId: string | null | undefined
): Promise<string | null> {
    if (!installerId) return null
    const admin = createAdminClient()
    if (!admin) return null
    const { data } = await admin
        .from('profiles')
        .select('phone')
        .eq('id', installerId)
        .maybeSingle()
    return data?.phone ?? null
}

async function buscar(token: string): Promise<Project | null> {
    // Le regole di riga su `projects` dicono «solo i tuoi», e qui non c'è
    // nessun «tu»: la chiave di servizio è l'unico modo. È accettabile
    // perché la query è una sola, per token esatto, e quello che esce
    // passa comunque dalla proiezione.
    const admin = createAdminClient()
    if (admin) {
        const { data } = await admin
            .from('projects')
            .select('*')
            .eq('seguimiento_token', token)
            .maybeSingle()
        if (data) return data as Project
    }

    // In dimostrazione si usa l'id: non ci sono token, e serve poter
    // vedere la pagina senza database.
    return mockDb.getProjectById(token) ?? null
}

export default async function Seguimiento({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const proyecto = await buscar(token)

    if (!proyecto) return <NoHayNada />

    const telefono = await telefonoDelInstalador(
        (proyecto as { installer_id?: string }).installer_id
    )

    return <Ficha v={vistaParaCliente(proyecto)} telefono={telefono} />
}

/* ------------------------------------------------------------ la ficha */

function Ficha({
    v,
    telefono,
}: {
    v: VistaCliente
    telefono: string | null
}) {
    const enEspanol = (iso: string) =>
        new Intl.DateTimeFormat('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(iso))

    const fecha = enEspanol(v.desde)

    return (
        <main className="min-h-screen bg-[var(--caes-paper)] px-6 py-16 font-sans text-[var(--caes-ink)] sm:px-10 sm:py-24">
            <div className="mx-auto max-w-[44rem]">
                <Link href="/" className="flex items-center gap-2.5" aria-label="CAES">
                    <span className="relative block h-[18px] w-[18px] rounded-[3px] bg-[var(--caes-ink)]">
                        <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
                    </span>
                    <span className="font-mono text-[14px] font-medium tracking-[.15em]">
                        CAES
                    </span>
                </Link>

                <p className="label-mono mt-14 text-[var(--caes-mut)]">Tu ayuda</p>
                <h1 className="mt-4 text-balance text-[clamp(30px,4.4vw,44px)] font-semibold leading-[1.05] tracking-[-0.04em]">
                    {v.titulo}
                </h1>
                <p className="mt-5 max-w-[52ch] text-[16px] leading-[1.65] text-[var(--caes-mut)]">
                    {v.detalle}
                </p>

                {/* ── il percorso ─────────────────────────────────── */}
                {v.paso > 0 && (
                    <div className="mt-12">
                        <div className="flex gap-1.5" aria-hidden>
                            {Array.from({ length: v.total }, (_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full ${
                                        i < v.paso
                                            ? 'bg-[var(--caes-green)]'
                                            : 'bg-[var(--caes-line)]'
                                    }`}
                                />
                            ))}
                        </div>
                        <p className="mt-3 text-[13px] text-[var(--caes-faint)]">
                            Paso {v.paso} de {v.total}
                        </p>
                    </div>
                )}

                {/* ── i dati, pochi ───────────────────────────────── */}
                <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-2">
                    <Dato etiqueta="La vivienda" valor={v.direccion} />
                    <Dato
                        etiqueta="Tu instalador"
                        valor={v.instalador ?? 'Todavía sin asignar'}
                    />
                    <Dato etiqueta="Empezó el" valor={fecha} />
                    <Dato
                        etiqueta="Lo que te corresponde"
                        valor={
                            v.suParte === null
                                ? 'Se sabrá al aprobarse'
                                : eur(v.suParte)
                        }
                        // Prima dell'approvazione il riparto non e'
                        // deciso. Dare una cifra che poi cambia e' peggio
                        // che non darne nessuna: diventa quella che il
                        // cliente ricorda.
                        apagado={v.suParte === null}
                        // Una cifra senza una data e' una telefonata
                        // garantita: il cliente la legge e la domanda
                        // successiva e' sempre «e cuando?».
                        nota={
                            v.suParte === null
                                ? undefined
                                : v.cerrado
                                  ? 'Ya ingresado'
                                  : 'Se ingresa una sola vez, cuando el certificado se venda'
                        }
                    />
                </dl>

                {/* Cosa ha firmato, in lingua normale. Non sostituisce
                    il contratto: serve perche un cliente che capisce
                    non chiama a marzo per chiedere se gli hanno tolto
                    qualcosa. Vedi src/lib/caes/seguimiento.ts. */}
                {v.queFirmo && (
                    <section className="mt-10 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6 sm:p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.022em]">
                            Lo que firmaste, en corto
                        </h2>
                        <ul className="mt-4 flex flex-col gap-3">
                            {v.queFirmo.map((linea) => (
                                <li
                                    key={linea.slice(0, 24)}
                                    className="flex gap-3 text-[14.5px] leading-[1.6] text-[var(--caes-mut)]"
                                >
                                    <span
                                        className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--caes-green)]"
                                        aria-hidden
                                    />
                                    {linea}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-5 text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                            Esto es un resumen para entenderlo, no el contrato. Lo que
                            vale es el Convenio que firmaste, y tu instalador te puede
                            mandar una copia cuando quieras.
                        </p>
                    </section>
                )}

                {v.cerrado && (
                    <p className="mt-8 rounded-2xl border border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.06] px-6 py-5 text-[14.5px] leading-[1.6] text-[var(--caes-ink)]">
                        Esto ya está cerrado. Si el ingreso no te ha llegado, habla
                        con tu instalador: es quien tiene el expediente.
                    </p>
                )}

                {/* La telefonata, quando serve davvero: un tocco, non
                    una caccia al numero in rubrica. */}
                {telefono && (
                    <a
                        href={`tel:${telefono.replace(/[^0-9+]/g, '')}`}
                        className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] px-5 py-3 text-[14.5px] transition-colors hover:border-[var(--caes-ink)]/40"
                    >
                        <Phone className="h-4 w-4 text-[var(--caes-mut)]" />
                        Llamar a {v.instalador ?? 'tu instalador'}
                    </a>
                )}

                <p className="mt-14 max-w-[52ch] text-[13.5px] leading-[1.6] text-[var(--caes-faint)]">
                    Última novedad: {enEspanol(v.movida)}. Esta página se actualiza
                    sola — puedes guardarla en favoritos y volver cuando quieras, sin
                    cuenta ni contraseña. Si algo no te cuadra, tu instalador es quien
                    mejor te lo explica.
                </p>
            </div>
        </main>
    )
}

function Dato({
    etiqueta,
    valor,
    apagado,
    nota,
}: {
    etiqueta: string
    valor: string
    apagado?: boolean
    nota?: string
}) {
    return (
        <div className="bg-[var(--caes-panel)] px-6 py-5">
            <dt className="label-mono text-[var(--caes-faint)]">{etiqueta}</dt>
            <dd
                className={`mt-2 text-[16px] font-medium tracking-[-0.018em] ${
                    apagado ? 'text-[var(--caes-faint)]' : ''
                }`}
            >
                {valor}
            </dd>
            {nota && (
                <p className="mt-1.5 text-[12.5px] leading-[1.45] text-[var(--caes-faint)]">
                    {nota}
                </p>
            )}
        </div>
    )
}

/**
 * Link sbagliato.
 *
 * Non dice se il token esiste o no, e non invita a riprovare: una
 * pagina pubblica che distingue «non c'è» da «non è tuo» è una pagina
 * su cui si possono provare indirizzi finché uno funziona.
 */
function NoHayNada() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--caes-paper)] px-6 font-sans text-[var(--caes-ink)]">
            <div className="max-w-[34rem] text-center">
                <h1 className="text-balance text-[26px] font-semibold tracking-[-0.03em]">
                    Este enlace no lleva a ninguna parte.
                </h1>
                <p className="mx-auto mt-4 max-w-[42ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Puede que esté incompleto por cómo te llegó. Pídele el enlace
                    otra vez a tu instalador.
                </p>
            </div>
        </main>
    )
}

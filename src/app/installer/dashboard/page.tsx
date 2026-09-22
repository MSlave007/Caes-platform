'use client'

import { useCarga, Estado } from '@/components/Carga'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Plus, Search, Trash2 } from 'lucide-react'
import StatusChip, { normalize } from '@/components/platform/StatusChip'
import TeToca, { type Pendiente } from '@/components/platform/TeToca'
import { abiertoPorLaAgencia, esperaAlInstalador, estado } from '@/lib/caes/status'
import { COMISION_MAXIMA_PCT, eur } from '@/lib/caes/estimate'
import {
    contarArchivos,
    deleteDraft,
    listDrafts,
    timeAgo,
    type Draft,
} from '@/lib/draft'

const EASE = [0.16, 1, 0.3, 1] as const

type Project = {
    id: string
    client_name: string
    address?: string
    status: string
    savings_eur?: number
    /** Il motivo scritto dall'agenzia quando rimanda indietro. */
    admin_notes?: string | null
    created_at: string
    project_date: string
}

export default function InstallerDashboard() {
    const {
        datos,
        cargando,
        error: errorCarga,
        recargar,
    } = useCarga<Project[]>('/api/projects')
    // `datos ?? []` sarebbe un array nuovo a ogni resa, e i useMemo che
    // dipendono da questa lista si ricalcolerebbero sempre.
    const projects = useMemo<Project[]>(() => datos ?? [], [datos])
    const [search, setSearch] = useState('')
    const [borradores, setBorradores] = useState<Draft[]>([])

    // Le bozze arrivano dall'account (e dalla copia in questo browser, che
    // copre il cantiere senza campo). Si leggono dopo il montaggio: durante
    // il render non si puo ne chiamare l'API ne toccare localStorage.
    useEffect(() => {
        let vivo = true
        void listDrafts().then((d) => vivo && setBorradores(d))
        return () => {
            vivo = false
        }
    }, [])

    const borrar = async (id: string) => {
        await deleteDraft(id)
        setBorradores(await listDrafts())
    }

    /**
     * Gli espedienti passano dall'API, non da Supabase diretto.
     *
     * Prima questa pagina interrogava il database dal browser. Con una
     * sessione le regole di riga davano i propri, il che e giusto — ma
     * senza sessione davano zero, e in dimostrazione la dashboard
     * dell'installatore risultava sempre vuota mentre quella
     * dell'agenzia mostrava le stesse pratiche. Due letture diverse
     * degli stessi dati sono due posti dove divergere.
     */
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return projects
        return projects.filter(
            (p) =>
                p.client_name?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q) ||
                p.status?.toLowerCase().includes(q)
        )
    }, [projects, search])

    /**
     * Vivi e chiusi, separati.
     *
     * Erano tutti in fila. Con ventidue espedienti gli otto gia
     * incassati stavano in mezzo al lavoro di oggi; con cento la lista
     * non si usa piu. «Chiuso» non vuol dire «da nascondere», vuol dire
     * «non e di oggi»: resta a un clic, con il conto scritto sopra.
     *
     * Lo dice il modello degli stati, non un elenco a parte:
     * `terminal` e vero per «Cobrado y repartido» e «Rechazado».
     */
    const [vivos, cerrados] = useMemo(() => {
        const a: Project[] = []
        const b: Project[] = []
        for (const p of filtered) {
            ;(estado(normalize(p.status)).terminal ? b : a).push(p)
        }
        return [a, b]
    }, [filtered])

    /**
     * Cercando si guardano tutti.
     *
     * Chi scrive un nome sta cercando una cosa precisa, e nasconderla
     * perche e chiusa vorrebbe dire far credere che non esiste.
     */
    const buscando = search.trim().length > 0
    const [verCerrados, setVerCerrados] = useState(false)
    const mostrarCerrados = buscando || verCerrados

    /**
     * Quelli fermi in attesa di lui.
     *
     * Non «gli aperti»: quelli su cui NESSUNO puo' muoversi al posto suo.
     * Il modello degli stati lo sa gia' — `actor === 'installer'` — e
     * fino a ora quell'informazione finiva in una pastiglia dello stesso
     * peso di tutte le altre.
     */
    const pendientes = useMemo<Pendiente[]>(
        () =>
            projects
                .filter(
                    (p) =>
                        esperaAlInstalador(normalize(p.status)) ||
                        // Quelli che gli ha aperto l'agenzia: non sa
                        // nemmeno di averli, e senza metterglieli davanti
                        // restano li per sempre.
                        abiertoPorLaAgencia(normalize(p.status))
                )
                .map((p) => ({
                    id: p.id,
                    cliente: p.client_name,
                    estado: normalize(p.status),
                    motivo: p.admin_notes,
                })),
        [projects]
    )

    /** Quelli che sta guardando l'agenzia: non c'e' niente da fare. */
    const enRevision = projects.filter(
        (p) => estado(normalize(p.status)).actor === 'agency'
    ).length

    const totalSavings = projects.reduce((a, p) => a + (p.savings_eur || 0), 0)
    const open = projects.filter((p) =>
        ['draft', 'submitted', 'changes_requested', 'approved', 'issued'].includes(
            normalize(p.status)
        )
    ).length
    const approved = projects.filter((p) => normalize(p.status) === 'approved').length

    // Quota massima che l'installatore può trattenere sugli espedienti approvati.
    const potential = projects
        .filter((p) => normalize(p.status) === 'approved')
        .reduce((a, p) => a + (p.savings_eur || 0) * (COMISION_MAXIMA_PCT / 100), 0)

    return (
        <div className="flex flex-col gap-12">
            {/* ------------------------------------------------ intestazione */}
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="label-mono text-[var(--caes-mut)]">Tus expedientes</p>
                    <h1 className="mt-4 text-balance text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {/*
                            L'errore prima del conteggio. «Todo al día»
                            davanti a una rete caduta e una rassicurazione
                            falsa — ed e peggio di un errore, perche va
                            a casa tranquillo.
                        */}
                        {errorCarga ? (
                            <>
                                No se han podido <em className="serif-accent">cargar</em>.
                            </>
                        ) : cargando ? (
                            <>
                                Cargando <em className="serif-accent">tus expedientes</em>…
                            </>
                        ) : open > 0 ? (
                            <>
                                Tienes {open} <em className="serif-accent">en curso</em>.
                            </>
                        ) : (
                            <>
                                Todo <em className="serif-accent">al día</em>.
                            </>
                        )}
                    </h1>
                </div>

                <Link
                    href="/installer/documentos"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo expediente
                </Link>
            </div>

            {/* Prima di tutto il resto: quello che aspetta lui. */}
            <TeToca pendientes={pendientes} />

            {/* ------------------------------------------------------ numeri */}
            {/*
                Con la lista non caricata queste quattro cifre sarebbero
                tutte zero: «0 en manos de la agencia, 0,00 € de ahorro».
                Non e un dato mancante, e un dato falso — e piu
                tranquillizzante della verita. Meglio non mostrarle.
            */}
            <div
                hidden={Boolean(errorCarga)}
                className="grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-2 lg:grid-cols-4"
            >
                {[
                    // Il primo non e' un conteggio, e' una domanda: quanti
                    // stanno fermi da qualcuno che non sei tu. E' quello
                    // che uno vuole sapere entrando, e prima non c'era.
                    {
                        k: 'En manos de la agencia',
                        v: String(enRevision),
                        n:
                            enRevision > 0
                                ? 'los estamos mirando. No tienes que hacer nada'
                                : 'nada esperando revisión',
                    },
                    { k: 'Aprobados', v: String(approved), n: 'certificado ya emitido' },
                    { k: 'Ahorro certificado', v: eur(totalSavings), n: 'suma de todos los proyectos' },
                    {
                        k: 'Tu parte, como máximo',
                        v: eur(potential),
                        n: `hasta el ${COMISION_MAXIMA_PCT} % que marca la norma`,
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.k}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}
                        className="bg-[var(--caes-panel)] p-6"
                    >
                        <div className="label-mono text-[var(--caes-faint)]">{s.k}</div>
                        <div className="mt-4 font-sans text-[clamp(24px,2.6vw,30px)] font-semibold leading-none tracking-[-0.04em] tabular">
                            {s.v}
                        </div>
                        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-[var(--caes-mut)]">
                            {s.n}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* ----------------------------------------------------- bozze

                Stanno sopra gli espedienti inviati e non in fondo: sono
                l'unica cosa in questa pagina su cui c'e ancora da fare
                qualcosa. Un espediente inviato si guarda; una bozza si
                finisce, ed e li che si perde tempo se non si ritrova. */}
            {borradores.length > 0 && (
                <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Sin terminar
                        </h2>
                        <p className="text-[13px] text-[var(--caes-mut)]">
                            {borradores.every((b) => b.sincronizado)
                                ? 'Guardados en tu cuenta. Los retomas desde cualquier dispositivo.'
                                : 'Alguno está solo en este dispositivo. Se sube en cuanto haya conexión.'}
                        </p>
                    </div>

                    <ul className="mt-5 flex flex-col gap-2.5">
                        {borradores.map((b, i) => (
                            <motion.li
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.04, ease: EASE }}
                                className="group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)] px-5 py-4 transition-colors hover:border-[var(--caes-ink)]/30"
                            >
                                <Link
                                    href={`/installer/documentos?b=${b.id}`}
                                    className="min-w-0 flex-1"
                                >
                                    <span className="block truncate text-[15px] font-medium tracking-[-0.018em]">
                                        {b.nombre}
                                    </span>
                                    <span className="text-[12.5px] text-[var(--caes-mut)]">
                                        {contarArchivos(b)}{' '}
                                        {contarArchivos(b) === 1 ? 'archivo' : 'archivos'} ·
                                        guardado {timeAgo(b.savedAt)}
                                    </span>
                                </Link>

                                <Link
                                    href={`/installer/documentos?b=${b.id}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)] hover:bg-[var(--caes-band)]"
                                >
                                    Seguir
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => void borrar(b.id)}
                                    aria-label={`Eliminar ${b.nombre}`}
                                    className="rounded-lg p-2 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ------------------------------------------------------ ricerca */}
            <div>
                <div className="relative max-w-[26rem]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por cliente, dirección o estado"
                        className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-3 pl-11 pr-4 text-[14px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                    />
                </div>

                {/* ---------------------------------------------------- lista */}
                <div className="mt-7">
                    {cargando || errorCarga ? (
                        <Estado
                            cargando={cargando}
                            error={errorCarga}
                            recargar={recargar}
                            que="tus expedientes"
                        />
                    ) : filtered.length === 0 ? (
                        <EmptyState searching={search.length > 0} />
                    ) : (
                        <>
                            {vivos.length > 0 && (
                                <ul className="flex flex-col gap-3">
                                    {vivos.map((p, i) => (
                                        <Fila key={p.id} p={p} i={i} />
                                    ))}
                                </ul>
                            )}

                            {cerrados.length > 0 && (
                                <div className={vivos.length > 0 ? 'mt-8' : ''}>
                                    {/*
                                        Il bottone dice quanti sono anche da
                                        chiuso: «Cerrados» da solo non fa
                                        sapere se dietro c'e uno o quaranta.
                                    */}
                                    {!buscando && (
                                        <button
                                            type="button"
                                            onClick={() => setVerCerrados((v) => !v)}
                                            aria-expanded={verCerrados}
                                            className="flex items-center gap-2 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                                        >
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform ${
                                                    verCerrados ? 'rotate-180' : ''
                                                }`}
                                            />
                                            {cerrados.length}{' '}
                                            {cerrados.length === 1
                                                ? 'expediente cerrado'
                                                : 'expedientes cerrados'}
                                        </button>
                                    )}

                                    {mostrarCerrados && (
                                        <ul
                                            className={`flex flex-col gap-3 ${
                                                buscando ? '' : 'mt-4'
                                            }`}
                                        >
                                            {cerrados.map((p, i) => (
                                                <Fila key={p.id} p={p} i={i} apagado />
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * Una riga della lista.
 *
 * Serviva in due posti — i vivi e i chiusi — e ricopiarla sarebbe il
 * modo in cui fra un mese le due liste mostrano cose diverse.
 *
 * `apagado` la smorza: i chiusi si leggono, ma non devono pesare quanto
 * il lavoro di oggi.
 */
function Fila({
    p,
    i,
    apagado,
}: {
    p: Project
    i: number
    apagado?: boolean
}) {
    const e = estado(normalize(p.status))
    const mio = e.actor === 'installer' && normalize(p.status) !== 'draft'

    return (
        <motion.li
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.04, ease: EASE }}
        >
            <Link
                href={`/installer/project/${p.id}`}
                className={`group grid grid-cols-1 items-center gap-4 rounded-2xl border border-[var(--caes-line)] p-5 transition-all duration-300 hover:border-[var(--caes-ink)]/25 hover:shadow-[0_18px_40px_-26px_rgba(6,35,26,.35)] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:p-6 ${
                    apagado
                        ? 'bg-[var(--caes-panel)]/55 hover:bg-[var(--caes-panel)]'
                        : 'bg-[var(--caes-panel)]'
                }`}
            >
                <div className="min-w-0">
                    <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em]">
                        {p.client_name || 'Sin nombre'}
                    </h2>
                    <p className="mt-1 truncate text-[13px] text-[var(--caes-mut)]">
                        {p.address || 'Sin dirección'}
                    </p>

                    {/* Di chi e' la palla adesso.
                        La pastiglia dice in che STATO e', che non e' la
                        stessa domanda: da «Aprobado» non si capisce se
                        c'e' qualcosa da fare o se si aspetta. Questa
                        riga risponde a quella. */}
                    <p
                        className={`mt-2 truncate text-[12.5px] ${
                            mio
                                ? 'font-medium text-[var(--caes-falta-ink)]'
                                : 'text-[var(--caes-faint)]'
                        }`}
                    >
                        {mio
                            ? 'Te toca a ti'
                            : e.actor === 'agency'
                              ? 'Lo está revisando la agencia'
                              : e.actor === 'external'
                                ? 'En trámite con el sujeto delegado'
                                : 'Cerrado'}
                    </p>
                </div>

                <span className="font-mono text-[12px] text-[var(--caes-faint)]">
                    {formatDate(p.project_date || p.created_at)}
                </span>

                <span className="font-mono tabular text-[15px] font-medium sm:w-[110px] sm:text-right">
                    {p.savings_eur ? eur(p.savings_eur) : '—'}
                </span>

                <span className="flex items-center gap-4">
                    <StatusChip status={p.status} />
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)] sm:block" />
                </span>
            </Link>
        </motion.li>
    )
}

function formatDate(iso?: string) {
    if (!iso) return '—'
    try {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(iso))
    } catch {
        return '—'
    }
}

function EmptyState({ searching }: { searching: boolean }) {
    return (
        <div className="rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)]/60 px-8 py-14 text-center">
            <h2 className="mx-auto max-w-[24ch] text-balance text-[20px] font-semibold leading-[1.2] tracking-[-0.026em]">
                {searching
                    ? 'Nada coincide con esa búsqueda.'
                    : 'Todavía no has abierto ningún expediente.'}
            </h2>
            <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                {searching
                    ? 'Prueba con el nombre del cliente, la dirección o el estado.'
                    : 'El primero lleva unos quince minutos. Los siguientes, menos: la plataforma ya conoce tus datos.'}
            </p>
            {!searching && (
                <Link
                    href="/installer/documentos"
                    className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                >
                    Empezar el primero
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
            )}
        </div>
    )
}

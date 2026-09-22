'use client'

import { useCarga, Estado } from '@/components/Carga'
import { Suspense, useMemo, useState } from 'react'
import { ordenarPorRiesgo } from '@/lib/caes/riesgo'
import { useSearchParams } from 'next/navigation'
import { FASES, ORDEN, faseDe, type FaseId } from '@/lib/caes/fase'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import ProjectRow from '@/components/admin/ProjectRow'
import type { Project, Source } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

type SourceFilter = 'all' | Source

/**
 * Un filtro per fase, non per stato.
 *
 * Gli stati dicevano cosa è stato deciso; la fase dice di chi è la
 * palla. «Enviado» era un filtro che conteneva tre lavori diversi —
 * sollecitare, leggere, aspettare una firma — e chi lo premeva non
 * poteva sapere quale dei tre stava guardando.
 */
type FaseFilter = 'all' | FaseId

const FASE_TABS: { id: FaseFilter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    ...ORDEN.map((id) => ({ id: id as FaseFilter, label: FASES[id].label })),
]

/**
 * I link che arrivano da fuori parlano ancora di stati.
 *
 * `submitted` non si traduce in una fase: ne contiene tre, ed è tutto il
 * problema. Quindi diventa «todas», e le fasi stesse fanno il taglio.
 */
const DESDE_ESTADO: Record<string, FaseFilter> = {
    approved: 'fuera',
    issued: 'fuera',
    paid: 'cobrado',
    rejected: 'parado',
    changes_requested: 'parado',
}

const SOURCE_TABS: { id: SourceFilter; label: string }[] = [
    { id: 'all', label: 'Todo' },
    { id: 'installer', label: 'De instaladores' },
    { id: 'client', label: 'De clientes' },
]

function ColaDeRevision() {
    const {
        datos,
        cargando,
        error: errorCarga,
        recargar,
    } = useCarga<Project[]>('/api/projects')
    // `datos ?? []` crea un array nuovo a ogni resa, e i useMemo che
    // dipendono da questa lista si ricalcolerebbero sempre.
    const projects = useMemo<Project[]>(() => datos ?? [], [datos])
    const [source, setSource] = useState<SourceFilter>('all')
    const params = useSearchParams()
    const desdeUrl = params.get('fase') ?? DESDE_ESTADO[params.get('estado') ?? ''] ?? ''
    const [fase, setFase] = useState<FaseFilter>(
        FASE_TABS.some((t) => t.id === desdeUrl) ? (desdeUrl as FaseFilter) : 'all'
    )
    const [q, setQ] = useState('')

    const counts = useMemo(() => {
        const bySource = (s: SourceFilter) =>
            s === 'all' ? projects : projects.filter((p) => p.source === s)
        return {
            all: projects.length,
            installer: bySource('installer').length,
            client: bySource('client').length,
        }
    }, [projects])

    /**
     * Quanti ce n'è in ogni fase, con l'origine già applicata.
     *
     * Con l'origine e non senza: se stai guardando solo gli espedienti
     * dei clienti, un «Faltan papeles · 5» che conta anche quelli degli
     * installatori è un numero che non corrisponde a niente di quello
     * che vedi sotto.
     */
    const porFase = useMemo(() => {
        const base =
            source === 'all' ? projects : projects.filter((p) => p.source === source)
        const c: Record<string, number> = { all: base.length }
        for (const id of ORDEN) c[id] = 0
        for (const p of base) c[faseDe(p).id]++
        return c
    }, [projects, source])

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return projects.filter((p) => {
            if (source !== 'all' && p.source !== source) return false

            if (fase !== 'all' && faseDe(p).id !== fase) return false

            if (!needle) return true
            return (
                p.client_name?.toLowerCase().includes(needle) ||
                p.installer_name?.toLowerCase().includes(needle) ||
                p.address?.toLowerCase().includes(needle) ||
                p.id.includes(needle)
            )
        })
    }, [projects, source, fase, q])

    /**
     * La coda in ordine di lavoro, non di arrivo.
     *
     * Vedi src/lib/caes/riesgo.ts: chi rivede, aprendo a caso, non sa
     * mai se sta per perdere due minuti o mezz'ora. Separati, i puliti
     * si chiudono di fila e il tempo vero va dove serve.
     */
    const enOrden = useMemo(() => {
        const porRiesgo = ordenarPorRiesgo(filtered)
        return [...porRiesgo].sort(
            (a, b) => ORDEN.indexOf(faseDe(a.proyecto).id) - ORDEN.indexOf(faseDe(b.proyecto).id)
        )
    }, [filtered])

    /**
     * Quanti aspettano NOI, non quanti sono «enviado».
     *
     * Contava gli `submitted`, che sono anche quelli fermi in attesa
     * dell'installatore o del cliente: il titolo diceva «6 esperando tu
     * firma» quando cinque aspettavano qualcun altro. La fase sa di chi
     * è la palla, e questo è l'unico numero che dice a chi legge se ha
     * qualcosa da fare adesso.
     */
    const nuestros = projects.filter((p) => faseDe(p).mano === 'nosotros').length

    return (
        <div className="flex flex-col gap-9">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Cola de revisión</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {/*
                        L'errore prima del conteggio. Zero perche la
                        coda e vuota e zero perche non e arrivato niente
                        sono la stessa cifra e due notizie opposte: «La
                        cola está vacía» davanti a una rete caduta e una
                        bugia detta con sicurezza.
                    */}
                    {errorCarga ? (
                        <>
                            La cola no se ha <em className="serif-accent">podido cargar</em>.
                        </>
                    ) : cargando ? (
                        <>
                            Cargando <em className="serif-accent">la cola</em>…
                        </>
                    ) : nuestros > 0 ? (
                        <>
                            {nuestros} esperando <em className="serif-accent">a ti</em>.
                        </>
                    ) : projects.length > 0 ? (
                        // Non «vuota»: ci sono fascicoli, semplicemente
                        // nessuno aspetta noi. Dire «vacía» davanti a
                        // ventitre righe è una bugia detta con sicurezza.
                        <>
                            Nada <em className="serif-accent">para ti</em> ahora mismo.
                        </>
                    ) : (
                        <>
                            La cola está <em className="serif-accent">vacía</em>.
                        </>
                    )}
                </h1>
            </div>

            {/* --------------------------------------------------- filtri */}
            <div className="flex flex-col gap-4">
                {/* origine: è il taglio che cambia davvero la lavorazione */}
                <div className="flex flex-wrap items-center gap-2">
                    {SOURCE_TABS.map((t) => {
                        const on = t.id === source
                        const n = counts[t.id]
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSource(t.id)}
                                className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] transition-colors ${on
                                        ? 'bg-[var(--caes-ink)] font-medium text-[var(--caes-paper)]'
                                        : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)]/30 hover:text-[var(--caes-ink)]'
                                    }`}
                            >
                                {t.label}
                                <span
                                    className={`font-mono tabular text-[11.5px] ${on ? 'text-[var(--caes-lime)]' : 'text-[var(--caes-faint)]'}`}
                                >
                                    {n}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line)] pt-4">
                    {/* I conteggi sulle pastiglie, non solo sul gruppo:
                        si vede dove sta il lavoro senza scorrere. */}
                    <div className="flex flex-wrap items-center gap-1">
                        {FASE_TABS.map((t) => {
                            const n = porFase[t.id] ?? 0
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setFase(t.id)}
                                    title={t.id === 'all' ? undefined : FASES[t.id].hint}
                                    className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] transition-colors ${t.id === fase
                                            ? 'bg-[var(--caes-band)] font-medium text-[var(--caes-ink)]'
                                            : n === 0
                                                ? 'text-[var(--caes-faint)] hover:text-[var(--caes-mut)]'
                                                : 'text-[var(--caes-mut)] hover:text-[var(--caes-ink)]'
                                        }`}
                                >
                                    {t.label}
                                    <span className="font-mono tabular text-[11px] text-[var(--caes-faint)]">
                                        {n}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="relative w-full max-w-[22rem]">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cliente, instalador, dirección o número"
                            className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-2.5 pl-11 pr-4 text-[13.5px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                        />
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------- lista */}
            {cargando || errorCarga ? (
                <Estado
                    cargando={cargando}
                    error={errorCarga}
                    recargar={recargar}
                    que="la cola"
                />
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)]/60 px-8 py-14 text-center">
                    <h2 className="text-[19px] font-semibold tracking-[-0.026em]">
                        Nada aquí con estos filtros.
                    </h2>
                    <p className="mx-auto mt-3 max-w-[42ch] text-[14px] text-[var(--caes-mut)]">
                        Prueba a cambiar el estado o el origen, o quita la búsqueda.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {enOrden.map(({ proyecto: p, riesgo }, i) => {
                        // Il titolo compare solo quando la fase cambia:
                        // un'intestazione sopra ogni riga sarebbe piu
                        // rumore che ordine.
                        const suFase = faseDe(p).id
                        const anterior = enOrden[i - 1]
                            ? faseDe(enOrden[i - 1].proyecto).id
                            : null
                        return (
                            <motion.li
                                key={p.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.45,
                                    delay: Math.min(i, 8) * 0.04,
                                    ease: EASE,
                                }}
                            >
                                {suFase !== anterior && (
                                    <TituloDeGrupo
                                        fase={suFase}
                                        cuantos={
                                            enOrden.filter(
                                                (x) => faseDe(x.proyecto).id === suFase
                                            ).length
                                        }
                                        primero={i === 0}
                                    />
                                )}
                                <ProjectRow p={p} />
                                {riesgo.motivos.length > 0 && (
                                    <p className="mt-1.5 pl-1 text-[12.5px] text-[var(--caes-falta-ink)]">
                                        {riesgo.motivos.join(' · ')}
                                    </p>
                                )}
                            </motion.li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

/**
 * I titoli vengono da `fase.ts`, non da una tabella qui.
 *
 * Erano scritti qui e dicevano tre cose sul rischio. La fase le dice per
 * tutti e sette i casi, ed è la stessa frase che vede l'installatore nel
 * suo pannello: se stessero in due posti, un giorno direbbero due cose
 * diverse della stessa pratica.
 */
function TituloDeGrupo({
    fase,
    cuantos,
    primero,
}: {
    fase: FaseId
    cuantos: number
    primero: boolean
}) {
    const g = { titulo: FASES[fase].label, hint: FASES[fase].hint }
    return (
        <div className={primero ? 'mb-3' : 'mb-3 mt-8'}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="label-mono text-[var(--caes-faint)]">
                    {g.titulo} · {cuantos}
                </span>
                <span className="text-[12.5px] text-[var(--caes-faint)]">{g.hint}</span>
            </div>
        </div>
    )
}

/**
 * useSearchParams() obbliga a un confine Suspense: senza, Next non riesce
 * a pre-renderizzare la pagina e la build fallisce. Il typecheck non lo
 * intercetta, solo `npm run build`.
 */
export default function AdminReviewQueue() {
    return (
        <Suspense fallback={null}>
            <ColaDeRevision />
        </Suspense>
    )
}

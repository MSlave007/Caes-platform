'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, Search, UserRound } from 'lucide-react'
import FichaClienteForm, {
    type DatosCliente,
} from '@/components/platform/FichaClienteForm'
import { eur } from '@/lib/caes/estimate'

/**
 * I clienti dell'installatore.
 *
 * ── PERCHÉ NON È UNA RUBRICA ──────────────────────────────────────────
 *
 * Una rubrica è una colonna di nomi uguali, e non risponde a niente.
 * Ogni riga qui porta il numero che conta — quante pratiche ha, quante
 * sono ancora aperte, quanto risparmio hanno certificato — perché il
 * motivo per aprire questa pagina non è cercare un telefono: è vedere
 * con chi hai qualcosa in ballo.
 *
 * Chi ha qualcosa di aperto sale in cima. Non in ordine alfabetico: in
 * ordine di quello che ti riguarda adesso.
 *
 * ── PERCHÉ NON È UN CRM ───────────────────────────────────────────────
 *
 * Niente note commerciali, attività, promemoria, stati di trattativa.
 * Un CRM a metà è peggio di nessun CRM: ci si mette dentro roba che
 * dopo un mese non guarda più nessuno, e allora non ci si fida nemmeno
 * del resto.
 */

type Cliente = {
    id: string
    nombre: string
    nif: string | null
    telefono: string | null
    direccion: string | null
    expedientes?: number
    abiertos?: number
    ahorro?: number
}

/** Un colore stabile per cliente. Aiuta a ritrovarlo a colpo d'occhio. */
const TONOS = [
    'bg-[#E4EDE6] text-[#3B6B4C]',
    'bg-[#EFE8DC] text-[#7A5A16]',
    'bg-[#E3E9F0] text-[#3F5B77]',
    'bg-[#F0E6E6] text-[#7A4646]',
    'bg-[#E9E6F0] text-[#554A75]',
]
const tono = (s: string) =>
    TONOS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONOS.length]

const iniciales = (n: string) =>
    n
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join('')

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busca, setBusca] = useState('')
    const [creando, setCreando] = useState(false)

    const cargar = useCallback(async () => {
        try {
            const r = await fetch('/api/clientes')
            if (!r.ok) throw new Error()
            const j = await r.json()
            setClientes(j.data ?? [])
        } catch {
            setError('No se han podido cargar tus clientes.')
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        void cargar()
    }, [cargar])

    const crear = async (d: DatosCliente) => {
        const r = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d),
        })
        if (!r.ok) throw new Error((await r.json())?.error ?? 'No se ha podido crear')
        setCreando(false)
        await cargar()
    }

    const lista = useMemo(() => {
        const q = busca.trim().toLowerCase()
        const filtrados = q
            ? clientes.filter((c) =>
                [c.nombre, c.nif, c.telefono, c.direccion]
                    .filter(Boolean)
                    .some((v) => v!.toLowerCase().includes(q))
            )
            : clientes
        // Chi ha qualcosa di aperto prima. Poi chi ha più pratiche.
        return [...filtrados].sort(
            (a, b) =>
                (b.abiertos ?? 0) - (a.abiertos ?? 0) ||
                (b.expedientes ?? 0) - (a.expedientes ?? 0) ||
                a.nombre.localeCompare(b.nombre, 'es')
        )
    }, [clientes, busca])

    const conAbiertos = clientes.filter((c) => (c.abiertos ?? 0) > 0).length

    /**
     * Dove finisce il lavoro vivo.
     *
     * L'elenco e gia ordinato con chi ha qualcosa di aperto davanti, ma
     * senza un segno le due meta si leggevano come una lista sola: il
     * titolo diceva «11 con algo en marcha» e sotto c'erano sedici
     * schede, senza niente che spiegasse le altre cinque.
     *
     * Un separatore, non un nascondiglio: un cliente senza niente di
     * aperto resta un cliente da chiamare. E il contrario di quello che
     * si fa con un espediente chiuso, che invece e finito.
     */
    const primerDormido = lista.findIndex((c) => (c.abiertos ?? 0) === 0)
    const hayCorte = primerDormido > 0 && primerDormido < lista.length

    return (
        <div className="flex flex-col gap-9">
            {/* ------------------------------------------------ testa */}
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="label-mono text-[var(--caes-mut)]">Tus clientes</p>
                    <h1 className="mt-4 text-balance text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {conAbiertos > 0 ? (
                            <>
                                {clientes.length} clientes, {conAbiertos} con algo{' '}
                                <em className="serif-accent">en marcha</em>.
                            </>
                        ) : clientes.length > 0 ? (
                            <>
                                Todo <em className="serif-accent">cerrado</em>.
                            </>
                        ) : (
                            <>
                                Todavía <em className="serif-accent">ninguno</em>.
                            </>
                        )}
                    </h1>
                    <p className="mt-4 max-w-[54ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                        Se crean solos al enviar un expediente. La próxima vez que
                        trabajes para el mismo cliente, escribes su nombre y se rellena
                        todo lo demás.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setCreando(true)}
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo cliente
                </button>
            </div>

            {clientes.length > 4 && (
                <div className="relative max-w-[26rem]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                    <input
                        type="search"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nombre, NIF o teléfono"
                        className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-3 pl-11 pr-4 text-[14px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)]"
                    />
                </div>
            )}

            {/* ------------------------------------------------ elenco */}
            {cargando ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-6 py-8 text-[14px] text-[var(--caes-mut)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando…
                </div>
            ) : error ? (
                <p className="rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3 text-[13.5px] text-[var(--caes-falta-deep)]">
                    {error}
                </p>
            ) : lista.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-16 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--caes-band)]">
                        <UserRound
                            className="h-5 w-5 text-[var(--caes-faint)]"
                            strokeWidth={1.6}
                        />
                    </span>
                    <h2 className="mx-auto mt-5 max-w-[26ch] text-balance text-[18px] font-semibold leading-[1.25] tracking-[-0.024em]">
                        {busca ? 'Ninguno coincide con eso.' : 'Aquí aparecerán tus clientes.'}
                    </h2>
                    {!busca && (
                        <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                            No hace falta darlos de alta uno a uno: el primero se crea
                            cuando envíes tu primer expediente.
                        </p>
                    )}
                </div>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {lista.map((c, i) => {
                        const abiertos = c.abiertos ?? 0
                        return (
                            <Fragment key={c.id}>
                            {hayCorte && i === primerDormido && (
                                <li
                                    className="mt-4 flex items-center gap-4 sm:col-span-2"
                                    aria-hidden
                                >
                                    <span className="label-mono shrink-0 text-[var(--caes-faint)]">
                                        Sin nada abierto · {lista.length - primerDormido}
                                    </span>
                                    <span className="h-px flex-1 bg-[var(--caes-line)]" />
                                </li>
                            )}
                            <li>
                                <Link
                                    href={`/installer/clientes/${c.id}`}
                                    className={`group flex h-full flex-col gap-4 rounded-2xl border bg-[var(--caes-panel)] p-5 transition-all duration-300 hover:shadow-[0_18px_40px_-28px_rgba(6,35,26,.35)] ${abiertos > 0
                                        ? 'border-[var(--caes-green)]/40 hover:border-[var(--caes-green)]'
                                        : 'border-[var(--caes-line)] hover:border-[var(--caes-ink)]/25'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <span
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono text-[14px] ${tono(c.nombre)}`}
                                        >
                                            {iniciales(c.nombre)}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15.5px] font-semibold tracking-[-0.018em] text-[var(--caes-ink)]">
                                                {c.nombre}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12.5px] text-[var(--caes-mut)]">
                                                {[c.nif, c.telefono].filter(Boolean).join(' · ') ||
                                                    'Sin datos de contacto'}
                                            </span>
                                        </span>

                                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)]" />
                                    </div>

                                    {/* La riga che rende utile l'elenco. */}
                                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--caes-line-2)] pt-3.5">
                                        {abiertos > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--caes-green)]">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--caes-green)]" />
                                                {abiertos} en marcha
                                            </span>
                                        ) : (
                                            <span className="text-[12.5px] text-[var(--caes-faint)]">
                                                Nada abierto
                                            </span>
                                        )}

                                        <span className="text-[12.5px] text-[var(--caes-mut)]">
                                            {c.expedientes ?? 0}{' '}
                                            {(c.expedientes ?? 0) === 1
                                                ? 'expediente'
                                                : 'expedientes'}
                                        </span>

                                        {(c.ahorro ?? 0) > 0 && (
                                            <span className="ml-auto font-mono tabular text-[12.5px] text-[var(--caes-mut)]">
                                                {eur(c.ahorro ?? 0)}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </li>
                            </Fragment>
                        )
                    })}
                </ul>
            )}

            {creando && (
                <FichaClienteForm
                    titulo="Nuevo cliente"
                    onGuardar={crear}
                    onCerrar={() => setCreando(false)}
                />
            )}
        </div>
    )
}

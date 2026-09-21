'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Search, UserRound } from 'lucide-react'

/**
 * I clienti dell'installatore.
 *
 * ── PERCHÉ UN ELENCO E NON UN CRM ─────────────────────────────────────
 *
 * Qui non ci sono note commerciali, attività, promemoria né stati di
 * trattativa. Un CRM fatto a metà è peggio di nessun CRM: la gente ci
 * mette dentro dati che poi nessuno guarda, e dopo un mese l'elenco è
 * pieno di cose vecchie di cui non ci si fida.
 *
 * Questo elenco risponde a una domanda sola, che è quella che un
 * installatore si fa davvero: «di questo cliente, cosa ho in ballo?».
 * Se fra sei mesi lo usano tutti i giorni, la base per farlo crescere
 * c'è già.
 */

type Cliente = {
    id: string
    nombre: string
    nif: string | null
    telefono: string | null
    direccion: string | null
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busca, setBusca] = useState('')

    useEffect(() => {
        let vivo = true
        fetch('/api/clientes')
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((j) => vivo && setClientes(j.data ?? []))
            .catch(() => vivo && setError('No se han podido cargar tus clientes.'))
            .finally(() => vivo && setCargando(false))
        return () => {
            vivo = false
        }
    }, [])

    // Il filtro è locale: l'elenco è corto e cercare sul server a ogni
    // lettera sarebbe un viaggio per niente.
    const filtrados = useMemo(() => {
        const q = busca.trim().toLowerCase()
        if (!q) return clientes
        return clientes.filter((c) =>
            [c.nombre, c.nif, c.telefono, c.direccion]
                .filter(Boolean)
                .some((v) => v!.toLowerCase().includes(q))
        )
    }, [clientes, busca])

    return (
        <div className="flex flex-col gap-10">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Tus clientes</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {clientes.length > 0 ? (
                        <>
                            {clientes.length}{' '}
                            <em className="serif-accent">
                                {clientes.length === 1 ? 'ficha' : 'fichas'}
                            </em>
                            .
                        </>
                    ) : (
                        <>
                            Todavía <em className="serif-accent">ninguno</em>.
                        </>
                    )}
                </h1>
                <p className="mt-4 max-w-[54ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Se crean solos cuando envías un expediente. La próxima vez que
                    trabajes para el mismo cliente, escribes su nombre y se rellena
                    todo lo demás.
                </p>
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

            {cargando ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-6 py-8 text-[14px] text-[var(--caes-mut)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando…
                </div>
            ) : error ? (
                <p className="rounded-xl border border-[#E0B48C] bg-[#FBF1E7] px-4 py-3 text-[13.5px] text-[#7A4A12]">
                    {error}
                </p>
            ) : filtrados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                    <h2 className="mx-auto max-w-[26ch] text-balance text-[18px] font-semibold leading-[1.25] tracking-[-0.024em]">
                        {busca
                            ? 'Ninguno coincide con eso.'
                            : 'Aquí aparecerán tus clientes.'}
                    </h2>
                    {!busca && (
                        <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                            No hay que darlos de alta: el primero se crea cuando envíes
                            tu primer expediente.
                        </p>
                    )}
                </div>
            ) : (
                <ul className="flex flex-col gap-2.5">
                    {filtrados.map((c) => (
                        <li key={c.id}>
                            <Link
                                href={`/installer/clientes/${c.id}`}
                                className="group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-5 py-4 transition-all duration-300 hover:border-[var(--caes-ink)]/25 hover:shadow-[0_18px_40px_-28px_rgba(6,35,26,.35)]"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--caes-band)]">
                                    <UserRound
                                        className="h-4 w-4 text-[var(--caes-mut)]"
                                        strokeWidth={1.7}
                                    />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15.5px] font-medium tracking-[-0.018em]">
                                        {c.nombre}
                                    </span>
                                    <span className="block truncate text-[12.5px] text-[var(--caes-mut)]">
                                        {[c.nif, c.telefono, c.direccion]
                                            .filter(Boolean)
                                            .join(' · ') || 'Sin más datos'}
                                    </span>
                                </span>

                                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)]" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

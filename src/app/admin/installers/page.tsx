'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2, Search, Users } from 'lucide-react'
import {
    carteraDeClientes,
    carteraDeInstaladores,
    resumenCartera,
} from '@/lib/caes/cartera'
import { estado } from '@/lib/caes/status'
import FilaInstalador, { eurRedondo } from '@/components/admin/FilaInstalador'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * La cartera: gli installatori visti da chi li coordina.
 *
 * ── COSA RISPONDE QUESTA PAGINA ───────────────────────────────────────
 *
 * Tre domande, e sono tre domande che oggi non hanno risposta da nessuna
 * altra parte nella piattaforma:
 *
 *   1. Chi devo chiamare oggi, e perché?
 *   2. Quanti clienti ha ognuno? (clienti, non espedienti: un cliente
 *      con quattro pratiche è UN rapporto, non quattro)
 *   3. Il cliente X, di chi è?
 *
 * ── PERCHÉ NON È UN CRM CLASSICO ──────────────────────────────────────
 *
 * Non c'è niente da riempire. Nessuna colonna da trascinare, nessuna
 * nota da scrivere, nessuno stato da aggiornare a mano. Tutto quello che
 * si legge qui è già negli espedienti: chi sta bloccando lo dice lo
 * stato, da quanto lo dice la data.
 *
 * Il giorno in cui si aggiunge un campo che qualcuno deve compilare,
 * quel campo diventa la prima cosa che smette di essere vera.
 */
export default function AdminCartera() {
    const [proyectos, setProyectos] = useState<Project[]>([])
    const [cargando, setCargando] = useState(true)
    const [q, setQ] = useState('')
    const [abierto, setAbierto] = useState<string | null>(null)

    /**
     * L'ora si legge una volta sola, dopo il montaggio. Leggerla durante
     * il calcolo renderebbe impura la resa, e con React 16 è un errore
     * di lint — ma soprattutto farebbe ballare i «giorni fa» fra il
     * server e il browser.
     */
    const [ahora, setAhora] = useState<number | null>(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setAhora(Date.now()), [])

    useEffect(() => {
        fetch('/api/projects')
            .then((r) => r.json())
            .then((j) => setProyectos(j.data ?? []))
            .catch((e) => console.error('Error al cargar:', e))
            .finally(() => setCargando(false))
    }, [])

    const instaladores = useMemo(
        () => (ahora === null ? [] : carteraDeInstaladores(proyectos, ahora)),
        [proyectos, ahora]
    )
    const clientes = useMemo(
        () => (ahora === null ? [] : carteraDeClientes(proyectos, ahora)),
        [proyectos, ahora]
    )
    const resumen = useMemo(
        () => resumenCartera(instaladores, clientes),
        [instaladores, clientes]
    )

    const busca = q.trim().toLowerCase()
    const instFiltrados = busca
        ? instaladores.filter((i) => i.nombre.toLowerCase().includes(busca))
        : instaladores
    // I clienti si mostrano solo quando si cerca: un elenco di tutti i
    // clienti di tutti gli installatori non è una vista, è un dump.
    const cliFiltrados = busca
        ? clientes.filter((c) => c.nombre.toLowerCase().includes(busca))
        : []

    /** Sempre da assegnare: arrivano dal calcolatore e non sono di nessuno. */
    const huerfanos = proyectos.filter((p) => !p.installer_name)

    if (cargando || ahora === null) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-9">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">La cartera</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {resumen.instaladores} instaladores,{' '}
                    {resumen.clientes} clientes <em className="serif-accent">entre todos</em>.
                </h1>
                <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Ordenados por quién necesita una llamada, no por nombre. Nada de
                    esto se rellena a mano: sale de los expedientes que ya existen.
                </p>
            </div>

            {/* ── quello che va fatto oggi ─────────────────────────── */}
            {resumen.necesitan.length > 0 && (
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="rounded-2xl border border-[#C4643F]/45 bg-[#C4643F]/[.06] p-6 sm:p-7"
                >
                    <div className="flex items-start gap-3.5">
                        <AlertTriangle
                            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#9B4526]"
                            strokeWidth={2.2}
                        />
                        <div className="min-w-0">
                            <h2 className="text-[17px] font-semibold tracking-[-0.024em] text-[#7E3A1F]">
                                {resumen.necesitan.length === 1
                                    ? 'Hoy hay un instalador al que llamar.'
                                    : `Hoy hay ${resumen.necesitan.length} instaladores a los que llamar.`}
                            </h2>
                            <p className="mt-1.5 text-[14px] leading-[1.55] text-[#7E3A1F]/80">
                                Tienen trabajo parado en su mano. Son{' '}
                                <strong className="font-semibold">
                                    {eurRedondo(resumen.euroParado)}
                                </strong>{' '}
                                que no se mueven hasta que lo toquen ellos.
                            </p>

                            <ul className="mt-4 flex flex-col gap-2">
                                {resumen.necesitan.map((i) => (
                                    <li
                                        key={i.nombre}
                                        className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[14px] text-[#7E3A1F]"
                                    >
                                        <strong className="font-semibold">{i.nombre}</strong>
                                        <span className="text-[#7E3A1F]/75">
                                            {i.parados.length}{' '}
                                            {i.parados.length === 1 ? 'parado' : 'parados'} ·
                                            el más viejo, {i.diasPeor} días ·{' '}
                                            {i.parados[0].cliente}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.section>
            )}

            {/* ── ricerca: installatori E clienti ──────────────────── */}
            <div>
                <div className="relative max-w-[28rem]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                    <input
                        id="buscar-cartera"
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar instalador o cliente"
                        className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-2.5 pl-11 pr-4 text-[13.5px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                    />
                </div>
                <p className="mt-2.5 text-[12.5px] text-[var(--caes-faint)]">
                    Escribe el nombre de un cliente para ver de quién es.
                </p>
            </div>

            {/* ── il cliente X di chi è ────────────────────────────── */}
            {cliFiltrados.length > 0 && (
                <section>
                    <p className="label-mono text-[var(--caes-faint)]">
                        Clientes · {cliFiltrados.length}
                    </p>
                    <ul className="mt-4 flex flex-col gap-3">
                        {cliFiltrados.map((c) => (
                            <li
                                key={c.nombre}
                                className={`rounded-2xl border bg-[var(--caes-panel)] p-5 sm:p-6 ${
                                    c.instaladores.length > 1
                                        ? 'border-[#C4643F]/40'
                                        : 'border-[var(--caes-line)]'
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    <Users
                                        className="h-4 w-4 text-[var(--caes-faint)]"
                                        strokeWidth={1.8}
                                    />
                                    <h3 className="text-[15.5px] font-semibold tracking-[-0.02em]">
                                        {c.nombre}
                                    </h3>
                                    <span className="rounded-full bg-[var(--caes-band)] px-2.5 py-1 font-mono text-[10.5px] tabular text-[var(--caes-mut)]">
                                        {c.expedientes.length}{' '}
                                        {c.expedientes.length === 1
                                            ? 'expediente'
                                            : 'expedientes'}
                                    </span>
                                </div>

                                <p className="mt-2.5 text-[14px] leading-[1.55] text-[var(--caes-mut)]">
                                    {c.instaladores.length === 0 ? (
                                        <>Sin instalador asignado todavía.</>
                                    ) : c.instaladores.length === 1 ? (
                                        <>
                                            Lo lleva{' '}
                                            <strong className="font-medium text-[var(--caes-ink)]">
                                                {c.instaladores[0]}
                                            </strong>
                                            .
                                        </>
                                    ) : (
                                        // Il caso che nessun altro schermo mostra: lo
                                        // stesso cliente in mano a due installatori.
                                        <span className="text-[#7E3A1F]">
                                            Está en manos de{' '}
                                            <strong className="font-semibold">
                                                {c.instaladores.length} instaladores
                                            </strong>
                                            : {c.instaladores.join(' y ')}. Conviene
                                            mirarlo.
                                        </span>
                                    )}
                                </p>

                                <ul className="mt-4 flex flex-col divide-y divide-[var(--caes-line-2)]">
                                    {c.expedientes.map((p) => (
                                        <li key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                                            <Link
                                                href={`/admin/review/${p.id}`}
                                                className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 text-[13.5px] transition-colors hover:text-[var(--caes-green)]"
                                            >
                                                <span className="min-w-0 truncate text-[var(--caes-mut)]">
                                                    {p.address || 'Sin dirección'}
                                                </span>
                                                <span className="flex shrink-0 items-baseline gap-3">
                                                    <span className="text-[var(--caes-faint)]">
                                                        {p.installer_name ?? 'sin asignar'}
                                                    </span>
                                                    <span className="font-medium">
                                                        {estado(p.status).label}
                                                    </span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ── gli installatori ─────────────────────────────────── */}
            {/*
                Cercando un cliente, la sezione degli installatori non ha
                niente da dire: un'intestazione «Instaladores · 0» sopra
                il vuoto è rumore, e fa sembrare rotta una ricerca che ha
                funzionato benissimo.
            */}
            <section hidden={instFiltrados.length === 0 && cliFiltrados.length > 0}>
                {busca && instFiltrados.length > 0 && (
                    <p className="label-mono mb-4 text-[var(--caes-faint)]">
                        Instaladores · {instFiltrados.length}
                    </p>
                )}

                {instFiltrados.length === 0 && cliFiltrados.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                        <h2 className="text-[19px] font-semibold tracking-[-0.026em]">
                            {busca
                                ? 'Nada con ese nombre.'
                                : 'Todavía no hay instaladores.'}
                        </h2>
                        {busca && (
                            <p className="mt-2 text-[14px] text-[var(--caes-mut)]">
                                Ni instalador ni cliente.
                            </p>
                        )}
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {instFiltrados.map((inst, i) => (
                            <FilaInstalador
                                key={inst.nombre}
                                inst={inst}
                                proyectos={proyectos}
                                indice={i}
                                abierto={abierto === inst.nombre}
                                onAbrir={() =>
                                    setAbierto((a) =>
                                        a === inst.nombre ? null : inst.nombre
                                    )
                                }
                            />
                        ))}
                    </ul>
                )}
            </section>

            {/* ── quelli che non sono di nessuno ───────────────────── */}
            {huerfanos.length > 0 && !busca && (
                <section className="rounded-2xl border border-dashed border-[var(--caes-line)] p-6">
                    <p className="label-mono text-[var(--caes-faint)]">Sin asignar</p>
                    <p className="mt-2.5 max-w-[56ch] text-[14px] leading-[1.55] text-[var(--caes-mut)]">
                        {huerfanos.length}{' '}
                        {huerfanos.length === 1
                            ? 'expediente ha llegado'
                            : 'expedientes han llegado'}{' '}
                        del calculador y todavía no{' '}
                        {huerfanos.length === 1 ? 'es' : 'son'} de nadie. Hasta que no{' '}
                        {huerfanos.length === 1 ? 'tenga' : 'tengan'} instalador, no{' '}
                        {huerfanos.length === 1 ? 'aparece' : 'aparecen'} en ninguna
                        cartera.
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {huerfanos.map((p) => (
                            <Link
                                key={p.id}
                                href={`/admin/review/${p.id}`}
                                className="rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] px-3 py-1.5 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)]/35 hover:text-[var(--caes-ink)]"
                            >
                                {p.client_name}
                            </Link>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

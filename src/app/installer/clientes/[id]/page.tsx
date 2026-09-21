'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    UserRound,
} from 'lucide-react'
import FichaClienteForm, {
    type DatosCliente,
} from '@/components/platform/FichaClienteForm'
import StatusChip, { normalize } from '@/components/platform/StatusChip'
import { estado } from '@/lib/caes/status'
import { eur } from '@/lib/caes/estimate'

/**
 * La scheda di un cliente.
 *
 * ── A COSA SERVE DAVVERO ──────────────────────────────────────────────
 *
 * Non è una rubrica. È la pagina che l'installatore apre quando il
 * cliente lo chiama e chiede «come va la mia pratica?». Quindi la
 * risposta a quella domanda deve stare in alto e leggersi senza
 * scorrere: a che punto è ciascuna, e chi la sta fermando.
 *
 * I dati di contatto vengono dopo. Un telefono non si guarda mentre si
 * è al telefono con quella persona.
 *
 * ── PERCHÉ NON CI SONO NOTE, ATTIVITÀ E PROMEMORIA ────────────────────
 *
 * Perché sarebbe un CRM a metà, e un CRM a metà è peggio di nessuno:
 * ci si mette dentro roba che dopo un mese non guarda più nessuno, e
 * allora non ci si fida nemmeno del resto. Questa scheda risponde a una
 * domanda sola e la risponde bene.
 */

type Expediente = {
    id: string
    client_name: string
    address?: string | null
    status: string
    savings_eur?: number | null
    created_at?: string
}

type Cliente = {
    id: string
    nombre: string
    nif: string | null
    telefono: string | null
    email: string | null
    direccion: string | null
    expedientes: Expediente[]
}

const fecha = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : ''

export default function ClientePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const [c, setC] = useState<Cliente | null>(null)
    const [cargando, setCargando] = useState(true)
    const [editando, setEditando] = useState(false)

    useEffect(() => {
        let vivo = true
        fetch(`/api/clientes/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => vivo && setC(j?.data ?? null))
            .finally(() => vivo && setCargando(false))
        return () => {
            vivo = false
        }
    }, [id])

    const guardar = async (d: DatosCliente) => {
        const r = await fetch(`/api/clientes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d),
        })
        if (!r.ok) throw new Error((await r.json())?.error ?? 'No se ha podido guardar')
        const j = await r.json()
        // Si tiene quello che c'era e si sovrascrive quello che e'
        // cambiato: la risposta non riporta gli espedienti, e perderli
        // farebbe sparire mezza pagina dopo un salvataggio.
        setC((v) => (v ? { ...v, ...j.data } : v))
        setEditando(false)
    }

    if (cargando) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
            </div>
        )
    }

    if (!c) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                <h1 className="text-[20px] font-semibold tracking-[-0.026em]">
                    Esta ficha no existe.
                </h1>
                <Link
                    href="/installer/clientes"
                    className="mt-6 inline-flex items-center gap-2 text-[14px] text-[var(--caes-mut)] underline-offset-4 hover:text-[var(--caes-ink)] hover:underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a tus clientes
                </Link>
            </div>
        )
    }

    const exp = c.expedientes ?? []
    const total = exp.reduce((a, e) => a + (e.savings_eur ?? 0), 0)
    // Quelli che non sono ancora chiusi: è il numero che conta quando
    // chiama, non quanti gliene hai fatti in totale.
    const abiertos = exp.filter((e) => estado(normalize(e.status)).actor !== 'none')

    const iniciales = c.nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join('')

    return (
        <div className="flex flex-col gap-9">
            <Link
                href="/installer/clientes"
                className="group inline-flex w-fit items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
            >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                Tus clientes
            </Link>

            {/* ------------------------------------------------ chi è */}
            <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex items-center gap-5">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--caes-band)] font-mono text-[19px] text-[var(--caes-mut)]">
                        {iniciales || <UserRound className="h-6 w-6" strokeWidth={1.6} />}
                    </span>
                    <div>
                        <h1 className="text-balance text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                            {c.nombre}
                        </h1>
                        <p className="mt-2 text-[14px] text-[var(--caes-mut)]">
                            {exp.length === 0
                                ? 'Todavía sin expedientes'
                                : `${exp.length} ${exp.length === 1 ? 'expediente' : 'expedientes'}${abiertos.length > 0 ? ` · ${abiertos.length} en curso` : ''}`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setEditando(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-5 py-3.5 text-[14.5px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)] hover:bg-[var(--caes-band)]"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar datos
                    </button>

                    {/* Il cliente viaggia nell'indirizzo: il modulo si apre
                        con i suoi dati gia dentro, che e' il motivo per cui
                        esiste la rubrica. */}
                    <Link
                        href={`/installer/documentos?cliente=${c.id}`}
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo expediente
                    </Link>
                </div>
            </div>

            {/* ------------------------------------- i numeri, in alto
                Sono la risposta alla telefonata: quante ne ha in ballo,
                quante in tutto, quanto risparmio ha certificato. */}
            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-3">
                {[
                    {
                        k: 'En marcha',
                        v: String(abiertos.length),
                        n:
                            abiertos.length > 0
                                ? 'todavía se mueven'
                                : 'nada pendiente ahora mismo',
                        vivo: abiertos.length > 0,
                    },
                    {
                        k: 'Expedientes',
                        v: String(exp.length),
                        n: 'desde que es cliente tuyo',
                        vivo: false,
                    },
                    {
                        k: 'Ahorro certificado',
                        v: eur(total),
                        n: 'sumando todos los suyos',
                        vivo: false,
                    },
                ].map((m) => (
                    <div key={m.k} className="bg-[var(--caes-panel)] p-6">
                        <div className="label-mono text-[var(--caes-faint)]">{m.k}</div>
                        <div
                            className={`mt-3.5 font-sans text-[clamp(22px,2.2vw,28px)] font-semibold leading-none tracking-[-0.04em] tabular ${m.vivo ? 'text-[var(--caes-green)]' : 'text-[var(--caes-ink)]'
                                }`}
                        >
                            {m.v}
                        </div>
                        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-[var(--caes-mut)]">
                            {m.n}
                        </p>
                    </div>
                ))}
            </div>

            {/* ------------------------------ le sue pratiche, per prime */}
            <section>
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h2 className="text-[17px] font-semibold tracking-[-0.024em]">
                        Sus expedientes
                    </h2>
                    <Link
                        href={`/installer/documentos?cliente=${c.id}`}
                        className="text-[13px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                    >
                        Abrir uno nuevo para él
                    </Link>
                </div>

                {exp.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-12 text-center">
                        <p className="mx-auto max-w-[40ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                            Cuando le hagas una instalación y envíes el expediente,
                            aparecerá aquí con su estado.
                        </p>
                    </div>
                ) : (
                    <ul className="mt-5 flex flex-col gap-2.5">
                        {exp.map((e) => {
                            const st = estado(normalize(e.status))
                            const mio = st.actor === 'installer'
                            return (
                                <li key={e.id}>
                                    <Link
                                        href={`/installer/project/${e.id}`}
                                        className={`group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border bg-[var(--caes-panel)] px-5 py-4 transition-all duration-300 hover:shadow-[0_18px_40px_-28px_rgba(6,35,26,.35)] ${mio
                                            ? 'border-[#D9A94F]/55 hover:border-[#C4863F]'
                                            : 'border-[var(--caes-line)] hover:border-[var(--caes-ink)]/25'
                                            }`}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-medium tracking-[-0.018em]">
                                                {e.address || 'Sin dirección'}
                                            </span>
                                            {/* La riga che risponde al telefono. */}
                                            <span
                                                className={`block text-[12.5px] ${mio
                                                    ? 'font-medium text-[#8A5B0B]'
                                                    : 'text-[var(--caes-faint)]'
                                                    }`}
                                            >
                                                {mio
                                                    ? 'Te toca a ti'
                                                    : st.actor === 'agency'
                                                        ? 'Lo está revisando la agencia'
                                                        : st.actor === 'external'
                                                            ? 'En trámite con el sujeto delegado'
                                                            : 'Cerrado'}
                                            </span>
                                        </span>

                                        <span className="shrink-0 font-mono text-[12px] text-[var(--caes-faint)]">
                                            {fecha(e.created_at)}
                                        </span>
                                        <span className="shrink-0 font-mono tabular text-[14.5px] font-medium">
                                            {eur(e.savings_eur ?? 0)}
                                        </span>
                                        <StatusChip status={e.status} />
                                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)]" />
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>

            {/* ------------------------------------ i contatti, in fondo */}
            <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Sus datos
                    </h2>
                    <button
                        type="button"
                        onClick={() => setEditando(true)}
                        className="text-[13px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                    >
                        Corregir
                    </button>
                </div>
                <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                    Son los que se escriben en el Convenio. La próxima vez que le hagas
                    una instalación se rellenan solos.
                </p>

                <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {[
                        { k: 'NIF o NIE', v: c.nif, Icono: UserRound },
                        { k: 'Teléfono', v: c.telefono, Icono: Phone, href: c.telefono ? `tel:${c.telefono.replace(/\s/g, '')}` : undefined },
                        { k: 'Correo', v: c.email, Icono: Mail, href: c.email ? `mailto:${c.email}` : undefined },
                        { k: 'Dirección', v: c.direccion, Icono: MapPin },
                    ].map((f) => (
                        <div key={f.k} className="flex items-start gap-3">
                            <f.Icono
                                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--caes-faint)]"
                                strokeWidth={1.7}
                            />
                            <div className="min-w-0">
                                <dt className="label-mono text-[var(--caes-faint)]">{f.k}</dt>
                                <dd className="mt-1 break-words text-[14.5px] text-[var(--caes-ink)]">
                                    {f.v ? (
                                        f.href ? (
                                            <a
                                                href={f.href}
                                                className="underline-offset-4 hover:underline"
                                            >
                                                {f.v}
                                            </a>
                                        ) : (
                                            f.v
                                        )
                                    ) : (
                                        <span className="text-[var(--caes-faint)]">
                                            — sin dato
                                        </span>
                                    )}
                                </dd>
                            </div>
                        </div>
                    ))}
                </dl>
            </section>

            {editando && (
                <FichaClienteForm
                    titulo={`Datos de ${c.nombre}`}
                    inicial={{
                        nombre: c.nombre,
                        nif: c.nif ?? '',
                        telefono: c.telefono ?? '',
                        email: c.email ?? '',
                        direccion: c.direccion ?? '',
                    }}
                    onGuardar={guardar}
                    onCerrar={() => setEditando(false)}
                />
            )}
        </div>
    )
}

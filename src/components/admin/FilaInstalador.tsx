'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Clock, Moon, Sparkle } from 'lucide-react'
import { estado } from '@/lib/caes/status'
import { DIAS_PARADO, type Instalador, type Situacion } from '@/lib/caes/cartera'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

/** Cifre di portafoglio: gli spiccioli qui non dicono niente. */
export const eurRedondo = (n: number) =>
    new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
        // Come `eur()` nel resto del progetto: senza questo lo spagnolo
        // scrive «3380 €» e la cifra si legge male a colpo d'occhio.
        useGrouping: 'always',
    }).format(n)

/**
 * La riga di un installatore nella cartera.
 *
 * Chiusa dice una cosa sola: se devo chiamarlo e perché. Aperta mostra i
 * suoi clienti — perché «quanti clienti ha» senza «chi sono» è un numero
 * che non si può usare.
 */
export default function FilaInstalador({
    inst,
    proyectos,
    abierto,
    onAbrir,
    indice,
}: {
    inst: Instalador
    /** Tutti gli espedienti: servono solo se la riga si apre. */
    proyectos: Project[]
    abierto: boolean
    onAbrir: () => void
    indice: number
}) {
    const urgente = inst.situacion === 'necesita'

    return (
        <motion.li
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(indice, 8) * 0.04, ease: EASE }}
            className={`overflow-hidden rounded-2xl border bg-[var(--caes-panel)] transition-colors ${
                urgente
                    ? 'border-[var(--caes-bloqueo)]/45'
                    : 'border-[var(--caes-line)] hover:border-[var(--caes-line)]'
            }`}
        >
            <button
                type="button"
                onClick={onAbrir}
                aria-expanded={abierto}
                className="grid w-full items-center gap-x-5 gap-y-4 p-5 text-left sm:p-6 lg:grid-cols-[minmax(0,1fr)_repeat(4,auto)_auto]"
            >
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="truncate text-[15.5px] font-semibold tracking-[-0.02em]">
                            {inst.nombre}
                        </h2>
                        <Chip situacion={inst.situacion} dias={inst.diasPeor} />
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                        {frase(inst)}
                    </p>
                </div>

                {/*
                    Su schermo stretto le quattro cifre stanno in fila e
                    vanno a capo; su schermo largo `lg:contents` fa
                    sparire questo involucro e le quattro tornano a essere
                    colonne della griglia, allineate fra una riga e
                    l'altra. Senza, ognuna si prendeva una riga sua e la
                    scheda diventava alta il doppio.
                */}
                <div className="flex flex-wrap gap-x-8 gap-y-3 lg:contents">
                    <Cifra label="Clientes" valor={String(inst.clientes)} />
                    <Cifra label="Expedientes" valor={String(inst.expedientes)} />
                    <Cifra
                        label="Parados"
                        valor={String(inst.parados.length)}
                        alerta={inst.diasPeor >= DIAS_PARADO}
                    />
                    <Cifra label="Cobrado" valor={eurRedondo(inst.cobrado)} />
                </div>

                <ChevronDown
                    className={`hidden h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform lg:block ${
                        abierto ? 'rotate-180' : ''
                    }`}
                />
            </button>

            <AnimatePresence initial={false}>
                {abierto && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                    >
                        <Clientes inst={inst} proyectos={proyectos} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    )
}

/* ------------------------------------------------------- i clienti */

function Clientes({
    inst,
    proyectos,
}: {
    inst: Instalador
    proyectos: Project[]
}) {
    const suyos = proyectos.filter((p) => p.installer_name === inst.nombre)

    // Raggruppati per cliente: è così che il capo se li ricorda, non per
    // numero di espediente.
    const porCliente = new Map<string, Project[]>()
    for (const p of suyos) {
        const l = porCliente.get(p.client_name)
        if (l) l.push(p)
        else porCliente.set(p.client_name, [p])
    }

    const filas = [...porCliente.entries()].sort(
        (a, b) => b[1].length - a[1].length
    )

    return (
        <div className="border-t border-[var(--caes-line-2)] bg-[var(--caes-paper)]/60 px-5 py-5 sm:px-6">
            <p className="label-mono text-[var(--caes-faint)]">
                Sus clientes · {porCliente.size}
            </p>

            <ul className="mt-4 flex flex-col divide-y divide-[var(--caes-line-2)]">
                {filas.map(([nombre, exps]) => (
                    <li
                        key={nombre}
                        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium tracking-[-0.012em]">
                                {nombre}
                                {exps.length > 1 && (
                                    <span className="ml-2 rounded-full bg-[var(--caes-band)] px-2 py-0.5 font-mono text-[10.5px] tabular text-[var(--caes-mut)]">
                                        ×{exps.length}
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {exps.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/admin/review/${p.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] px-2.5 py-1 text-[11.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)]/35 hover:text-[var(--caes-ink)]"
                                >
                                    <span
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ background: color(p.status) }}
                                    />
                                    {estado(p.status).label}
                                </Link>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

/* ------------------------------------------------------------ pezzi */

function Cifra({
    label,
    valor,
    alerta,
}: {
    label: string
    valor: string
    alerta?: boolean
}) {
    return (
        <div className="lg:w-[104px] lg:text-right">
            <div className="label-mono text-[var(--caes-faint)]">{label}</div>
            <div
                className={`mt-1.5 font-mono tabular text-[15px] font-medium ${
                    alerta ? 'text-[var(--caes-bloqueo-ink)]' : ''
                }`}
            >
                {valor}
            </div>
        </div>
    )
}

function Chip({ situacion, dias }: { situacion: Situacion; dias: number }) {
    if (situacion === 'necesita') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-bloqueo)]/14 px-2.5 py-1 text-[11px] font-medium text-[var(--caes-bloqueo-ink)]">
                <Clock className="h-3 w-3" strokeWidth={2.4} />
                Te necesita · {dias} d
            </span>
        )
    }
    if (situacion === 'dormido') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-band)] px-2.5 py-1 text-[11px] text-[var(--caes-mut)]">
                <Moon className="h-3 w-3" strokeWidth={2.2} />
                Dormido
            </span>
        )
    }
    if (situacion === 'nuevo') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-lime)]/35 px-2.5 py-1 text-[11px] font-medium text-[var(--caes-lime-ink)]">
                <Sparkle className="h-3 w-3" strokeWidth={2.4} />
                Nuevo
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-green)]/12 px-2.5 py-1 text-[11px] font-medium text-[var(--caes-green)]">
            Al día
        </span>
    )
}

/**
 * La riga sotto il nome. Una frase, non un elenco di numeri: i numeri
 * sono già nelle colonne, e ripeterli non aggiunge niente.
 */
function frase(i: Instalador): string {
    if (i.situacion === 'necesita') {
        const euros = i.parados.reduce((s, p) => s + p.euros, 0)
        const cuantos = i.parados.length
        return `${cuantos} ${
            cuantos === 1 ? 'expediente parado' : 'expedientes parados'
        } en su mano, el más viejo desde hace ${i.diasPeor} días. ${eurRedondo(
            euros
        )} quietos.`
    }
    if (i.situacion === 'dormido') {
        return `Sin mandar nada desde hace ${i.diasSilencio} días. Cobró ${eurRedondo(
            i.cobrado
        )} y desapareció.`
    }
    if (i.situacion === 'nuevo') {
        return i.enRevision > 0
            ? `Acaba de empezar. ${i.enRevision} en revisión vuestra.`
            : 'Acaba de empezar. Todavía no ha mandado nada a revisar.'
    }
    if (i.enRevision > 0) {
        return `Nada parado en su mano. ${i.enRevision} ${
            i.enRevision === 1 ? 'espera' : 'esperan'
        } revisión vuestra.`
    }
    return `Nada parado. ${eurRedondo(i.enJuego)} en juego.`
}

function color(estadoId: string): string {
    const tone = estado(estadoId).tone
    if (tone === 'ok') return 'var(--caes-green)'
    if (tone === 'warn') return 'var(--caes-bloqueo)'
    if (tone === 'bad') return 'var(--caes-mal)'
    if (tone === 'info') return 'var(--caes-mut)'
    return 'var(--caes-faint)'
}

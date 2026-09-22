'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { Extraccion } from '@/lib/caes/extraction'

const EASE = [0.16, 1, 0.3, 1] as const

type Equipo = {
    marca: string
    modelo: string
    scop: number | null
    scop_acs: number | null
    potencia_kw: number | null
    veces: number
}

/** I tre dati che il catalogo può risparmiare. */
const DEL_CATALOGO = [
    { id: 'scop', label: 'SCOP', clave: 'scop' as const, unidad: '' },
    { id: 'scop_acs', label: 'SCOP en ACS', clave: 'scop_acs' as const, unidad: '' },
    {
        id: 'potencia_kw',
        label: 'Potencia',
        clave: 'potencia_kw' as const,
        unidad: ' kW',
    },
]

const decidido = (e: Extraccion, id: string) =>
    e[id]?.estado === 'confirmado' || e[id]?.estado === 'corregido'

/**
 * «Este modelo ya lo conocemos».
 *
 * ── COSA FA ───────────────────────────────────────────────────────────
 *
 * Quando marca e modello sono confermati, chiede al catalogo se di
 * quella macchina sappiamo già SCOP, SCOP in ACS e potenza — perché
 * qualcuno li ha confermati in un fascicolo precedente, guardando la
 * scheda tecnica.
 *
 * Alla ottava Daikin Altherma 3 del mese non c'è niente da leggere.
 *
 * ── PERCHÉ NON RIEMPIE DA SOLO ────────────────────────────────────────
 *
 * Perché non è un fatto, è una proposta. Il catalogo è fatto di
 * revisioni umane, ma resta quello che qualcun altro ha confermato su
 * un'altra macchina con lo stesso nome — e due unità dello stesso
 * modello possono avere taglie diverse.
 *
 * Si mostra, si accetta con un tasto, e il valore accettato resta
 * `corregido`: a nome di chi rivede, non a nome di una tabella. La
 * firma sotto quei numeri è di una persona, e deve restare sua.
 */
export default function EquipoConocido({
    extraccion,
    onAplicar,
}: {
    extraccion: Extraccion
    /** Applica i valori accettati, come se li avesse scritti chi rivede. */
    onAplicar: (valores: Record<string, string>) => void
}) {
    const marca = decidido(extraccion, 'marca')
        ? String(extraccion.marca?.valor ?? '')
        : ''
    const modelo = decidido(extraccion, 'modelo')
        ? String(extraccion.modelo?.valor ?? '')
        : ''

    const [equipo, setEquipo] = useState<Equipo | null>(null)

    useEffect(() => {
        if (!marca || !modelo) {
            setEquipo(null)
            return
        }
        let vivo = true
        fetch(
            `/api/equipos?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`
        )
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (vivo) setEquipo(j?.data ?? null)
            })
            .catch(() => {
                /* senza catalogo si legge la scheda, come sempre */
            })
        return () => {
            vivo = false
        }
    }, [marca, modelo])

    if (!equipo) return null

    // Solo quello che manca ancora: proporre un dato che qualcuno ha
    // appena confermato guardando il documento sarebbe rumore.
    const utiles = DEL_CATALOGO.filter(
        (c) => equipo[c.clave] !== null && !decidido(extraccion, c.id)
    )
    if (utiles.length === 0) return null

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-2xl border border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.05] p-6"
        >
            <div className="flex items-start gap-3.5">
                <Sparkles
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--caes-green)]"
                    strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                    <h2 className="text-[15.5px] font-semibold tracking-[-0.02em]">
                        Este modelo ya lo conocemos
                    </h2>
                    <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                        {equipo.marca} {equipo.modelo}, confirmado en{' '}
                        {equipo.veces === 1
                            ? 'un expediente anterior'
                            : `${equipo.veces} expedientes anteriores`}
                        . No hace falta volver a leer la ficha, pero míralo: dos
                        unidades del mismo modelo pueden ser de potencias distintas.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5">
                        {utiles.map((c) => (
                            <span key={c.id} className="flex items-baseline gap-2">
                                <span className="label-mono text-[var(--caes-faint)]">
                                    {c.label}
                                </span>
                                <span className="font-mono tabular text-[15px] font-medium">
                                    {String(equipo[c.clave]).replace('.', ',')}
                                    {c.unidad}
                                </span>
                            </span>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            onAplicar(
                                Object.fromEntries(
                                    utiles.map((c) => [c.id, String(equipo[c.clave])])
                                )
                            )
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--caes-green)] px-4 py-2 text-[13.5px] font-medium text-[var(--caes-green)] transition-colors hover:bg-[var(--caes-green)] hover:text-[var(--caes-paper)]"
                    >
                        Usar {utiles.length === 1 ? 'este dato' : 'estos datos'}
                    </button>
                </div>
            </div>
        </motion.section>
    )
}

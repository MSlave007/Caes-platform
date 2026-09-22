'use client'

import { useEffect, useState } from 'react'
import { ScanLine } from 'lucide-react'

type ResumenCampo = {
    campo: string
    etiqueta: string
    total: number
    aciertos: number
    precision: number | null
    confianzaMedia: number | null
}

/**
 * Come sta andando la lettura automatica.
 *
 * ── PERCHÉ È QUI E NON IN UNA PAGINA SUA ──────────────────────────────
 *
 * Perché non è una dashboard: è un dato che si guarda ogni tanto per
 * decidere una cosa sola — se una soglia va alzata o abbassata. Una
 * pagina propria sarebbe una voce di menù in più per qualcosa che si
 * apre una volta al mese.
 *
 * ── PERCHÉ IL PRIMO GIORNO NON È VUOTO ────────────────────────────────
 *
 * Perché uno schermo vuoto non dice se è rotto o se non è ancora
 * successo niente, e sono due cose diverse. Qui c'è scritto che si
 * riempie da solo rivedendo, e da quel momento non si guarda più finché
 * non serve.
 */
export default function ComoLee() {
    const [datos, setDatos] = useState<ResumenCampo[] | null>(null)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        let vivo = true
        fetch('/api/lecturas')
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!vivo) return
                setDatos(j?.data ?? [])
                setTotal(j?.total ?? 0)
            })
            .catch(() => {
                if (vivo) setDatos([])
            })
        return () => {
            vivo = false
        }
    }, [])

    if (datos === null) return null

    return (
        <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
            <div className="flex items-center gap-2.5">
                <ScanLine
                    className="h-4 w-4 text-[var(--caes-mut)]"
                    strokeWidth={1.8}
                />
                <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                    Cómo va la lectura automática
                </h2>
            </div>

            {total === 0 ? (
                <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                    Todavía no hay lecturas que medir. Esto se llena solo: cada vez
                    que confirmas o corriges un campo en una revisión queda anotado
                    si el modelo había acertado. Con unas semanas de trabajo sabrás
                    en qué campos puedes fiarte y en cuáles no.
                </p>
            ) : (
                <>
                    <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                        Sobre {total} {total === 1 ? 'lectura' : 'lecturas'} que alguien
                        ha confirmado o corregido. Los peores arriba: son los que
                        piden decisión. Un campo que el modelo siempre acierta no
                        pide nada.
                    </p>

                    <ul className="mt-6 flex flex-col divide-y divide-[var(--caes-line-2)]">
                        {datos.slice(0, 12).map((d) => (
                            <li
                                key={d.campo}
                                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0"
                            >
                                <span className="min-w-0 text-[14px]">{d.etiqueta}</span>

                                <span className="flex shrink-0 items-baseline gap-5">
                                    {d.confianzaMedia !== null && (
                                        <span className="text-[12.5px] text-[var(--caes-faint)]">
                                            dice {d.confianzaMedia.toLocaleString('es-ES')}
                                        </span>
                                    )}
                                    <span className="font-mono tabular text-[14px] font-medium">
                                        {/*
                                            Sotto il minimo si mostrano i conti
                                            grezzi: con tre letture una
                                            percentuale e rumore con la virgola,
                                            e farebbe cambiare una soglia per
                                            due casi sfortunati.
                                        */}
                                        {d.precision === null
                                            ? `${d.aciertos}/${d.total}`
                                            : `${d.precision.toLocaleString('es-ES')} %`}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}

'use client'

import { AlertTriangle, Ban } from 'lucide-react'

/**
 * Quello che impedisce di approvare.
 *
 * ── COS'ERA E PERCHÉ NON ANDAVA ───────────────────────────────────────
 *
 * Una fascia arancione con dentro una frase sola: «Falta documentación
 * obligatoria: Fotos del equipo instalado (0 de 3), Foto de dónde estaba
 * el equipo anterior, Resguardo del registro del RITE, Certificado…».
 * Tutto dello stesso peso, su due righe, separato da virgole. Per sapere
 * quante cose mancano bisognava contarle a mano, e per sapere quali
 * bisognava leggere una riga di prosa fino in fondo.
 *
 * ── COME FUNZIONA ADESSO ──────────────────────────────────────────────
 *
 * Una riga in grassetto che dice IL PROBLEMA in tre parole — «Faltan 6
 * documentos» — e sotto l'elenco come cose separate, una accanto
 * all'altra, che si contano con l'occhio.
 *
 * E due livelli diversi, perché sono problemi diversi:
 *
 *   BLOCCO    il fascicolo non è recuperabile così com'è (sotto il 20 %
 *             minimo di legge). Rosso, perché non è una cosa da fare:
 *             è una cosa che non si può fare
 *   MANCANZA  manca qualcosa che può arrivare. Ambra, perché è lavoro
 *             da fare, non una condanna
 *
 * Distinguerli conta: chiedere all'installatore sei foto è una
 * telefonata, dirgli che la pratica non è ammissibile è un'altra.
 */

export type Aviso = {
    tipo: 'bloqueo' | 'falta'
    /** Tre-cinque parole. È quello che si legge per primo. */
    titulo: string
    /** Una frase di contesto. Facoltativa. */
    detalle?: string
    /** Le cose che mancano, una per etichetta. */
    piezas?: string[]
}

export default function Avisos({ avisos }: { avisos: Aviso[] }) {
    if (avisos.length === 0) return null

    return (
        <div className="flex flex-col gap-3">
            {avisos.map((a, i) => {
                const bloqueo = a.tipo === 'bloqueo'
                return (
                    <div
                        key={i}
                        role="status"
                        className={`flex gap-4 rounded-2xl border p-5 ${bloqueo
                            ? 'border-[#C4643F]/45 bg-[#C4643F]/[.06]'
                            : 'border-[#D9A94F]/55 bg-[#D9A94F]/[.08]'
                            }`}
                    >
                        <span
                            className={`mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bloqueo ? 'bg-[#C4643F]/15 text-[#9B4526]' : 'bg-[#D9A94F]/25 text-[#8A5B0B]'
                                }`}
                        >
                            {bloqueo ? (
                                <Ban className="h-3.5 w-3.5" strokeWidth={2.2} />
                            ) : (
                                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
                            )}
                        </span>

                        <div className="min-w-0 flex-1">
                            <p
                                className={`text-[14.5px] font-semibold tracking-[-0.014em] ${bloqueo ? 'text-[#7A3418]' : 'text-[#6F4708]'
                                    }`}
                            >
                                {a.titulo}
                            </p>

                            {a.detalle && (
                                <p
                                    className={`mt-1.5 max-w-[68ch] text-[13.5px] leading-[1.55] ${bloqueo ? 'text-[#8A4526]' : 'text-[#7A5A16]'
                                        }`}
                                >
                                    {a.detalle}
                                </p>
                            )}

                            {/* Separate, non in fila con le virgole: cosi si
                                contano con l'occhio invece di leggerle. */}
                            {a.piezas && a.piezas.length > 0 && (
                                <ul className="mt-3.5 flex flex-wrap gap-1.5">
                                    {a.piezas.map((t) => (
                                        <li
                                            key={t}
                                            className={`rounded-full border px-2.5 py-1 text-[12.5px] ${bloqueo
                                                ? 'border-[#C4643F]/35 bg-[#FBF3EF] text-[#8A4526]'
                                                : 'border-[#D9A94F]/45 bg-[#FCF7EC] text-[#7A5A16]'
                                                }`}
                                        >
                                            {t}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

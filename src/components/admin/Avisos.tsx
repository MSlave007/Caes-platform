'use client'

import { AlertTriangle, ArrowDown, Ban } from 'lucide-react'

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

export type Pieza = {
    texto: string
    /**
     * L'id dell'elemento a cui porta, se c'è.
     *
     * Senza, la pastiglia resta un'etichetta e si veste da etichetta.
     * Con, diventa un bottone vero — perché il difetto peggiore di
     * prima era proprio questo: bordo tondo e imbottitura identici ai
     * bottoni due centimetri sopra, e cliccandole non succedeva niente.
     */
    ancla?: string
}

export type Aviso = {
    tipo: 'bloqueo' | 'falta'
    /** Tre-cinque parole. È quello che si legge per primo. */
    titulo: string
    /** Una frase di contesto. Facoltativa. */
    detalle?: string
    /** Le cose che mancano, una per etichetta. */
    piezas?: Pieza[]
    /**
     * Chi deve muoversi.
     *
     * È la differenza che due riquadri dello stesso ambra non
     * riuscivano a dire: «mancano sette documenti» è una telefonata
     * all'installatore, «due controlli non tornano» è una cosa da
     * guardare adesso. Scritto, si capisce senza interpretare una
     * tinta.
     */
    quien?: 'instalador' | 'tu'
}

/** Porta all'elemento e lo fa notare per un attimo. */
function irA(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Un lampo, non una selezione permanente: dice «è questo» e sparisce.
    el.animate(
        [
            { boxShadow: '0 0 0 0 rgba(217,169,79,0)' },
            { boxShadow: '0 0 0 4px rgba(217,169,79,.55)' },
            { boxShadow: '0 0 0 0 rgba(217,169,79,0)' },
        ],
        { duration: 1400, easing: 'ease-out' }
    )
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
                            ? 'border-[var(--caes-bloqueo)]/45 bg-[var(--caes-bloqueo)]/[.06]'
                            : 'border-[var(--caes-falta)]/55 bg-[var(--caes-falta)]/[.08]'
                            }`}
                    >
                        <span
                            className={`mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bloqueo ? 'bg-[var(--caes-bloqueo)]/15 text-[var(--caes-bloqueo-ink)]' : 'bg-[var(--caes-falta)]/25 text-[var(--caes-falta-ink)]'
                                }`}
                        >
                            {bloqueo ? (
                                <Ban className="h-3.5 w-3.5" strokeWidth={2.2} />
                            ) : (
                                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
                            )}
                        </span>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <p
                                    className={`text-[14.5px] font-semibold tracking-[-0.014em] ${bloqueo ? 'text-[var(--caes-bloqueo-deep)]' : 'text-[var(--caes-falta-deep)]'
                                        }`}
                                >
                                    {a.titulo}
                                </p>
                                {a.quien && (
                                    <span
                                        className={`label-mono shrink-0 ${bloqueo ? 'text-[var(--caes-bloqueo-ink)]/70' : 'text-[var(--caes-falta-ink)]/70'
                                            }`}
                                    >
                                        {a.quien === 'tu'
                                            ? 'Lo miras tú'
                                            : 'Lo trae el instalador'}
                                    </span>
                                )}
                            </div>

                            {a.detalle && (
                                <p
                                    className={`mt-1.5 max-w-[68ch] text-[13.5px] leading-[1.55] ${bloqueo ? 'text-[var(--caes-bloqueo-ink)]' : 'text-[var(--caes-falta-ink)]'
                                        }`}
                                >
                                    {a.detalle}
                                </p>
                            )}

                            {/* Separate, non in fila con le virgole: cosi si
                                contano con l'occhio invece di leggerle. */}
                            {a.piezas && a.piezas.length > 0 && (
                                <ul className="mt-3.5 flex flex-wrap gap-1.5">
                                    {a.piezas.map((p) => {
                                        const tono = bloqueo
                                            ? 'border-[var(--caes-bloqueo)]/35 bg-[var(--caes-bloqueo-bg)] text-[var(--caes-bloqueo-ink)]'
                                            : 'border-[var(--caes-falta)]/45 bg-[var(--caes-falta-bg)] text-[var(--caes-falta-ink)]'

                                        // Con un'ancora è un bottone e si
                                        // comporta come tale; senza, è
                                        // un'etichetta e si veste piatta,
                                        // senza bordo, così non promette un
                                        // clic che non c'è.
                                        return (
                                            <li key={p.texto}>
                                                {p.ancla ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => irA(p.ancla!)}
                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--caes-ink)] ${tono}`}
                                                    >
                                                        {p.texto}
                                                        <ArrowDown
                                                            className="h-3 w-3 opacity-60"
                                                            strokeWidth={2.2}
                                                        />
                                                    </button>
                                                ) : (
                                                    <span
                                                        className={`inline-block rounded-md px-2 py-1 text-[12.5px] ${bloqueo
                                                            ? 'bg-[var(--caes-bloqueo-bg)] text-[var(--caes-bloqueo-ink)]'
                                                            : 'bg-[var(--caes-falta-bg)] text-[var(--caes-falta-ink)]'
                                                            }`}
                                                    >
                                                        {p.texto}
                                                    </span>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

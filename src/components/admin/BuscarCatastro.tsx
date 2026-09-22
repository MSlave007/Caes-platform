'use client'

import { useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import type { Localizacion } from '@/lib/caes/catastro'

/**
 * I dati del Catastro, senza andare sul portale.
 *
 * ── COSA TOGLIE DI MEZZO ──────────────────────────────────────────────
 *
 * Cinque campi del Convenio — referencia, huso, X, Y, località — che
 * oggi si cercano a mano, in un'altra finestra, per ogni espediente. E
 * con loro la provincia e la comunità, che escono dal codice postale.
 *
 * ── PERCHÉ CHIEDE LA REFERENCIA E NON L'INDIRIZZO ─────────────────────
 *
 * Perché dall'indirizzo il Catastro non risponde in modo affidabile:
 * vuole la sigla della via e il nome esatto come li scrive lui, e
 * quello che abbiamo è testo libero da una fattura. Un aiuto che
 * sbaglia una volta su tre non si usa, si scavalca.
 *
 * La referencia invece è esatta, e non è un dato in più da chiedere:
 * sta sul **certificato energetico**, che il fascicolo già richiede, e
 * sulla ricevuta dell'IBI del cliente.
 *
 * ── PERCHÉ MOSTRA L'INDIRIZZO CHE TORNA ───────────────────────────────
 *
 * Perché una referencia sbagliata di una cifra è una referencia valida
 * di un'altra casa. Il Catastro risponderebbe lo stesso, con le
 * coordinate di un posto che non c'entra, e il Convenio uscirebbe
 * perfetto e falso. Far vedere l'indirizzo che è tornato è l'unico modo
 * di accorgersene prima di firmare.
 */
export default function BuscarCatastro({
    sugerida,
    onEncontrado,
}: {
    /** Se l'estrazione l'ha già letta da qualche parte, si parte da lì. */
    sugerida?: string
    /** I valori trovati, pronti da mettere nei buchi. */
    onEncontrado: (datos: Localizacion) => void
}) {
    const [rc, setRc] = useState(sugerida ?? '')
    const [buscando, setBuscando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hallado, setHallado] = useState<Localizacion | null>(null)

    const buscar = async () => {
        if (buscando || rc.trim().length < 14) return
        setBuscando(true)
        setError(null)
        setHallado(null)
        try {
            const r = await fetch(`/api/catastro?rc=${encodeURIComponent(rc.trim())}`)
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido consultar.')
                return
            }
            setHallado(j.data)
        } catch {
            setError('No se ha podido consultar el Catastro.')
        } finally {
            setBuscando(false)
        }
    }

    return (
        <div className="rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5">
            <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[var(--caes-mut)]" strokeWidth={1.8} />
                <h4 className="text-[14px] font-semibold tracking-[-0.016em]">
                    Traerlo del Catastro
                </h4>
            </div>
            <p className="mt-1.5 max-w-[64ch] text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                Con la referencia catastral salen la localidad, la provincia, la
                comunidad, el huso y las dos coordenadas. Está en el certificado
                energético del expediente y en el recibo del IBI del cliente.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <input
                    value={rc}
                    onChange={(e) => setRc(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            void buscar()
                        }
                    }}
                    placeholder="0000000XX0000X0000XX"
                    spellCheck={false}
                    className="w-[24ch] rounded-[6px] border border-[var(--caes-line)] bg-white px-3 py-2 font-mono text-[13px] uppercase tracking-[.04em] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]"
                />
                <button
                    type="button"
                    onClick={() => void buscar()}
                    disabled={buscando || rc.trim().length < 14}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] transition-colors hover:border-[var(--caes-ink)]/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {buscando ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Search className="h-3.5 w-3.5" />
                    )}
                    Buscar
                </button>
            </div>

            {error && (
                <p className="mt-3 rounded-lg border border-[var(--caes-mal)]/40 bg-[var(--caes-mal-bg)] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-[var(--caes-mal)]">
                    {error}
                </p>
            )}

            {hallado && (
                <div className="mt-4 rounded-lg border border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.05] p-4">
                    {/* Prima l'indirizzo, e in grande: è quello che dice se
                        è la casa giusta. Le coordinate non lo dicono a
                        nessuno — nessuno riconosce la sua casa da una X. */}
                    <p className="text-[13.5px] font-medium leading-[1.45]">
                        {hallado.direccion ?? 'Encontrado'}
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-[var(--caes-mut)]">
                        {[hallado.localidad, hallado.provincia, hallado.ccaa]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                    <p className="mt-2 font-mono text-[11.5px] tabular text-[var(--caes-faint)]">
                        Huso {hallado.utm_huso} · X {hallado.utm_x} · Y {hallado.utm_y}
                    </p>

                    <p className="mt-3.5 text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                        ¿Es esta la vivienda del expediente? Una referencia con una
                        cifra cambiada es la de otra casa, y el Catastro contesta
                        igual.
                    </p>

                    <button
                        type="button"
                        onClick={() => onEncontrado(hallado)}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--caes-green)] px-4 py-2 text-[13px] font-medium text-[var(--caes-green)] transition-colors hover:bg-[var(--caes-green)] hover:text-[var(--caes-paper)]"
                    >
                        Sí, usar estos datos
                    </button>
                </div>
            )}
        </div>
    )
}

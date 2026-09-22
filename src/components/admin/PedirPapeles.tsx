'use client'

import { useState } from 'react'
import { Check, Copy, Link2, Loader2, MessageCircle, Trash2 } from 'lucide-react'

/**
 * «Pídeselos con un enlace».
 *
 * ── COSA SOSTITUISCE ──────────────────────────────────────────────────
 *
 * Il giro di oggi: chi rivede scrive «faltan 7 documentos», l'installatore
 * riceve la notifica, entra, cerca il suo espediente fra quaranta, e
 * mette ogni file nella casella giusta. Se sbaglia casella — e sbaglia
 * spesso — si ricomincia.
 *
 * Con questo: un link su WhatsApp, lui molla tutto in un colpo, e il
 * modello smista.
 *
 * ── PERCHÉ IL MESSAGGIO È GIÀ SCRITTO ─────────────────────────────────
 *
 * Stesso motivo del motivo di richiesta modifiche: quel messaggio è
 * l'unica cosa su cui l'installatore agisce. Scritto da noi una volta e
 * bene, dice anche la cosa che conta di più — che non deve ordinare
 * niente.
 */
export default function PedirPapeles({
    expedienteId,
    faltan,
    tokenActual,
    caducaActual,
}: {
    expedienteId: string
    /** Le etichette di quello che manca, per scrivere la nota da solo. */
    faltan: string[]
    tokenActual?: string | null
    caducaActual?: string | null
}) {
    const [token, setToken] = useState<string | null>(tokenActual ?? null)
    const [caduca, setCaduca] = useState<string | null>(caducaActual ?? null)
    const [nota, setNota] = useState(
        faltan.length > 0 ? `Faltan: ${faltan.join(', ')}.` : ''
    )
    const [ocupado, setOcupado] = useState(false)
    const [copiado, setCopiado] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const enlace =
        token && typeof window !== 'undefined'
            ? `${window.location.origin}/subida/${token}`
            : ''

    const crear = async () => {
        setOcupado(true)
        setError(null)
        try {
            const r = await fetch('/api/subida', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: expedienteId, nota }),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido crear.')
                return
            }
            setToken(j.data.subida_token)
            setCaduca(j.data.subida_caduca)
        } catch {
            setError('No se ha podido crear el enlace.')
        } finally {
            setOcupado(false)
        }
    }

    const revocar = async () => {
        setOcupado(true)
        try {
            await fetch(`/api/subida?id=${encodeURIComponent(expedienteId)}`, {
                method: 'DELETE',
            })
            setToken(null)
            setCaduca(null)
        } finally {
            setOcupado(false)
        }
    }

    const texto = `Hola, para terminar el expediente me faltan unos papeles. Súbelos aquí, todos juntos y sin ordenar — ya los colocamos nosotros:\n\n${enlace}\n\n${nota}`

    return (
        <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6">
            <div className="flex items-center gap-2.5">
                <Link2 className="h-4 w-4 text-[var(--caes-mut)]" strokeWidth={1.8} />
                <h3 className="text-[15px] font-semibold tracking-[-0.018em]">
                    Pedirle los papeles con un enlace
                </h3>
            </div>
            <p className="mt-1.5 max-w-[64ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                Lo abre sin entrar, suelta todo de golpe y el lector los reparte por
                su casilla. No tiene que acertar ninguna — que es donde se equivoca.
            </p>

            {!token ? (
                <>
                    <label
                        htmlFor="nota-subida"
                        className="mt-5 block text-[13px] font-medium"
                    >
                        Qué le dices
                    </label>
                    <textarea
                        id="nota-subida"
                        rows={2}
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        className="mt-2 w-full resize-y rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 text-[13.5px] leading-[1.5] outline-none transition-colors focus:border-[var(--caes-green)]"
                    />
                    <p className="mt-1.5 text-[12px] text-[var(--caes-faint)]">
                        Es lo único identificable que sale en esa página: ni el
                        cliente, ni la dirección, ni el dinero.
                    </p>

                    <button
                        type="button"
                        onClick={() => void crear()}
                        disabled={ocupado}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                        {ocupado ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Link2 className="h-3.5 w-3.5" />
                        )}
                        Crear el enlace
                    </button>
                </>
            ) : (
                <>
                    <p className="mt-4 overflow-x-auto rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-4 py-3 font-mono text-[12.5px] text-[var(--caes-mut)]">
                        {enlace}
                    </p>
                    {caduca && (
                        <p className="mt-2 text-[12px] text-[var(--caes-faint)]">
                            Caduca el{' '}
                            {new Intl.DateTimeFormat('es-ES', {
                                day: 'numeric',
                                month: 'long',
                            }).format(new Date(caduca))}
                            . Después deja de funcionar solo.
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(texto)
                                    setCopiado(true)
                                    window.setTimeout(() => setCopiado(false), 2200)
                                } catch {
                                    /* resta il testo da selezionare */
                                }
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] transition-colors hover:border-[var(--caes-ink)]/40"
                        >
                            {copiado ? (
                                <>
                                    <Check
                                        className="h-3.5 w-3.5 text-[var(--caes-green)]"
                                        strokeWidth={3}
                                    />
                                    Copiado
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar mensaje
                                </>
                            )}
                        </button>

                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-4 py-2 text-[13px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                        </a>

                        {/* Revocare sta accanto e non nascosto: se il link
                            e finito dove non doveva, i secondi contano. */}
                        <button
                            type="button"
                            onClick={() => void revocar()}
                            disabled={ocupado}
                            className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-mal)] hover:underline disabled:opacity-40"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Anularlo
                        </button>
                    </div>
                </>
            )}

            {error && (
                <p className="mt-3 text-[12.5px] text-[var(--caes-mal)]">{error}</p>
            )}
        </section>
    )
}

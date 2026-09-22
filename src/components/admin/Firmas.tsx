'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, PenLine, Trash2, X } from 'lucide-react'
import Firmar from '@/components/firma/Firmar'

type FirmaPuesta = {
    rol: string
    nombre: string
    metodo: string
    cuando: string
}

type Estado = {
    congelado?: string
    huella?: string
    /** `null` quando non si è potuto ricalcolare: non è «sì». */
    coincide: boolean | null
    firmas: FirmaPuesta[]
    /** Chi manca, e con che nome lo chiama il documento. */
    faltan: { rol: string; nombre: string }[]
}

const METODOS: Record<string, string> = {
    trazo: 'trazo a mano',
    escrito: 'nombre escrito',
    guardada: 'firma guardada',
}

/**
 * Le firme di un documento.
 *
 * ── LA RIGA CHE GIUSTIFICA TUTTO IL RESTO ─────────────────────────────
 *
 * «Los datos han cambiado desde que se firmó».
 *
 * Il resto — chi, quando, con che metodo — lo mostra qualunque elenco.
 * Quella riga no: per scriverla bisogna ricomporre il documento con i
 * dati di adesso e confrontarne l'impronta con quella salvata alla
 * firma. È il motivo per cui il PDF si ricompone identico, ed è la
 * differenza fra dire «ha firmato» e sapere COSA ha firmato.
 *
 * Non blocca niente: a volte un dato va davvero corretto dopo. Ma chi
 * manda il fascicolo deve saperlo prima, non dopo.
 */
export default function Firmas({
    expedienteId,
    plantillaId,
    completo,
}: {
    expedienteId: string
    plantillaId: string
    /** Falso quando mancano dati: un borrador non si firma. */
    completo: boolean
}) {
    const [estado, setEstado] = useState<Estado | null>(null)
    const [firmando, setFirmando] = useState<string | null>(null)
    const [ocupado, setOcupado] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const cargar = useCallback(async () => {
        try {
            const r = await fetch(
                `/api/firmas?id=${encodeURIComponent(expedienteId)}&plantilla=${plantillaId}`
            )
            const j = await r.json()
            setEstado(r.ok ? j.data : { coincide: null, firmas: [], faltan: [] })
        } catch {
            setEstado({ coincide: null, firmas: [], faltan: [] })
        }
    }, [expedienteId, plantillaId])

    useEffect(() => {
        void cargar()
    }, [cargar])

    const firmar = async (
        rol: string,
        firma: { png: string; nombre: string; metodo: string }
    ) => {
        setOcupado(true)
        setError(null)
        try {
            const r = await fetch('/api/firmas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: expedienteId, plantilla: plantillaId, rol, ...firma }),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido firmar.')
                return
            }
            setFirmando(null)
            await cargar()
        } catch {
            setError('No se ha podido firmar.')
        } finally {
            setOcupado(false)
        }
    }

    const quitar = async (rol: string) => {
        setOcupado(true)
        try {
            await fetch(
                `/api/firmas?id=${encodeURIComponent(expedienteId)}` +
                    `&plantilla=${plantillaId}&rol=${encodeURIComponent(rol)}`,
                { method: 'DELETE' }
            )
            await cargar()
        } finally {
            setOcupado(false)
        }
    }

    if (!estado) {
        return (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--caes-line)] px-5 py-4 text-[13px] text-[var(--caes-mut)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando las firmas…
            </div>
        )
    }

    return (
        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6 print:hidden">
            <div>
                <h3 className="text-[15px] font-semibold tracking-[-0.018em]">Firmas</h3>
                <p className="mt-1.5 max-w-[64ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                    Firma electrónica simple. Se guarda quién, cuándo, desde dónde y la
                    huella del documento exacto que se firmó — y todo eso sale impreso
                    en la última página del PDF.
                </p>
            </div>

            {/* ── la riga che conta ────────────────────────────────── */}
            {estado.firmas.length > 0 && estado.coincide === false && (
                <p className="flex items-start gap-2.5 rounded-xl border border-[var(--caes-bloqueo)] bg-[var(--caes-bloqueo-bg)] px-4 py-3 text-[13px] leading-[1.5] text-[var(--caes-bloqueo-deep)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        <strong className="font-semibold">
                            Los datos han cambiado desde que se firmó.
                        </strong>{' '}
                        El documento ya no es el que firmaron. Si el cambio era
                        necesario, quita las firmas y vuelve a pedirlas.
                    </span>
                </p>
            )}
            {estado.firmas.length > 0 && estado.coincide === null && (
                <p className="flex items-start gap-2.5 rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3 text-[13px] leading-[1.5] text-[var(--caes-falta-deep)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    No se ha podido comprobar si el documento sigue siendo el que se
                    firmó. Vuelve a abrir esta pantalla.
                </p>
            )}

            {/* ── chi ha già firmato ───────────────────────────────── */}
            {estado.firmas.length > 0 && (
                <ul className="flex flex-col gap-px overflow-hidden rounded-xl border border-[var(--caes-line)] bg-[var(--caes-line)]">
                    {estado.firmas.map((f) => (
                        <li
                            key={f.rol}
                            className="flex flex-wrap items-center justify-between gap-3 bg-[var(--caes-paper)] px-4 py-3"
                        >
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-[13.5px] font-medium">
                                    <Check
                                        className="h-3.5 w-3.5 shrink-0 text-[var(--caes-green)]"
                                        strokeWidth={3}
                                    />
                                    {f.nombre}
                                    <span className="font-normal text-[var(--caes-mut)]">
                                        · {f.rol}
                                    </span>
                                </p>
                                <p className="mt-0.5 pl-[22px] text-[12px] text-[var(--caes-faint)]">
                                    {f.cuando} · {METODOS[f.metodo] ?? f.metodo}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void quitar(f.rol)}
                                disabled={ocupado}
                                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-mal)] hover:underline disabled:opacity-40"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Quitarla
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* ── chi manca ────────────────────────────────────────── */}
            {estado.faltan.length === 0 ? (
                <p className="text-[13px] text-[var(--caes-green)]">
                    Está firmado por todas las partes.
                </p>
            ) : !completo ? (
                // La ragione, non solo il divieto: senza, «Firmar» sparisce
                // e non si capisce se manca una funzione o manca un dato.
                <p className="text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                    Todavía faltan datos en el documento, así que no se puede firmar.
                    Un borrador no se firma.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {estado.faltan.map(({ rol, nombre }) =>
                        firmando === rol ? (
                            <div key={rol} className="flex flex-col gap-2">
                                <Firmar
                                    rol={rol}
                                    nombreSugerido={nombre}
                                    ocupado={ocupado}
                                    error={error}
                                    onFirmar={(f) => void firmar(rol, f)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFirmando(null)}
                                    className="inline-flex items-center gap-1.5 self-start text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Dejarlo
                                </button>
                            </div>
                        ) : (
                            <button
                                key={rol}
                                type="button"
                                onClick={() => {
                                    setError(null)
                                    setFirmando(rol)
                                }}
                                className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-[var(--caes-line)] px-4 py-3.5 text-left transition-colors hover:border-[var(--caes-ink)]/40 hover:bg-[var(--caes-band)]"
                            >
                                <span className="text-[13.5px]">
                                    Falta la firma de{' '}
                                    <strong className="font-medium">{rol}</strong>
                                </span>
                                <span className="inline-flex shrink-0 items-center gap-2 text-[12.5px] text-[var(--caes-mut)]">
                                    <PenLine className="h-3.5 w-3.5" />
                                    Firmar ahora
                                </span>
                            </button>
                        )
                    )}
                </div>
            )}
        </section>
    )
}

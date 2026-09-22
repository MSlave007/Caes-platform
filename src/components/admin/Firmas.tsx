'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    AlertTriangle,
    Check,
    Copy,
    Link2,
    Loader2,
    MessageCircle,
    PenLine,
    Trash2,
    X,
} from 'lucide-react'
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
    /** Il link mandato e non ancora usato, se è di questo documento. */
    enlace?: { token: string; caduca: string | null; rol: string } | null
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
    const [copiado, setCopiado] = useState(false)
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

    const pedirPorEnlace = async (rol: string) => {
        setOcupado(true)
        setError(null)
        try {
            const r = await fetch('/api/firma-enlace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: expedienteId, plantilla: plantillaId, rol }),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido crear el enlace.')
                return
            }
            await cargar()
        } catch {
            setError('No se ha podido crear el enlace.')
        } finally {
            setOcupado(false)
        }
    }

    const anularEnlace = async () => {
        setOcupado(true)
        try {
            await fetch(`/api/firma-enlace?id=${encodeURIComponent(expedienteId)}`, {
                method: 'DELETE',
            })
            await cargar()
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

            {/* ── il link mandato e non ancora usato ───────────────── */}
            {estado.enlace && <EnlacePendiente
                enlace={estado.enlace}
                ocupado={ocupado}
                copiado={copiado}
                onCopiar={setCopiado}
                onAnular={() => void anularEnlace()}
            />}

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
                            <div
                                key={rol}
                                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-dashed border-[var(--caes-line)] px-4 py-3.5"
                            >
                                <span className="text-[13.5px]">
                                    Falta la firma de{' '}
                                    <strong className="font-medium">{rol}</strong>
                                </span>

                                {/**
                                  * Due modi, perché sono due situazioni.
                                  *
                                  * L'installatore è a casa del cliente e gli
                                  * passa il telefono; oppure il cliente è a
                                  * casa sua e gli arriva un messaggio. Il
                                  * secondo è quello per cui di solito si paga
                                  * una piattaforma.
                                  */}
                                <span className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError(null)
                                            setFirmando(rol)
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-3.5 py-2 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                                    >
                                        <PenLine className="h-3.5 w-3.5" />
                                        Firmar aquí
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void pedirPorEnlace(rol)}
                                        disabled={ocupado || Boolean(estado.enlace)}
                                        title={
                                            estado.enlace
                                                ? 'Ya hay un enlace de firma en marcha en este expediente'
                                                : undefined
                                        }
                                        className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                        Mandarle el enlace
                                    </button>
                                </span>
                            </div>
                        )
                    )}
                </div>
            )}
        </section>
    )
}

/**
 * Il link mandato e non ancora usato.
 *
 * Con il messaggio già scritto: quel messaggio è l'unica cosa su cui il
 * cliente agisce, e scriverlo ogni volta a mano vuol dire scriverlo ogni
 * volta un po' peggio.
 *
 * «Anularlo» sta accanto e non nascosto: se il link è finito dove non
 * doveva, i secondi contano.
 */
function EnlacePendiente({
    enlace,
    ocupado,
    copiado,
    onCopiar,
    onAnular,
}: {
    enlace: { token: string; caduca: string | null; rol: string }
    ocupado: boolean
    copiado: boolean
    onCopiar: (v: boolean) => void
    onAnular: () => void
}) {
    const url =
        typeof window !== 'undefined'
            ? `${window.location.origin}/firma/${enlace.token}`
            : ''

    const texto =
        'Hola, ya está listo el documento para firmar. Puedes leerlo y firmarlo ' +
        `desde aquí, desde el móvil, sin registrarte:\n\n${url}`

    return (
        <div className="rounded-xl border border-[var(--caes-falta)]/50 bg-[var(--caes-falta-bg)] p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--caes-falta-deep)]">
                <Link2 className="h-3.5 w-3.5" />
                Enlace de firma en marcha · {enlace.rol}
            </p>
            <p className="mt-2.5 overflow-x-auto rounded-lg border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-3.5 py-2.5 font-mono text-[12px] text-[var(--caes-mut)]">
                {url}
            </p>
            {enlace.caduca && (
                <p className="mt-2 text-[12px] text-[var(--caes-faint)]">
                    Caduca el{' '}
                    {new Intl.DateTimeFormat('es-ES', {
                        day: 'numeric',
                        month: 'long',
                    }).format(new Date(enlace.caduca))}
                    . Y deja de funcionar en cuanto firme.
                </p>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(texto)
                            onCopiar(true)
                            window.setTimeout(() => onCopiar(false), 2200)
                        } catch {
                            /* resta il testo da selezionare */
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-2 text-[13px] transition-colors hover:border-[var(--caes-ink)]/40"
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

                <button
                    type="button"
                    onClick={onAnular}
                    disabled={ocupado}
                    className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-mal)] hover:underline disabled:opacity-40"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Anularlo
                </button>
            </div>
        </div>
    )
}

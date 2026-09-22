'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, WifiOff } from 'lucide-react'

/**
 * Caricare dei dati, e dire la verità quando non si può.
 *
 * ── COS'ERA E PERCHÉ NON ANDAVA ───────────────────────────────────────
 *
 * Nove schermate avevano lo stesso identico pezzo di codice:
 *
 *     fetch(...).then(setDatos).catch((e) => console.error(e))
 *              .finally(() => setCargando(false))
 *
 * `console.error` vuol dire: l'errore finisce in una console che nessuno
 * ha aperta, e chi guarda resta davanti a una lista vuota o a un
 * «Cargando…» che non finisce mai. Senza rete la piattaforma non diceva
 * che era senza rete: diceva che non c'era niente.
 *
 * È la differenza fra «non hai espedientes» e «non sono riuscito a
 * chiederli», e per chi guarda sono due notizie opposte.
 *
 * ── PERCHÉ UN PEZZO SOLO ──────────────────────────────────────────────
 *
 * Perché nove copie dello stesso difetto si correggono nove volte, e
 * l'undicesima schermata lo ricopia comunque. Il posto dove si carica
 * qualcosa è uno, e la cortesia di dire cos'è andato storto sta lì
 * dentro.
 */

export type Carga<T> = {
    datos: T | null
    cargando: boolean
    error: string | null
    /** Riprova. È l'unica cosa sensata da offrire dopo un errore di rete. */
    recargar: () => void
}

export function useCarga<T>(url: string | null): Carga<T> {
    const [intento, setIntento] = useState(0)
    /**
     * Il risultato viaggia con la chiave per cui è stato chiesto.
     *
     * Così «sto ancora caricando» si RICAVA — il risultato non è di
     * questa chiave — invece di essere assegnato all'inizio
     * dell'effetto. Un `setCargando(true)` lì dentro è un setState
     * sincrono: un render in più a ogni giro, e il lint lo dice.
     */
    const clave = `${url}#${intento}`
    const [res, setRes] = useState<{
        clave: string
        datos: T | null
        error: string | null
    } | null>(null)

    const recargar = useCallback(() => setIntento((n) => n + 1), [])

    useEffect(() => {
        if (!url) return
        let vivo = true

        fetch(url)
            .then(async (r) => {
                const j = await r.json().catch(() => null)
                if (!r.ok) {
                    // Il messaggio del server quando c'è: sa cos'è
                    // successo meglio di qualunque frase generica.
                    throw new Error(j?.error ?? `El servidor ha contestado ${r.status}.`)
                }
                return j
            })
            .then((j) => {
                if (vivo) setRes({ clave, datos: (j?.data ?? j) as T, error: null })
            })
            .catch((e: unknown) => {
                if (!vivo) return
                setRes({
                    clave,
                    datos: null,
                    error:
                        e instanceof Error && e.message
                            ? e.message
                            : 'No se ha podido cargar. Puede ser la conexión.',
                })
            })

        return () => {
            vivo = false
        }
    }, [url, clave])

    const mio = res?.clave === clave ? res : null
    return {
        datos: mio?.datos ?? null,
        cargando: url !== null && mio === null,
        error: mio?.error ?? null,
        recargar,
    }
}

/**
 * Quello che si mostra mentre si carica, e quando non si è potuto.
 *
 * Restituisce `null` quando è tutto a posto, così chi chiama scrive:
 *
 *     const aviso = <Estado {...carga} que="tus expedientes" />
 *     if (aviso) return aviso
 */
export function Estado({
    cargando,
    error,
    recargar,
    que,
}: {
    cargando: boolean
    error: string | null
    recargar: () => void
    /** «tus expedientes», «la cola»… Va dentro la frase. */
    que: string
}) {
    if (cargando) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-6 py-8 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando {que}…
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-[var(--caes-mal)]/40 bg-[var(--caes-mal-bg)] px-6 py-6">
                <WifiOff
                    className="h-[18px] w-[18px] shrink-0 text-[var(--caes-mal)]"
                    strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-[var(--caes-mal)]">
                        No se han podido cargar {que}.
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.5] text-[var(--caes-mal-ink)]">
                        {error}
                    </p>
                </div>
                {/* Riprovare è l'unica cosa sensata da offrire: quasi
                    sempre è la rete, e quasi sempre torna. */}
                <button
                    type="button"
                    onClick={recargar}
                    className="shrink-0 rounded-full border border-[var(--caes-mal)]/50 px-4 py-2 text-[13px] font-medium text-[var(--caes-mal)] transition-colors hover:bg-[var(--caes-mal)] hover:text-[var(--caes-paper)]"
                >
                    Reintentar
                </button>
            </div>
        )
    }

    return null
}

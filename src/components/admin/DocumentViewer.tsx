'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, ExternalLink, Maximize2, Minimize2, X } from 'lucide-react'

/**
 * Visore di un documento del fascicolo.
 *
 * Verificare significa guardare. Prima in revisione si spuntava il nome di
 * un file senza poterlo aprire: una firma su qualcosa che nessuno ha visto.
 *
 * L'indirizzo non è permanente: lo si chiede a /api/documents/url, che
 * controlla chi sta chiedendo e ne firma uno valido cinque minuti. Se
 * scade mentre il pannello è aperto, si richiede.
 *
 * ── PERCHÉ IL PDF ADESSO SI LEGGE ─────────────────────────────────────
 *
 * Il visore PDF di Chrome apre di suo la colonna delle miniature. Dentro
 * un riquadro largo mezza pagina quella colonna si mangiava un terzo
 * dello spazio, e la fattura restava un francobollo: per leggere un NIF
 * bisognava scaricare il file. Il documento lo si guarda per verificarlo,
 * quindi se non si legge il pannello non serve a niente.
 *
 * Due cose lo sistemano. `#navpanes=0` chiude le miniature — la barra con
 * zoom e numero di pagina resta, che quella serve — e `view=FitH` apre
 * alla larghezza della pagina invece che a una scala arbitraria. Il resto
 * lo fa l'altezza: il riquadro è alto quanto una pagina vera, e con
 * «Ampliar» prende tutto lo schermo.
 */

type Props = {
    /** Percorso nel deposito. Null quando il file non è mai stato archiviato. */
    path?: string | null
    nombre: string
    onClose: () => void
    /** Sta occupando tutto lo schermo. */
    ampliado?: boolean
    /** Assente quando ingrandire non ha senso (è già a tutto schermo). */
    onAmpliar?: () => void
}

/**
 * Parametri per il visore incorporato.
 *
 * Valgono per Chrome ed Edge, che sono quelli che si usano qui. Firefox
 * li ignora e apre come sa: non si rompe niente, si perde solo il
 * miglioramento.
 */
const VISOR = '#navpanes=0&view=FitH&pagemode=none'

export default function DocumentViewer({
    path,
    nombre,
    onClose,
    ampliado,
    onAmpliar,
}: Props) {
    const [url, setUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let vivo = true

        // Nessun reset qui: il genitore monta un visore per documento
        // (key={s.id}), quindi lo stato nasce gia pulito. E il caso "senza
        // percorso" si deduce in render, non e uno stato da impostare.
        if (!path) return

        fetch(`/api/documents/url?path=${encodeURIComponent(path)}`)
            .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
            .then(({ ok, j }) => {
                if (!vivo) return
                if (!ok || !j.url) throw new Error(j?.error ?? 'No se ha podido abrir')
                setUrl(j.url)
            })
            .catch((e) => vivo && setError(e instanceof Error ? e.message : 'Error'))

        return () => {
            vivo = false
        }
    }, [path])

    const esPdf = (path ?? '').toLowerCase().endsWith('.pdf')
    // Dedotto, non messo nello stato: senza percorso non c'e niente da aprire.
    const mensaje = !path
        ? 'Este documento no está archivado. Se subió en modo demostración.'
        : error

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-[var(--caes-line)] bg-[var(--caes-panel)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--caes-line-2)] px-4 py-2.5">
                <span className="truncate text-[13.5px] font-medium text-[var(--caes-ink)]">
                    {nombre}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                    {onAmpliar && (
                        <button
                            type="button"
                            onClick={onAmpliar}
                            title={ampliado ? 'Reducir' : 'Ampliar a pantalla completa'}
                            className="rounded-full p-2 text-[var(--caes-mut)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                        >
                            {ampliado ? (
                                <Minimize2 className="h-4 w-4" />
                            ) : (
                                <Maximize2 className="h-4 w-4" />
                            )}
                        </button>
                    )}
                    {url ? (
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir en otra pestaña"
                            className="rounded-full p-2 text-[var(--caes-mut)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    ) : null}
                    <button
                        type="button"
                        onClick={onClose}
                        title="Cerrar"
                        className="rounded-full p-2 text-[var(--caes-mut)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--caes-band)]">
                {mensaje ? (
                    <p className="flex max-w-[44ch] items-start gap-2.5 px-6 py-10 text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                        <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0 text-[var(--caes-falta-ink)]" />
                        {mensaje}
                    </p>
                ) : !url ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--caes-faint)]" />
                ) : esPdf ? (
                    <iframe src={`${url}${VISOR}`} title={nombre} className="h-full w-full" />
                ) : (
                    // Le foto di targhette si guardano da vicino: qui si
                    // apre alla larghezza piena e si scorre, invece di
                    // rimpicciolire tutto per farlo stare nel riquadro.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={nombre} className="w-full max-w-none object-contain" />
                )}
            </div>
        </div>
    )
}

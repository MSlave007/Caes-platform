'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, ExternalLink, X } from 'lucide-react'

/**
 * Visore di un documento del fascicolo.
 *
 * Verificare significa guardare. Prima in revisione si spuntava il nome di
 * un file senza poterlo aprire: una firma su qualcosa che nessuno ha visto.
 *
 * L'indirizzo non è permanente: lo si chiede a /api/documents/url, che
 * controlla chi sta chiedendo e ne firma uno valido cinque minuti. Se
 * scade mentre il pannello è aperto, si richiede.
 */

type Props = {
    /** Percorso nel deposito. Null quando il file non è mai stato archiviato. */
    path?: string | null
    nombre: string
    onClose: () => void
}

export default function DocumentViewer({ path, nombre, onClose }: Props) {
    const [url, setUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let vivo = true
        setUrl(null)
        setError(null)

        if (!path) {
            setError('Este documento no está archivado. Se subió en modo demostración.')
            return
        }

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

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[var(--caes-line)] bg-[var(--caes-panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--caes-line-2)] px-5 py-3.5">
                <span className="truncate text-[14px] font-medium text-[var(--caes-ink)]">
                    {nombre}
                </span>
                <div className="flex items-center gap-1">
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

            <div className="flex min-h-[340px] flex-1 items-center justify-center bg-[var(--caes-band)]">
                {error ? (
                    <p className="flex max-w-[44ch] items-start gap-2.5 px-6 text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                        <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0 text-[#C4863F]" />
                        {error}
                    </p>
                ) : !url ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--caes-faint)]" />
                ) : esPdf ? (
                    <iframe src={url} title={nombre} className="h-full w-full" />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={nombre} className="max-h-full max-w-full object-contain" />
                )}
            </div>
        </div>
    )
}

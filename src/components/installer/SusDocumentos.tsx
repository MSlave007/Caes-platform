'use client'

import { useRef, useState } from 'react'
import { Check, FileText, ImageIcon, Loader2, Upload } from 'lucide-react'
import type { DocSpec } from '@/lib/documents'

/**
 * I documenti dell'espediente, dal pannello dell'installatore.
 *
 * ── PERCHÉ NON È PIÙ «LO QUE ENVIASTE» ────────────────────────────────
 *
 * Perché era al passato, e di sola lettura. Gli si diceva «Falta:
 * Certificado de la instalación» e non gli si dava modo di darcelo:
 * l'unica strada era il link pubblico, che deve mandargli qualcuno.
 * Cioè, per chi ha un account: entra, vede cosa manca, e deve chiamare
 * perché gli mandino un link.
 *
 * ── PERCHÉ QUI NON SMISTA NESSUN MODELLO ──────────────────────────────
 *
 * Perché la casella la sceglie lui, ed è nel posto giusto per farlo: ha
 * davanti la riga «RITE · Falta» e preme lì. Far indovinare a un modello
 * una cosa che una persona ha appena indicato col dito sarebbe
 * aggiungere un errore possibile a un'operazione che non ne aveva.
 */

type Subido = { casilla: string; estado: 'subiendo' | 'hecho' | 'error'; error?: string }

export default function SusDocumentos({
    expedienteId,
    specs,
    puestos,
    comentarios,
}: {
    expedienteId: string
    specs: DocSpec[]
    /** Gli id delle caselle già piene, al caricamento della pagina. */
    puestos: string[]
    /**
     * Quello che chi rivede ha scritto su una casella.
     *
     * Prima c'era una frase sola per tutto il fascicolo: «faltan dos
     * certificados» va bene, «la factura no se lee y la foto de la
     * etiqueta está movida» no — due cose su due documenti, e bisognava
     * indovinare quale riga riguardava quale.
     */
    comentarios?: Record<string, string>
}) {
    const [hechos, setHechos] = useState<Set<string>>(new Set(puestos))
    const [estados, setEstados] = useState<Record<string, Subido>>({})
    const input = useRef<HTMLInputElement>(null)
    const pedida = useRef<string | null>(null)

    const mandar = async (casilla: string, archivo: File) => {
        setEstados((e) => ({ ...e, [casilla]: { casilla, estado: 'subiendo' } }))
        try {
            const cuerpo = new FormData()
            cuerpo.append('archivo', archivo)
            cuerpo.append('casilla', casilla)

            const r = await fetch(`/api/projects/${expedienteId}/documentos`, {
                method: 'POST',
                body: cuerpo,
            })
            const j = await r.json()
            if (!r.ok) {
                setEstados((e) => ({
                    ...e,
                    [casilla]: {
                        casilla,
                        estado: 'error',
                        error: j?.error ?? 'No ha subido',
                    },
                }))
                return
            }
            setHechos((h) => new Set(h).add(casilla))
            setEstados((e) => ({ ...e, [casilla]: { casilla, estado: 'hecho' } }))
        } catch {
            setEstados((e) => ({
                ...e,
                [casilla]: { casilla, estado: 'error', error: 'Sin conexión' },
            }))
        }
    }

    const faltan = specs.filter((s) => s.required && !hechos.has(s.id)).length

    return (
        <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                    Los papeles de la obra
                </h2>
                {/* Il numero che conta: quanti ne mancano per finire. */}
                <span className="label-mono text-[var(--caes-faint)]">
                    {faltan === 0
                        ? 'Están todos'
                        : `${faltan} ${faltan === 1 ? 'por subir' : 'por subir'}`}
                </span>
            </div>
            <p className="mt-1.5 max-w-[58ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                Lo que falte lo puedes subir desde aquí mismo. PDF o foto, las dos
                valen.
            </p>

            <ul className="mt-6 flex flex-col gap-2">
                {specs.map((s) => {
                    const hecho = hechos.has(s.id)
                    const estado = estados[s.id]
                    return (
                        <li
                            key={s.id}
                            className={`flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
                                hecho
                                    ? 'border-[var(--caes-green)]/25 bg-[var(--caes-green)]/[.05]'
                                    : 'border-[var(--caes-line)]'
                            }`}
                        >
                            <span className="mt-0.5 shrink-0">
                                {hecho ? (
                                    <Check
                                        className="h-4 w-4 text-[var(--caes-green)]"
                                        strokeWidth={3}
                                    />
                                ) : s.onSite ? (
                                    <ImageIcon
                                        className="h-4 w-4 text-[var(--caes-faint)]"
                                        strokeWidth={1.7}
                                    />
                                ) : (
                                    <FileText
                                        className="h-4 w-4 text-[var(--caes-faint)]"
                                        strokeWidth={1.7}
                                    />
                                )}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-x-2 text-[14.5px] font-medium leading-[1.4]">
                                    {s.label}
                                    {!s.required && (
                                        <span className="text-[11.5px] font-normal text-[var(--caes-faint)]">
                                            opcional
                                        </span>
                                    )}
                                </p>
                                {/* Il perché anche quando è già dentro: chi
                                    torna vuole poter controllare che quello
                                    che ha mandato fosse quello giusto. */}
                                <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                                    {s.why}
                                </p>
                                {/* La nota di chi rivede, sulla riga che
                                    riguarda. È l'unica cosa in questa
                                    pagina che chiede di fare qualcosa,
                                    quindi si vede. */}
                                {comentarios?.[s.id] && (
                                    <p className="mt-2 border-l-2 border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-3 py-2 text-[12.5px] leading-[1.5] text-[var(--caes-falta-deep)]">
                                        {comentarios[s.id]}
                                    </p>
                                )}
                                {estado?.estado === 'error' && (
                                    <p className="mt-1.5 text-[12.5px] text-[var(--caes-mal)]">
                                        {estado.error}
                                    </p>
                                )}
                            </div>

                            {estado?.estado === 'subiendo' ? (
                                <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-[var(--caes-faint)]" />
                            ) : (
                                // Anche quando c'è già: «sustituir» esiste
                                // perché la prima foto viene mossa, e senza
                                // questo l'unico modo è chiamare.
                                <button
                                    type="button"
                                    onClick={() => {
                                        pedida.current = s.id
                                        input.current?.click()
                                    }}
                                    className="mt-0.5 shrink-0 rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-1.5 text-[12.5px] transition-colors hover:border-[var(--caes-ink)] hover:bg-[var(--caes-band)]"
                                >
                                    {hecho ? 'Otro más' : s.onSite ? 'Hacerla' : 'Subirlo'}
                                </button>
                            )}
                        </li>
                    )
                })}
            </ul>

            <input
                ref={input}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    const casilla = pedida.current
                    if (f && casilla) void mandar(casilla, f)
                    e.target.value = ''
                    pedida.current = null
                }}
            />

            <p className="mt-5 flex items-center gap-2 text-[12.5px] text-[var(--caes-faint)]">
                <Upload className="h-3.5 w-3.5" />
                Lo revisamos nosotros: no hace falta que lo mandes perfecto.
            </p>
        </section>
    )
}

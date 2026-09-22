'use client'

import { use, useEffect, useState } from 'react'
import { Check, Download, FileText, Loader2 } from 'lucide-react'
import Firmar from '@/components/firma/Firmar'

/**
 * «Lee esto y fírmalo».
 *
 * ── PER CHI È ─────────────────────────────────────────────────────────
 *
 * Per un cliente a cui è arrivato un messaggio su WhatsApp. Non ha un
 * account, non ne vuole uno, e sta guardando un telefono.
 *
 * ── PERCHÉ IL DOCUMENTO STA SOPRA E NON DIETRO A UN LINK ──────────────
 *
 * Perché firmare senza leggere non è firmare, e un link «ver el
 * documento» lo apre una persona su dieci. Aperto, lo scorre chiunque.
 *
 * Su un telefono il visore PDF nel riquadro funziona male o non
 * funziona, quindi lì sotto c'è comunque il modo di scaricarlo: non è
 * un ripiego nascosto, è una riga scritta.
 *
 * ── PERCHÉ NON DICE CHI È IL CLIENTE ──────────────────────────────────
 *
 * Perché è un indirizzo pubblico. C'è il numero del fascicolo, il nome
 * del documento, e il nome del firmante — che è il suo, e che deve
 * corrispondere a quello scritto nel contratto. Niente cifre, niente
 * indirizzo, niente telefono.
 */

type Estado = {
    numero: string
    documento: string
    queEs: string
    rol: string
    nombre: string
    nota: string | null
    yaFirmado: boolean
}

export default function FirmaPublica({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = use(params)

    const [estado, setEstado] = useState<Estado | null>(null)
    const [caducado, setCaducado] = useState(false)
    const [hecho, setHecho] = useState<{ cuando: string; documento: string } | null>(null)
    const [ocupado, setOcupado] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let vivo = true
        fetch(`/api/firma/${token}`)
            .then(async (r) => {
                if (!vivo) return
                if (!r.ok) {
                    setCaducado(true)
                    return
                }
                setEstado((await r.json()).data)
            })
            .catch(() => vivo && setCaducado(true))
        return () => {
            vivo = false
        }
    }, [token])

    const firmar = async (firma: { png: string; nombre: string; metodo: string }) => {
        setOcupado(true)
        setError(null)
        try {
            const r = await fetch(`/api/firma/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firma),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido firmar.')
                return
            }
            setHecho(j.data)
        } catch {
            setError('No se ha podido firmar. Comprueba la conexión.')
        } finally {
            setOcupado(false)
        }
    }

    if (caducado) {
        return (
            <Sobre>
                <h1 className="text-balance text-[26px] font-semibold tracking-[-0.03em]">
                    Este enlace ya no vale.
                </h1>
                <p className="mx-auto mt-4 max-w-[42ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Los enlaces para firmar caducan, y también dejan de funcionar en
                    cuanto se ha firmado. Pídele uno nuevo a quien te lo mandó.
                </p>
            </Sobre>
        )
    }

    if (hecho) {
        return (
            <Sobre>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--caes-green)]/12">
                    <Check className="h-7 w-7 text-[var(--caes-green)]" strokeWidth={2.6} />
                </span>
                <h1 className="mt-6 text-balance text-[27px] font-semibold tracking-[-0.03em]">
                    Firmado. Ya está.
                </h1>
                <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Has firmado {hecho.documento} el {hecho.cuando}. No tienes que
                    hacer nada más — nosotros seguimos con el expediente.
                </p>
                {/* La copia adesso, che è quando la si vuole. Dopo, il
                    link è morto e chiederla vuol dire telefonare. */}
                <a
                    href={`/api/firma/${token}/pdf`}
                    className="mx-auto mt-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--caes-line)] px-5 py-3 text-[14px] transition-colors hover:border-[var(--caes-ink)]/40 hover:bg-[var(--caes-band)]"
                >
                    <Download className="h-4 w-4" />
                    Guardar una copia firmada
                </a>
            </Sobre>
        )
    }

    if (!estado) {
        return (
            <Sobre>
                <span className="flex items-center justify-center gap-3 text-[14px] text-[var(--caes-mut)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando el documento…
                </span>
            </Sobre>
        )
    }

    return (
        <main className="min-h-screen bg-[var(--caes-paper)] px-6 py-14 font-sans text-[var(--caes-ink)] sm:px-10 sm:py-20">
            <div className="mx-auto max-w-[46rem]">
                <Marca />

                <p className="label-mono mt-12 text-[var(--caes-mut)]">
                    Expediente {estado.numero}
                </p>
                <h1 className="mt-4 text-balance text-[clamp(27px,3.8vw,38px)] font-semibold leading-[1.08] tracking-[-0.038em]">
                    {estado.documento}
                </h1>
                <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.6] text-[var(--caes-mut)]">
                    {estado.queEs}
                </p>

                {estado.nota && (
                    <p className="mt-6 rounded-xl border border-[var(--caes-falta)]/50 bg-[var(--caes-falta-bg)] px-4 py-3.5 text-[14px] leading-[1.55] text-[var(--caes-falta-deep)]">
                        {estado.nota}
                    </p>
                )}

                {estado.yaFirmado ? (
                    <p className="mt-8 flex items-start gap-2.5 rounded-xl border border-[var(--caes-green)]/30 bg-[var(--caes-green)]/[.06] px-5 py-4 text-[14.5px] leading-[1.5]">
                        <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--caes-green)]"
                            strokeWidth={3}
                        />
                        Este documento ya lo has firmado. No hace falta nada más.
                    </p>
                ) : (
                    <>
                        {/* ── il documento, aperto ─────────────────── */}
                        <div className="mt-8">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="flex items-center gap-2 text-[13px] text-[var(--caes-mut)]">
                                    <FileText className="h-3.5 w-3.5" />
                                    Léelo antes de firmar
                                </p>
                                <a
                                    href={`/api/firma/${token}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden text-[13px] text-[var(--caes-mut)] underline underline-offset-4 transition-colors hover:text-[var(--caes-ink)] sm:inline"
                                >
                                    Abrirlo aparte o guardarlo
                                </a>
                            </div>
                            {/**
                              * Il riquadro solo dove c'è un visore.
                              *
                              * Su un telefono `<object type="application/pdf">`
                              * quasi sempre non mostra niente — e non cade
                              * sul contenuto di ripiego: resta un rettangolo
                              * bianco, che è il modo peggiore di fallire
                              * perché sembra un documento vuoto.
                              *
                              * Quindi sotto i 640px non si prova nemmeno: c'è
                              * un bottone che apre il PDF con il visore del
                              * telefono, che funziona sempre.
                              */}
                            <object
                                data={`/api/firma/${token}/pdf`}
                                type="application/pdf"
                                className="mt-3 hidden h-[34rem] w-full rounded-xl border border-[var(--caes-line)] bg-white sm:block"
                            />

                            <a
                                href={`/api/firma/${token}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-5 py-4 transition-colors hover:border-[var(--caes-ink)]/30 sm:hidden"
                            >
                                <span>
                                    <span className="block text-[14.5px] font-medium">
                                        Abrir el documento
                                    </span>
                                    <span className="mt-0.5 block text-[12.5px] text-[var(--caes-mut)]">
                                        Se abre en otra pestaña · PDF
                                    </span>
                                </span>
                                <FileText
                                    className="h-5 w-5 shrink-0 text-[var(--caes-mut)]"
                                    strokeWidth={1.7}
                                />
                            </a>
                        </div>

                        <div className="mt-8">
                            <Firmar
                                rol={estado.rol}
                                nombreSugerido={estado.nombre}
                                ocupado={ocupado}
                                error={error}
                                onFirmar={(f) => void firmar(f)}
                            />
                        </div>
                    </>
                )}
            </div>
        </main>
    )
}

function Marca() {
    return (
        <span className="flex items-center gap-2.5" aria-label="CAES">
            <span className="relative block h-[18px] w-[18px] rounded-[3px] bg-[var(--caes-ink)]">
                <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
            </span>
            <span className="font-mono text-[14px] font-medium tracking-[.15em]">CAES</span>
        </span>
    )
}

function Sobre({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--caes-paper)] px-6 font-sans text-[var(--caes-ink)]">
            <div className="flex max-w-[34rem] flex-col text-center">{children}</div>
        </main>
    )
}

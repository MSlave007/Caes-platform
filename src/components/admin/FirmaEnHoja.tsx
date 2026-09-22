'use client'

import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { Trash2 } from 'lucide-react'
import {
    ALTO_CAJA,
    anchoColumna,
    colocar,
    desdeCaja,
} from '@/lib/caes/cajaFirma'

/**
 * La firma sul foglio, che si prende con le dita.
 *
 * ── PERCHÉ NON PIÙ LE FRECCETTE ───────────────────────────────────────
 *
 * Perché per spostare una cosa che si vede, si spinge la cosa che si
 * vede. Quattro frecce e un più e un meno sono un modo di descrivere a
 * una macchina un gesto che la mano sa già fare, e ogni clic è un giro
 * di «premi, guarda, premi ancora».
 *
 * ── PERCHÉ UNA LIBRERIA E NON A MANO ──────────────────────────────────
 *
 * Trascinare e ridimensionare col dito è un problema risolto, e risolto
 * male è peggio di non averlo: la cattura del puntatore quando esci dal
 * riquadro, il tocco che diventa scorrimento della pagina, i limiti, le
 * proporzioni bloccate. `react-rnd` fa tutto questo da otto anni.
 *
 * (Ho controllato che giri su React 19: `react-draggable` 4.7.2, che sta
 * sotto, non usa più `findDOMNode` — che React 19 ha tolto.)
 *
 * Quello che la libreria NON fa è l'unica cosa difficile qui: tradurre i
 * pixel dello schermo in punti del PDF. Quello sta in `cajaFirma.ts`, e
 * ci passano tutti e due — il foglio e il renderer — perché la firma si
 * sposta dove si vede e si stampa dove si è messa.
 */

export type AjusteFirma = { escala: number; dx: number; dy: number }

export default function FirmaEnHoja({
    png,
    ajuste,
    partes,
    onMover,
    onQuitar,
}: {
    /** Il tratto, base64 senza intestazione. */
    png: string
    ajuste: AjusteFirma
    /** Quante firme ha questo documento: decide la larghezza della colonna. */
    partes: number
    onMover: (a: AjusteFirma) => void
    onQuitar: () => void
}) {
    const caja = useRef<HTMLDivElement>(null)
    /** Quanti pixel vale un punto PDF su questo schermo. */
    const [k, setK] = useState(0)
    /** Le misure vere del PNG: senza, non si sa quanto è grande il tratto. */
    const [img, setImg] = useState<{ ancho: number; alto: number } | null>(null)
    const [tocando, setTocando] = useState(false)

    const anchoCol = anchoColumna(partes)

    /**
     * Il fattore di scala si misura, non si indovina.
     *
     * La colonna sul foglio è larga quanto è larga la finestra; nel PDF
     * è larga 222 punti. Il rapporto fra le due è tutto quello che serve
     * per tradurre un trascinamento in uno spostamento stampabile, e
     * cambia quando si ridimensiona la finestra.
     */
    useEffect(() => {
        const medir = () => {
            const w = caja.current?.clientWidth ?? 0
            if (w > 0) setK(w / anchoCol)
        }
        medir()
        window.addEventListener('resize', medir)
        return () => window.removeEventListener('resize', medir)
    }, [anchoCol])

    useEffect(() => {
        const el = new window.Image()
        el.onload = () => setImg({ ancho: el.naturalWidth, alto: el.naturalHeight })
        el.src = `data:image/png;base64,${png}`
    }, [png])

    // Niente da disegnare finche non si sa quanto e largo il foglio e
    // quanto e grande il tratto: si disegnerebbe nel posto sbagliato per
    // un fotogramma, che su una firma si vede.
    const sitio = k > 0 && img ? colocar(img, anchoCol, ajuste) : null

    return (
        <div
            ref={caja}
            className="relative w-full"
            style={{ height: sitio ? ALTO_CAJA * k : 76 }}
            onPointerEnter={() => setTocando(true)}
            onPointerLeave={() => setTocando(false)}
        >
            {sitio && img && (
                <Rnd
                    bounds="parent"
                    lockAspectRatio
                    size={{ width: sitio.ancho * k, height: sitio.alto * k }}
                    position={{ x: sitio.x * k, y: sitio.y * k }}
                    minWidth={28}
                    enableResizing={{
                        topLeft: true,
                        topRight: true,
                        bottomLeft: true,
                        bottomRight: true,
                    }}
                    onDragStop={(_e, d) =>
                        onMover(
                            desdeCaja(img, anchoCol, {
                                x: d.x / k,
                                y: d.y / k,
                                ancho: sitio.ancho,
                            })
                        )
                    }
                    onResizeStop={(_e, _dir, ref, _delta, pos) =>
                        onMover(
                            desdeCaja(img, anchoCol, {
                                x: pos.x / k,
                                y: pos.y / k,
                                ancho: ref.offsetWidth / k,
                            })
                        )
                    }
                    // Le maniglie si vedono quando ci sei sopra. Un
                    // documento con quattro quadratini agli angoli di ogni
                    // firma non sembra un documento.
                    resizeHandleStyles={
                        tocando
                            ? {
                                  topLeft: MANIGLIA,
                                  topRight: MANIGLIA,
                                  bottomLeft: MANIGLIA,
                                  bottomRight: MANIGLIA,
                              }
                            : {}
                    }
                    className={`group/firma transition-colors ${
                        tocando
                            ? 'rounded-[3px] outline-1 outline-dashed outline-offset-[3px] outline-[var(--caes-green)]'
                            : ''
                    }`}
                    style={{ cursor: 'grab', touchAction: 'none' }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`data:image/png;base64,${png}`}
                        alt="Firma"
                        draggable={false}
                        className="pointer-events-none h-full w-full select-none object-fill"
                    />
                </Rnd>
            )}

            {/**
             * Toglierla sta sulla firma, non solo nel pannello.
             *
             * È lì che ci si accorge che è venuta male, e chiedere di
             * scendere in fondo alla pagina per un gesto che si sta già
             * facendo con la mano sopra al tratto è un giro di troppo.
             */}
            {tocando && (
                <button
                    type="button"
                    onClick={onQuitar}
                    title="Quitar esta firma"
                    aria-label="Quitar esta firma"
                    className="absolute right-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] text-[var(--caes-mut)] shadow-sm transition-colors hover:border-[var(--caes-mal)] hover:text-[var(--caes-mal)]"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}

        </div>
    )
}

const MANIGLIA: React.CSSProperties = {
    width: 11,
    height: 11,
    borderRadius: 3,
    border: '1.5px solid var(--caes-green)',
    background: 'var(--caes-paper)',
}

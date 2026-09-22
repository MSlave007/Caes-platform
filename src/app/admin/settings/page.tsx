'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, Loader2, Lock } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '@/components/auth/AuthShell'
import {
    AHORRO_MINIMO_PCT,
    COMISION_MAXIMA_PCT,
    CUOTA_CAES_PCT,
    TARIFA_CAES_EUR_MWH,
    VALIDEZ_ANOS,
    eur,
} from '@/lib/caes/estimate'
import { PROVEEDORES } from '@/lib/caes/proveedores'
import ComoLee from '@/components/admin/ComoLee'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Impostazioni dell'agenzia.
 *
 * La distinzione che regge questa pagina: alcuni numeri li decide la norma e
 * non sono nostri da toccare, altri sono decisioni commerciali. Mescolarli in
 * un unico elenco di campi editabili sarebbe un invito a modificare per
 * sbaglio qualcosa che poi invalida un espediente.
 */
export default function AdminSettings() {
    const [agencyPct, setAgencyPct] = useState(CUOTA_CAES_PCT)
    const [delegate, setDelegate] = useState('')
    const [reviewDays, setReviewDays] = useState(5)

    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    /**
     * Se non c'è dove scrivere, il server lo dice e la pagina lo ripete
     * accanto al bottone spento. Il «Guardado» di prima compariva
     * sempre: chi lo vedeva usciva convinto di aver cambiato il margine.
     */
    const [persistente, setPersistente] = useState(true)
    const [motivo, setMotivo] = useState<string | null>(null)

    useEffect(() => {
        let vivo = true
        fetch('/api/ajustes')
            .then((r) => r.json())
            .then((j) => {
                if (!vivo || !j?.data) return
                setAgencyPct(j.data.margen_pct ?? CUOTA_CAES_PCT)
                setDelegate(j.data.proveedor ?? '')
                setReviewDays(j.data.dias_revision ?? 5)
                setPersistente(j.persistente !== false)
                setMotivo(j.motivo ?? null)
            })
            .catch(() => {
                if (vivo) setError('No se han podido cargar los ajustes.')
            })
            .finally(() => {
                if (vivo) setCargando(false)
            })
        return () => {
            vivo = false
        }
    }, [])

    // Riferimento vivo, così si vede cosa significa la percentuale.
    const sample = 756.28
    const yours = (sample * agencyPct) / 100

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!persistente || guardando) return
        setGuardando(true)
        setError(null)
        try {
            const r = await fetch('/api/ajustes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    margen_pct: agencyPct,
                    proveedor: delegate || null,
                    dias_revision: reviewDays,
                }),
            })
            const j = await r.json().catch(() => null)
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido guardar.')
                if (j?.persistente === false) setPersistente(false)
                return
            }
            setSaved(true)
            window.setTimeout(() => setSaved(false), 2600)
        } catch {
            setError('No se ha podido guardar: sin conexión con el servidor.')
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
            </div>
        )
    }

    return (
        <div className="flex max-w-[68rem] flex-col gap-10">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Ajustes</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    Lo que decides tú, y lo que <em className="serif-accent">decide la norma</em>.
                </h1>
            </div>

            {/* ------------------------------------------- fissi per legge */}
            <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-band)] p-7">
                <div className="flex items-center gap-2.5">
                    <Lock className="h-4 w-4 text-[var(--caes-mut)]" strokeWidth={1.8} />
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Fijado por la normativa
                    </h2>
                </div>
                <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                    No se toca desde aquí. Si cambia la norma se actualiza en el motor de
                    cálculo, en un sitio, y los expedientes nuevos salen ya con las reglas
                    nuevas. Los ya aprobados conservan las de su fecha.
                </p>

                <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-2">
                    {[
                        {
                            k: 'Tarifa CAES',
                            v: `${TARIFA_CAES_EUR_MWH} €`,
                            u: 'por MWh ahorrado',
                        },
                        {
                            k: 'Ahorro mínimo',
                            v: `${AHORRO_MINIMO_PCT} %`,
                            u: 'sobre la línea base',
                        },
                        {
                            k: 'Comisión máxima del instalador',
                            v: `${COMISION_MAXIMA_PCT} %`,
                            u: 'sobre el total',
                        },
                        {
                            k: 'Validez del certificado',
                            v: `${VALIDEZ_ANOS} años`,
                            u: 'desde la aprobación',
                        },
                    ].map((r) => (
                        <div key={r.k} className="bg-[var(--caes-panel)] p-5">
                            <div className="label-mono text-[var(--caes-faint)]">{r.k}</div>
                            <div className="mt-3 font-mono tabular text-[22px] font-medium tracking-[-0.03em]">
                                {r.v}
                            </div>
                            <p className="mt-1 text-[12.5px] text-[var(--caes-mut)]">{r.u}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* -------------------------------------------- decisioni nostre */}
            <form onSubmit={save} className="flex flex-col gap-6">
                {/* Su schermo largo le due affiancate, invece di una
                    colonna stretta e mezzo schermo vuoto. */}
                <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Tu margen por defecto
                    </h2>
                    <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                        La parte que retienes del valor del certificado. Lo que queda
                        después de tu margen y de la comisión del instalador es del
                        cliente: se le ingresa una sola vez. En cada expediente puedes
                        cambiarlo antes de aprobar.
                    </p>

                    <div className="mt-8 font-sans text-[clamp(38px,5vw,52px)] font-semibold leading-none tracking-[-0.05em] tabular">
                        {agencyPct} %
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={100 - COMISION_MAXIMA_PCT}
                        step={1}
                        value={agencyPct}
                        onChange={(e) => setAgencyPct(Number(e.target.value))}
                        className="caes-range mt-6 w-full"
                        aria-label="Margen por defecto de la agencia"
                    />
                    <div className="mt-3 flex justify-between text-[12px] text-[var(--caes-faint)]">
                        <span>0 %</span>
                        <span>
                            Tope práctico {100 - COMISION_MAXIMA_PCT} %, para que quede algo
                            al cliente
                        </span>
                    </div>

                    <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--caes-line-2)] pt-6 text-[13.5px] text-[var(--caes-mut)]">
                        En un expediente de {eur(sample)}, retendrías
                        <b className="font-mono tabular text-[15px] font-medium text-[var(--caes-ink)]">
                            {eur(yours)}
                        </b>
                    </div>
                </section>

                <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Cómo trabajáis
                    </h2>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <Field
                            label="Sujeto delegado"
                            hint="Sale en el Convenio con su NIF y su código de acreditación. Cada expediente puede llevar otro."
                        >
                            {/*
                                Era texto libre aquí y una lista en la
                                revisión: el mismo dato con dos controles
                                distintos. Escrito a mano se podía poner
                                un nombre que no existe, y acababa
                                impreso en un contrato.
                            */}
                            <select
                                className={inputClass}
                                value={delegate}
                                onChange={(e) => setDelegate(e.target.value)}
                            >
                                <option value="">Sin elegir</option>
                                {PROVEEDORES.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Compromiso de revisión"
                            hint="Días hábiles que prometéis al instalador. Se muestra en su panel."
                        >
                            <input
                                type="number"
                                min={1}
                                max={30}
                                className={inputClass}
                                value={reviewDays}
                                onChange={(e) => setReviewDays(Number(e.target.value) || 1)}
                            />
                        </Field>
                    </div>
                </section>
                </div>

                {/* Non e un ajuste: e un dato che si guarda ogni tanto
                    per decidere una cosa sola, se una soglia va mossa.
                    Una pagina sua sarebbe una voce di menu per qualcosa
                    che si apre una volta al mese. */}
                <ComoLee />

                {error && (
                    <p className="flex items-start gap-2.5 rounded-xl border border-[var(--caes-mal)]/40 bg-[var(--caes-mal-bg)] px-4 py-3 text-[13.5px] leading-[1.5] text-[var(--caes-mal)]">
                        <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            strokeWidth={2}
                        />
                        {error}
                    </p>
                )}

                {/*
                    Il motivo sta ACCANTO al bottone spento, non in fondo
                    alla pagina in grigio chiaro. È il modello che usa già
                    la revisione con «Aprobar y emitir»: chi non può fare
                    una cosa deve leggere perché dove sta guardando.
                */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="w-[16rem]">
                        <PrimaryButton
                            type="submit"
                            disabled={!persistente || guardando}
                        >
                            {guardando ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando…
                                </>
                            ) : (
                                'Guardar cambios'
                            )}
                        </PrimaryButton>
                    </div>

                    {!persistente && (
                        <p className="max-w-[42ch] text-[13px] leading-[1.5] text-[var(--caes-falta-ink)]">
                            {motivo ?? 'Todavía no hay dónde guardarlos.'} Está el
                            SQL al final de{' '}
                            <code className="font-mono text-[12.5px]">setup.sql</code>
                            ; en cuanto pase, este botón funciona.
                        </p>
                    )}

                    {saved && (
                        <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="flex items-center gap-2 text-[13.5px] text-[var(--caes-green)]"
                        >
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                            Guardado
                        </motion.span>
                    )}
                </div>
            </form>
        </div>
    )
}

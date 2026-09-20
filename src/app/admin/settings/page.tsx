'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '@/components/auth/AuthShell'
import {
    AHORRO_MINIMO_PCT,
    COMISION_MAXIMA_PCT,    CUOTA_CAES_PCT,
    TARIFA_CAES_EUR_MWH,
    VALIDEZ_ANOS,
    eur,
} from '@/lib/caes/estimate'

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
    const [saved, setSaved] = useState(false)

    // Riferimento vivo, così si vede cosa significa la percentuale.
    const sample = 756.28
    const yours = (sample * agencyPct) / 100

    const save = (e: React.FormEvent) => {
        e.preventDefault()
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2600)
    }

    return (
        <div className="flex max-w-[52rem] flex-col gap-10">
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
                            hint="De quién vienen las plantillas de Convenio CAE, RES 60 y Anexo 1."
                        >
                            <input
                                className={inputClass}
                                value={delegate}
                                onChange={(e) => setDelegate(e.target.value)}
                                placeholder="Naturgy, Bettergy…"
                            />
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

                <div className="flex items-center gap-4">
                    <div className="w-[16rem]">
                        <PrimaryButton type="submit">Guardar cambios</PrimaryButton>
                    </div>
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

                {/* Onesto: finché non c'è il database, non si salva nulla. */}
                <p className="text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                    Estos ajustes todavía no se guardan: falta la conexión con la base de
                    datos. El margen por defecto se lee del motor de cálculo.
                </p>
            </form>
        </div>
    )
}

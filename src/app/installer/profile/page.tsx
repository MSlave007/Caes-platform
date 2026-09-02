'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Field, PrimaryButton, inputClass } from '@/components/auth/AuthShell'
import { COMISION_MAXIMA_PCT, eur } from '@/lib/caes/estimate'

const EASE = [0.16, 1, 0.3, 1] as const

type Profile = {
    full_name: string
    phone: string
    company_id: string
    address: string
    default_commission: number
}

const EMPTY: Profile = {
    full_name: '',
    phone: '',
    company_id: '',
    address: '',
    default_commission: 25,
}

/**
 * Profilo dell'installatore.
 *
 * La commissione predefinita sta qui e non dentro ogni espediente: chi fa
 * dieci installazioni al mese non vuole rispondere dieci volte alla stessa
 * domanda. Nel percorso resta modificabile caso per caso.
 */
export default function InstallerProfilePage() {
    const supabase = createClient()
    const [p, setP] = useState<Profile>(EMPTY)
    const [email, setEmail] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const { data: auth } = await supabase.auth.getUser()
                setEmail(auth.user?.email ?? null)
                if (!auth.user) return

                const { data } = await supabase
                    .from('profiles')
                    .select('full_name, phone, company_id, address, default_commission')
                    .eq('id', auth.user.id)
                    .single()

                if (data) setP({ ...EMPTY, ...data })
            } catch (err) {
                console.error('Error al cargar el perfil:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [supabase])

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setSaved(false)
        setError(null)
        try {
            const { data: auth } = await supabase.auth.getUser()
            if (!auth.user) throw new Error('Sesión caducada. Vuelve a entrar.')

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: p.full_name,
                    phone: p.phone,
                    company_id: p.company_id,
                    address: p.address,
                    default_commission: p.default_commission,
                })
                .eq('id', auth.user.id)

            if (error) throw error
            setSaved(true)
            window.setTimeout(() => setSaved(false), 2600)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No se ha podido guardar')
        } finally {
            setSaving(false)
        }
    }

    // Riferimento vivo: cosa significa quella percentuale su un caso tipo.
    const sample = 400
    const yours = (sample * p.default_commission) / 100

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando tu perfil…
            </div>
        )
    }

    return (
        <div className="max-w-[46rem]">
            <p className="label-mono text-[var(--caes-mut)]">Tu perfil</p>
            <h1 className="mt-4 text-balance text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                Los datos que se <em className="serif-accent">repiten</em>.
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                Todo lo de aquí se rellena solo en cada expediente nuevo. Cámbialo
                cuando cambie, no antes.
            </p>

            <form onSubmit={save} className="mt-10 flex flex-col gap-9">
                <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        La empresa
                    </h2>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <Field label="Nombre o razón social">
                            <input
                                className={inputClass}
                                value={p.full_name}
                                onChange={(e) => setP({ ...p, full_name: e.target.value })}
                                placeholder="Clima Levante S.L."
                            />
                        </Field>
                        <Field label="CIF o NIF">
                            <input
                                className={inputClass}
                                value={p.company_id}
                                onChange={(e) => setP({ ...p, company_id: e.target.value })}
                                placeholder="B12345678"
                            />
                        </Field>
                        <Field label="Teléfono">
                            <input
                                type="tel"
                                className={inputClass}
                                value={p.phone}
                                onChange={(e) => setP({ ...p, phone: e.target.value })}
                                placeholder="600 000 000"
                            />
                        </Field>
                        <Field label="Correo" hint="Para cambiarlo, escríbenos.">
                            <input
                                className={`${inputClass} cursor-not-allowed opacity-60`}
                                value={email ?? ''}
                                readOnly
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Dirección">
                                <input
                                    className={inputClass}
                                    value={p.address}
                                    onChange={(e) => setP({ ...p, address: e.target.value })}
                                    placeholder="Calle, número, población"
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                {/* --------------------------------------------- commissione */}
                <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Tu comisión por defecto
                    </h2>
                    <p className="mt-2 max-w-[54ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                        La parte del ahorro que te quedas. El tope legal es el{' '}
                        {COMISION_MAXIMA_PCT} %: por encima, el acuerdo CAES no vale y hay
                        que rehacerlo. En cada expediente puedes cambiarla antes de enviar.
                    </p>

                    <div className="mt-8 flex items-baseline gap-3">
                        <span className="font-sans text-[clamp(38px,5vw,52px)] font-semibold leading-none tracking-[-0.05em] tabular">
                            {p.default_commission} %
                        </span>
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={COMISION_MAXIMA_PCT}
                        step={1}
                        value={p.default_commission}
                        onChange={(e) =>
                            setP({ ...p, default_commission: parseInt(e.target.value) })
                        }
                        className="caes-range mt-6 w-full"
                        aria-label="Comisión por defecto"
                    />
                    <div className="mt-3 flex justify-between text-[12px] text-[var(--caes-faint)]">
                        <span>0 %</span>
                        <span>Máximo legal {COMISION_MAXIMA_PCT} %</span>
                    </div>

                    <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--caes-line-2)] pt-6 text-[13.5px] text-[var(--caes-mut)]">
                        En un expediente de {eur(sample)} al año, te quedarías
                        <b className="font-mono tabular text-[15px] font-medium text-[var(--caes-ink)]">
                            {eur(yours)}
                        </b>
                    </div>
                </section>

                {error && (
                    <p
                        role="alert"
                        className="rounded-xl border border-[#E0B48C] bg-[#FBF1E7] px-4 py-3 text-[13.5px] text-[#7A4A12]"
                    >
                        {error}
                    </p>
                )}

                <div className="flex items-center gap-4">
                    <div className="w-[16rem]">
                        <PrimaryButton type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando…
                                </>
                            ) : (
                                'Guardar cambios'
                            )}
                        </PrimaryButton>
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
            </form>
        </div>
    )
}

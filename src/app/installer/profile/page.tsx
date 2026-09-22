'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, Loader2, Paperclip, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Field, PrimaryButton, inputClass } from '@/components/auth/AuthShell'
import { COMISION_MAXIMA_PCT, eur } from '@/lib/caes/estimate'
import { DOCUMENTOS_PERFIL } from '@/lib/documents'

const EASE = [0.16, 1, 0.3, 1] as const

type Profile = {
    name: string
    phone: string
    nif: string
    address: string
    default_commission: number
    /** Percorso nel deposito del DNI. Vedi DOCUMENTOS_PERFIL. */
    dni_path: string | null
    dni_nombre: string | null
}

const EMPTY: Profile = {
    name: '',
    phone: '',
    nif: '',
    address: '',
    default_commission: 25,
    dni_path: null,
    dni_nombre: null,
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
    const [subiendo, setSubiendo] = useState(false)
    const [errorDni, setErrorDni] = useState<string | null>(null)
    const dniInput = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const { data: auth } = await supabase.auth.getUser()
                setEmail(auth.user?.email ?? null)
                if (!auth.user) return

                const { data } = await supabase
                    .from('profiles')
                    .select(
                        'name, phone, nif, address, default_commission, dni_path, dni_nombre'
                    )
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
                    name: p.name,
                    phone: p.phone,
                    nif: p.nif,
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

    /**
     * Il DNI si salva da solo, con una chiamata sua.
     *
     * Se stesse nella stessa `update` del resto, una colonna mancante
     * farebbe fallire anche il salvataggio del nome e della commissione.
     * Un pezzo che non funziona deve rompere solo se stesso.
     */
    const subirDni = async (f: File) => {
        setSubiendo(true)
        setErrorDni(null)
        try {
            const fd = new FormData()
            fd.append('file', f)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? 'No se ha podido subir')

            setP((v) => ({ ...v, dni_path: json.path, dni_nombre: f.name }))

            const { data: auth } = await supabase.auth.getUser()
            if (!auth.user) return
            const { error: e } = await supabase
                .from('profiles')
                .update({ dni_path: json.path, dni_nombre: f.name })
                .eq('id', auth.user.id)
            if (e) throw e
        } catch (err) {
            setErrorDni(err instanceof Error ? err.message : 'No se ha podido guardar')
        } finally {
            setSubiendo(false)
        }
    }

    const quitarDni = async () => {
        setP((v) => ({ ...v, dni_path: null, dni_nombre: null }))
        setErrorDni(null)
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        await supabase
            .from('profiles')
            .update({ dni_path: null, dni_nombre: null })
            .eq('id', auth.user.id)
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
                                value={p.name}
                                onChange={(e) => setP({ ...p, name: e.target.value })}
                                placeholder="Clima Levante S.L."
                            />
                        </Field>
                        <Field label="CIF o NIF">
                            <input
                                className={inputClass}
                                value={p.nif}
                                onChange={(e) => setP({ ...p, nif: e.target.value })}
                                placeholder="B12345678"
                            />
                        </Field>
                        <Field
                            label="Teléfono"
                            hint="Sale en la página que ven tus clientes, con un botón para llamarte. Sin él no aparece."
                        >
                            <input
                                type="tel"
                                className={inputClass}
                                value={p.phone}
                                onChange={(e) => setP({ ...p, phone: e.target.value })}
                                placeholder="600 000 000"
                            />
                        </Field>
                        {/* Il suggerimento mandava a scriverci per una
                            cosa che si fa da soli in due clic: il cambio
                            email sta in «Mi cuenta», con la conferma sul
                            vecchio indirizzo. */}
                        <Field
                            label="Correo"
                            hint="Es con el que entras. Para cambiarlo, en Mi cuenta."
                        >
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

                {/* ------------------------------------------ verificazione

                    Il DNI stava nell'elenco documenti di OGNI espediente:
                    vuol dire richiederlo a ogni cantiere quando ce l'abbiamo
                    gia e non cambia. Sta qui, si carica una volta, e da li
                    in poi nessuno lo chiede piu. */}
                <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Tu verificación
                    </h2>
                    {DOCUMENTOS_PERFIL.map((d) => (
                        <div key={d.id} className="mt-6">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="text-[14.5px] font-medium text-[var(--caes-ink)]">
                                    {d.label}
                                </span>
                                {p.dni_path ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-green)]/12 px-2.5 py-1 text-[11.5px] text-[var(--caes-green)]">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                        Aportado
                                    </span>
                                ) : (
                                    <span className="rounded-full border border-dashed border-[var(--caes-falta-ink)] px-2.5 py-1 text-[11.5px] text-[var(--caes-falta-ink)]">
                                        Pendiente
                                    </span>
                                )}
                            </div>
                            <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                                {d.why}
                            </p>

                            {p.dni_path ? (
                                <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-4 py-3">
                                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--caes-faint)]" />
                                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--caes-ink)]">
                                        {p.dni_nombre ?? d.label}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={quitarDni}
                                        aria-label="Quitar"
                                        className="shrink-0 rounded-lg p-1.5 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={subiendo}
                                    onClick={() => dniInput.current?.click()}
                                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--caes-ink)] px-4 py-2 text-[13.5px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)] disabled:opacity-50"
                                >
                                    {subiendo ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-3.5 w-3.5" />
                                    )}
                                    Elegir archivo
                                </button>
                            )}

                            <input
                                ref={dniInput}
                                type="file"
                                accept={d.accept}
                                className="sr-only"
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) void subirDni(f)
                                    e.target.value = ''
                                }}
                            />

                            {errorDni && (
                                <p className="mt-3 flex items-start gap-2 text-[13px] leading-[1.5] text-[var(--caes-falta-ink)]">
                                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                                    {errorDni}
                                </p>
                            )}
                        </div>
                    ))}
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
                        className="rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3 text-[13.5px] text-[var(--caes-falta-deep)]"
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

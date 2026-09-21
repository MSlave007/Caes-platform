'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Camera, Loader2, Trash2 } from 'lucide-react'
import Seguridad from '@/components/cuenta/Seguridad'

/**
 * «Mi cuenta» — la stessa per l'installatore e per chi rivede.
 *
 * ── PERCHÉ UNA SOLA ───────────────────────────────────────────────────
 *
 * I dati della PERSONA sono gli stessi qualunque sia il ruolo: come ti
 * chiami, come ti si trova, la password. Quello che cambia è il lavoro,
 * non l'utenza. Due pagine gemelle avrebbero voluto dire due posti dove
 * dimenticarsi di aggiungere il cambio password.
 *
 * Quello che riguarda l'AZIENDA e il MESTIERE — la commissione
 * predefinita, il DNI professionale — resta in /installer/profile:
 * quelli sì che dipendono dal ruolo.
 *
 * ── LA FOTO STA NEL DEPOSITO PRIVATO ──────────────────────────────────
 *
 * Non in un bucket pubblico. È la faccia di una persona: un indirizzo
 * permanente e indovinabile su un bucket aperto è esattamente il tipo
 * di cosa che finisce indicizzata. Si guarda con un indirizzo firmato a
 * scadenza, come i documenti, e il percorso è intestato a chi l'ha
 * caricata — quindi nessun altro può nemmeno chiederlo.
 */

type Cuenta = {
    name: string | null
    phone: string | null
    nif: string | null
    address: string | null
    avatar_path: string | null
    role: string | null
    email: string | null
}

const VACIA: Cuenta = {
    name: '',
    phone: '',
    nif: '',
    address: '',
    avatar_path: null,
    role: null,
    email: null,
}

export default function PaginaCuenta() {
    const [c, setC] = useState<Cuenta>(VACIA)
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [hecho, setHecho] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [subiendo, setSubiendo] = useState(false)
    const foto = useRef<HTMLInputElement>(null)

    /* --------------------------------------------------------- carica */
    useEffect(() => {
        let vivo = true
        fetch('/api/cuenta')
            .then((r) => r.json())
            .then((j) => vivo && j.data && setC({ ...VACIA, ...j.data }))
            .catch(() => vivo && setError('No se ha podido cargar tu cuenta.'))
            .finally(() => vivo && setCargando(false))
        return () => {
            vivo = false
        }
    }, [])

    // L'indirizzo della foto è firmato e scade: si chiede ogni volta.
    useEffect(() => {
        if (!c.avatar_path) {
            setAvatarUrl(null)
            return
        }
        let vivo = true
        fetch(`/api/documents/url?path=${encodeURIComponent(c.avatar_path)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => vivo && setAvatarUrl(j?.url ?? null))
            .catch(() => {})
        return () => {
            vivo = false
        }
    }, [c.avatar_path])

    /* --------------------------------------------------------- salva */
    const guardar = useCallback(
        async (parche: Partial<Cuenta>) => {
            setGuardando(true)
            setError(null)
            setHecho(false)
            try {
                const res = await fetch('/api/cuenta', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parche),
                })
                if (!res.ok) throw new Error((await res.json())?.error ?? 'Error')
                setHecho(true)
                window.setTimeout(() => setHecho(false), 2600)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'No se ha podido guardar')
            } finally {
                setGuardando(false)
            }
        },
        []
    )

    const subirFoto = async (f: File) => {
        setSubiendo(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('file', f)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const j = await res.json()
            if (!res.ok) throw new Error(j?.error ?? 'No se ha podido subir')
            setC((v) => ({ ...v, avatar_path: j.path }))
            await guardar({ avatar_path: j.path })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se ha podido subir')
        } finally {
            setSubiendo(false)
        }
    }

    const quitarFoto = async () => {
        setC((v) => ({ ...v, avatar_path: null }))
        await guardar({ avatar_path: null })
    }

    const iniciales = (c.name ?? c.email ?? '?')
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join('')

    const campo =
        'w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 text-[14.5px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]'
    const etiqueta = 'label-mono block text-[var(--caes-faint)]'

    if (cargando) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando tu cuenta…
            </div>
        )
    }

    return (
        <div className="w-full max-w-[46rem]">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Tu cuenta</p>
                <h1 className="mt-4 text-balance text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    Quién eres <em className="serif-accent">aquí dentro</em>.
                </h1>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Esto vale para toda la plataforma. Lo del negocio — tu comisión, tu
                    documentación profesional — está en tu perfil.
                </p>

                <div className="mt-10 flex flex-col gap-6">
                    {/* ------------------------------------------- persona */}
                    <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Tus datos
                        </h2>

                        <div className="mt-6 flex flex-wrap items-center gap-5">
                            <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--caes-line-2)] bg-[var(--caes-band)]">
                                {avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={avatarUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="font-mono text-[22px] text-[var(--caes-mut)]">
                                        {iniciales}
                                    </span>
                                )}
                                {subiendo && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-[var(--caes-paper)]/70">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </span>
                                )}
                            </span>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => foto.current?.click()}
                                    disabled={subiendo}
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-ink)] px-4 py-2 text-[13.5px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)] disabled:opacity-40"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    {c.avatar_path ? 'Cambiar foto' : 'Poner una foto'}
                                </button>
                                {c.avatar_path && (
                                    <button
                                        type="button"
                                        onClick={quitarFoto}
                                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Quitarla
                                    </button>
                                )}
                                <input
                                    ref={foto}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0]
                                        if (f) void subirFoto(f)
                                        e.target.value = ''
                                    }}
                                />
                            </div>
                        </div>

                        <div className="mt-7 grid gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="nombre" className={etiqueta}>
                                    Nombre o razón social
                                </label>
                                <input
                                    id="nombre"
                                    className={`${campo} mt-2`}
                                    value={c.name ?? ''}
                                    onChange={(e) => setC({ ...c, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="tel" className={etiqueta}>
                                    Teléfono
                                </label>
                                <input
                                    id="tel"
                                    type="tel"
                                    className={`${campo} mt-2`}
                                    value={c.phone ?? ''}
                                    onChange={(e) => setC({ ...c, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="cif" className={etiqueta}>
                                    CIF o NIF
                                </label>
                                <input
                                    id="cif"
                                    className={`${campo} mt-2`}
                                    value={c.nif ?? ''}
                                    onChange={(e) => setC({ ...c, nif: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="dir" className={etiqueta}>
                                    Dirección
                                </label>
                                <input
                                    id="dir"
                                    className={`${campo} mt-2`}
                                    value={c.address ?? ''}
                                    onChange={(e) => setC({ ...c, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-7 flex flex-wrap items-center gap-4">
                            <button
                                type="button"
                                disabled={guardando}
                                onClick={() =>
                                    guardar({
                                        name: c.name,
                                        phone: c.phone,
                                        nif: c.nif,
                                        address: c.address,
                                    })
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--caes-ink)] px-6 py-3 text-[14px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:opacity-40"
                            >
                                {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Guardar
                            </button>
                            {hecho && (
                                <span className="flex items-center gap-2 text-[13.5px] text-[var(--caes-green)]">
                                    <Check className="h-4 w-4" strokeWidth={2.5} />
                                    Guardado
                                </span>
                            )}
                        </div>

                        <p className="mt-5 max-w-[56ch] border-t border-[var(--caes-line-2)] pt-5 text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                            Estos datos salen en los documentos de tus expedientes, así
                            que no hace falta volver a escribirlos en cada uno.
                        </p>
                    </section>

                    {error && (
                        <p
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-[#E0B48C] bg-[#FBF1E7] px-4 py-3 text-[13.5px] leading-[1.5] text-[#7A4A12]"
                        >
                            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                            {error}
                        </p>
                    )}

                    {/* ------------------------------------------- accesso */}
                    <Seguridad email={c.email} />
                </div>
            </div>
        </div>
    )
}

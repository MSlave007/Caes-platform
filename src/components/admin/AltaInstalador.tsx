'use client'

import { useState } from 'react'
import { Check, Copy, Loader2, MessageCircle, UserPlus, X } from 'lucide-react'

type Creado = { id: string; nombre: string; email: string; contraseña: string }

/**
 * Dare di alta un installatore.
 *
 * ── PERCHÉ È QUI E NON IN UNA SCHERMATA SUA ───────────────────────────
 *
 * Perché il momento in cui serve è questo: stai assegnando un
 * espediente e la persona non è nell'elenco. Mandarti in «Instaladores»
 * a crearla e poi tornare indietro vuol dire perdere l'espediente che
 * stavi aprendo.
 *
 * ── LA PASSWORD SI VEDE UNA VOLTA SOLA ────────────────────────────────
 *
 * E si dice a chiare lettere, prima ancora di mostrarla. Un segreto che
 * scompare senza avvisare è un segreto che qualcuno perde: chiude la
 * finestra, e l'unico modo di rimediare è rigenerarlo.
 *
 * Il messaggio è già scritto — come per il link dei papeles — perché è
 * l'unica cosa su cui quella persona agisce, e scriverlo a mano ogni
 * volta vuol dire scriverlo ogni volta un po' peggio.
 */
export default function AltaInstalador({
    onCreado,
    onCerrar,
}: {
    onCreado?: (i: { id: string; nombre: string; email: string }) => void
    onCerrar?: () => void
}) {
    const [nombre, setNombre] = useState('')
    const [empresa, setEmpresa] = useState('')
    const [email, setEmail] = useState('')
    const [telefono, setTelefono] = useState('')

    const [ocupado, setOcupado] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [creado, setCreado] = useState<Creado | null>(null)
    const [copiado, setCopiado] = useState(false)

    const crear = async () => {
        if (ocupado) return
        setOcupado(true)
        setError(null)
        try {
            const r = await fetch('/api/instaladores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, empresa, email, telefono }),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido crear la cuenta.')
                return
            }
            setCreado(j.data)
            onCreado?.({ id: j.data.id, nombre: j.data.nombre, email: j.data.email })
        } catch {
            setError('No se ha podido crear la cuenta.')
        } finally {
            setOcupado(false)
        }
    }

    if (creado) {
        const texto =
            `Hola ${creado.nombre}, ya tienes cuenta en CAES.\n\n` +
            `Entra en ${typeof window !== 'undefined' ? window.location.origin : ''}/login\n` +
            `Correo: ${creado.email}\n` +
            `Contraseña: ${creado.contraseña}\n\n` +
            `Cámbiala la primera vez que entres.`

        return (
            <section className="rounded-2xl border border-[var(--caes-green)]/30 bg-[var(--caes-green)]/[.06] p-6">
                <p className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.018em]">
                    <Check className="h-4 w-4 text-[var(--caes-green)]" strokeWidth={3} />
                    {creado.nombre} ya tiene cuenta
                </p>

                {/* Detto PRIMA di mostrarla: un segreto che scompare senza
                    avvisare è un segreto che qualcuno perde. */}
                <p className="mt-2 max-w-[60ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                    Esta contraseña se ve una sola vez y no se guarda en ningún
                    sitio. Mándasela ahora — si se pierde, hay que hacer otra.
                </p>

                <dl className="mt-4 overflow-hidden rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)]">
                    <div className="flex flex-wrap items-baseline gap-x-3 border-b border-[var(--caes-line)] px-4 py-3">
                        <dt className="label-mono w-[5.5rem] shrink-0 text-[var(--caes-faint)]">
                            Correo
                        </dt>
                        <dd className="min-w-0 break-all font-mono text-[13px]">
                            {creado.email}
                        </dd>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 px-4 py-3">
                        <dt className="label-mono w-[5.5rem] shrink-0 text-[var(--caes-faint)]">
                            Contraseña
                        </dt>
                        <dd className="min-w-0 break-all font-mono text-[13px]">
                            {creado.contraseña}
                        </dd>
                    </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(texto)
                                setCopiado(true)
                                window.setTimeout(() => setCopiado(false), 2200)
                            } catch {
                                /* resta il testo da selezionare */
                            }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-2 text-[13px] transition-colors hover:border-[var(--caes-ink)]/40"
                    >
                        {copiado ? (
                            <>
                                <Check
                                    className="h-3.5 w-3.5 text-[var(--caes-green)]"
                                    strokeWidth={3}
                                />
                                Copiado
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                Copiar el mensaje
                            </>
                        )}
                    </button>

                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-4 py-2 text-[13px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                    </a>

                    <button
                        type="button"
                        onClick={onCerrar}
                        className="ml-auto text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                    >
                        Ya está
                    </button>
                </div>
            </section>
        )
    }

    const listo = nombre.trim().length > 1 && email.includes('@') && !ocupado

    return (
        /**
         * Il verde dice che qui si sta facendo una cosa nuova.
         *
         * Come pannello grigio come gli altri sembrava un modulo da
         * compilare fra tanti. Ma questo non modifica niente: crea una
         * persona che prima non c'era, con le sue chiavi. È lo stesso
         * verde della firma e dei link — le tre cose in questa
         * piattaforma che escono da qui e arrivano a qualcuno.
         */
        <section className="rounded-2xl border border-[var(--caes-green)]/30 bg-gradient-to-br from-[var(--caes-green)]/[.09] via-[var(--caes-panel)] to-[var(--caes-panel)] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--caes-green)]/14 text-[var(--caes-green)]">
                        <UserPlus className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Dar de alta un instalador
                    </h3>
                    <p className="mt-1.5 max-w-[58ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                        Le creamos la cuenta aquí y le pasamos los datos. Desde ese
                        momento el enlace para subir papeles le llega a un sitio, y
                        lo que suba lo encuentra en su panel.
                    </p>
                    </div>
                </div>
                {onCerrar && (
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="shrink-0 rounded-full p-1.5 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Campo
                    etiqueta="Nombre y apellidos"
                    valor={nombre}
                    onCambiar={setNombre}
                    placeholder="Quién es la persona"
                    autoComplete="name"
                />
                <Campo
                    etiqueta="Correo"
                    valor={email}
                    onCambiar={setEmail}
                    placeholder="Con el que entrará"
                    tipo="email"
                    autoComplete="email"
                />
                <Campo
                    etiqueta="Empresa"
                    valor={empresa}
                    onCambiar={setEmpresa}
                    placeholder="Opcional · así aparece en los documentos"
                />
                <Campo
                    etiqueta="Teléfono"
                    valor={telefono}
                    onCambiar={setTelefono}
                    placeholder="Opcional"
                    tipo="tel"
                    autoComplete="tel"
                />
            </div>

            {error && <p className="mt-4 text-[12.5px] text-[var(--caes-mal)]">{error}</p>}

            <button
                type="button"
                onClick={() => void crear()}
                disabled={!listo}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {ocupado ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                )}
                Crear la cuenta
            </button>
        </section>
    )
}

function Campo({
    etiqueta,
    valor,
    onCambiar,
    placeholder,
    tipo = 'text',
    autoComplete,
}: {
    etiqueta: string
    valor: string
    onCambiar: (v: string) => void
    placeholder?: string
    tipo?: string
    autoComplete?: string
}) {
    return (
        <label className="block">
            <span className="text-[13px] font-medium">{etiqueta}</span>
            <input
                type={tipo}
                value={valor}
                autoComplete={autoComplete}
                onChange={(e) => onCambiar(e.target.value)}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[var(--caes-green)]"
            />
        </label>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'

/**
 * Il link da dare al cliente.
 *
 * ── PERCHÉ STA QUI ────────────────────────────────────────────────────
 *
 * La pagina di seguimento esiste, ma se nessuno può darla al cliente è
 * come se non ci fosse. Sta dentro il fascicolo perché è lì che
 * l'installatore è quando il cliente lo chiama — e chiamare è
 * esattamente la cosa che questo link toglie di mezzo.
 *
 * ── PERCHÉ ANCHE WHATSAPP ─────────────────────────────────────────────
 *
 * Perché è lì che l'installatore parla coi clienti, non per email. Non
 * serve nessuna API: `wa.me` apre la conversazione col testo già
 * scritto, e funziona dal telefono, che è dove sta quando serve.
 *
 * Il messaggio è già scritto apposta. «Copia il link» lascia
 * all'installatore il lavoro di spiegare cos'è; scritto da noi è
 * spiegato una volta e bene, e dice anche la cosa che conta di più:
 * che non deve fare niente.
 */
export default function EnlaceCliente({
    token,
    cliente,
    clienteId,
}: {
    /** L'identificatore pubblico del fascicolo. */
    token: string
    cliente?: string | null
    /** La scheda del cliente: da lì viene il telefono per WhatsApp. */
    clienteId?: string | null
}) {
    const [copiado, setCopiado] = useState(false)

    /**
     * Il telefono sta sulla scheda del cliente, non sull'espediente.
     * Si chiede qui invece che dalla pagina perché è l'unico posto che
     * lo usa: caricarlo sempre, per un bottone che c'è solo quando il
     * numero c'è, sarebbe una chiamata in più a ogni apertura.
     */
    const [telefono, setTelefono] = useState<string | null>(null)
    useEffect(() => {
        if (!clienteId) return
        let vivo = true
        fetch(`/api/clientes/${clienteId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (vivo) setTelefono(j?.data?.telefono ?? null)
            })
            .catch(() => {
                /* senza telefono resta «copiar enlace», che basta */
            })
        return () => {
            vivo = false
        }
    }, [clienteId])

    // Costruito nel browser: il server non sa su che dominio è servito.
    const enlace =
        typeof window === 'undefined'
            ? ''
            : `${window.location.origin}/seguimiento/${token}`

    /**
     * Il nome di battesimo, solo se ce n'è uno.
     *
     * Prendere la prima parola e basta dava «Hola Hotel» e «Hola
     * Comunidad»: con le aziende il primo pezzo del nome non è un nome.
     * Quando non si capisce, si saluta e basta — che è sempre corretto.
     */
    const EMPRESA = /^(hotel|comunidad|inmobiliaria|residencial|edificio|finca|asoc|fund|s\.?l\.?|s\.?a\.?|c\.?b\.?)/i
    const trozos = (cliente ?? '').trim().split(/\s+/).filter(Boolean)
    const nombre =
        trozos.length > 0 && trozos.length <= 4 && !EMPRESA.test(trozos[0])
            ? trozos[0]
            : ''
    const texto = `Hola${nombre ? ' ' + nombre : ''}, aquí puedes ver cómo va tu ayuda por la instalación, sin tener que registrarte ni llamarme: ${enlace}\n\nSe actualiza sola. No tienes que hacer nada.`

    const soloNumeros = (telefono ?? '').replace(/[^0-9]/g, '')
    const whatsapp =
        soloNumeros.length >= 9
            ? `https://wa.me/${soloNumeros.length === 9 ? '34' + soloNumeros : soloNumeros}?text=${encodeURIComponent(texto)}`
            : null

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(enlace)
            setCopiado(true)
            window.setTimeout(() => setCopiado(false), 2200)
        } catch {
            /* senza permesso di appunti resta il link da selezionare a mano */
        }
    }

    return (
        <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                Enlace para tu cliente
            </h2>
            <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                Le enseña en qué punto está, sin cuenta ni contraseña. No ve ni tu
                comisión ni la nuestra, ni los documentos: solo cómo va lo suyo.
            </p>

            <p className="mt-5 overflow-x-auto rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-4 py-3 font-mono text-[12.5px] text-[var(--caes-mut)]">
                {enlace || '…'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={copiar}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2.5 text-[13.5px] transition-colors hover:border-[var(--caes-ink)]/40"
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
                            Copiar enlace
                        </>
                    )}
                </button>

                {whatsapp && (
                    <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Mandarlo por WhatsApp
                    </a>
                )}
            </div>
        </section>
    )
}

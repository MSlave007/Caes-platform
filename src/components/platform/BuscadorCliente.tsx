'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, UserPlus } from 'lucide-react'

/**
 * Il cliente: si cerca fra i propri, o si scrive nuovo.
 *
 * ── COSA RISOLVE ──────────────────────────────────────────────────────
 *
 * Il nome del cliente si riscriveva a mano a ogni espediente, insieme a
 * NIF, telefono e indirizzo. Lo stesso cliente che fa due installazioni
 * — la caldaia quest'anno, l'aria l'anno prossimo — era due volte dati
 * diversi che nessuno collegava. E una cifra sbagliata nel NIF la
 * seconda volta non la vedeva nessuno.
 *
 * ── PERCHÉ NON È UN ELENCO A TENDINA ──────────────────────────────────
 *
 * Perché la maggior parte delle volte il cliente è nuovo. Un elenco a
 * tendina mette la scelta prima della scrittura e costringe chi ha un
 * cliente nuovo a passare da «nessuno di questi». Qui si scrive e
 * basta: se sotto compare qualcuno che assomiglia, lo si prende; se no
 * si continua a scrivere e diventa una scheda nuova.
 */

export type Cliente = {
    id?: string
    nombre: string
    nif?: string | null
    telefono?: string | null
    email?: string | null
    direccion?: string | null
}

export default function BuscadorCliente({
    valor,
    onElegir,
    onEscribir,
    className,
    id = 'buscador-cliente',
}: {
    valor: string
    /** Un cliente già esistente: riempie tutto il resto. */
    onElegir: (c: Cliente) => void
    /** Sta scrivendo un nome: potrebbe diventare un cliente nuovo. */
    onEscribir: (nombre: string) => void
    className?: string
    id?: string
}) {
    const [sugerencias, setSugerencias] = useState<Cliente[]>([])
    const [buscando, setBuscando] = useState(false)
    const [abierto, setAbierto] = useState(false)
    const [elegido, setElegido] = useState<string | null>(null)
    const caja = useRef<HTMLDivElement>(null)

    /* ------------------------------------------------------- ricerca */
    useEffect(() => {
        const q = valor.trim()
        // Sotto due lettere ogni cliente assomiglia a ogni cliente.
        if (q.length < 2 || elegido === q) {
            setSugerencias([])
            return
        }

        let vivo = true
        const t = window.setTimeout(async () => {
            setBuscando(true)
            try {
                const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`)
                const j = await res.json()
                if (vivo) {
                    setSugerencias(j.data ?? [])
                    setAbierto(true)
                }
            } catch {
                /* senza rete si scrive a mano, come prima */
            } finally {
                if (vivo) setBuscando(false)
            }
            // Un terzo di secondo: abbastanza da non chiamare per ogni
            // lettera, poco da non sembrare lento mentre si scrive.
        }, 300)

        return () => {
            vivo = false
            window.clearTimeout(t)
        }
    }, [valor, elegido])

    /* ------------------------------------------- chiusura al di fuori */
    useEffect(() => {
        const fuera = (e: MouseEvent) => {
            if (caja.current && !caja.current.contains(e.target as Node)) {
                setAbierto(false)
            }
        }
        document.addEventListener('mousedown', fuera)
        return () => document.removeEventListener('mousedown', fuera)
    }, [])

    const tomar = (c: Cliente) => {
        setElegido(c.nombre)
        setAbierto(false)
        setSugerencias([])
        onElegir(c)
    }

    return (
        <div ref={caja} className="relative">
            <input
                id={id}
                className={className}
                value={valor}
                autoComplete="off"
                onChange={(e) => {
                    setElegido(null)
                    onEscribir(e.target.value)
                }}
                onFocus={() => sugerencias.length > 0 && setAbierto(true)}
                placeholder="Nombre y apellidos"
            />

            {buscando && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--caes-faint)]" />
            )}
            {elegido === valor && valor && (
                <Check
                    className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--caes-green)]"
                    strokeWidth={3}
                />
            )}

            {abierto && sugerencias.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] shadow-[0_18px_40px_-20px_rgba(6,35,26,.35)]">
                    <li className="border-b border-[var(--caes-line-2)] px-4 py-2">
                        <span className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[var(--caes-faint)]">
                            Ya lo tienes
                        </span>
                    </li>
                    {sugerencias.map((c) => (
                        <li key={c.id}>
                            <button
                                type="button"
                                onClick={() => tomar(c)}
                                className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-[var(--caes-band)]"
                            >
                                <span className="text-[14px] text-[var(--caes-ink)]">
                                    {c.nombre}
                                </span>
                                <span className="text-[12px] text-[var(--caes-faint)]">
                                    {[c.nif, c.telefono, c.direccion]
                                        .filter(Boolean)
                                        .join(' · ') || 'Sin más datos'}
                                </span>
                            </button>
                        </li>
                    ))}
                    <li className="border-t border-[var(--caes-line-2)] px-4 py-2.5">
                        <span className="flex items-center gap-2 text-[12.5px] text-[var(--caes-mut)]">
                            <UserPlus className="h-3.5 w-3.5 text-[var(--caes-faint)]" />
                            O sigue escribiendo: si no está, se crea al enviar.
                        </span>
                    </li>
                </ul>
            )}
        </div>
    )
}

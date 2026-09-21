'use client'

import Link from 'next/link'
import { ArrowLeft, Home, Wrench } from 'lucide-react'
import StatusChip from '@/components/platform/StatusChip'
import PestanasExpediente from './PestanasExpediente'

/**
 * La testa di un espediente, uguale su tutte le sue schede.
 *
 * ── PERCHÉ È UN COMPONENTE E NON DUE INTESTAZIONI ─────────────────────
 *
 * Le schede «Revisión» e «Documentos» c'erano già, ma passando alla
 * seconda sparivano il nome del cliente, il numero e lo stato: al loro
 * posto compariva un altro titolo. Il risultato è che non sembrava una
 * scheda della stessa pratica, sembrava un'altra pagina — e infatti per
 * tornare veniva istintivo il tasto indietro del browser.
 *
 * Quello che identifica la pratica deve restare fermo mentre cambia
 * quello che ci si fa dentro. È la differenza fra due viste e due
 * pagine, e si vede solo se l'intestazione non si muove di un pixel.
 */
export default function CabeceraExpediente({
    id,
    numero,
    cliente,
    instalador,
    direccion,
    origen,
    estado,
    activa,
    pendientes,
}: {
    id: string
    /** Il numero mostrato. Su Supabase è un UUID: si accorcia. */
    numero: string
    cliente: string
    instalador?: string | null
    direccion?: string | null
    origen?: 'installer' | 'client'
    estado?: string
    activa: 'revision' | 'documentos'
    pendientes?: number
}) {
    // Un UUID intero in un titolo non lo legge nessuno e non lo ripete
    // nessuno al telefono. I primi otto bastano a distinguerlo.
    const corto = numero.length > 12 ? numero.slice(0, 8) : numero

    return (
        <div className="flex flex-col gap-6 print:hidden">
            <Link
                href="/admin/review"
                className="group inline-flex w-fit items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
            >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                Volver a la cola
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{
                                background:
                                    origen === 'client'
                                        ? 'rgba(199,240,74,.28)'
                                        : 'var(--caes-band)',
                            }}
                            title={
                                origen === 'client'
                                    ? 'Lo abre el cliente'
                                    : 'Lo abre el instalador'
                            }
                        >
                            {origen === 'client' ? (
                                <Home className="h-4 w-4 text-[var(--caes-lime-ink)]" strokeWidth={1.7} />
                            ) : (
                                <Wrench className="h-4 w-4 text-[var(--caes-mut)]" strokeWidth={1.7} />
                            )}
                        </span>
                        <span className="label-mono text-[var(--caes-mut)]">
                            Expediente #{corto} ·{' '}
                            {origen === 'client' ? 'Lo abre el cliente' : 'Lo abre el instalador'}
                        </span>
                    </div>

                    <h1 className="mt-4 text-balance text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {cliente}
                    </h1>
                    <p className="mt-2 text-[14px] text-[var(--caes-mut)]">
                        {instalador ?? 'Sin instalador asignado'}
                        {direccion ? ` · ${direccion}` : ''}
                    </p>
                </div>

                {estado && <StatusChip status={estado} />}
            </div>

            <PestanasExpediente id={id} activa={activa} pendientes={pendientes} />
        </div>
    )
}

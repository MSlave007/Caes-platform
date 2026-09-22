'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'

type Instalador = { id: string; nombre: string; email: string | null }

/**
 * Aprire un espediente dall'agenzia e darlo a un installatore.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Fino a ieri una pratica poteva nascere in un modo solo: la apriva
 * l'installatore. Ma il giro vero è anche l'altro — arriva un cliente,
 * l'agenzia sa chi copre quella zona, apre lei e gliela assegna.
 *
 * All'installatore resta il suo pezzo di lavoro, che è mettere i
 * documenti dell'obra. Il resto lo fa chi rivede, che vede tutto
 * comunque.
 *
 * ── PERCHÉ CHIEDE POCHISSIMO ──────────────────────────────────────────
 *
 * Tre campi. Tutto il resto — importi, potenze, date — esce dai
 * documenti quando arrivano, e chiederlo adesso vorrebbe dire farlo
 * scrivere a mano a qualcuno che non ce l'ha davanti.
 *
 * ── PERCHÉ NASCE `draft` ──────────────────────────────────────────────
 *
 * Perché le carte non ci sono. Farla nascere «inviata» la metterebbe in
 * coda di revisione vuota: lavoro che compare e non si può fare.
 */
export default function AbrirExpediente() {
    const router = useRouter()
    const [abierto, setAbierto] = useState(false)
    const [lista, setLista] = useState<Instalador[] | null>(null)

    const [cliente, setCliente] = useState('')
    const [direccion, setDireccion] = useState('')
    const [instalador, setInstalador] = useState('')

    const [ocupado, setOcupado] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!abierto || lista) return
        let vivo = true
        fetch('/api/instaladores')
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => vivo && setLista(j?.data ?? []))
            .catch(() => vivo && setLista([]))
        return () => {
            vivo = false
        }
    }, [abierto, lista])

    const crear = async () => {
        if (!cliente.trim() || ocupado) return
        setOcupado(true)
        setError(null)
        try {
            const r = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_name: cliente.trim(),
                    address: direccion.trim(),
                    installer_id: instalador || undefined,
                    installer_name:
                        lista?.find((i) => i.id === instalador)?.nombre ?? undefined,
                }),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido crear.')
                return
            }

            /**
             * L'avviso passa dalla rotta di assegnazione, non duplicato
             * qui.
             *
             * Creare e assegnare sono due cose e l'avviso sta attaccato
             * alla seconda — vedi `/api/projects/[id]/asignar`. Scrivere
             * un secondo posto che manda la stessa email vorrebbe dire
             * due testi da tenere allineati, e non restano allineati.
             */
            if (instalador) {
                await fetch(`/api/projects/${j.data.id}/asignar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        installerId: instalador,
                        nombre: lista?.find((i) => i.id === instalador)?.nombre,
                    }),
                }).catch(() => {
                    /* creato comunque: l'avviso non deve far fallire */
                })
            }

            router.push(`/admin/review/${j.data.id}`)
        } catch {
            setError('No se ha podido crear el expediente.')
        } finally {
            setOcupado(false)
        }
    }

    if (!abierto) {
        return (
            <button
                type="button"
                onClick={() => setAbierto(true)}
                className="inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-5 py-3 text-[14px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
            >
                <Plus className="h-4 w-4" />
                Abrir un expediente
            </button>
        )
    }

    return (
        // `w-full`: dentro la riga d'intestazione, che e flessibile, il
        // pannello va a capo da solo invece di schiacciare «Exportar CSV»
        // di lato a meta altezza.
        <section className="w-full rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Abrir un expediente
                    </h2>
                    <p className="mt-1.5 max-w-[56ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                        Lo abres tú y se lo das a un instalador. Él solo tiene que
                        subir los papeles de la obra — el resto lo llevas tú.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    aria-label="Cerrar"
                    className="shrink-0 rounded-full p-1.5 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="text-[13px] font-medium">Cliente</span>
                    <input
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        placeholder="Nombre o razón social"
                        className="mt-1.5 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[var(--caes-green)]"
                    />
                </label>

                <label className="block">
                    <span className="text-[13px] font-medium">Instalador</span>
                    <select
                        value={instalador}
                        onChange={(e) => setInstalador(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[var(--caes-green)]"
                    >
                        <option value="">
                            {lista === null ? 'Cargando…' : 'Decidirlo después'}
                        </option>
                        {(lista ?? []).map((i) => (
                            <option key={i.id} value={i.id}>
                                {i.nombre}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block sm:col-span-2">
                    <span className="text-[13px] font-medium">Dirección de la obra</span>
                    <input
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Calle, número, población"
                        className="mt-1.5 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[var(--caes-green)]"
                    />
                    <span className="mt-1.5 block text-[12px] text-[var(--caes-faint)]">
                        Lo demás sale de los documentos cuando lleguen.
                    </span>
                </label>
            </div>

            {error && (
                <p className="mt-4 text-[12.5px] text-[var(--caes-mal)]">{error}</p>
            )}

            <button
                type="button"
                onClick={() => void crear()}
                disabled={!cliente.trim() || ocupado}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {ocupado ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Plus className="h-3.5 w-3.5" />
                )}
                Abrirlo
            </button>
        </section>
    )
}

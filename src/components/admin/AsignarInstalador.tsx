'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, UserPlus } from 'lucide-react'

type Instalador = { id: string; nombre: string; email: string | null }

/**
 * Dare un espediente a un installatore.
 *
 * ── PERCHÉ L'ELENCO NON SI RICAVA DAGLI ESPEDIENTI ────────────────────
 *
 * Perché servirebbe il contrario: chi non ha mai mandato niente è
 * esattamente quello a cui vogliamo darne uno. L'elenco arriva dagli
 * account veri — vedi `/api/instaladores`.
 *
 * ── PERCHÉ DICE CHE VERRÀ AVVISATO ────────────────────────────────────
 *
 * Perché chi assegna deve sapere che sta facendo squillare un telefono.
 * Un'azione che manda una email senza dirlo è un'azione che si preme
 * per sbaglio.
 */
export default function AsignarInstalador({
    expedienteId,
    actual,
    onHecho,
}: {
    expedienteId: string
    /** Il nome di chi ce l'ha adesso, se c'è già qualcuno. */
    actual?: string | null
    onHecho?: (nombre: string) => void
}) {
    const [lista, setLista] = useState<Instalador[] | null>(null)
    const [elegido, setElegido] = useState('')
    const [ocupado, setOcupado] = useState(false)
    const [hecho, setHecho] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let vivo = true
        fetch('/api/instaladores')
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => vivo && setLista(j?.data ?? []))
            .catch(() => vivo && setLista([]))
        return () => {
            vivo = false
        }
    }, [])

    const asignar = async () => {
        if (!elegido || ocupado) return
        setOcupado(true)
        setError(null)
        try {
            const nombre = lista?.find((i) => i.id === elegido)?.nombre ?? ''
            const r = await fetch(`/api/projects/${expedienteId}/asignar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installerId: elegido, nombre }),
            })
            const j = await r.json()
            if (!r.ok) {
                setError(j?.error ?? 'No se ha podido asignar.')
                return
            }
            const puesto = j.data?.installer_name ?? nombre
            setHecho(puesto)
            onHecho?.(puesto)
        } catch {
            setError('No se ha podido asignar.')
        } finally {
            setOcupado(false)
        }
    }

    if (hecho) {
        return (
            <p className="flex items-center gap-2 text-[13.5px] text-[var(--caes-green)]">
                <Check className="h-4 w-4" strokeWidth={3} />
                Asignado a {hecho}. Ya lo tiene en su panel.
            </p>
        )
    }

    const conCorreo = lista?.find((i) => i.id === elegido)?.email

    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
                <select
                    value={elegido}
                    onChange={(e) => setElegido(e.target.value)}
                    disabled={!lista || lista.length === 0}
                    className="min-w-[16rem] rounded-[6px] border border-[var(--caes-line)] bg-white px-3 py-2 text-[13.5px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)] disabled:opacity-50"
                >
                    <option value="">
                        {lista === null
                            ? 'Cargando…'
                            : lista.length === 0
                              ? 'No hay instaladores dados de alta'
                              : actual
                                ? `Ahora lo tiene ${actual} — cambiar a…`
                                : 'Elige un instalador'}
                    </option>
                    {(lista ?? []).map((i) => (
                        <option key={i.id} value={i.id}>
                            {i.nombre}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={() => void asignar()}
                    disabled={!elegido || ocupado}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-4 py-2 text-[13px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {ocupado ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Asignárselo
                </button>
            </div>

            {/* Chi assegna deve sapere che sta facendo squillare un
                telefono — o che NON lo sta facendo, se manca l'email. */}
            {elegido && (
                <p className="text-[12.5px] text-[var(--caes-faint)]">
                    {conCorreo
                        ? `Le llegará un correo a ${conCorreo} y lo verá en su panel.`
                        : 'Lo verá en su panel. No tiene correo en su perfil, así que no le llega aviso.'}
                </p>
            )}

            {error && (
                <p className="text-[12.5px] text-[var(--caes-mal)]">{error}</p>
            )}
        </div>
    )
}

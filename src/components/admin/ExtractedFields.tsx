'use client'

import { Check, AlertTriangle, Sparkles } from 'lucide-react'
import {
    CAMPOS,
    CONFIANZA_BAJA,
    type CampoDef,
    type Extraccion,
    type ValorCampo,
} from '@/lib/caes/extraction'

/**
 * I dati estratti dai documenti, da confermare o correggere.
 *
 * Il principio: **l'estrazione propone, non decide.** Ogni valore arriva
 * con una confidenza; chi rivede conferma o corregge, con il documento
 * aperto accanto. Un valore che finisce nel fascicolo senza passare da qui
 * è un valore di cui nessuno risponde — e va in carte che qualcuno firma e
 * per cui risponde dieci anni.
 *
 * I campi sono raggruppati per documento di provenienza, non per tipo di
 * dato: si rivede un documento alla volta, guardandolo.
 */

type Props = {
    extraccion: Extraccion
    /** Documento attualmente aperto nel visore, per evidenziarne i campi. */
    documentoAbierto?: string | null
    onAbrirDocumento: (documentoId: string) => void
    onCambiar: (campoId: string, valor: string) => void
    onConfirmar: (campoId: string) => void
    /** Etichette dei documenti, da src/lib/documents.ts */
    etiquetaDocumento: (id: string) => string
}

function Fila({
    def,
    v,
    onCambiar,
    onConfirmar,
}: {
    def: CampoDef
    v: ValorCampo
    onCambiar: (valor: string) => void
    onConfirmar: () => void
}) {
    const confirmado = v.estado === 'confirmado' || v.estado === 'corregido'
    const dudoso = !confirmado && typeof v.confianza === 'number' && v.confianza < CONFIANZA_BAJA
    const vacio = v.estado === 'vacio' || v.valor === null || v.valor === ''

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--caes-line-2)] py-3 last:border-b-0">
            <span className="min-w-[150px] flex-1 text-[13.5px] leading-[1.35] text-[var(--caes-mut)]">
                {def.label}
                {def.destino !== 'documentos' && (
                    <span
                        title="Entra en el cálculo"
                        className="ml-2 font-mono text-[9px] uppercase tracking-[.1em] text-[var(--caes-green)]"
                    >
                        fórmula
                    </span>
                )}
            </span>

            <span className="flex items-center gap-2">
                {def.tipo === 'opcion' ? (
                    <select
                        value={String(v.valor ?? '')}
                        onChange={(e) => onCambiar(e.target.value)}
                        className="w-[168px] rounded-[6px] border border-[var(--caes-line)] bg-white px-3 py-1.5 text-[14px] text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)]"
                    >
                        <option value="">—</option>
                        {def.opciones?.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        value={String(v.valor ?? '')}
                        onChange={(e) => onCambiar(e.target.value)}
                        inputMode={def.tipo === 'numero' ? 'decimal' : undefined}
                        placeholder="—"
                        className={`w-[130px] rounded-[6px] border bg-white px-3 py-1.5 text-[14px] tabular-nums text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)] ${dudoso ? 'border-[#D9A94F]' : 'border-[var(--caes-line)]'
                            }`}
                    />
                )}

                {def.unidad ? (
                    <span className="w-[74px] font-mono text-[11px] text-[var(--caes-faint)]">
                        {def.unidad}
                    </span>
                ) : (
                    <span className="w-[74px]" />
                )}

                <button
                    type="button"
                    onClick={onConfirmar}
                    disabled={vacio}
                    title={confirmado ? 'Confirmado' : 'Confirmar este valor'}
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${confirmado
                            ? 'bg-[var(--caes-green)] text-white'
                            : 'border border-[var(--caes-line)] text-[var(--caes-faint)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)] disabled:opacity-30'
                        }`}
                >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
            </span>

            {dudoso && (
                <span className="flex w-full items-center gap-1.5 text-[12px] text-[#8A5B0B]">
                    <AlertTriangle className="h-3 w-3" />
                    Lectura poco segura ({Math.round((v.confianza ?? 0) * 100)} %). Abre el
                    documento y compruébalo.
                </span>
            )}
            {!dudoso && def.ayuda && !confirmado && (
                <span className="w-full text-[12px] leading-[1.4] text-[var(--caes-faint)]">
                    {def.ayuda}
                </span>
            )}
        </div>
    )
}

export default function ExtractedFields({
    extraccion,
    documentoAbierto,
    onAbrirDocumento,
    onCambiar,
    onConfirmar,
    etiquetaDocumento,
}: Props) {
    const porDocumento = CAMPOS.reduce<Record<string, CampoDef[]>>((acc, c) => {
        ;(acc[c.documento] ??= []).push(c)
        return acc
    }, {})

    return (
        <div className="flex flex-col gap-5">
            {Object.entries(porDocumento).map(([docId, campos]) => {
                const abierto = documentoAbierto === docId
                const pendientes = campos.filter(
                    (c) => !['confirmado', 'corregido'].includes(extraccion[c.id]?.estado ?? 'vacio')
                ).length

                return (
                    <section
                        key={docId}
                        className={`rounded-[10px] border bg-[var(--caes-panel)] transition-colors ${abierto ? 'border-[var(--caes-ink)]' : 'border-[var(--caes-line)]'
                            }`}
                    >
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--caes-line-2)] px-5 py-3">
                            <span className="flex items-center gap-2.5">
                                <Sparkles className="h-3.5 w-3.5 text-[var(--caes-green)]" />
                                <span className="text-[14px] font-semibold tracking-[-0.015em] text-[var(--caes-ink)]">
                                    {etiquetaDocumento(docId)}
                                </span>
                                {pendientes > 0 ? (
                                    <span className="rounded-full bg-[#D9A94F]/16 px-2.5 py-0.5 text-[11px] font-medium text-[#8A5B0B]">
                                        {pendientes} sin confirmar
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-[var(--caes-green)]/12 px-2.5 py-0.5 text-[11px] font-medium text-[var(--caes-green)]">
                                        Todo confirmado
                                    </span>
                                )}
                            </span>

                            <button
                                type="button"
                                onClick={() => onAbrirDocumento(docId)}
                                className="text-[13px] text-[var(--caes-mut)] underline underline-offset-4 transition-colors hover:text-[var(--caes-ink)]"
                            >
                                {abierto ? 'Viendo' : 'Ver documento'}
                            </button>
                        </header>

                        <div className="px-5 py-1">
                            {campos.map((c) => (
                                <Fila
                                    key={c.id}
                                    def={c}
                                    v={extraccion[c.id] ?? { valor: null, estado: 'vacio' }}
                                    onCambiar={(valor) => onCambiar(c.id, valor)}
                                    onConfirmar={() => onConfirmar(c.id)}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

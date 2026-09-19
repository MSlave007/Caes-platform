'use client'

import { useState } from 'react'
import { Check, ChevronRight, AlertTriangle } from 'lucide-react'
import DocumentViewer from './DocumentViewer'
import {
    camposDe,
    CONFIANZA_BAJA,
    type CampoDef,
    type Extraccion,
    type ValorCampo,
} from '@/lib/caes/extraction'
import type { DocSpec } from '@/lib/documents'

/**
 * Revisione di un fascicolo: documenti e dati estratti, insieme.
 *
 * ── PERCHÉ È UNA LISTA SOLA ───────────────────────────────────────────
 *
 * Prima erano due colonne parallele: i documenti a sinistra, i dati
 * estratti a destra. Scorrevano entrambe, e il collegamento fra «questo
 * dato» e «quel documento» lo doveva fare chi rivede, a mente. Con otto
 * documenti diventava uno scorrimento lungo che mostrava poco.
 *
 * Qui i dati stanno DENTRO il documento da cui escono. Chiuso, ogni
 * documento è una riga sola con il suo conteggio. Aperto, occupa tutta la
 * larghezza: documento da una parte, i suoi campi dall'altra, affiancati.
 * Il collegamento è fisico, non da ricostruire.
 *
 * ── L'ORDINE È INFORMAZIONE ───────────────────────────────────────────
 *
 * Prima i documenti da cui si estrae qualcosa, ordinati per quanto
 * pesano: il certificato energetico e la scheda tecnica danno i cinque
 * numeri della formula, e stanno in cima. In fondo, separati, quelli che
 * servono solo come riscontro e da cui non si prende niente: si spuntano
 * e basta.
 */

type Props = {
    specs: DocSpec[]
    /** Documenti effettivamente caricati, con il loro percorso. */
    subidos: { id: string; name: string; path?: string }[]
    verified: Record<string, boolean>
    onVerificar: (docId: string) => void
    extraccion: Extraccion
    onCambiar: (campoId: string, valor: string) => void
    onConfirmar: (campoId: string) => void
}

function Campo({
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
    const vacio = v.valor === null || v.valor === ''

    return (
        <div className="flex flex-col gap-1 border-b border-[var(--caes-line-2)] py-2.5 last:border-b-0">
            <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--caes-mut)]">
                    {def.label}
                    {def.destino !== 'documentos' && (
                        <span
                            title="Entra en el cálculo del CAE"
                            className="ml-1.5 text-[var(--caes-green)]"
                        >
                            ·
                        </span>
                    )}
                </span>

                {def.tipo === 'opcion' ? (
                    <select
                        value={String(v.valor ?? '')}
                        onChange={(e) => onCambiar(e.target.value)}
                        className="w-[150px] rounded-[6px] border border-[var(--caes-line)] bg-white px-2.5 py-1.5 text-[13.5px] text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)]"
                    >
                        <option value="">—</option>
                        {def.opciones?.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="flex items-baseline gap-1.5">
                        <input
                            value={String(v.valor ?? '')}
                            onChange={(e) => onCambiar(e.target.value)}
                            inputMode={def.tipo === 'numero' ? 'decimal' : undefined}
                            placeholder="—"
                            className={`w-[104px] rounded-[6px] border bg-white px-2.5 py-1.5 text-right text-[13.5px] tabular-nums text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)] ${dudoso ? 'border-[#D9A94F]' : 'border-[var(--caes-line)]'
                                }`}
                        />
                        <span className="w-[62px] font-mono text-[10px] text-[var(--caes-faint)]">
                            {def.unidad ?? ''}
                        </span>
                    </span>
                )}

                <button
                    type="button"
                    onClick={onConfirmar}
                    disabled={vacio}
                    title={confirmado ? 'Confirmado' : 'Confirmar'}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${confirmado
                            ? 'bg-[var(--caes-green)] text-white'
                            : 'border border-[var(--caes-line)] text-[var(--caes-faint)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)] disabled:opacity-25'
                        }`}
                >
                    <Check className="h-3 w-3" strokeWidth={3} />
                </button>
            </div>

            {dudoso && (
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#8A5B0B]">
                    <AlertTriangle className="h-3 w-3" />
                    Lectura poco segura ({Math.round((v.confianza ?? 0) * 100)} %)
                </span>
            )}
        </div>
    )
}

export default function DocumentReview({
    specs,
    subidos,
    verified,
    onVerificar,
    extraccion,
    onCambiar,
    onConfirmar,
}: Props) {
    const [abierto, setAbierto] = useState<string | null>(null)

    const mapa = new Map(subidos.map((d) => [d.id, d]))

    const conDatos = specs
        .filter((s) => camposDe(s.id).length > 0)
        .sort((a, b) => camposDe(b.id).length - camposDe(a.id).length)
    const sinDatos = specs.filter((s) => camposDe(s.id).length === 0)

    const fila = (s: DocSpec) => {
        const doc = mapa.get(s.id)
        const has = Boolean(doc)
        const ok = verified[s.id]
        const campos = camposDe(s.id)
        const pendientes = campos.filter(
            (c) => !['confirmado', 'corregido'].includes(extraccion[c.id]?.estado ?? 'vacio')
        ).length
        const esAbierto = abierto === s.id

        return (
            <li
                key={s.id}
                className={`overflow-hidden rounded-xl border transition-colors ${!has
                        ? 'border-dashed border-[var(--caes-line)]'
                        : esAbierto
                            ? 'border-[var(--caes-ink)]'
                            : ok
                                ? 'border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.04]'
                                : 'border-[var(--caes-line)]'
                    }`}
            >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setAbierto(esAbierto ? null : s.id)}
                        disabled={!has}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                    >
                        <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 text-[var(--caes-faint)] transition-transform ${esAbierto ? 'rotate-90' : ''
                                } ${!has ? 'opacity-0' : ''}`}
                            strokeWidth={2.5}
                        />
                        <span className="min-w-0">
                            <span
                                className={`block truncate text-[14px] font-medium ${has ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                    }`}
                            >
                                {s.label}
                            </span>
                            {!has && (
                                <span className="text-[12px] text-[var(--caes-faint)]">
                                    {s.required ? 'Falta · obligatorio' : 'No aportado · opcional'}
                                </span>
                            )}
                        </span>
                    </button>

                    {has && campos.length > 0 && (
                        <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${pendientes > 0
                                    ? 'bg-[#D9A94F]/16 text-[#8A5B0B]'
                                    : 'bg-[var(--caes-green)]/12 text-[var(--caes-green)]'
                                }`}
                        >
                            {pendientes > 0
                                ? `${pendientes} de ${campos.length} sin confirmar`
                                : `${campos.length} datos confirmados`}
                        </span>
                    )}

                    {has && (
                        <button
                            type="button"
                            onClick={() => onVerificar(s.id)}
                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${ok
                                    ? 'bg-[var(--caes-green)] text-white'
                                    : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                                }`}
                        >
                            {ok ? 'Verificado' : 'Verificar'}
                        </button>
                    )}
                </div>

                {/* Aperto: documento e suoi campi affiancati, tutta la larghezza */}
                {esAbierto && has && (
                    <div className="grid gap-5 border-t border-[var(--caes-line-2)] bg-[var(--caes-band)]/40 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                        <div className="min-h-[300px]">
                            <DocumentViewer
                                key={s.id}
                                path={doc?.path}
                                nombre={s.label}
                                onClose={() => setAbierto(null)}
                            />
                        </div>

                        <div className="flex flex-col">
                            {campos.length > 0 ? (
                                <>
                                    <span className="mb-1 font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                                        Lo que sale de aquí
                                    </span>
                                    {campos.map((c) => (
                                        <Campo
                                            key={c.id}
                                            def={c}
                                            v={extraccion[c.id] ?? { valor: null, estado: 'vacio' }}
                                            onCambiar={(valor) => onCambiar(c.id, valor)}
                                            onConfirmar={() => onConfirmar(c.id)}
                                        />
                                    ))}
                                </>
                            ) : (
                                <p className="text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                                    De este documento no se extrae ningún dato. Sirve como
                                    comprobación: mira que coincida con los demás y márcalo.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </li>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-2.5">{conDatos.map(fila)}</ul>

            {sinDatos.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                        Solo comprobación · no se extrae nada
                    </span>
                    <ul className="flex flex-col gap-2.5">{sinDatos.map(fila)}</ul>
                </div>
            )}
        </div>
    )
}

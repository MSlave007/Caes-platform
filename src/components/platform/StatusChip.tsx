'use client'

/**
 * Stato di un espediente, sempre uguale ovunque compaia.
 *
 * Il colore non basta da solo — chi non distingue verde e ambra vedrebbe due
 * pastiglie identiche — quindi lo stato è scritto per esteso e ogni stato ha
 * anche un puntino di tono diverso.
 *
 * Prima questo file teneva la SUA tabella di cinque stati, e tutto quello
 * che non riconosceva finiva su «Borrador»: un espediente in attesa di firme
 * si mostrava all'installatore come se non fosse mai stato inviato. Ora le
 * etichette vengono da src/lib/caes/status.ts, che è la fonte unica.
 */

import { estado, normalize, type EstadoId } from '@/lib/caes/status'

export type Status = EstadoId

/**
 * Si riesporta: sei schermate la importavano da qui.
 *
 * Adesso vive in `status.ts`, dove vivono gli stati — ma cambiare sei
 * import per spostare una funzione vuol dire toccare sei file per
 * niente.
 */
export { normalize }

const TONO: Record<string, { dot: string; bg: string; fg: string }> = {
    neutral: {
        dot: 'bg-[var(--caes-faint)]',
        bg: 'bg-[var(--caes-band)]',
        fg: 'text-[var(--caes-mut)]',
    },
    info: {
        dot: 'bg-[var(--caes-info-hi)]',
        bg: 'bg-[var(--caes-info-hi)]/14',
        fg: 'text-[var(--caes-info-ink)]',
    },
    warn: {
        dot: 'bg-[var(--caes-falta)]',
        bg: 'bg-[var(--caes-falta)]/16',
        fg: 'text-[var(--caes-falta-ink)]',
    },
    ok: {
        dot: 'bg-[var(--caes-green)]',
        bg: 'bg-[var(--caes-green)]/12',
        fg: 'text-[var(--caes-green)]',
    },
    bad: {
        dot: 'bg-[var(--caes-bloqueo)]',
        bg: 'bg-[var(--caes-bloqueo)]/14',
        fg: 'text-[var(--caes-bloqueo-ink)]',
    },
}

export default function StatusChip({ status }: { status?: string }) {
    const e = estado(normalize(status))
    const t = TONO[e.tone] ?? TONO.neutral
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] font-medium ${t.bg} ${t.fg}`}
            title={e.hint}
        >
            <i className={`block h-[6px] w-[6px] rounded-full ${t.dot}`} />
            {e.label}
        </span>
    )
}

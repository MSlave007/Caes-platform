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

import { estado, type EstadoId } from '@/lib/caes/status'

export type Status = EstadoId

const TONO: Record<string, { dot: string; bg: string; fg: string }> = {
    neutral: {
        dot: 'bg-[var(--caes-faint)]',
        bg: 'bg-[var(--caes-band)]',
        fg: 'text-[var(--caes-mut)]',
    },
    info: {
        dot: 'bg-[#8CBBF5]',
        bg: 'bg-[#8CBBF5]/14',
        fg: 'text-[#2E6FB8]',
    },
    warn: {
        dot: 'bg-[#D9A94F]',
        bg: 'bg-[#D9A94F]/16',
        fg: 'text-[#8A5B0B]',
    },
    ok: {
        dot: 'bg-[var(--caes-green)]',
        bg: 'bg-[var(--caes-green)]/12',
        fg: 'text-[var(--caes-green)]',
    },
    bad: {
        dot: 'bg-[#C4643F]',
        bg: 'bg-[#C4643F]/14',
        fg: 'text-[#9B4526]',
    },
}

/** Accetta anche le vecchie scritture, così i dati esistenti non si rompono. */
export function normalize(raw?: string): Status {
    const s = (raw ?? '').toLowerCase().trim()

    // sinonimi storici e spagnolismi finiti nei dati
    const alias: Record<string, EstadoId> = {
        aprobado: 'approved',
        rechazado: 'rejected',
        enviado: 'submitted',
        borrador: 'draft',
        // "in revisione" non esiste piu come stato a se: una pratica
        // arrivata e' gia in revisione. I vecchi dati confluiscono qui.
        in_review: 'submitted',
        under_review: 'submitted',
        review: 'submitted',
        revision: 'submitted',
        en_revision: 'submitted',
        awaiting_signatures: 'changes_requested',
        at_delegate: 'approved',
    }
    if (alias[s]) return alias[s]

    // se è già un id valido lo teniamo; altrimenti è una bozza
    const e = estado(s)
    return e.id === 'submitted' && s !== 'submitted' ? 'draft' : e.id
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

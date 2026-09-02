'use client'

/**
 * Stato di un espediente, sempre uguale ovunque compaia.
 *
 * Il colore non basta da solo — chi non distingue verde e ambra vedrebbe due
 * pastiglie identiche — quindi lo stato è scritto per esteso e ogni stato ha
 * anche una forma diversa nel puntino.
 */

export type Status = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected'

const MAP: Record<
    Status,
    { label: string; dot: string; bg: string; fg: string }
> = {
    draft: {
        label: 'Borrador',
        dot: 'bg-[var(--caes-faint)]',
        bg: 'bg-[var(--caes-band)]',
        fg: 'text-[var(--caes-mut)]',
    },
    submitted: {
        label: 'Enviado',
        dot: 'bg-[#8CBBF5]',
        bg: 'bg-[#8CBBF5]/14',
        fg: 'text-[#2E6FB8]',
    },
    in_review: {
        label: 'En revisión',
        dot: 'bg-[#D9A94F]',
        bg: 'bg-[#D9A94F]/16',
        fg: 'text-[#8A5B0B]',
    },
    approved: {
        label: 'Aprobado',
        dot: 'bg-[var(--caes-green)]',
        bg: 'bg-[var(--caes-green)]/12',
        fg: 'text-[var(--caes-green)]',
    },
    rejected: {
        label: 'Rechazado',
        dot: 'bg-[#C4643F]',
        bg: 'bg-[#C4643F]/14',
        fg: 'text-[#9B4526]',
    },
}

export function normalize(raw?: string): Status {
    const s = (raw ?? '').toLowerCase()
    if (s === 'approved' || s === 'aprobado') return 'approved'
    if (s === 'rejected' || s === 'rechazado') return 'rejected'
    if (s === 'in_review' || s === 'review' || s === 'revision') return 'in_review'
    if (s === 'submitted' || s === 'enviado') return 'submitted'
    return 'draft'
}

export default function StatusChip({ status }: { status?: string }) {
    const s = MAP[normalize(status)]
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] font-medium ${s.bg} ${s.fg}`}
        >
            <i className={`block h-[6px] w-[6px] rounded-full ${s.dot}`} />
            {s.label}
        </span>
    )
}

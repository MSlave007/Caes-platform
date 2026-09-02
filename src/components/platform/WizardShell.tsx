'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, Cloud, CloudOff, Loader2, Lock } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const

export type StepDef = {
    id: string
    label: string
    /** Riassunto di cosa si fa qui, per il passo corrente */
    caption: string
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Cornice del percorso: passi navigabili in alto, stato del salvataggio a
 * vista, contenuto in mezzo.
 *
 * I passi già superati e quello corrente si possono cliccare; quelli più
 * avanti no, perché senza i dati dei precedenti non avrebbero cosa mostrare.
 * Il lucchetto lo dice invece di lasciare un click che non fa niente.
 */
export default function WizardShell({
    steps,
    current,
    maxReached,
    onGoTo,
    save,
    savedAt,
    onSave,
    children,
}: {
    steps: StepDef[]
    current: number
    /** Passo più avanzato mai raggiunto: fin lì si può tornare avanti */
    maxReached: number
    onGoTo: (i: number) => void
    save: SaveState
    savedAt?: string
    onSave: () => void
    children: React.ReactNode
}) {
    const reduce = useReducedMotion()

    return (
        <div className="mx-auto w-full max-w-[820px]">
            {/* ------------------------------------------------------ passi */}
            <nav aria-label="Pasos" className="border-b border-[var(--caes-line)] pb-6">
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
                    {steps.map((s, i) => {
                        const done = i < maxReached
                        const active = i === current
                        const locked = i > maxReached
                        return (
                            <li key={s.id} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => !locked && onGoTo(i)}
                                    aria-current={active ? 'step' : undefined}
                                    className={`flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13px] transition-all duration-300 ${active
                                            ? 'bg-[var(--caes-ink)] font-medium text-[var(--caes-paper)]'
                                            : locked
                                                ? 'cursor-not-allowed text-[var(--caes-faint)]'
                                                : 'text-[var(--caes-mut)] hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]'
                                        }`}
                                >
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${active
                                                ? 'bg-[var(--caes-lime)] text-[var(--caes-lime-ink)]'
                                                : done
                                                    ? 'bg-[var(--caes-green)] text-white'
                                                    : 'bg-[var(--caes-band)] text-[var(--caes-faint)]'
                                            }`}
                                    >
                                        {done ? (
                                            <Check className="h-3 w-3" strokeWidth={3} />
                                        ) : locked ? (
                                            <Lock className="h-3 w-3" strokeWidth={2} />
                                        ) : (
                                            i + 1
                                        )}
                                    </span>
                                    {s.label}
                                </button>
                                {i < steps.length - 1 && (
                                    <span className="hidden h-px w-5 bg-[var(--caes-line)] sm:block" />
                                )}
                            </li>
                        )
                    })}
                </ol>

                {/* stato del salvataggio */}
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={save === 'saving'}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)]/40 hover:bg-[var(--caes-band)] disabled:opacity-50"
                    >
                        {save === 'saving' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : save === 'error' ? (
                            <CloudOff className="h-3.5 w-3.5 text-amber-700" />
                        ) : (
                            <Cloud className="h-3.5 w-3.5" />
                        )}
                        Guardar borrador
                    </button>

                    <motion.span
                        key={savedAt ?? save}
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="text-[12.5px] text-[var(--caes-faint)]"
                    >
                        {save === 'error'
                            ? 'No se ha podido guardar en este navegador.'
                            : savedAt
                                ? `Guardado ${savedAt}. Puedes cerrar y seguir cuando quieras.`
                                : 'Nada guardado todavía.'}
                    </motion.span>
                </div>
            </nav>

            {/* --------------------------------------------------- contenuto */}
            <motion.div
                key={current}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="pt-10"
            >
                {children}
            </motion.div>
        </div>
    )
}

/** Passo non ancora costruito: dice cosa ci andrà, senza fingere. */
export function StepPlaceholder({
    title,
    body,
}: {
    title: string
    body: string
}) {
    return (
        <div className="rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)]/60 p-10 text-center">
            <span className="label-mono text-[var(--caes-faint)]">Próximo paso</span>
            <h2 className="mx-auto mt-4 max-w-[22ch] text-balance text-[22px] font-semibold leading-[1.15] tracking-[-0.028em] text-[var(--caes-ink)]">
                {title}
            </h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                {body}
            </p>
        </div>
    )
}

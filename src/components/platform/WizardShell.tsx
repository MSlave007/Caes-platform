'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const

export type StepDef = {
    id: string
    label: string
    /** Riassunto di cosa si fa qui, per il passo corrente */
    caption: string
}

/**
 * `local` non è un errore: la bozza è al sicuro in questo browser ma non
 * è ancora arrivata all'account. Va distinto da `saved`, altrimenti chi
 * cambia dispositivo scopre solo lì che non c'era.
 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'local' | 'error'

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
    nombre,
    onNombreChange,
    children,
    ancho,
}: {
    steps: StepDef[]
    current: number
    /** Passo più avanzato mai raggiunto: fin lì si può tornare avanti */
    maxReached: number
    onGoTo: (i: number) => void
    save: SaveState
    savedAt?: string
    /** Il nome dell'espediente. Vive qui perché vale per tutti i passi. */
    nombre?: string
    onNombreChange?: (v: string) => void
    children: React.ReactNode
    /** Il passo dei documenti e una griglia a due colonne: gli servono
     *  piu di 820px, agli altri no. */
    ancho?: boolean
}) {
    const reduce = useReducedMotion()

    return (
        <div className={`mx-auto w-full ${ancho ? 'max-w-[1060px]' : 'max-w-[820px]'}`}>
            {/* ---------------------------------------------------- il nome
                Sta in cima e non dentro un passo: e il nome della pratica,
                non un dato del primo modulo. Chi ha tre cantieri aperti
                distingue le bozze solo da qui — il cliente non c'e ancora,
                perche i suoi dati escono dalla fattura, che arriva dopo. */}
            {onNombreChange && (
                <div className="mb-6">
                    <label
                        htmlFor="nombre-expediente"
                        className="label-mono block text-[var(--caes-faint)]"
                    >
                        Nombre del expediente
                    </label>
                    <input
                        id="nombre-expediente"
                        value={nombre ?? ''}
                        onChange={(e) => onNombreChange(e.target.value)}
                        placeholder="Calle Mayor 4, 3ºB"
                        className="mt-2 w-full max-w-[34ch] border-b border-transparent bg-transparent pb-1.5 text-[22px] font-semibold tracking-[-0.026em] text-[var(--caes-ink)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--caes-faint)] hover:border-[var(--caes-line)] focus:border-[var(--caes-ink)]"
                    />
                </div>
            )}

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

                {/* Stato del salvataggio. Il PULSANTE non sta piu qui: qui
                    scorre via appena si comincia a caricare, ed e proprio
                    mentre si scorre che serve. Sta nella barra in fondo. */}
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <motion.span
                        key={savedAt ?? save}
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="text-[12.5px] text-[var(--caes-faint)]"
                    >
                        {save === 'error'
                            ? 'No se ha podido guardar.'
                            : save === 'local'
                                ? 'Guardado en este dispositivo. Lo subimos a tu cuenta en cuanto haya conexión.'
                                : savedAt
                                    ? `Guardado en tu cuenta ${savedAt}. Puedes cerrar y seguir desde donde quieras.`
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

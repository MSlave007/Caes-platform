'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import DocumentChecklist, {
    type FileMap,
} from '@/components/platform/DocumentChecklist'
import WizardShell, {
    StepPlaceholder,
    type SaveState,
    type StepDef,
} from '@/components/platform/WizardShell'
import type { Role } from '@/lib/documents'
import { clearDraft, loadDraft, saveDraft, timeAgo } from '@/lib/draft'

const STEPS: StepDef[] = [
    { id: 'docs', label: 'Documentos', caption: 'Lo que hay que subir' },
    { id: 'datos', label: 'Datos', caption: 'Confirmar lo que ha leído la IA' },
    { id: 'ahorro', label: 'Ahorro', caption: 'Cálculo y comprobación del BOE' },
    { id: 'envio', label: 'Envío', caption: 'Comisión y firma' },
]

/**
 * Percorso di creazione dell'espediente.
 *
 * Il selettore instalador / cliente qui è visibile per confrontare i due
 * elenchi. In produzione il ruolo arriva dal profilo e sparisce: nessuno
 * deve poter scegliere di che tipo di utente è.
 */
export default function DocumentosPage() {
    const [role, setRole] = useState<Role>('installer')
    const [files, setFiles] = useState<FileMap>({})
    const [step, setStep] = useState(0)
    const [maxReached, setMaxReached] = useState(0)
    const [save, setSave] = useState<SaveState>('idle')
    const [savedAt, setSavedAt] = useState<string | undefined>()
    const [restored, setRestored] = useState(false)

    /* ---------------------------------------------- ripresa della bozza */
    useEffect(() => {
        const d = loadDraft()
        if (!d) return
        setRole(d.role)
        setStep(d.step)
        setMaxReached(d.step)
        setSavedAt(timeAgo(d.savedAt))
        // I riferimenti tornano già completi: quando Storage sarà collegato,
        // torneranno anche i file veri dietro a questi nomi.
        setFiles(
            Object.fromEntries(
                Object.entries(d.files).map(([k, v]) => [
                    k,
                    { name: v.name, size: v.size, state: 'done' as const },
                ])
            )
        )
        setRestored(true)
    }, [])

    const persist = useCallback(
        (next?: { role?: Role; step?: number; files?: FileMap }) => {
            setSave('saving')
            const payload = {
                role: next?.role ?? role,
                step: next?.step ?? step,
                files: Object.fromEntries(
                    Object.entries(next?.files ?? files)
                        .filter(([, v]) => v.state === 'done')
                        .map(([k, v]) => [k, { name: v.name, size: v.size }])
                ),
            }
            const ok = saveDraft(payload)
            window.setTimeout(() => {
                if (ok) {
                    setSavedAt(timeAgo(ok.savedAt))
                    setSave('saved')
                } else {
                    setSave('error')
                }
            }, 350)
        },
        [role, step, files]
    )

    // Salvataggio automatico a ogni file completato: il lavoro fatto non si
    // perde perché qualcuno ha chiuso la scheda senza premere niente.
    useEffect(() => {
        const anyDone = Object.values(files).some((f) => f.state === 'done')
        if (!anyDone) return
        const t = window.setTimeout(() => persist(), 900)
        return () => window.clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files])

    const goTo = (i: number) => {
        setStep(i)
        persist({ step: i })
    }

    const advance = () => {
        const next = Math.min(step + 1, STEPS.length - 1)
        setStep(next)
        setMaxReached((m) => Math.max(m, next))
        persist({ step: next })
    }

    const startOver = () => {
        clearDraft()
        setFiles({})
        setStep(0)
        setMaxReached(0)
        setSavedAt(undefined)
        setSave('idle')
        setRestored(false)
    }

    return (
        <div className="min-h-screen bg-[var(--caes-paper)] font-sans">
            <header className="border-b border-[var(--caes-line)]">
                <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-5 sm:px-10">
                    <Link
                        href="/installer/dashboard"
                        className="group inline-flex items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                        Volver
                    </Link>
                    <span className="flex items-center gap-2.5">
                        <span className="relative block h-[16px] w-[16px] rounded-[3px] bg-[var(--caes-ink)]">
                            <span className="absolute bottom-[3px] left-[3px] block h-[5px] w-[5px] rounded-[1px] bg-[var(--caes-lime)]" />
                        </span>
                        <span className="font-mono text-[13px] font-medium tracking-[.15em] text-[var(--caes-ink)]">
                            CAES
                        </span>
                    </span>
                </div>
            </header>

            <main className="px-6 py-12 sm:px-10">
                {restored && (
                    <div className="mx-auto mb-8 flex w-full max-w-[820px] flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.05] px-5 py-3.5">
                        <p className="text-[13.5px] text-[var(--caes-ink)]">
                            Hemos recuperado tu borrador. Sigues donde lo dejaste.
                        </p>
                        <button
                            type="button"
                            onClick={startOver}
                            className="inline-flex items-center gap-2 text-[13px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Empezar de cero
                        </button>
                    </div>
                )}

                <WizardShell
                    steps={STEPS}
                    current={step}
                    maxReached={maxReached}
                    onGoTo={goTo}
                    save={save}
                    savedAt={savedAt}
                    onSave={() => persist()}
                >
                    {step === 0 && (
                        <DocumentChecklist
                            role={role}
                            onRoleChange={(r) => {
                                setRole(r)
                                setFiles({})
                                persist({ role: r, files: {} })
                            }}
                            files={files}
                            onFilesChange={setFiles}
                            onContinue={advance}
                        />
                    )}

                    {step === 1 && (
                        <StepPlaceholder
                            title="Confirmar lo que ha leído la IA"
                            body="Marca, modelo, potencia y número de serie salen solos de la factura y de las fotos. Aquí se revisan y se corrige lo que haga falta, campo a campo."
                        />
                    )}

                    {step === 2 && (
                        <StepPlaceholder
                            title="Cálculo del ahorro y comprobación del BOE"
                            body="El motor compara el consumo anterior con el nuevo, comprueba que se supera el 20 % mínimo y avisa antes de enviar si algo no cuadra."
                        />
                    )}

                    {step === 3 && (
                        <StepPlaceholder
                            title="Tu comisión y el envío"
                            body="Eliges cuánto te quedas, hasta el 30 % que marca la norma. Al enviar queda bloqueado y el acuerdo CAES se genera con el reparto ya aplicado."
                        />
                    )}
                </WizardShell>
            </main>
        </div>
    )
}

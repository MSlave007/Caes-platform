'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
    ArrowRight,
    Camera,
    Check,
    AlertTriangle,
    FileText,
    Loader2,
    Paperclip,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react'
import { DOCUMENTS, requiredCount, type DocSpec, type Role } from '@/lib/documents'

const EASE = [0.16, 1, 0.3, 1] as const

export type Uploaded = {
    name: string
    size: number
    state: 'reading' | 'done' | 'error'
    /** Percorso nel deposito. Vuoto finché il caricamento non è finito. */
    path?: string
    /** Messaggio da mostrare quando lo stato è 'error'. */
    error?: string
    /** Vero quando il file NON è stato davvero archiviato (demo). */
    demo?: boolean
}
export type FileMap = Record<string, Uploaded>

/**
 * Caricamento documenti, uguale per installatore e cliente ma con elenchi
 * diversi. Una riga per documento, non una griglia di riquadri: qui si tratta
 * di spuntare una lista, e una lista si legge dall'alto in basso.
 *
 * Nota: al momento i file restano nel browser. Il collegamento a Supabase
 * Storage e a /api/extract è il passo successivo — la forma dei dati
 * (`Uploaded` per id documento) è già quella che servirà.
 */
export default function DocumentChecklist({
    role,
    onRoleChange,
    files,
    onFilesChange,
    onContinue,
}: {
    role: Role
    onRoleChange?: (r: Role) => void
    files: FileMap
    /** Aggiornatore funzionale: il timer dell'estrazione parte prima che
     *  lo stato sia risalito, quindi deve leggere l'ultimo valore, non
     *  quello catturato al momento del click. */
    onFilesChange: (updater: (prev: FileMap) => FileMap) => void
    onContinue: () => void
}) {
    const reduce = useReducedMotion()
    const specs = DOCUMENTS[role]
    const setFiles = onFilesChange

    const done = specs.filter((s) => s.required && files[s.id]?.state === 'done').length
    const total = requiredCount(role)
    const complete = done === total

    /**
     * Carica davvero il file.
     *
     * Prima qui c'era un setTimeout di 1,1 secondi che faceva sembrare
     * riuscito un caricamento che non avveniva: il file restava nel
     * browser e in revisione non c'era niente da aprire.
     *
     * Il server restituisce solo il PERCORSO, non un indirizzo: per
     * guardare il documento si chiede poi un indirizzo firmato a scadenza.
     */
    const handleFile = async (id: string, f: File) => {
        setFiles((p) => ({ ...p, [id]: { name: f.name, size: f.size, state: 'reading' } }))

        try {
            const fd = new FormData()
            fd.append('file', f)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const json = await res.json()

            if (!res.ok) throw new Error(json?.error ?? 'No se ha podido subir')

            setFiles((p) =>
                p[id]
                    ? {
                        ...p,
                        [id]: {
                            ...p[id],
                            state: 'done',
                            path: json.path,
                            // Il server non è riuscito ad archiviare davvero.
                            // Va detto: un "hecho" che non ha salvato niente
                            // è peggio di un errore.
                            demo: Boolean(json.mock),
                        },
                    }
                    : p
            )
        } catch (e) {
            setFiles((p) =>
                p[id]
                    ? {
                        ...p,
                        [id]: {
                            ...p[id],
                            state: 'error',
                            error: e instanceof Error ? e.message : 'Error al subir',
                        },
                    }
                    : p
            )
        }
    }

    const remove = (id: string) =>
        setFiles((p) => {
            const n = { ...p }
            delete n[id]
            return n
        })

    return (
        <div className="mx-auto w-full max-w-[820px]">
            {/* ------------------------------------------------ intestazione */}
            <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="mt-0 text-balance text-[clamp(26px,3.4vw,36px)] font-semibold leading-[1.08] tracking-[-0.036em] text-[var(--caes-ink)]">
                        {role === 'installer'
                            ? 'Sube lo de la instalación'
                            : 'Sube lo tuyo'}
                    </h1>
                    <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                        {role === 'installer'
                            ? 'Cuatro fotos y dos documentos. Hazlo antes de irte de la obra: volver a por el número de serie cuesta una visita entera.'
                            : 'Tres documentos y, si puedes, dos fotos. Con esto el instalador llega sabiendo lo que se va a encontrar.'}
                    </p>
                </div>

                {onRoleChange && (
                    <div className="flex rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] p-1">
                        {(['installer', 'client'] as Role[]).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => onRoleChange(r)}
                                className={`rounded-full px-4 py-2 text-[13px] transition-colors ${r === role
                                        ? 'bg-[var(--caes-ink)] font-medium text-[var(--caes-paper)]'
                                        : 'text-[var(--caes-mut)] hover:text-[var(--caes-ink)]'
                                    }`}
                            >
                                {r === 'installer' ? 'Instalador' : 'Cliente'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ------------------------------------------------ avanzamento */}
            <div className="mt-9 flex items-center gap-4">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--caes-line)]">
                    <motion.div
                        className="h-full rounded-full bg-[var(--caes-green)]"
                        animate={{ width: `${(done / total) * 100}%` }}
                        transition={{ duration: 0.6, ease: EASE }}
                    />
                </div>
                <span className="shrink-0 font-mono tabular text-[12.5px] text-[var(--caes-mut)]">
                    {done} / {total} obligatorios
                </span>
            </div>

            {/* ------------------------------------------------------- lista */}
            <ul className="mt-8 flex flex-col gap-3">
                {specs.map((spec, i) => (
                    <DocRow
                        key={spec.id}
                        spec={spec}
                        index={i}
                        file={files[spec.id]}
                        reduce={!!reduce}
                        onFile={(f) => handleFile(spec.id, f)}
                        onRemove={() => remove(spec.id)}
                    />
                ))}
            </ul>

            {/* ------------------------------------------------------ azione */}
            <div className="sticky bottom-0 mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line)] bg-[var(--caes-paper)] py-6">
                <p className="max-w-[44ch] text-[13px] leading-[1.55] text-[var(--caes-mut)]">
                    {complete
                        ? 'Ya está todo lo obligatorio. Puedes seguir.'
                        : `Faltan ${total - done} ${total - done === 1 ? 'documento obligatorio' : 'documentos obligatorios'}. Sin ellos el expediente no se puede enviar.`}
                </p>
                <button
                    type="button"
                    disabled={!complete}
                    onClick={onContinue}
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    Continuar
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */

function DocRow({
    spec,
    index,
    file,
    reduce,
    onFile,
    onRemove,
}: {
    spec: DocSpec
    index: number
    file?: Uploaded
    reduce: boolean
    onFile: (f: File) => void
    onRemove: () => void
}) {
    const input = useRef<HTMLInputElement>(null)
    const [over, setOver] = useState(false)
    const filled = file?.state === 'done'

    return (
        <motion.li
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05, ease: EASE }}
            onDragOver={(e) => {
                e.preventDefault()
                setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault()
                setOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) onFile(f)
            }}
            className={`rounded-2xl border bg-[var(--caes-panel)] p-5 transition-colors duration-300 sm:p-6 ${over
                    ? 'border-[var(--caes-green)] bg-[var(--caes-green)]/[.04]'
                    : filled
                        ? 'border-[var(--caes-green)]/35'
                        : 'border-[var(--caes-line)]'
                }`}
        >
            <div className="flex items-start gap-4">
                {/* stato */}
                <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${filled
                            ? 'bg-[var(--caes-green)] text-white'
                            : file?.state === 'error'
                                ? 'bg-[#C4643F]/15 text-[#9B4526]'
                                : 'bg-[var(--caes-band)] text-[var(--caes-mut)]'
                        }`}
                >
                    {file?.state === 'reading' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : file?.state === 'error' ? (
                        <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                    ) : filled ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                    ) : spec.onSite ? (
                        <Camera className="h-4 w-4" strokeWidth={1.7} />
                    ) : (
                        <FileText className="h-4 w-4" strokeWidth={1.7} />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-[15.5px] font-semibold tracking-[-0.018em] text-[var(--caes-ink)]">
                            {spec.label}
                        </h3>
                        {!spec.required && (
                            <span className="rounded-full bg-[var(--caes-band)] px-2.5 py-1 text-[11px] text-[var(--caes-mut)]">
                                Opcional
                            </span>
                        )}
                        {filled && file?.demo && (
                            <span className="rounded-full border border-dashed border-[#C3A45C] px-2.5 py-1 text-[11px] text-[#8A6A2C]">
                                Sin archivar · demo
                            </span>
                        )}
                        {file?.state === 'error' && (
                            <span className="w-full text-[13px] text-[#9B4526]">
                                {file.error ?? 'No se ha podido subir'}
                            </span>
                        )}
                        {spec.extracted && (
                            <span className="flex items-center gap-1.5 rounded-full bg-[var(--caes-lime)] px-2.5 py-1 text-[11px] font-medium text-[var(--caes-lime-ink)]">
                                <Sparkles className="h-3 w-3" />
                                Lo leemos solos
                            </span>
                        )}
                    </div>

                    <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                        {spec.why}
                    </p>

                    <AnimatePresence mode="wait">
                        {file ? (
                            <motion.div
                                key="file"
                                initial={reduce ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                                transition={{ duration: 0.3, ease: EASE }}
                                className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-4 py-3"
                            >
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--caes-faint)]" />
                                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--caes-ink)]">
                                    {file.name}
                                </span>
                                <span className="shrink-0 font-mono text-[11.5px] text-[var(--caes-faint)]">
                                    {Math.max(1, Math.round(file.size / 1024))} KB
                                </span>
                                <button
                                    type="button"
                                    onClick={onRemove}
                                    aria-label={`Quitar ${spec.label}`}
                                    className="shrink-0 rounded-lg p-1.5 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduce ? undefined : { opacity: 0 }}
                                className="mt-4 flex flex-wrap items-center gap-3"
                            >
                                <button
                                    type="button"
                                    onClick={() => input.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-ink)] px-4 py-2 text-[13.5px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]"
                                >
                                    {spec.onSite ? (
                                        <Camera className="h-3.5 w-3.5" />
                                    ) : (
                                        <Paperclip className="h-3.5 w-3.5" />
                                    )}
                                    {spec.onSite ? 'Hacer la foto' : 'Elegir archivo'}
                                </button>
                                <span className="hidden text-[12.5px] text-[var(--caes-faint)] sm:inline">
                                    o arrastra el archivo aquí
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <input
                        ref={input}
                        type="file"
                        accept={spec.accept}
                        // Su móvil apre direttamente la fotocamera per gli scatti in obra.
                        {...(spec.onSite ? { capture: 'environment' as const } : {})}
                        className="sr-only"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) onFile(f)
                            e.target.value = ''
                        }}
                    />
                </div>
            </div>
        </motion.li>
    )
}

export { X }

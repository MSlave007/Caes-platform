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
    MessageSquare,
    Paperclip,
    Plus,
    Trash2,
    X,
} from 'lucide-react'
import { DOCUMENTS, requiredCount, type DocSpec, type Role } from '@/lib/documents'

const EASE = [0.16, 1, 0.3, 1] as const

export type Uploaded = {
    /**
     * Chiave interna della riga. Serve perché due file possono chiamarsi
     * uguale e i caricamenti finiscono in ordine sparso: senza, l'esito
     * di uno finisce sull'altro.
     */
    clave?: string
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

/**
 * Un riquadro può contenere più file: le tre foto dell'impianto nuovo sono
 * un gesto solo in cantiere, non tre adempimenti separati. Quindi la
 * mappa è id documento → elenco di file, anche quando il file è uno.
 */
export type FileMap = Record<string, Uploaded[]>

/** Quanti file servono perché il riquadro si consideri completo. */
export const necesarios = (s: DocSpec) => s.minFiles ?? 1

/** Quanti ne sono arrivati davvero in fondo. */
export const hechos = (items?: Uploaded[]) =>
    (items ?? []).filter((f) => f.state === 'done').length

export const completo = (s: DocSpec, items?: Uploaded[]) =>
    hechos(items) >= necesarios(s)

/**
 * Caricamento documenti, uguale per installatore e cliente ma con elenchi
 * diversi. Una riga per documento, non una griglia di riquadri: qui si tratta
 * di spuntare una lista, e una lista si legge dall'alto in basso.
 *
 * ── DUE COSE CHE PRIMA ERANO SBAGLIATE ────────────────────────────────
 *
 * 1. L'input dei documenti «da cantiere» aveva `capture`, che sul telefono
 *    apre la fotocamera e TOGLIE la possibilità di scegliere un file già
 *    fatto. Una foto scattata mezz'ora prima vale uguale. Adesso ci sono
 *    due pulsanti distinti e la scelta resta a chi carica.
 * 2. Ogni riquadro accettava un file solo, quindi le tre foto dell'impianto
 *    erano tre righe. Adesso un riquadro, tre file, e si vede a colpo
 *    d'occhio quanti ne mancano.
 */
export default function DocumentChecklist({
    role,
    onRoleChange,
    files,
    onFilesChange,
    notas,
    onNotasChange,
    onContinue,
}: {
    role: Role
    onRoleChange?: (r: Role) => void
    files: FileMap
    /** Aggiornatore funzionale: il caricamento finisce dopo che lo stato è
     *  già risalito, quindi deve leggere l'ultimo valore, non quello
     *  catturato al momento del click. */
    onFilesChange: (updater: (prev: FileMap) => FileMap) => void
    notas: string
    onNotasChange: (v: string) => void
    onContinue: () => void
}) {
    const reduce = useReducedMotion()
    const specs = DOCUMENTS[role]
    const setFiles = onFilesChange

    const done = specs.filter((s) => s.required && completo(s, files[s.id])).length
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
        // Chiave stabile per ritrovare QUESTA riga nell'elenco: due file
        // possono avere lo stesso nome, e i caricamenti finiscono in
        // ordine sparso.
        const clave = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const marcar = (cambio: Partial<Uploaded>) =>
            setFiles((p) => ({
                ...p,
                [id]: (p[id] ?? []).map((u) =>
                    u.clave === clave ? { ...u, ...cambio } : u
                ),
            }))

        setFiles((p) => ({
            ...p,
            [id]: [...(p[id] ?? []), { clave, name: f.name, size: f.size, state: 'reading' }],
        }))

        try {
            const fd = new FormData()
            fd.append('file', f)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const json = await res.json()

            if (!res.ok) throw new Error(json?.error ?? 'No se ha podido subir')

            marcar({
                state: 'done',
                path: json.path,
                // Il server non è riuscito ad archiviare davvero. Va detto:
                // un «hecho» che non ha salvato niente è peggio di un errore.
                demo: Boolean(json.mock),
            })
        } catch (e) {
            marcar({
                state: 'error',
                error: e instanceof Error ? e.message : 'Error al subir',
            })
        }
    }

    const handleList = (id: string, list: FileList | null) => {
        if (!list) return
        Array.from(list).forEach((f) => void handleFile(id, f))
    }

    const remove = (id: string, i: number) =>
        setFiles((p) => {
            const resto = (p[id] ?? []).filter((_, j) => j !== i)
            const n = { ...p }
            if (resto.length) n[id] = resto
            else delete n[id]
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
                    <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                        {role === 'installer'
                            ? 'Puedes hacer las fotos ahora o coger las que ya tengas en el móvil. Se guarda solo: si lo dejas a medias, lo retomas donde estabas.'
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
                        items={files[spec.id] ?? []}
                        reduce={!!reduce}
                        onFiles={(l) => handleList(spec.id, l)}
                        onRemove={(j) => remove(spec.id, j)}
                    />
                ))}
            </ul>

            {/* ------------------------------------------------ osservazioni */}
            <div className="mt-6 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5 sm:p-6">
                <label htmlFor="notas" className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-[var(--caes-faint)]" strokeWidth={1.7} />
                    <span className="text-[15.5px] font-semibold tracking-[-0.018em] text-[var(--caes-ink)]">
                        ¿Algo que debamos saber?
                    </span>
                </label>
                <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                    Un dato raro, una foto que no has podido hacer, algo que no encaja
                    con lo de arriba. Lo lee quien revisa el expediente, antes de
                    llamarte.
                </p>
                <textarea
                    id="notas"
                    rows={3}
                    value={notas}
                    onChange={(e) => onNotasChange(e.target.value)}
                    placeholder="Opcional"
                    className="mt-4 w-full resize-y rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-4 py-3 text-[14px] leading-[1.55] text-[var(--caes-ink)] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-ink)]"
                />
            </div>

            {/* ------------------------------------------------------ azione */}
            <div className="sticky bottom-0 mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line)] bg-[var(--caes-paper)] py-6">
                <p className="max-w-[44ch] text-[13px] leading-[1.55] text-[var(--caes-mut)]">
                    {complete
                        ? 'Ya está todo lo obligatorio. Puedes seguir.'
                        : `Faltan ${total - done} ${total - done === 1 ? 'apartado obligatorio' : 'apartados obligatorios'}. Sin ellos el expediente no se puede enviar, pero el borrador se guarda igual.`}
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
    items,
    reduce,
    onFiles,
    onRemove,
}: {
    spec: DocSpec
    index: number
    items: Uploaded[]
    reduce: boolean
    onFiles: (l: FileList | null) => void
    onRemove: (i: number) => void
}) {
    const archivo = useRef<HTMLInputElement>(null)
    const camara = useRef<HTMLInputElement>(null)
    const [over, setOver] = useState(false)

    const need = necesarios(spec)
    const n = hechos(items)
    const filled = n >= need
    const subiendo = items.some((f) => f.state === 'reading')
    const fallo = items.some((f) => f.state === 'error')

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
                onFiles(e.dataTransfer.files)
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
                        : fallo
                            ? 'bg-[#C4643F]/15 text-[#9B4526]'
                            : 'bg-[var(--caes-band)] text-[var(--caes-mut)]'
                        }`}
                >
                    {subiendo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : filled ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                    ) : fallo ? (
                        <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                    ) : spec.onSite ? (
                        <Camera className="h-4 w-4" strokeWidth={1.7} />
                    ) : (
                        <FileText className="h-4 w-4" strokeWidth={1.7} />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                        <h3 className="text-[15.5px] font-semibold tracking-[-0.018em] text-[var(--caes-ink)]">
                            {spec.label}
                        </h3>

                        {/* Quanti ne servono, quando ne serve più di uno.
                            Il conteggio sostituisce tre righe separate. */}
                        {need > 1 && (
                            <span
                                className={`rounded-full px-2.5 py-1 font-mono text-[11px] tabular-nums ${filled
                                    ? 'bg-[var(--caes-green)]/12 text-[var(--caes-green)]'
                                    : 'bg-[var(--caes-band)] text-[var(--caes-mut)]'
                                    }`}
                            >
                                {n} de {need} fotos
                            </span>
                        )}

                        {!spec.required && (
                            <span className="rounded-full bg-[var(--caes-band)] px-2.5 py-1 text-[11px] text-[var(--caes-mut)]">
                                Opcional
                            </span>
                        )}
                    </div>

                    <p className="mt-1.5 max-w-[54ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                        {spec.why}
                    </p>

                    {/* Cosa devono mostrare. Non è decorazione: è la lista che
                        evita la seconda visita in cantiere. */}
                    {spec.checklist && (
                        <ul className="mt-3 flex flex-col gap-1.5">
                            {spec.checklist.map((c, i) => (
                                <li
                                    key={c}
                                    className="flex items-center gap-2.5 text-[13px] text-[var(--caes-mut)]"
                                >
                                    <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${i < n
                                            ? 'border-[var(--caes-green)] bg-[var(--caes-green)] text-white'
                                            : 'border-[var(--caes-line-2)]'
                                            }`}
                                    >
                                        {i < n && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                                    </span>
                                    {c}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* ------------------------------------------- i file */}
                    <AnimatePresence initial={false}>
                        {items.length > 0 && (
                            <motion.ul
                                key="lista"
                                initial={reduce ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                                transition={{ duration: 0.3, ease: EASE }}
                                className="mt-4 flex flex-col gap-2"
                            >
                                {items.map((f, i) => (
                                    <li
                                        key={f.clave ?? `${f.name}-${i}`}
                                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${f.state === 'error'
                                            ? 'border-[#C4643F]/45 bg-[#C4643F]/[.05]'
                                            : 'border-[var(--caes-line-2)] bg-[var(--caes-paper)]'
                                            }`}
                                    >
                                        {f.state === 'reading' ? (
                                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--caes-faint)]" />
                                        ) : f.state === 'error' ? (
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#9B4526]" />
                                        ) : (
                                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--caes-faint)]" />
                                        )}

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] text-[var(--caes-ink)]">
                                                {f.name}
                                            </span>
                                            {f.state === 'error' && (
                                                <span className="block text-[12px] text-[#9B4526]">
                                                    {f.error ?? 'No se ha podido subir'}
                                                </span>
                                            )}
                                            {f.state === 'done' && f.demo && (
                                                <span className="block text-[12px] text-[#8A6A2C]">
                                                    Sin archivar · demo
                                                </span>
                                            )}
                                        </span>

                                        <span className="shrink-0 font-mono text-[11.5px] text-[var(--caes-faint)]">
                                            {Math.max(1, Math.round(f.size / 1024))} KB
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onRemove(i)}
                                            aria-label={`Quitar ${f.name}`}
                                            className="shrink-0 rounded-lg p-1.5 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>

                    {/* --------------------------------------- i pulsanti */}
                    {(spec.multiple || items.length === 0) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => archivo.current?.click()}
                                className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-ink)] px-4 py-2 text-[13.5px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]"
                            >
                                {items.length > 0 ? (
                                    <Plus className="h-3.5 w-3.5" />
                                ) : (
                                    <Paperclip className="h-3.5 w-3.5" />
                                )}
                                {items.length > 0 ? 'Añadir otro' : 'Elegir archivo'}
                            </button>

                            {/* Solo per i documenti da cantiere, e SEMPRE
                                accanto alla scelta del file: la fotocamera è
                                una comodità, non l'unica strada. */}
                            {spec.onSite && (
                                <button
                                    type="button"
                                    onClick={() => camara.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)] sm:hidden"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    Hacer foto
                                </button>
                            )}

                            <span className="hidden text-[12.5px] text-[var(--caes-faint)] sm:inline">
                                o arrastra {spec.multiple ? 'los archivos' : 'el archivo'} aquí
                            </span>
                        </div>
                    )}

                    <input
                        ref={archivo}
                        type="file"
                        accept={spec.accept}
                        multiple={spec.multiple}
                        className="sr-only"
                        onChange={(e) => {
                            onFiles(e.target.files)
                            e.target.value = ''
                        }}
                    />
                    {spec.onSite && (
                        <input
                            ref={camara}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => {
                                onFiles(e.target.files)
                                e.target.value = ''
                            }}
                        />
                    )}
                </div>
            </div>
        </motion.li>
    )
}

export { X }

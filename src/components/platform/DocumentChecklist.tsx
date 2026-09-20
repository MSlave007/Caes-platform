'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
    ArrowRight,
    Camera,
    Check,
    AlertTriangle,
    FileText,
    Cloud,
    CloudOff,
    Loader2,
    MessageSquare,
    Paperclip,
    Plus,
    Trash2,
    X,
} from 'lucide-react'
import { DOCUMENTS, requiredCount, type DocSpec, type Role } from '@/lib/documents'
import type { SaveState } from './WizardShell'
import { camposDe } from '@/lib/caes/extraction'

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
 * diversi.
 *
 * ── PERCHÉ UNA GRIGLIA E NON UN ELENCO ────────────────────────────────
 *
 * Prima era una colonna sola di schede alte quanto capitava: undici
 * blocchi identici nella forma e diversi nell'altezza, con mezza pagina
 * vuota a destra e uno scorrimento lunghissimo. Adesso sono due colonne.
 * Le schede della stessa riga si allineano da sole, e l'azione sta in
 * fondo a ciascuna: i pulsanti cadono tutti sulla stessa linea.
 *
 * Tre schede occupano la riga intera (`ancho`), e non per capriccio: la
 * fattura e le foto dell'impianto portano dentro una lista, e gli extra
 * chiudono. Quello che resta si appaia a due a due proprio come va
 * letto — i due RITE insieme, i due certificati energetici insieme.
 *
 * ── DUE COSE CHE PRIMA ERANO SBAGLIATE ────────────────────────────────
 *
 * 1. L'input dei documenti «da cantiere» aveva `capture`, che sul telefono
 *    apre la fotocamera e TOGLIE la possibilità di scegliere un file già
 *    fatto. Una foto scattata mezz'ora prima vale uguale.
 * 2. Ogni riquadro accettava un file solo, quindi le tre foto
 *    dell'impianto erano tre righe.
 */
export default function DocumentChecklist({
    role,
    onRoleChange,
    files,
    onFilesChange,
    notas,
    onNotasChange,
    onContinue,
    onSave,
    save,
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
    /** Salvataggio esplicito. Sta nella barra in fondo, che non scorre via:
     *  quasi nessun espediente si completa in una sola seduta. */
    onSave: () => void
    save: SaveState
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
        <div className="w-full">
            {/* ------------------------------------------------ intestazione */}
            <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="mt-0 text-balance text-[clamp(26px,3.4vw,36px)] font-semibold leading-[1.08] tracking-[-0.036em] text-[var(--caes-ink)]">
                        {role === 'installer'
                            ? 'Sube lo de la instalación'
                            : 'Sube lo tuyo'}
                    </h1>
                    <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
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
                <span className="shrink-0 font-mono tabular-nums text-[12.5px] text-[var(--caes-mut)]">
                    {done} / {total} obligatorios
                </span>
            </div>

            {/* Detto una volta. Ripetuto su ognuna delle undici schede era
                solo rumore: si legge alla prima e poi si sa. */}
            <p className="mt-3 hidden text-[12.5px] text-[var(--caes-faint)] lg:block">
                También puedes arrastrar los archivos sobre el apartado que toque.
            </p>

            {/* --------------------------------------------------- griglia */}
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div className="mt-3 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5 sm:p-6">
                <label htmlFor="notas" className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-[var(--caes-faint)]" strokeWidth={1.7} />
                    <span className="text-[15px] font-semibold tracking-[-0.018em] text-[var(--caes-ink)]">
                        ¿Algo que debamos saber?
                    </span>
                    <span className="rounded-full bg-[var(--caes-band)] px-2.5 py-1 text-[11px] text-[var(--caes-mut)]">
                        Opcional
                    </span>
                </label>
                <p className="mt-1.5 max-w-[70ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                    Un dato raro, una foto que no has podido hacer, algo que no encaja
                    con lo de arriba. Lo lee quien revisa el expediente, antes de
                    llamarte.
                </p>
                <textarea
                    id="notas"
                    rows={2}
                    value={notas}
                    onChange={(e) => onNotasChange(e.target.value)}
                    className="mt-3.5 w-full resize-y rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-paper)] px-4 py-3 text-[14px] leading-[1.55] text-[var(--caes-ink)] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-ink)]"
                />
            </div>

            {/* ------------------------------------------------------ azione

                Le due uscite stanno insieme e non scorrono via. Non e una
                simmetria estetica: quasi nessun espediente si chiude in una
                seduta — manca il certificato energetico, manca il RITE — e
                se l'unico pulsante visibile mentre si scorre e «Continuar»,
                chi non puo continuare non sa che puo comunque salvare. */}
            <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-[var(--caes-line)] bg-[var(--caes-paper)] py-5">
                <p className="max-w-[46ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                    {complete
                        ? 'Ya está todo lo obligatorio. Puedes seguir.'
                        : `Faltan ${total - done} ${total - done === 1 ? 'apartado obligatorio' : 'apartados obligatorios'} para poder enviarlo.`}
                    {/* Solo l'errore. Il «guardato poco fa» sta gia sotto i
                        passi, e ripeterlo qui e la stessa frase due volte a
                        quaranta pixel di distanza. Un fallimento invece va
                        detto dove si sta guardando. */}
                    {save === 'error' && (
                        <span className="block text-[#8A5B0B]">
                            No se ha podido guardar en este navegador.
                        </span>
                    )}
                </p>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={save === 'saving'}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-5 py-3 text-[14px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)] hover:bg-[var(--caes-band)] disabled:opacity-50"
                    >
                        {save === 'saving' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : save === 'error' ? (
                            <CloudOff className="h-3.5 w-3.5 text-[#8A5B0B]" />
                        ) : (
                            <Cloud className="h-3.5 w-3.5" />
                        )}
                        Guardar borrador
                    </button>

                    <button
                        type="button"
                        disabled={!complete}
                        onClick={onContinue}
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3 text-[14px] font-medium text-[var(--caes-paper)] transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        Continuar
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                </div>
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

    // Cosa esce da questo documento, letto dalla mappa dell'estrazione
    // invece che riscritto a mano: una riga sola, sempre della stessa
    // altezza, e non si disallinea mai dalla verità.
    const campos = camposDe(spec.id)

    return (
        <motion.li
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: EASE }}
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
            className={`flex flex-col rounded-2xl border bg-[var(--caes-panel)] p-5 transition-colors duration-300 ${spec.ancho ? 'sm:col-span-2' : ''
                } ${over
                    ? 'border-[var(--caes-green)] bg-[var(--caes-green)]/[.05]'
                    : filled
                        ? 'border-[var(--caes-green)]/40'
                        : 'border-[var(--caes-line)]'
                }`}
        >
            {/* ------------------------------------------- testa della scheda */}
            <div className="flex items-start gap-3.5">
                <span
                    className={`mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${filled
                        ? 'bg-[var(--caes-green)] text-white'
                        : fallo
                            ? 'bg-[#C4643F]/15 text-[#9B4526]'
                            : 'bg-[var(--caes-band)] text-[var(--caes-mut)]'
                        }`}
                >
                    {subiendo ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : filled ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : fallo ? (
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : spec.onSite ? (
                        <Camera className="h-3.5 w-3.5" strokeWidth={1.7} />
                    ) : (
                        <FileText className="h-3.5 w-3.5" strokeWidth={1.7} />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <h3 className="text-[14.5px] font-semibold leading-[1.3] tracking-[-0.016em] text-[var(--caes-ink)]">
                            {spec.label}
                        </h3>

                        {need > 1 && (
                            <span
                                className={`rounded-full px-2 py-0.5 font-mono text-[10.5px] tabular-nums ${filled
                                    ? 'bg-[var(--caes-green)]/12 text-[var(--caes-green)]'
                                    : 'bg-[var(--caes-band)] text-[var(--caes-mut)]'
                                    }`}
                            >
                                {n}/{need}
                            </span>
                        )}

                        {!spec.required && (
                            <span className="rounded-full bg-[var(--caes-band)] px-2 py-0.5 text-[10.5px] text-[var(--caes-mut)]">
                                Opcional
                            </span>
                        )}
                    </div>

                    {/* Due righe da `sm` in su: è quello che tiene allineate
                        le schede della stessa riga senza inventare altezze.
                        Sul telefono no — c'è una colonna sola, non c'è niente
                        da allineare, e tagliare lì vorrebbe dire solo
                        nascondere metà frase. */}
                    <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--caes-mut)] sm:line-clamp-2">
                        {spec.why}
                    </p>
                </div>
            </div>

            {/* ------------------------------------------- cosa esce da qui */}
            {campos.length > 0 && (
                <p className="mt-3 flex min-w-0 items-baseline gap-2 text-[12px] text-[var(--caes-faint)]">
                    <span className="shrink-0 font-mono tabular-nums text-[var(--caes-mut)]">
                        {campos.length} {campos.length === 1 ? 'dato' : 'datos'}
                    </span>
                    <span className="truncate">
                        {campos.map((c) => c.label).join(' · ')}
                    </span>
                </p>
            )}

            {/* --------------------------------- le tre foto, in orizzontale */}
            {spec.checklist && (
                <ul className="mt-3.5 grid gap-2 sm:grid-cols-3">
                    {spec.checklist.map((c, i) => (
                        <li
                            key={c}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] leading-[1.35] transition-colors ${i < n
                                ? 'border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.05] text-[var(--caes-ink)]'
                                : 'border-dashed border-[var(--caes-line-2)] text-[var(--caes-mut)]'
                                }`}
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

            {/* ------------------------------------------------------ i file */}
            <AnimatePresence initial={false}>
                {items.length > 0 && (
                    <motion.ul
                        key="lista"
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, ease: EASE }}
                        className="mt-3.5 flex flex-col gap-1.5"
                    >
                        {items.map((f, i) => (
                            <li
                                key={f.clave ?? `${f.name}-${i}`}
                                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${f.state === 'error'
                                    ? 'border-[#C4643F]/45 bg-[#C4643F]/[.05]'
                                    : 'border-[var(--caes-line-2)] bg-[var(--caes-paper)]'
                                    }`}
                            >
                                {f.state === 'reading' ? (
                                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--caes-faint)]" />
                                ) : f.state === 'error' ? (
                                    <AlertTriangle className="h-3 w-3 shrink-0 text-[#9B4526]" />
                                ) : (
                                    <Paperclip className="h-3 w-3 shrink-0 text-[var(--caes-faint)]" />
                                )}

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12.5px] text-[var(--caes-ink)]">
                                        {f.name}
                                    </span>
                                    {f.state === 'error' && (
                                        <span className="block text-[11.5px] text-[#9B4526]">
                                            {f.error ?? 'No se ha podido subir'}
                                        </span>
                                    )}
                                    {f.state === 'done' && f.demo && (
                                        <span className="block text-[11.5px] text-[#8A6A2C]">
                                            Sin archivar · demo
                                        </span>
                                    )}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => onRemove(i)}
                                    aria-label={`Quitar ${f.name}`}
                                    className="shrink-0 rounded-md p-1 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>

            {/* ---------------------------------------------------- l'azione
                `mt-auto` la incolla in fondo: cosi le schede appaiate hanno
                i pulsanti sulla stessa linea, qualunque testo abbiano sopra. */}
            {(spec.multiple || items.length === 0) && (
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <button
                        type="button"
                        onClick={() => archivo.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-ink)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]"
                    >
                        {items.length > 0 ? (
                            <Plus className="h-3 w-3" />
                        ) : (
                            <Paperclip className="h-3 w-3" />
                        )}
                        {items.length > 0 ? 'Añadir otro' : 'Elegir archivo'}
                    </button>

                    {/* La fotocamera è una comodità, non l'unica strada: sta
                        ACCANTO alla scelta del file, mai al posto suo. */}
                    {spec.onSite && (
                        <button
                            type="button"
                            onClick={() => camara.current?.click()}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-3.5 py-1.5 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)] sm:hidden"
                        >
                            <Camera className="h-3 w-3" />
                            Hacer foto
                        </button>
                    )}
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
        </motion.li>
    )
}

export { X }

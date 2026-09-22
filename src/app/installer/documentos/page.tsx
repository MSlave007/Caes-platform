'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import DocumentChecklist, {
    type FileMap,
} from '@/components/platform/DocumentChecklist'
import SubmitStep from '@/components/platform/SubmitStep'
import BuscadorCliente, {
    type Cliente,
} from '@/components/platform/BuscadorCliente'
import { UserRound, X } from 'lucide-react'
import WizardShell, {
    StepPlaceholder,
    type SaveState,
    type StepDef,
} from '@/components/platform/WizardShell'
import type { Role } from '@/lib/documents'
import {
    deleteDraft,
    loadDraft,
    nuevoId,
    saveDraft,
    estaVacia,
    timeAgo,
    type Draft,
} from '@/lib/draft'

const STEPS: StepDef[] = [
    { id: 'docs', label: 'Documentos', caption: 'Lo que hay que subir' },
    { id: 'datos', label: 'Datos', caption: 'Confirmar lo que ha leído la IA' },
    { id: 'ahorro', label: 'Ahorro', caption: 'Cálculo y comprobación del BOE' },
    { id: 'envio', label: 'Envío', caption: 'Comisión y firma' },
]

/**
 * Percorso di creazione dell'espediente.
 *
 * ── UNA BOZZA PER VOLTA, MA NON UNA SOLA ──────────────────────────────
 *
 * L'indirizzo porta `?b=<id>`: si riprende quella bozza. Senza, se ne
 * apre una nuova. È quello che permette di avere tre cantieri aperti
 * insieme senza che il secondo cancelli il primo — vedi src/lib/draft.ts.
 *
 * Il selettore instalador / cliente qui è visibile per confrontare i due
 * elenchi. In produzione il ruolo arriva dal profilo e sparisce: nessuno
 * deve poter scegliere di che tipo di utente è.
 */
export default function DocumentosPage() {
    return (
        <Suspense fallback={<Cargando />}>
            <Documentos />
        </Suspense>
    )
}

function Cargando() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--caes-paper)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--caes-faint)]" />
        </div>
    )
}

function Documentos() {
    const params = useSearchParams()
    const pedido = params.get('b')
    // Arrivando dalla scheda di un cliente, il modulo si apre con i
    // suoi dati gia dentro: e il motivo per cui esiste la rubrica.
    const clientePedido = params.get('cliente')

    const [id, setId] = useState<string | null>(null)
    const [nombre, setNombre] = useState('')
    const [role, setRole] = useState<Role>('installer')
    const [files, setFiles] = useState<FileMap>({})
    const [notas, setNotas] = useState('')
    /**
     * Il cliente dell'espediente, scelto in cima.
     *
     * Si tiene anche il nome, non solo l'id: riaprendo la bozza si vede
     * subito di chi e' senza dover chiedere la scheda al server.
     */
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [clienteNombre, setClienteNombre] = useState('')
    const [step, setStep] = useState(0)
    const [maxReached, setMaxReached] = useState(0)
    const [save, setSave] = useState<SaveState>('idle')
    const [savedAt, setSavedAt] = useState<string | undefined>()
    const [restored, setRestored] = useState(false)

    /* ---------------------------------------------- ripresa della bozza
       Lo stato si imposta dentro l'effetto apposta: la bozza arriva dal
       server (e dalla copia locale), che durante il render non si possono
       leggere. Prima si renderizza vuoto, poi si riempie. */
    useEffect(() => {
        let vivo = true
        const cargar = async () => {
            const d: Draft | null = pedido ? await loadDraft(pedido) : null
            if (!vivo) return
            if (!d) {
                // Nuova: l'id si crea subito, così il primo salvataggio
                // automatico ha già dove andare.
                setId(nuevoId())
                return
            }
            setId(d.id)
            setNombre(d.nombre)
            setRole(d.role)
            setStep(d.step)
            setMaxReached(d.step)
            setNotas(d.notas ?? '')
            setClienteId(d.cliente_id ?? null)
            setClienteNombre(d.cliente_nombre ?? '')
            setSavedAt(timeAgo(d.savedAt))
        // I riferimenti tornano con il percorso: un file archiviato resta
        // apribile anche riprendendo la bozza da un altro momento.
            setFiles(
                Object.fromEntries(
                    Object.entries(d.files).map(([k, v]) => [
                        k,
                        v.map((f) => ({
                            name: f.name,
                            size: f.size,
                            state: 'done' as const,
                            path: f.storagePath,
                        })),
                    ])
                )
            )
            setRestored(true)
        }
        void cargar()
        return () => {
            vivo = false
        }
    }, [pedido])

    // Lo stato più fresco, senza rimettere `persist` in piedi a ogni tasto
    // scritto nel nome: il salvataggio automatico si riaggancerebbe.
    const ahora = useRef({
        id,
        nombre,
        role,
        step,
        files,
        notas,
        clienteId,
        clienteNombre,
    })
    // Aggiornato DOPO il render, non durante: scrivere in un ref mentre si
    // renderizza e una di quelle cose che funzionano finche non funzionano.
    useEffect(() => {
        ahora.current = {
            id,
            nombre,
            role,
            step,
            files,
            notas,
            clienteId,
            clienteNombre,
        }
    })

    /**
     * Scrive la bozza. Il risultato ha tre esiti, non due: arrivata
     * all'account, salvata solo qui, o niente. Il secondo non e un errore
     * ma non e nemmeno «guardato»: chi cambia dispositivo deve saperlo
     * adesso, non quando non la trova.
     */
    const guardar = useCallback(
        async (d: Parameters<typeof saveDraft>[0]) => {
            const ok = await saveDraft(d)
            if (!ok) {
                setSave('error')
                return
            }
            setSavedAt(timeAgo(ok.savedAt))
            setSave(ok.sincronizado ? 'saved' : 'local')
        },
        []
    )

    const persist = useCallback(
        (next?: Partial<{ role: Role; step: number; files: FileMap; nombre: string }>) => {
            const v = ahora.current
            if (!v.id) return

            const carga = {
                id: v.id,
                nombre: next?.nombre ?? v.nombre,
                role: next?.role ?? v.role,
                step: next?.step ?? v.step,
                notas: v.notas,
                cliente_id: v.clienteId,
                cliente_nombre: v.clienteNombre || null,
                files: Object.fromEntries(
                    Object.entries(next?.files ?? v.files)
                        .map(([k, arr]) => [
                            k,
                            arr
                                .filter((f) => f.state === 'done')
                                .map((f) => ({
                                    name: f.name,
                                    size: f.size,
                                    storagePath: f.path,
                                })),
                        ])
                        // Uno slot rimasto senza file riusciti non va salvato:
                        // riaprendo la bozza sembrerebbe pieno e vuoto insieme.
                        .filter(([, arr]) => (arr as unknown[]).length > 0)
                ),
            }

            /**
             * Una bozza senza niente dentro non si salva.
             *
             * Aprire questa pagina e cambiare passo bastava a crearne
             * una: l'elenco «Sin terminar» si riempiva di righe tutte
             * uguali con zero file, e in mezzo ci stava anche il lavoro
             * vero. Una lista in cui quasi niente vuol dire qualcosa e
             * una lista che si smette di leggere.
             */
            if (estaVacia(carga)) {
                setSave('vacio')
                return
            }

            setSave('saving')
            void guardar(carga)
        },
        [guardar]
    )

    // Salvataggio automatico a ogni file completato: il lavoro fatto non si
    // perde perché qualcuno ha chiuso la scheda senza premere niente.
    useEffect(() => {
        const anyDone = Object.values(files).some((v) =>
            v.some((f) => f.state === 'done')
        )
        if (!anyDone) return
        const t = window.setTimeout(() => persist(), 900)
        return () => window.clearTimeout(t)
    }, [files, persist])

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
        if (id) void deleteDraft(id)
        setId(nuevoId())
        setNombre('')
        setFiles({})
        setNotas('')
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
                    <div className="mx-auto mb-8 flex w-full max-w-[1060px] flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.05] px-5 py-3.5">
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
                    ancho={step === 0}
                    steps={STEPS}
                    current={step}
                    maxReached={maxReached}
                    onGoTo={goTo}
                    save={save}
                    savedAt={savedAt}
                    nombre={nombre}
                    onNombreChange={(v) => {
                        setNombre(v)
                        setSave('idle')
                    }}
                    cliente={
                        <div className="mt-5 max-w-[34ch]">
                            <label
                                htmlFor="cliente-expediente"
                                className="label-mono block text-[var(--caes-faint)]"
                            >
                                Cliente
                            </label>

                            {clienteId ? (
                                // Gia' scelto: si mostra e si puo' togliere.
                                // Un campo di ricerca con dentro un nome gia'
                                // deciso invita a riscriverlo per sbaglio.
                                <span className="mt-2 inline-flex items-center gap-2.5 rounded-full border border-[var(--caes-green)]/45 bg-[var(--caes-green)]/[.07] py-1.5 pl-3 pr-1.5 text-[14px] text-[var(--caes-ink)]">
                                    <UserRound
                                        className="h-3.5 w-3.5 text-[var(--caes-green)]"
                                        strokeWidth={2}
                                    />
                                    {clienteNombre}
                                    <button
                                        type="button"
                                        aria-label="Quitar cliente"
                                        onClick={() => {
                                            setClienteId(null)
                                            setClienteNombre('')
                                            persist()
                                        }}
                                        className="rounded-full p-1 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </span>
                            ) : (
                                <>
                                    <BuscadorCliente
                                        id="cliente-expediente"
                                        valor={clienteNombre}
                                        className="mt-2 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-4 py-2.5 text-[14px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]"
                                        onEscribir={(v) => {
                                            setClienteNombre(v)
                                            setClienteId(null)
                                        }}
                                        onElegir={(c: Cliente) => {
                                            setClienteNombre(c.nombre)
                                            setClienteId(c.id ?? null)
                                            persist()
                                        }}
                                    />
                                    <p className="mt-2 text-[12.5px] leading-[1.45] text-[var(--caes-faint)]">
                                        Si ya es cliente tuyo, elígelo y sus datos van
                                        solos al final. Si es nuevo, déjalo en blanco.
                                    </p>
                                </>
                            )}
                        </div>
                    }
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
                            notas={notas}
                            onNotasChange={setNotas}
                            onContinue={advance}
                            onSave={() => persist()}
                            save={save}
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
                        <SubmitStep
                            notas={notas}
                            nombre={nombre}
                            draftId={id ?? undefined}
                            clienteInicial={clienteId ?? clientePedido ?? undefined}
                            docs={Object.entries(files).flatMap(([slot, v]) =>
                                v
                                    .filter((f) => f.state === 'done')
                                    .map((f) => ({
                                        id: slot,
                                        name: f.name,
                                        verified: false,
                                        // Senza il percorso, in revisione non
                                        // c'e niente da aprire.
                                        path: f.path,
                                    }))
                            )}
                        />
                    )}
                </WizardShell>
            </main>
        </div>
    )
}

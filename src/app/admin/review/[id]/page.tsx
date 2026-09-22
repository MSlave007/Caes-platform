'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StatusControl from '@/components/admin/StatusControl'
import CabeceraExpediente from '@/components/admin/CabeceraExpediente'
import Avisos, { type Aviso } from '@/components/admin/Avisos'
import DocumentReview from '@/components/admin/DocumentReview'
import {
    CAMPOS,
    faltanParaFormula,
    type Extraccion,
} from '@/lib/caes/extraction'
import type { EstadoId } from '@/lib/caes/status'
import { PROVEEDORES, proveedor } from '@/lib/caes/proveedores'
import { PLANTILLAS, estadoDe, faltanEn } from '@/lib/caes/plantillas'
import {
    datosDe,
    extrasDeAgencia,
    extrasDePerfil,
} from '@/lib/caes/expediente'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FileText, Loader2, X } from 'lucide-react'
import { DOCUMENTS } from '@/lib/documents'
import {
    AHORRO_MINIMO_PCT,
    COMISION_MAXIMA_PCT,
    eur,
} from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

export default function AdminReviewDetail({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const router = useRouter()

    const [p, setP] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Valori modificabili in revisione
    const [savings, setSavings] = useState(0)
    const [agencyPct, setAgencyPct] = useState(65)
    const [verified, setVerified] = useState<Record<string, boolean>>({})
    // Il soggetto delegato e il prezzo pattuito. Non sono dettagli
    // commerciali: sono la controparte del Convenio e la clausola che il
    // cliente firma.
    const [prov, setProv] = useState<string>('')
    const [tarifa, setTarifa] = useState<number | ''>('')
    // Cinque campi dei documenti vengono dalla ficha dell'installatore.
    // Senza, il conteggio dei mancanti ne direbbe cinque di troppo.
    const [perfil, setPerfil] = useState<Parameters<typeof extrasDePerfil>[0]>(null)
    /** 'limpio' = niente da salvare. Vedi il salvataggio automatico sotto. */
    const [guardado, setGuardado] = useState<'limpio' | 'guardando' | 'hecho' | 'error'>(
        'limpio'
    )

    /**
     * I dati estratti dai documenti.
     *
     * Partono vuoti e si riempiono da due parti: quello che legge
     * /api/extract dai documenti, e quello che corregge a mano chi rivede.
     *
     * Si CARICANO dal fascicolo e si RISALVANO da soli. Prima vivevano
     * solo qui dentro: dodici campi controllati uno per uno sparivano al
     * primo aggiornamento della pagina, e nessuno se ne accorgeva finche'
     * non toccava rifarli.
     */
    const vacios = () =>
        Object.fromEntries(
            CAMPOS.map((c) => [c.id, { valor: null, estado: 'vacio' as const }])
        )
    const [extraccion, setExtraccion] = useState<Extraccion>(vacios)

    const cambiarCampo = (id: string, valor: string) =>
        setExtraccion((prev) => ({
            ...prev,
            // Toccato a mano: diventa "corregido", cioe risponde chi rivede.
            [id]: { ...prev[id], valor, estado: valor ? 'corregido' : 'vacio' },
        }))

    const confirmarCampo = (id: string) =>
        setExtraccion((prev) => ({
            ...prev,
            [id]: { ...prev[id], estado: prev[id]?.valor ? 'confirmado' : 'vacio' },
        }))

    /**
     * Conferma in blocco.
     *
     * Un solo aggiornamento di stato invece di N: con dodici campi, N
     * chiamate a `confirmarCampo` sono dodici render e un pannello che
     * sfarfalla. Vale anche come garanzia: o si confermano tutti o
     * nessuno, senza stati intermedi visibili.
     */
    const confirmarVarios = (ids: string[]) =>
        setExtraccion((prev) => {
            const siguiente = { ...prev }
            for (const id of ids) {
                if (!siguiente[id]?.valor) continue
                siguiente[id] = { ...siguiente[id], estado: 'confirmado' }
            }
            return siguiente
        })

    const faltan = faltanParaFormula(extraccion)

    /* ------------------------------------------------ carte e lettura */

    const [subiendo, setSubiendo] = useState<string | null>(null)
    const [leyendo, setLeyendo] = useState<string | null>(null)
    const [borrando, setBorrando] = useState<string | null>(null)
    const [errorDoc, setErrorDoc] = useState<string | null>(null)

    /**
     * Caricare un documento dalla revisione.
     *
     * Non tutto arriva dal portale: una carta su tre la mandano per
     * WhatsApp o la lasciano su un Drive. Finora quella finiva in un
     * limbo — il fascicolo restava «incompleto» e l'unico modo di
     * sbloccarlo era richiamare l'installatore e sperare che ricaricasse.
     *
     * Il file caricato da qui è identico a uno caricato da lui: stesso
     * deposito, stesso slot, stessa verifica da fare. Quello che cambia è
     * che il documento risulta NON verificato, come qualsiasi altro:
     * averlo caricato di persona non è una ragione per non guardarlo.
     */
    const subirDocumento = async (docId: string, files: FileList) => {
        setSubiendo(docId)
        setErrorDoc(null)
        try {
            const nuevos: NonNullable<Project['docs']> = []

            for (const file of Array.from(files)) {
                const fd = new FormData()
                fd.append('file', file)
                const res = await fetch('/api/upload', { method: 'POST', body: fd })
                const j = await res.json()
                if (!res.ok) throw new Error(j.error ?? 'No se ha podido subir el archivo')
                nuevos.push({ id: docId, name: file.name, verified: false, path: j.path })
            }

            const docs = [...(p?.docs ?? []), ...nuevos]
            await patch({ docs })
            setP((prev) => (prev ? { ...prev, docs } : prev))
        } catch (e) {
            setErrorDoc(e instanceof Error ? e.message : 'Error al subir el archivo')
        } finally {
            setSubiendo(null)
        }
    }

    /**
     * Togliere un file caricato per sbaglio.
     *
     * Due passi che vanno fatti in quest'ordine: prima si toglie dal
     * fascicolo, poi si cancella dal deposito. Se il secondo fallisce
     * resta un file orfano nel deposito, che non fa danno a nessuno;
     * facendoli al contrario resterebbe un riferimento a un file che non
     * c'è più — cioè esattamente l'«Object not found» da cui siamo
     * partiti.
     */
    const borrarDocumento = async (docId: string, indice: number) => {
        const todos = p?.docs ?? []
        // L'indice arriva dal pannello ed è relativo ai file DI QUELLO
        // SLOT, non all'elenco intero.
        const delSlot = todos.filter((d) => d.id === docId)
        const objetivo = delSlot[indice]
        if (!objetivo) return

        setBorrando(docId)
        setErrorDoc(null)
        try {
            let quitado = false
            const docs = todos.filter((d) => {
                if (quitado || d !== objetivo) return true
                quitado = true
                return false
            })

            await patch({ docs })
            setP((prev) => (prev ? { ...prev, docs } : prev))

            // Niente file nello slot: la spunta di verifica non ha più
            // niente a cui riferirsi e va tolta, o resta una conferma su
            // un documento che non esiste.
            if (!docs.some((d) => d.id === docId)) {
                setVerified((v) => ({ ...v, [docId]: false }))
            }

            if (objetivo.path) {
                const res = await fetch(
                    `/api/upload?path=${encodeURIComponent(objetivo.path)}`,
                    { method: 'DELETE' }
                )
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    setErrorDoc(
                        `Quitado del expediente, pero el archivo sigue en el almacén: ${j.details ?? j.error ?? 'error'}`
                    )
                }
            }
        } catch (e) {
            setErrorDoc(e instanceof Error ? e.message : 'Error al borrar el archivo')
        } finally {
            setBorrando(null)
        }
    }

    /**
     * Mandare un documento al modello.
     *
     * Quello che torna NON si conferma da solo: entra come proposta, con
     * la sua confidenza, e chi rivede lo spunta guardando il documento. Un
     * campo già confermato a mano non viene sovrascritto — se qualcuno ci
     * ha messo la faccia, la lettura automatica non gliela toglie.
     */
    const leerDocumento = async (docId: string, indice = 0) => {
        const doc = (p?.docs ?? []).filter((d) => d.id === docId)[indice]
        if (!doc?.path) {
            setErrorDoc(
                doc
                    ? 'Este archivo no está en el almacén: se subió en modo demostración.'
                    : 'No hay ningún archivo en este apartado.'
            )
            return
        }

        setLeyendo(docId)
        setErrorDoc(null)
        try {
            const res = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documento: docId, path: doc.path }),
            })
            const j = await res.json()
            if (!res.ok) throw new Error(j.details ?? j.error ?? 'No se ha podido leer')

            const datos = j.datos as Record<
                string,
                { valor: string | null; confianza: number }
            >

            setExtraccion((prev) => {
                const siguiente = { ...prev }
                for (const [id, leido] of Object.entries(datos)) {
                    const actual = prev[id]
                    if (actual && ['confirmado', 'corregido'].includes(actual.estado)) continue
                    if (leido.valor === null || leido.valor === '') continue
                    siguiente[id] = {
                        valor: leido.valor,
                        estado: 'extraido',
                        confianza: leido.confianza,
                    }
                }
                return siguiente
            })
        } catch (e) {
            setErrorDoc(e instanceof Error ? e.message : 'Error al leer el documento')
        } finally {
            setLeyendo(null)
        }
    }


    useEffect(() => {
        fetch(`/api/projects/${id}`)
            .then((r) => r.json())
            .then((j) => {
                const proj: Project = j.data
                setP(proj)
                setSavings(proj?.savings_eur ?? 0)
                setAgencyPct(proj?.agency_pct ?? 65)
                setProv(proj?.proveedor ?? proveedor(null).id)
                setTarifa(
                    typeof proj?.tarifa_eur_mwh === 'number' ? proj.tarifa_eur_mwh : ''
                )
                setVerified(
                    Object.fromEntries((proj?.docs ?? []).map((d) => [d.id, d.verified]))
                )
                // Quello gia' controllato in una sessione precedente torna
                // com'era: confermato resta confermato.
                if (proj?.extraccion && Object.keys(proj.extraccion).length > 0) {
                    setExtraccion({ ...vacios(), ...(proj.extraccion as Extraccion) })
                }
            })
            .catch((e) => console.error('Error al cargar el expediente:', e))
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        if (!p?.installer_id) return
        fetch(`/api/installers/${p.installer_id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => j?.data && setPerfil(j.data))
            .catch(() => {
                /* senza profilo quei cinque restano da scrivere a mano */
            })
    }, [p?.installer_id])

    /**
     * Lo stato dei tre documenti che escono da questo fascicolo.
     *
     * Si calcola con gli STESSI dati con cui si impaginano. Se qui
     * dicesse «listo» e poi nel documento mancasse un campo, questa
     * schermata sarebbe peggio che non averla.
     */
    const documentos = useMemo(() => {
        const datos = datosDe(extraccion, {
            ...extrasDePerfil(perfil),
            ...extrasDeAgencia({
                proveedor: prov,
                tarifa_eur_mwh: tarifa === '' ? null : Number(tarifa),
            }),
        })
        // I ritocchi scritti a mano contano come dati: sono l'ultima
        // parola di una persona su un documento che quella persona firma.
        const hechos = { ...datos, ...(p?.documentos?.retoques ?? {}) }
        const revisados = p?.documentos?.revisados ?? {}

        return PLANTILLAS.map((pl) => ({
            id: pl.id,
            nombre: pl.nombre,
            firman: pl.firman,
            faltan: faltanEn(pl, hechos).length,
            estado: estadoDe(pl, hechos, Boolean(revisados[pl.id])),
        }))
    }, [extraccion, perfil, prov, tarifa, p?.documentos])

    const specs = useMemo(
        () => (p ? DOCUMENTS[p.source === 'client' ? 'client' : 'installer'] : []),
        [p]
    )

    // Quanti file sono arrivati per ogni riquadro. Un conteggio, non un
    // insieme: alcuni riquadri ne chiedono tre (le foto dell'impianto), e
    // con due il fascicolo e incompleto anche se lo slot risulta «pieno».
    const cuantos = (p?.docs ?? []).reduce<Record<string, number>>((a, d) => {
        a[d.id] = (a[d.id] ?? 0) + 1
        return a
    }, {})
    const uploaded = new Set(Object.keys(cuantos))
    const missing = specs.filter(
        (s) => s.required && (cuantos[s.id] ?? 0) < (s.minFiles ?? 1)
    )
    const allVerified = specs
        .filter((s) => s.required && uploaded.has(s.id))
        .every((s) => verified[s.id])

    // Nullo vuol dire «non ancora calcolato», non «zero». In tutti e due
    // i casi non si approva — e il verso giusto in cui sbagliare — ma
    // vanno detti in modo diverso a chi legge.
    const sinCalcular = typeof p?.savings_pct !== 'number'
    const belowMinimum = (p?.savings_pct ?? 0) < AHORRO_MINIMO_PCT
    const canApprove = missing.length === 0 && allVerified && !belowMinimum

    /**
     * Quello che impedisce di approvare, come dati invece che come
     * paragrafo. Due livelli: un blocco e' una cosa che NON si puo'
     * fare, una mancanza e' lavoro da fare. Chiedere sei foto
     * all'installatore e' una telefonata; dirgli che la pratica non e'
     * ammissibile e' un'altra cosa.
     */
    const avisos = useMemo<Aviso[]>(() => {
        const lista: Aviso[] = []

        if (belowMinimum) {
            lista.push(
                sinCalcular
                    ? {
                        tipo: 'falta',
                        titulo: 'El ahorro todavía no está calculado',
                        detalle: `Hasta que no esté no se puede saber si supera el ${AHORRO_MINIMO_PCT} % que exige la norma, y sin eso no se aprueba.`,
                    }
                    : {
                        tipo: 'bloqueo',
                        titulo: `Ahorro del ${p?.savings_pct?.toLocaleString('es-ES')} %, por debajo del mínimo`,
                        detalle: `La norma exige un ${AHORRO_MINIMO_PCT} %. Este expediente no es elegible tal y como está.`,
                    }
            )
        }

        if (missing.length > 0) {
            lista.push({
                tipo: 'falta',
                titulo: `Faltan ${missing.length} ${missing.length === 1 ? 'documento obligatorio' : 'documentos obligatorios'}`,
                detalle: 'Sin ellos no se puede aprobar. Pídeselos al instalador o súbelos tú si los tienes.',
                piezas: missing.map((m) => {
                    const n = m.minFiles ?? 1
                    return n > 1
                        ? `${m.label} · ${cuantos[m.id] ?? 0} de ${n}`
                        : m.label
                }),
            })
        }

        return lista
    }, [belowMinimum, sinCalcular, missing, cuantos, p?.savings_pct])


    // Ripartizione: l'installatore ha bloccato la sua quota all'invio;
    // l'agenzia sceglie la propria sul residuo.
    const installerCut = (savings * (p?.installer_pct ?? 0)) / 100
    const remaining = savings - installerCut
    const agencyCut = (remaining * agencyPct) / 100
    const reserve = remaining - agencyCut

    const patch = async (body: Partial<Project>) => {
        const res = await fetch(`/api/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('No se ha podido guardar el cambio')
        return res.json()
    }

    /**
     * Salvataggio automatico del lavoro di revisione.
     *
     * ── PERCHE' NON BASTAVA SALVARE ALL'APPROVAZIONE ─────────────────
     *
     * Prima le spunte di verifica e i dati estratti partivano solo
     * insieme alla decisione. Ma una revisione non si fa in una seduta:
     * si aprono i documenti, si confronta il numero di serie, ci si
     * ferma, si torna il giorno dopo. Chi ricaricava la pagina ritrovava
     * tutto da rifare — e non era nemmeno detto lo notasse subito.
     *
     * Si salva mentre si lavora, con mezzo secondo di attesa perche'
     * correggere un campo a tastiera non generi una chiamata per lettera.
     */
    const primeraVez = useRef(true)
    /** Vero quando l'ultima modifica e' la firma ripresa dal server, non
     *  una modifica di chi rivede. Non va risalvata. */
    const adoptando = useRef(false)

    const guardarAvance = useCallback(async () => {
        setGuardado('guardando')
        try {
            const respuesta = await patch({
                extraccion,
                // Anche questi due. Stavano nello stesso buco: chi fissava
                // il risparmio riconosciuto e muoveva il margine, e poi
                // usciva senza approvare, tornava e li ritrovava com'erano
                // prima. Sono le due cifre che decidono quanto prende
                // ognuno — perderle in silenzio e la cosa peggiore.
                savings_eur: savings,
                agency_pct: agencyPct,
                proveedor: prov || undefined,
                tarifa_eur_mwh: tarifa === '' ? null : Number(tarifa),
                docs: (p?.docs ?? []).map((d) => ({
                    ...d,
                    verified: Boolean(verified[d.id]),
                })),
            })

            /**
             * Si prende indietro la firma che ha messo il server.
             *
             * Senza questo il nome di chi ha confermato compariva solo
             * ricaricando la pagina: si spuntava un campo e non succedeva
             * niente di visibile. Si copiano SOLO `por` e `en`, e solo sui
             * campi rimasti identici a quelli mandati: nel frattempo si
             * puo essere gia scritto in un altro campo, e adottare in
             * blocco la risposta glielo cancellerebbe sotto le dita.
             */
            const firmada = respuesta?.data?.extraccion as Extraccion | undefined
            if (firmada) {
                setExtraccion((prev) => {
                    let cambio = false
                    const siguiente = { ...prev }
                    for (const [campo, v] of Object.entries(firmada)) {
                        const actual = prev[campo]
                        if (!actual) continue
                        if (actual.valor !== v.valor || actual.estado !== v.estado) continue
                        if (actual.por === v.por && actual.en === v.en) continue
                        siguiente[campo] = { ...actual, por: v.por, en: v.en }
                        cambio = true
                    }
                    // Senza questo `return prev` la pagina si salvava in
                    // tondo: `{...prev}` e sempre un oggetto nuovo, quindi
                    // l'effetto di salvataggio automatico ripartiva, e a
                    // schermo si vedeva «Guardando… Guardado» all'infinito.
                    if (!cambio) return prev
                    adoptando.current = true
                    return siguiente
                })
            }

            setGuardado('hecho')
        } catch {
            // Non si perde niente di quello che c'e' a schermo: si dice
            // che non e' arrivato, e il tentativo successivo riprova.
            setGuardado('error')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extraccion, verified, savings, agencyPct, prov, tarifa, p?.docs, id])

    useEffect(() => {
        // Il primo giro e' il caricamento, non una modifica: risalvare
        // subito quello appena letto sarebbe una scrittura per niente.
        if (loading) return
        if (primeraVez.current) {
            primeraVez.current = false
            return
        }
        if (adoptando.current) {
            adoptando.current = false
            return
        }
        const t = window.setTimeout(() => void guardarAvance(), 500)
        return () => window.clearTimeout(t)
    }, [extraccion, verified, savings, agencyPct, prov, tarifa, loading, guardarAvance])

    const decide = async (status: 'approved' | 'rejected') => {
        setBusy(status === 'approved' ? 'approve' : 'reject')
        setError(null)
        try {
            // Le spunte di verifica vivevano solo nello stato locale: chi
            // riapriva la pratica le ritrovava tutte da rifare. Vanno salvate
            // insieme alla decisione.
            const docsVerificados = (p?.docs ?? []).map((d) => ({
                ...d,
                verified: Boolean(verified[d.id]),
            }))

            await patch(
                status === 'approved'
                    ? { status, savings_eur: savings, agency_pct: agencyPct, docs: docsVerificados }
                    : { status, docs: docsVerificados }
            )
            router.push('/admin/review')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar')
            setBusy(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando el expediente…
            </div>
        )
    }

    if (!p) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                <h1 className="text-[20px] font-semibold tracking-[-0.026em]">
                    Este expediente no existe.
                </h1>
                <Link
                    href="/admin/review"
                    className="mt-6 inline-flex items-center gap-2 text-[14px] text-[var(--caes-mut)] underline-offset-4 hover:text-[var(--caes-ink)] hover:underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a la cola
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-9">
            {/* Il ritorno alla coda sta dentro l'intestazione condivisa:
                qui ce n'era un secondo, identico, a quattro pixel. */}
            <CabeceraExpediente
                id={String(id)}
                numero={String(p.id)}
                cliente={p.client_name}
                instalador={p.installer_name}
                direccion={p.address}
                origen={p.source === 'client' ? 'client' : 'installer'}
                estado={p.status}
                activa="revision"
                pendientes={documentos.filter((d) => d.estado !== 'listo_firmar').length}
            />

            {/* --------------------------------------------------- avvisi */}
            <Avisos avisos={avisos} />

            {/* Documenti e dati estratti in una lista sola: i dati stanno
                dentro il documento da cui escono, cosi il collegamento non
                va ricostruito a mente. Il riparto resta sotto. */}
            <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Documentación y datos
                    </h2>

                    {/* Che si stia salvando va VISTO. Un salvataggio
                        automatico silenzioso e indistinguibile da uno che
                        non c'e: chi rivede deve poter chiudere la scheda
                        sapendo che il lavoro e al sicuro. */}
                    <span
                        className={`text-[12.5px] ${guardado === 'error'
                            ? 'text-[var(--caes-bloqueo-ink)]'
                            : 'text-[var(--caes-faint)]'
                            }`}
                        role={guardado === 'error' ? 'alert' : undefined}
                    >
                        {guardado === 'guardando'
                            ? 'Guardando…'
                            : guardado === 'hecho'
                                ? 'Guardado. Puedes cerrar y seguir después.'
                                : guardado === 'error'
                                    ? 'No se ha podido guardar lo comprobado.'
                                    : ''}
                    </span>
                </div>

                <div className="mt-6">
                    <DocumentReview
                        specs={specs}
                        subidos={(p?.docs ?? []).map((d) => ({
                            id: d.id,
                            name: d.name,
                            path: d.path,
                        }))}
                        verified={verified}
                        onVerificar={(id) =>
                            setVerified((v) => ({ ...v, [id]: !v[id] }))
                        }
                        extraccion={extraccion}
                        onCambiar={cambiarCampo}
                        onConfirmar={confirmarCampo}
                        onConfirmarVarios={confirmarVarios}
                        onSubir={subirDocumento}
                        subiendo={subiendo}
                        onLeer={leerDocumento}
                        leyendo={leyendo}
                        onBorrar={borrarDocumento}
                        borrando={borrando}
                    />
                    {errorDoc && (
                        <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--caes-falta-ink)]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {errorDoc}
                        </p>
                    )}
                </div>
            </section>

            {/* ------------------------------------ i documenti in uscita

                Il giro e': carte che arrivano -> dati confermati -> carte
                che escono. Prima questa terza parte era una pastiglia in
                alto che diceva solo «Ver los documentos»: si poteva
                approvare un fascicolo senza sapere se i documenti erano
                emettibili. Adesso lo stato si legge qui, e si calcola con
                gli stessi dati con cui i documenti si impaginano. */}
            <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                        Documentos que salen de aquí
                    </h2>
                    <Link
                        href={`/admin/review/${id}/documentos`}
                        className="group inline-flex items-center gap-2 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                    >
                        Abrirlos y revisarlos
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </div>

                <ul className="mt-6 flex flex-col gap-2.5">
                    {documentos.map((d) => {
                        const listo = d.estado !== 'incompleto'
                        const revisado = d.estado === 'listo_firmar'
                        return (
                            <li key={d.id}>
                                <Link
                                    href={`/admin/review/${id}/documentos`}
                                    className={`group flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border px-4 py-3.5 transition-colors ${revisado
                                        ? 'border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.05]'
                                        : listo
                                            ? 'border-[var(--caes-line)] hover:border-[var(--caes-ink)]/30'
                                            : 'border-dashed border-[var(--caes-line)] hover:border-[var(--caes-falta-ink)]'
                                        }`}
                                >
                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${revisado
                                            ? 'border-[var(--caes-green)] bg-[var(--caes-green)] text-white'
                                            : listo
                                                ? 'border-[var(--caes-line-2)] text-[var(--caes-faint)]'
                                                : 'border-dashed border-[var(--caes-falta-ink)] text-[var(--caes-falta-ink)]'
                                            }`}
                                    >
                                        {revisado ? (
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        ) : (
                                            <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                                        )}
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14.5px] font-medium text-[var(--caes-ink)]">
                                            {d.nombre}
                                        </span>
                                        <span className="block text-[12.5px] text-[var(--caes-faint)]">
                                            Lo firma: {d.firman.toLowerCase()}
                                        </span>
                                    </span>

                                    <span
                                        className={`shrink-0 text-[12.5px] ${revisado
                                            ? 'text-[var(--caes-green)]'
                                            : listo
                                                ? 'text-[var(--caes-mut)]'
                                                : 'text-[var(--caes-falta-ink)]'
                                            }`}
                                    >
                                        {revisado
                                            ? 'Revisado'
                                            : listo
                                                ? 'Listo para revisar'
                                                : `Faltan ${d.faltan} ${d.faltan === 1 ? 'dato' : 'datos'}`}
                                    </span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>

                {/* La firma non c'e' ancora. Dirlo e' meglio che lasciare
                    immaginare che «revisado» voglia dire «mandato». */}
                <p className="mt-5 border-t border-[var(--caes-line-2)] pt-5 text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                    {documentos.every((d) => d.estado === 'listo_firmar')
                        ? 'Los tres están revisados. El envío a firma electrónica todavía no está conectado: por ahora se descargan y se mandan a mano.'
                        : 'Cuando estén los tres revisados se podrán emitir. El envío a firma electrónica todavía no está conectado.'}
                </p>
            </section>

            {/* Il riparto, sotto: si decide dopo aver verificato. */}
                {/* ------------------------------------------- ripartizione */}
                <aside className="flex flex-col gap-6">
                    <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Ahorro reconocido
                        </h2>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                            Lo que calculó el motor. Ajústalo solo si la documentación dice
                            otra cosa.
                        </p>

                        <div className="mt-6 flex items-baseline gap-2">
                            <input
                                type="number"
                                min={0}
                                step={10}
                                value={savings}
                                onChange={(e) => setSavings(Number(e.target.value) || 0)}
                                className="w-[9rem] rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 font-mono tabular text-[20px] font-medium outline-none transition-colors focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                            />
                            <span className="text-[14px] text-[var(--caes-mut)]">€ / año</span>
                        </div>
                    </section>

                    {/* ------------------------------------ il cesionario

                        Sta accanto al risparmio e non nelle impostazioni
                        perche' non e' una preferenza: e' la controparte
                        del Convenio. Cambiarlo cambia NIF, codice di
                        accreditamento e chi firma, e il documento si
                        rigenera intero. */}
                    <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Sujeto delegado
                        </h2>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                            A quién se cede el ahorro. Sale en el Convenio con su NIF y
                            su código de acreditación, así que cámbialo aquí y no a mano
                            en el documento.
                        </p>

                        <select
                            value={prov}
                            onChange={(e) => setProv(e.target.value)}
                            className="mt-5 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 text-[14.5px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]"
                        >
                            {PROVEEDORES.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.etiqueta}
                                </option>
                            ))}
                        </select>

                        <div className="mt-6">
                            <label
                                htmlFor="tarifa"
                                className="label-mono block text-[var(--caes-faint)]"
                            >
                                Contraprestación
                            </label>
                            <div className="mt-2 flex items-baseline gap-2">
                                <input
                                    id="tarifa"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={tarifa}
                                    placeholder={String(proveedor(prov).tarifaEurMwh)}
                                    onChange={(e) =>
                                        setTarifa(e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    className="w-[7rem] rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-2.5 font-mono tabular text-[16px] outline-none transition-colors focus:border-[var(--caes-green)]"
                                />
                                <span className="text-[14px] text-[var(--caes-mut)]">€ / MWh</span>
                            </div>
                            <p className="mt-2.5 max-w-[46ch] text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                                {tarifa === ''
                                    ? `Vacío: se usa la del acuerdo con ${proveedor(prov).etiqueta}, ${proveedor(prov).tarifaEurMwh} €/MWh.`
                                    : 'Precio pactado en este expediente. Es el que se escribe en la cláusula del Convenio.'}
                            </p>
                        </div>
                    </section>

                    <section className="rounded-2xl bg-[var(--caes-deep)] p-7 text-[var(--caes-on-deep)]">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-white">
                            Tu margen
                        </h2>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(221,233,225,.6)]">
                            Sobre {eur(remaining)}, que es lo que queda después de la comisión
                            del instalador.
                        </p>

                        <div className="mt-6 font-mono tabular text-[34px] leading-none tracking-[-0.04em] text-[var(--caes-lime)]">
                            {eur(agencyCut)}
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={agencyPct}
                            onChange={(e) => setAgencyPct(Number(e.target.value))}
                            className="caes-range mt-6 w-full"
                            aria-label="Margen de la agencia"
                        />
                        <div className="mt-3 flex justify-between font-mono text-[11px] text-[rgba(221,233,225,.5)]">
                            <span>0 %</span>
                            <span>{agencyPct} %</span>
                            <span>100 %</span>
                        </div>

                        <div className="mt-7 flex flex-col gap-2.5 border-t border-white/10 pt-6 text-[13px]">
                            {[
                                {
                                    l: `Instalador · ${p.installer_pct} %`,
                                    v: installerCut,
                                    c: 'var(--caes-lime)',
                                    note: 'bloqueado al enviar',
                                },
                                { l: `Agencia · ${agencyPct} %`, v: agencyCut, c: '#4FCB8E' },
                                { l: 'Reserva', v: reserve, c: 'rgba(221,233,225,.35)' },
                            ].map((r) => (
                                <div key={r.l} className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-2.5 text-[rgba(221,233,225,.72)]">
                                        <i
                                            className="block h-[7px] w-[7px] shrink-0 rounded-[2px]"
                                            style={{ background: r.c }}
                                        />
                                        {r.l}
                                        {r.note && (
                                            <span className="text-[11.5px] text-[rgba(221,233,225,.4)]">
                                                {r.note}
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-mono tabular text-[13.5px] font-medium text-white">
                                        {eur(r.v)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {p.installer_pct > COMISION_MAXIMA_PCT && (
                            <p className="mt-5 rounded-lg bg-[var(--caes-bloqueo)]/20 px-3.5 py-2.5 text-[12.5px] text-[var(--caes-bloqueo)]">
                                La comisión del instalador supera el {COMISION_MAXIMA_PCT} %
                                legal. El acuerdo CAES no sería válido.
                            </p>
                        )}
                    </section>
                </aside>

            {error && (
                <p
                    role="alert"
                    className="rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3 text-[13.5px] text-[var(--caes-falta-deep)]"
                >
                    {error}
                </p>
            )}

            {/* --------------------------------------- ciclo di vita */}
            {p ? (
                <div className="mt-8">
                    <StatusControl
                        current={p.status}
                        onChange={async (next: EstadoId, motivo?: string) => {
                            // Il motivo finisce sul fascicolo: lo legge
                            // l'installatore nel suo pannello, ed e' quello
                            // che gli dice cosa fare.
                            await patch(
                                motivo
                                    ? { status: next, admin_notes: motivo }
                                    : { status: next }
                            )
                            setP((prev) =>
                                prev
                                    ? {
                                        ...prev,
                                        status: next,
                                        ...(motivo ? { admin_notes: motivo } : {}),
                                    }
                                    : prev
                            )
                        }}
                    />
                </div>
            ) : null}

            {/* ------------------------------------------------- decisione */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line)] bg-[var(--caes-paper)] py-6">
                <p className="max-w-[46ch] text-[13px] leading-[1.55] text-[var(--caes-mut)]">
                    {canApprove
                        ? 'Todo comprobado. Al aprobar se fija el reparto y se emite el certificado.'
                        : 'No se puede aprobar hasta que esté todo verificado y el ahorro supere el mínimo.'}
                </p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => decide('rejected')}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-5 py-3 text-[14.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-bloqueo)]/50 hover:text-[var(--caes-bloqueo-ink)] disabled:opacity-40"
                    >
                        {busy === 'reject' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                        Rechazar
                    </button>
                    <button
                        type="button"
                        onClick={() => decide('approved')}
                        disabled={!canApprove || busy !== null}
                        className="inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        {busy === 'approve' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                        )}
                        Aprobar y emitir
                    </button>
                </div>
            </div>
        </div>
    )
}

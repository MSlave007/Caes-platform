'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import GeneradorDocumentos from '@/components/admin/GeneradorDocumentos'
import { CAMPOS, type Extraccion } from '@/lib/caes/extraction'
import {
    DATOS_EJEMPLO,
    datosDe,
    extrasDeAgencia,
    extrasDePerfil,
} from '@/lib/caes/expediente'
import { huecosSinOrigen, type Datos } from '@/lib/caes/plantillas'
import type { Project } from '@/lib/mockDb'

/**
 * I documenti che il fascicolo produce.
 *
 * ── PERCHÉ OGGI PARTE DALL'ESEMPIO ────────────────────────────────────
 *
 * I dati estratti vivono ancora nello stato della schermata di revisione
 * e non vengono salvati: chi ricarica la pagina li perde. Finché non si
 * salvano sul fascicolo, questa schermata non ha da dove prenderli.
 *
 * Quindi qui si può girare in due modi. «Datos del expediente» mostra la
 * verità — oggi quasi tutto vuoto, che è esattamente quanto manca. «Datos
 * de ejemplo» riempie tutto con l'esemplare di Marco e fa vedere i tre
 * documenti finiti. Il secondo serve a decidere se la forma va bene; il
 * primo serve a non dimenticare quanta strada c'è.
 */
export default function DocumentosDelExpediente({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)

    const [p, setP] = useState<Project | null>(null)
    const [cargando, setCargando] = useState(true)
    const [conEjemplo, setConEjemplo] = useState(true)
    const [revisados, setRevisados] = useState<Record<string, boolean>>({})

    /**
     * Quello che è stato riscritto a mano dentro il documento.
     *
     * Separato dai dati, non fuso dentro: un ritocco è una decisione di
     * chi rivede e va poter essere annullata. Se lo scrivessimo sopra ai
     * dati, tornare indietro vorrebbe dire ricordarsi a memoria cosa
     * c'era prima.
     *
     * Vive sul fascicolo, non nella schermata: la referenza catastrale
     * scritta a mano una volta non si riscrive la volta dopo.
     */
    const [retoques, setRetoques] = useState<Datos>({})
    const [extraccion, setExtraccion] = useState<Extraccion>(() =>
        Object.fromEntries(CAMPOS.map((c) => [c.id, { valor: null, estado: 'vacio' as const }]))
    )
    const [perfil, setPerfil] = useState<Parameters<typeof extrasDePerfil>[0]>(null)
    const [guardado, setGuardado] = useState<'limpio' | 'guardando' | 'hecho' | 'error'>(
        'limpio'
    )

    useEffect(() => {
        fetch(`/api/projects/${id}`)
            .then((r) => r.json())
            .then((j) => {
                const proj: Project = j.data
                setP(proj)
                // Quello che chi rivede ha gia' confermato campo per campo.
                const ex = proj?.extraccion as Extraccion | undefined
                if (ex && Object.keys(ex).length > 0) {
                    setExtraccion((prev) => ({ ...prev, ...ex }))
                }
                const doc = proj?.documentos as
                    | { retoques?: Datos; revisados?: Record<string, boolean> }
                    | undefined
                if (doc?.retoques) setRetoques(doc.retoques)
                if (doc?.revisados) setRevisados(doc.revisados)
                // Se il fascicolo ha dati veri, si parte da quelli: l'esempio
                // serviva quando non c'era altro da mostrare.
                if (ex && Object.values(ex).some((v) => v?.valor)) setConEjemplo(false)
            })
            .catch((e) => console.error('Error al cargar el expediente:', e))
            .finally(() => setCargando(false))
    }, [id])

    // L'anagrafica dell'installatore: cinque campi dei documenti vengono
    // da qui, e finora si riscrivevano a mano a ogni pratica.
    useEffect(() => {
        if (!p?.installer_id) return
        fetch(`/api/installers/${p.installer_id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => j?.data && setPerfil(j.data))
            .catch(() => {
                /* senza profilo i cinque campi restano da scrivere a mano */
            })
    }, [p?.installer_id])

    /**
     * Ritocchi e spunte si salvano sul fascicolo.
     *
     * Mezzo secondo di attesa, come nel pannello di revisione: scrivere
     * una referenza catastrale a tastiera non deve generare una chiamata
     * per lettera.
     */
    const primeraVez = useRef(true)
    useEffect(() => {
        if (cargando) return
        if (primeraVez.current) {
            primeraVez.current = false
            return
        }
        const t = window.setTimeout(async () => {
            setGuardado('guardando')
            try {
                const res = await fetch(`/api/projects/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentos: { retoques, revisados } }),
                })
                setGuardado(res.ok ? 'hecho' : 'error')
            } catch {
                setGuardado('error')
            }
        }, 500)
        return () => window.clearTimeout(t)
    }, [retoques, revisados, cargando, id])

    // I ritocchi vincono sempre: sono l'ultima parola di una persona su
    // un documento che quella persona firma.
    const base = conEjemplo
        ? DATOS_EJEMPLO
        : datosDe(extraccion, { ...extrasDePerfil(perfil), ...extrasDeAgencia() })
    const datos: Datos = { ...base, ...retoques }
    const sinOrigen = huecosSinOrigen()

    if (cargando) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando el expediente…
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5 print:hidden">
                <Link
                    href={`/admin/review/${id}`}
                    className="group inline-flex w-fit items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                    Volver al expediente
                </Link>

                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-[-0.026em] text-[var(--caes-ink)]">
                            Documentos del expediente {p?.id ?? id}
                        </h1>
                        <p className="mt-1 text-[13.5px] text-[var(--caes-mut)]">
                            {p?.client_name ? `${p.client_name} · ` : ''}
                            Los tres se generan de los mismos datos, así que no pueden
                            contradecirse entre ellos.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <span
                            className={`text-[12.5px] ${guardado === 'error'
                                ? 'text-[#9B4526]'
                                : 'text-[var(--caes-faint)]'
                                }`}
                        >
                            {guardado === 'guardando'
                                ? 'Guardando…'
                                : guardado === 'hecho'
                                    ? 'Guardado'
                                    : guardado === 'error'
                                        ? 'No se ha podido guardar'
                                        : ''}
                        </span>

                    {/* L'interruttore fra la verita e la dimostrazione. */}
                    <div className="flex items-center gap-1 rounded-full border border-[var(--caes-line)] p-1">
                        {[
                            { v: false, t: 'Datos del expediente' },
                            { v: true, t: 'Datos de ejemplo' },
                        ].map((o) => (
                            <button
                                key={String(o.v)}
                                type="button"
                                onClick={() => setConEjemplo(o.v)}
                                className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${conEjemplo === o.v
                                        ? 'bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                        : 'text-[var(--caes-mut)] hover:text-[var(--caes-ink)]'
                                    }`}
                            >
                                {o.t}
                            </button>
                        ))}
                    </div>
                    </div>
                </div>
            </div>

            <GeneradorDocumentos
                datos={datos}
                retoques={retoques}
                onRetocar={(id, valor) =>
                    setRetoques((r) => {
                        // Riscrivere lo stesso valore che c'era gia non e'
                        // un ritocco: segnarlo riempirebbe l'elenco di
                        // modifiche che non hanno modificato niente.
                        if (valor === base[id]) {
                            const { [id]: _, ...resto } = r
                            void _
                            return resto
                        }
                        return { ...r, [id]: valor }
                    })
                }
                onDeshacer={(id) =>
                    setRetoques((r) => {
                        const { [id]: _, ...resto } = r
                        void _
                        return resto
                    })
                }
                revisados={revisados}
                onRevisar={(pid) => setRevisados((r) => ({ ...r, [pid]: !r[pid] }))}
                conEjemplo={conEjemplo}
            />

            {/* La lista di lavoro. Sta in fondo perche' non serve a chi
                guarda i documenti, serve a chi li deve far funzionare. */}
            {sinOrigen.length > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--caes-line)] px-5 py-4 print:hidden">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                        Campos que los documentos piden y la extracción todavía no da
                    </span>
                    <ul className="flex flex-col gap-1.5">
                        {sinOrigen.map((h) => (
                            <li key={h.id} className="text-[12.5px] leading-[1.45] text-[var(--caes-mut)]">
                                <span className="font-mono text-[11.5px] text-[var(--caes-faint)]">
                                    {h.campo}
                                </span>{' '}
                                · {h.label}
                                {h.nota && (
                                    <span className="block text-[11.5px] text-[var(--caes-faint)]">
                                        {h.nota}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

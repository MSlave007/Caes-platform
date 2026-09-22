'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react'
import { abiertoPorLaAgencia, estado } from '@/lib/caes/status'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Quello che la piattaforma sta aspettando DA TE.
 *
 * ── PERCHÉ IN CIMA E NON NELL'ELENCO ──────────────────────────────────
 *
 * Nell'elenco degli espedienti ogni riga aveva la sua pastiglia di
 * stato, e «Cambios solicitados» era una pastiglia come le altre, dello
 * stesso peso di «Aprobado». Ma le due cose non si somigliano per
 * niente: una è una notizia, l'altra è un lavoro fermo che aspetta te.
 *
 * Nella mappa del percorso «le settimane di silenzio» era uno dei tre
 * punti in cui il giro si rompe. Se la piattaforma rimanda indietro una
 * pratica e chi la deve correggere non se ne accorge, quel silenzio lo
 * abbiamo prodotto noi — con un'interfaccia che lo dice, ma sottovoce.
 *
 * ── PERCHÉ ORA SI APRE E SI CHIUDE ────────────────────────────────────
 *
 * Con sei pendenti la sezione si mangiava tutto lo schermo: sotto non
 * restava niente, nemmeno i numeri. Un avviso che copre la pagina
 * smette di essere un avviso e diventa la pagina.
 *
 * Chiuso però non deve voler dire cieco. La testata da sola dice
 * quanti sono e **di che tipo** («Te lo hemos abierto 3 · Cambios
 * solicitados 3»): l'urgenza si legge senza toccare niente, e si apre
 * solo quando si è deciso di mettersi a lavorare.
 *
 * Con uno o due nasce già aperta — a quell'altezza non copre niente e
 * chiuderla sarebbe solo un clic in più prima di capire.
 *
 * ── RAGGRUPPATI, NON RIPETUTI ─────────────────────────────────────────
 *
 * Tre bozze aperte dall'agenzia avevano tre volte la stessa identica
 * frase di sei righe. Il motivo lo scriviamo una volta sola in testa al
 * gruppo e sotto restano i nomi. Dove invece il testo è scritto a mano
 * dall'agenzia — «cambios solicitados» — ogni riga tiene il suo, perché
 * lì ogni riga dice una cosa diversa.
 */

export type Pendiente = {
    id: string
    cliente: string
    estado: string
    /** Quello che ha scritto l'agenzia. Senza questo l'avviso è inutile. */
    motivo?: string | null
}

/**
 * Il testo di `draft` in status.ts è scritto dal punto di vista
 * dell'agenzia («el instalador aún lo está rellenando») e qui direbbe il
 * contrario di quello che serve sapere.
 */
const TEXTO_ABIERTO =
    'Lo hemos abierto nosotros y te lo hemos asignado. Faltan los documentos de la obra — súbelos y ya lo revisamos.'

type Grupo = {
    clave: string
    etiqueta: string
    /** Testo valido per tutto il gruppo, o null se ogni riga ha il suo. */
    comun: string | null
    items: Pendiente[]
}

/** Raggruppa per motivo, tenendo l'ordine in cui sono arrivati. */
function agrupar(pendientes: Pendiente[]): Grupo[] {
    const mapa = new Map<string, Grupo>()

    for (const p of pendientes) {
        // Una bozza dentro `projects` può essere nata in un modo solo:
        // l'ha aperta l'agenzia per lui. Vedi abiertoPorLaAgencia().
        const abierto = abiertoPorLaAgencia(p.estado)
        const e = estado(p.estado)
        const clave = abierto ? 'abierto' : e.id

        let g = mapa.get(clave)
        if (!g) {
            g = {
                clave,
                etiqueta: abierto ? 'Te lo hemos abierto' : e.label,
                comun: abierto ? TEXTO_ABIERTO : e.hint,
                items: [],
            }
            mapa.set(clave, g)
        }

        // Basta che uno porti il suo motivo perché il testo comune non
        // valga più per tutti: da lì in giù si legge riga per riga.
        if (!abierto && p.motivo) g.comun = null
        g.items.push(p)
    }

    return [...mapa.values()]
}

export default function TeToca({ pendientes }: { pendientes: Pendiente[] }) {
    const grupos = agrupar(pendientes)
    /**
     * Aperto o chiuso: dedotto finché nessuno lo tocca.
     *
     * Era `useState(pendientes.length <= 2)`, e sembrava giusto. Ma lo
     * stato iniziale si calcola al primo render, e al primo render i
     * dati non sono ancora arrivati: la lista è vuota, `0 <= 2` è vero,
     * e il pannello si apriva. Poi arrivavano sei pratiche e restava
     * aperto — cioè proprio il caso in cui copre mezza pagina.
     *
     * `null` vuol dire «nessuno ha ancora deciso»: si guarda quanti ce
     * ne sono ADESSO. Dal primo clic in poi comanda la persona.
     */
    const [tocado, setTocado] = useState<boolean | null>(null)
    // Fino a due non copre niente: tanto vale averli già davanti.
    const abierto = tocado ?? pendientes.length <= 2
    const quieto = useReducedMotion()
    const idCuerpo = useId()

    if (pendientes.length === 0) return null

    const dur = quieto ? 0 : 0.34

    return (
        <section className="overflow-hidden rounded-2xl border border-[var(--caes-falta)]/55 bg-[var(--caes-falta)]/[.08]">
            {/* ------------------------------------------------- la testata */}
            <button
                type="button"
                onClick={() => setTocado(!abierto)}
                aria-expanded={abierto}
                aria-controls={idCuerpo}
                className="flex w-full items-start gap-4 p-6 text-left transition-colors hover:bg-[var(--caes-falta)]/[.06] sm:p-7"
            >
                <span className="mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--caes-falta)]/25 text-[var(--caes-falta-ink)]">
                    <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold tracking-[-0.018em] text-[var(--caes-falta-deep)]">
                        {pendientes.length === 1
                            ? 'Hay un expediente esperándote'
                            : `Hay ${pendientes.length} expedientes esperándote`}
                    </span>
                    <span className="mt-1.5 block max-w-[62ch] text-[13.5px] leading-[1.55] text-[var(--caes-falta-ink)]">
                        Hasta que no los toques no se mueven. Nadie más puede hacerlo
                        por ti.
                    </span>

                    {/*
                        Chiuso, questa riga è tutto quello che si sa: non
                        solo quanti, ma di che tipo. È la ragione per cui
                        chiudere non costa niente.
                    */}
                    <AnimatePresence initial={false}>
                        {!abierto && (
                            <motion.span
                                className="block overflow-hidden"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: dur, ease: EASE }}
                            >
                                <span className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-2">
                                    {grupos.map((g) => (
                                        <span
                                            key={g.clave}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--caes-falta)]/40 bg-[var(--caes-paper)]/70 px-2.5 py-1 text-[11.5px] text-[var(--caes-falta-ink)]"
                                        >
                                            {g.etiqueta}
                                            <span className="font-mono text-[11px] tabular-nums opacity-70">
                                                {g.items.length}
                                            </span>
                                        </span>
                                    ))}
                                </span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </span>

                <span className="mt-0.5 flex shrink-0 items-center gap-2 text-[12.5px] text-[var(--caes-falta-ink)]">
                    <span className="hidden sm:inline">
                        {abierto ? 'Ocultar' : 'Verlos'}
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ${
                            abierto ? 'rotate-180' : ''
                        }`}
                    />
                </span>
            </button>

            {/* -------------------------------------------------- l'elenco */}
            <AnimatePresence initial={false}>
                {abierto && (
                    <motion.div
                        id={idCuerpo}
                        className="overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: dur, ease: EASE }}
                    >
                        {/* Allineato sotto il titolo, non sotto l'icona. */}
                        <div className="flex flex-col gap-6 px-6 pb-6 sm:pb-7 sm:pl-[4.75rem] sm:pr-7">
                            {grupos.map((g, gi) => (
                                <motion.div
                                    key={g.clave}
                                    initial={quieto ? false : { opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: dur,
                                        delay: quieto ? 0 : 0.06 + gi * 0.05,
                                        ease: EASE,
                                    }}
                                >
                                    {/* Un gruppo solo non ha bisogno di
                                        essere annunciato: il titolo sopra
                                        dice già di cosa si parla. */}
                                    {grupos.length > 1 && (
                                        <div className="flex items-baseline gap-2.5">
                                            <span className="text-[12px] font-medium uppercase tracking-[0.07em] text-[var(--caes-falta-deep)]">
                                                {g.etiqueta}
                                            </span>
                                            <span className="h-px flex-1 bg-[var(--caes-falta)]/30" />
                                            <span className="font-mono text-[11px] tabular-nums text-[var(--caes-falta-ink)]/70">
                                                {g.items.length}
                                            </span>
                                        </div>
                                    )}

                                    {/* Il motivo, quando è lo stesso per
                                        tutti, sta qui e non in ogni riga. */}
                                    {g.comun && (
                                        <p className="mt-2.5 max-w-[68ch] whitespace-pre-wrap text-[13.5px] leading-[1.55] text-[var(--caes-falta-ink)]">
                                            {g.comun}
                                        </p>
                                    )}

                                    <ul className="mt-3 flex flex-col gap-2">
                                        {g.items.map((p) => (
                                            <li key={p.id}>
                                                <Link
                                                    href={`/installer/project/${p.id}`}
                                                    className="group flex flex-wrap items-start gap-x-4 gap-y-1.5 rounded-xl border border-[var(--caes-falta)]/45 bg-[var(--caes-paper)] px-4 py-3 transition-colors hover:border-[var(--caes-falta-ink)]"
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex flex-wrap items-baseline gap-x-2.5">
                                                            <span className="text-[14.5px] font-medium text-[var(--caes-ink)]">
                                                                {p.cliente}
                                                            </span>
                                                            <span className="font-mono text-[11px] text-[var(--caes-faint)]">
                                                                #{String(p.id).slice(0, 8)}
                                                            </span>
                                                        </span>

                                                        {/* Solo se questa riga
                                                            dice una cosa che il
                                                            gruppo non dice già. */}
                                                        {!g.comun && (
                                                            <span className="mt-1.5 block max-w-[68ch] whitespace-pre-wrap text-[13.5px] leading-[1.55] text-[var(--caes-ink)]">
                                                                {p.motivo || estado(p.estado).hint}
                                                            </span>
                                                        )}
                                                    </span>

                                                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)]" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

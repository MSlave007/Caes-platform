'use client'

import type { Role } from './documents'

/**
 * Le bozze degli espedienti.
 *
 * ── PERCHÉ PIÙ DI UNA ─────────────────────────────────────────────────
 *
 * Prima ce n'era una sola. Sembrava abbastanza finché non si guarda come
 * lavora davvero un installatore: comincia un'installazione il lunedì, gli
 * manca il certificato energetico, la lascia lì; mercoledì ne fa un'altra.
 * Con una bozza sola la seconda cancellava la prima, in silenzio.
 *
 * Quindi sono un elenco, e ognuna ha un NOME. Il nome non è un vezzo: è
 * l'unica cosa che distingue due cantieri quando il cliente non è ancora
 * stato scritto da nessuna parte — e in questa fase non lo è, perché i
 * dati del cliente escono dalla fattura, che arriva dopo.
 *
 * ── DOVE VIVONO ───────────────────────────────────────────────────────
 *
 * Nel browser (localStorage), non sul server. Le ritrovi sullo stesso
 * dispositivo e sullo stesso browser, non se cambi telefono. Dei file
 * teniamo il riferimento, non i byte: `storagePath` è la chiave nel
 * deposito, quindi un file già archiviato resta apribile.
 */

/** v3: più bozze, ognuna con nome e id. v2 era una sola, senza nome. */
export const DRAFTS_KEY = 'caes:drafts:v3'
const KEY_V2 = 'caes:draft:v2'
const KEY_V1 = 'caes:draft:v1'

export type DraftFile = {
    name: string
    size: number
    /** Chiave su Supabase Storage. Vuota finché il caricamento non è collegato. */
    storagePath?: string
}

export type Draft = {
    id: string
    /** Come la chiama chi la sta compilando. Mai vuoto: vedi `nombrePorDefecto`. */
    nombre: string
    role: Role
    step: number
    files: Record<string, DraftFile[]>
    /** Quello che l'installatore ha scritto a mano. Lo legge chi revisiona. */
    notas?: string
    /** ISO 8601 */
    savedAt: string
}

export function nuevoId(): string {
    return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Un nome che si possa riconoscere fra tre bozze aperte, quando chi
 * compila non ne ha scritto uno. La data da sola non basta — «Borrador»
 * per tre volte non distingue niente — ma è meglio del vuoto.
 */
export function nombrePorDefecto(d = new Date()): string {
    return `Sin nombre · ${d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
    })}`
}

/* ------------------------------------------------------------------ */

function leer(): Draft[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(DRAFTS_KEY)
        const lista = raw ? (JSON.parse(raw) as Draft[]) : []
        if (!Array.isArray(lista)) return []
        // Difesa: una bozza scritta a mano o rimasta a metà non deve far
        // saltare la pagina al primo `.map`.
        return lista
            .filter((d) => d && typeof d === 'object' && d.id && d.savedAt)
            .map((d) => ({
                ...d,
                nombre: d.nombre || nombrePorDefecto(new Date(d.savedAt)),
                files: Object.fromEntries(
                    Object.entries(d.files ?? {}).map(([k, v]) => [
                        k,
                        Array.isArray(v) ? v : [v],
                    ])
                ),
            }))
    } catch {
        // Modalità privata, spazio esaurito, dati corrotti: si riparte pulito.
        return []
    }
}

function escribir(lista: Draft[]): boolean {
    if (typeof window === 'undefined') return false
    try {
        window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(lista))
        return true
    } catch {
        return false
    }
}

/**
 * Recupera la bozza singola del formato vecchio, una volta sola.
 *
 * Buttarla sarebbe stato più semplice, ma è lavoro di qualcuno: se stava
 * compilando un espediente quando è cambiato il formato, se lo ritrova.
 */
function migrar(): Draft[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(KEY_V2)
        window.localStorage.removeItem(KEY_V2)
        window.localStorage.removeItem(KEY_V1)
        if (!raw) return []
        const v = JSON.parse(raw)
        if (!v || typeof v !== 'object' || !v.savedAt) return []
        return [
            {
                id: nuevoId(),
                nombre: 'Borrador recuperado',
                role: v.role ?? 'installer',
                step: v.step ?? 0,
                notas: v.notas,
                files: Object.fromEntries(
                    Object.entries(v.files ?? {}).map(([k, f]) => [
                        k,
                        Array.isArray(f) ? f : [f],
                    ])
                ),
                savedAt: v.savedAt,
            },
        ]
    } catch {
        return []
    }
}

/* ------------------------------------------------------------------ */

/** Tutte le bozze, dalla più recente. */
export function listDrafts(): Draft[] {
    let lista = leer()
    // Senza condizioni: prima migravo solo a elenco vuoto, e bastava aprire
    // il modulo prima della dashboard perché la vecchia bozza restasse lì
    // senza che nessuno la vedesse più. `migrar` cancella la chiave vecchia,
    // quindi gira una volta sola comunque.
    const viejas = migrar()
    if (viejas.length) {
        lista = [...lista, ...viejas]
        escribir(lista)
    }
    return [...lista].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function loadDraft(id: string): Draft | null {
    return listDrafts().find((d) => d.id === id) ?? null
}

/** La più recente. Serve a riprendere senza dover scegliere. */
export function latestDraft(): Draft | null {
    return listDrafts()[0] ?? null
}

/** Inserisce o aggiorna, per id. */
export function saveDraft(d: Omit<Draft, 'savedAt'>): Draft | null {
    const full: Draft = { ...d, savedAt: new Date().toISOString() }
    const lista = leer()
    const i = lista.findIndex((x) => x.id === d.id)
    if (i >= 0) lista[i] = full
    else lista.push(full)
    return escribir(lista) ? full : null
}

export function deleteDraft(id: string): boolean {
    return escribir(leer().filter((d) => d.id !== id))
}

/** Quanti file completati ci sono dentro. Serve a mostrare l'avanzamento. */
export function contarArchivos(d: Draft): number {
    return Object.values(d.files ?? {}).reduce((a, v) => a + v.length, 0)
}

/** "hace un momento", "hace 4 min", "hace 2 h", "ayer" */
export function timeAgo(iso: string, locale = 'es-ES') {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    if (min < 1) return locale.startsWith('es') ? 'hace un momento' : 'just now'
    if (min < 60) return rtf.format(-min, 'minute')
    const h = Math.floor(min / 60)
    if (h < 24) return rtf.format(-h, 'hour')
    return rtf.format(-Math.floor(h / 24), 'day')
}

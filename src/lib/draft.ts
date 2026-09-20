'use client'

import type { Role } from './documents'

/**
 * Le bozze degli espedienti.
 *
 * ── DOVE VIVONO, E PERCHÉ IN DUE POSTI ────────────────────────────────
 *
 * Sul SERVER, legate all'account: è lì che devono stare. Chi comincia un
 * espediente in ufficio deve ritrovarlo in cantiere dal telefono, e
 * svuotare i dati del browser non deve portarsi via mezza giornata di
 * lavoro. Vedi src/app/api/drafts/route.ts.
 *
 * E ANCHE nel browser, come copia. Non è un ripiego provvisorio: chi
 * carica le foto sta spesso in un seminterrato senza campo. Quindi si
 * scrive PRIMA in locale — quella scrittura non fallisce mai — e poi si
 * sincronizza. Un errore di rete diventa un ritardo, non una perdita.
 *
 * Chi chiama sa sempre com'è andata: `saveDraft` dice se è arrivata
 * all'account o se per ora è solo qui. Una bozza che sembra salvata e non
 * lo è, è peggio di un errore.
 *
 * ── I FILE ────────────────────────────────────────────────────────────
 *
 * Della bozza teniamo il RIFERIMENTO, non i byte: i file sono già in
 * Supabase Storage e `storagePath` è la loro chiave. Quindi una bozza
 * ripresa da un altro dispositivo ritrova davvero i suoi documenti.
 */

/** v3: più bozze, ognuna con nome e id. v2 era una sola, senza nome. */
export const DRAFTS_KEY = 'caes:drafts:v3'
const KEY_V2 = 'caes:draft:v2'
const KEY_V1 = 'caes:draft:v1'

export type DraftFile = {
    name: string
    size: number
    /** Chiave del file in Supabase Storage. */
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
    /** Falso finché non è arrivata all'account. */
    sincronizado?: boolean
}

export function nuevoId(): string {
    // Il formato è controllato anche dal server: "b" più base36.
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

/* --------------------------------------------------- copia nel browser */

function normalizar(d: Partial<Draft> & { savedAt: string; id: string }): Draft {
    return {
        id: d.id,
        nombre: d.nombre || nombrePorDefecto(new Date(d.savedAt)),
        role: (d.role as Role) ?? 'installer',
        step: d.step ?? 0,
        notas: d.notas,
        sincronizado: d.sincronizado,
        files: Object.fromEntries(
            Object.entries(d.files ?? {}).map(([k, v]) => [
                k,
                Array.isArray(v) ? v : [v],
            ])
        ),
        savedAt: d.savedAt,
    }
}

function leerLocal(): Draft[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(DRAFTS_KEY)
        const lista = raw ? JSON.parse(raw) : []
        if (!Array.isArray(lista)) return []
        // Difesa: una bozza corrotta o scritta a mano non deve far saltare
        // la pagina al primo `.map`.
        return lista
            .filter((d) => d && typeof d === 'object' && d.id && d.savedAt)
            .map(normalizar)
    } catch {
        // Modalità privata, spazio esaurito, dati corrotti: si riparte pulito.
        return []
    }
}

function escribirLocal(lista: Draft[]): boolean {
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
function migrarFormatoViejo(): Draft[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(KEY_V2)
        window.localStorage.removeItem(KEY_V2)
        window.localStorage.removeItem(KEY_V1)
        if (!raw) return []
        const v = JSON.parse(raw)
        if (!v || typeof v !== 'object' || !v.savedAt) return []
        return [normalizar({ ...v, id: nuevoId(), nombre: 'Borrador recuperado' })]
    } catch {
        return []
    }
}

/* ----------------------------------------------------------- il server */

type FilaServidor = {
    id: string
    nombre: string
    role: string
    step: number
    files: Record<string, DraftFile[]>
    notas?: string | null
    updated_at: string
}

const deFila = (r: FilaServidor): Draft =>
    normalizar({
        id: r.id,
        nombre: r.nombre,
        role: r.role as Role,
        step: r.step,
        files: r.files,
        notas: r.notas ?? undefined,
        savedAt: r.updated_at,
        sincronizado: true,
    })

async function subir(d: Draft): Promise<boolean> {
    try {
        const res = await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d),
        })
        return res.ok
    } catch {
        return false
    }
}

/* ------------------------------------------------------------- pubblico */

/**
 * Tutte le bozze, dalla più recente.
 *
 * Unisce account e browser. Quando la stessa bozza esiste in tutti e due,
 * vince la più recente: chi ha lavorato per ultimo ha ragione. Quelle che
 * stanno solo qui vengono spinte sull'account — è così che le bozze di
 * prima del login finiscono nell'account appena ci si registra.
 */
export async function listDrafts(): Promise<Draft[]> {
    const locales = [...leerLocal(), ...migrarFormatoViejo()]

    let remotas: Draft[] = []
    let hayServidor = false
    try {
        const res = await fetch('/api/drafts')
        if (res.ok) {
            const j = await res.json()
            remotas = (j.data ?? []).map(deFila)
            hayServidor = true
        }
    } catch {
        // Senza rete si lavora con quello che c'è qui.
    }

    const mapa = new Map<string, Draft>()
    for (const d of remotas) mapa.set(d.id, d)
    for (const d of locales) {
        const r = mapa.get(d.id)
        if (!r || d.savedAt > r.savedAt) {
            mapa.set(d.id, { ...d, sincronizado: r ? false : d.sincronizado })
        }
    }

    const lista = [...mapa.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt))

    // Quelle che il server non ha ancora: si mandano adesso, senza far
    // aspettare chi sta guardando la pagina.
    if (hayServidor) {
        for (const d of lista) {
            if (!d.sincronizado) void subir(d).then((ok) => ok && marcarSincronizada(d.id))
        }
    }

    escribirLocal(lista)
    return lista
}

function marcarSincronizada(id: string) {
    escribirLocal(
        leerLocal().map((d) => (d.id === id ? { ...d, sincronizado: true } : d))
    )
}

export async function loadDraft(id: string): Promise<Draft | null> {
    return (await listDrafts()).find((d) => d.id === id) ?? null
}

/**
 * Inserisce o aggiorna, per id.
 *
 * Restituisce `sincronizado: false` quando è riuscita solo la copia
 * locale. Chi chiama deve dirlo: «guardato» su qualcosa che vive in un
 * solo browser è una mezza verità.
 */
export async function saveDraft(d: Omit<Draft, 'savedAt'>): Promise<Draft | null> {
    const full: Draft = { ...d, savedAt: new Date().toISOString(), sincronizado: false }

    // Prima il locale: è la scrittura che non fallisce per colpa della rete.
    const lista = leerLocal()
    const i = lista.findIndex((x) => x.id === d.id)
    if (i >= 0) lista[i] = full
    else lista.push(full)
    if (!escribirLocal(lista)) return null

    const ok = await subir(full)
    if (ok) {
        full.sincronizado = true
        marcarSincronizada(full.id)
    }
    return full
}

export async function deleteDraft(id: string): Promise<boolean> {
    const ok = escribirLocal(leerLocal().filter((d) => d.id !== id))
    try {
        await fetch(`/api/drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
        // Se la cancellazione sul server non passa, alla prossima lista la
        // bozza ricompare. È il verso giusto in cui sbagliare: meglio
        // ricomparire che sparire dall'account senza che nessuno lo sappia.
    }
    return ok
}

/** Quanti file ci sono dentro. Serve a mostrare l'avanzamento. */
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

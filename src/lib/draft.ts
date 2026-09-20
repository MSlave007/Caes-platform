'use client'

import type { Role } from './documents'

/**
 * Bozza dell'espediente.
 *
 * ⚠️ Per ora vive nel browser (localStorage), non sul server. Vuol dire che
 * la ritrovi sullo stesso dispositivo e sullo stesso browser, non se cambi
 * telefono. Dei file salviamo il riferimento, non i byte: quando il
 * caricamento su Supabase Storage sarà collegato, `storagePath` conterrà la
 * chiave vera e la bozza diventerà davvero portabile.
 *
 * La forma dei dati è già quella definitiva, così il passaggio al server è
 * una sostituzione di `load`/`save` e nient'altro.
 */

/**
 * v2: i file di un documento sono un ELENCO, non uno solo (le tre foto
 * dell'impianto stanno in un riquadro solo). La chiave e cambiata apposta:
 * una bozza v1 ha la forma vecchia e, letta come v2, crasherebbe alla
 * prima `.filter` su un oggetto. Meglio ripartire puliti che rompersi.
 */
export const DRAFT_KEY = 'caes:draft:v2'
export const DRAFT_KEY_V1 = 'caes:draft:v1'

export type DraftFile = {
    name: string
    size: number
    /** Chiave su Supabase Storage. Vuota finché il caricamento non è collegato. */
    storagePath?: string
}

export type Draft = {
    role: Role
    step: number
    files: Record<string, DraftFile[]>
    /** Quello che l'installatore ha scritto a mano. Lo legge chi revisiona. */
    notas?: string
    /** ISO 8601 */
    savedAt: string
}

export function loadDraft(): Draft | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(DRAFT_KEY)
        if (!raw) return null
        const d = JSON.parse(raw) as Draft
        if (!d || typeof d !== 'object' || !d.savedAt) return null
        // Difesa: una bozza scritta a mano o rimasta a meta non deve
        // far saltare la pagina al primo `.map`.
        return {
            ...d,
            files: Object.fromEntries(
                Object.entries(d.files ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
            ),
        }
    } catch {
        // Modalità privata, spazio esaurito, dati corrotti: si riparte pulito.
        return null
    }
}

export function saveDraft(d: Omit<Draft, 'savedAt'>): Draft | null {
    if (typeof window === 'undefined') return null
    const full: Draft = { ...d, savedAt: new Date().toISOString() }
    try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
        return full
    } catch {
        return null
    }
}

export function clearDraft() {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(DRAFT_KEY)
        window.localStorage.removeItem(DRAFT_KEY_V1)
    } catch {
        /* niente da fare */
    }
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

import fs from 'node:fs'
import path from 'node:path'

/**
 * Slot fotografici della landing.
 *
 * Come funziona: ogni slot cerca il proprio file in public/img/landing/.
 * Se il file c'è, la sezione usa la fotografia; se non c'è, resta il
 * segnaposto disegnato. Nessun'immagine rotta, nessun buco grigio, e per
 * aggiungere una foto basta trascinarla nella cartella con il nome giusto.
 *
 * Questo modulo legge dal filesystem: va usato SOLO da componenti server.
 * Il percorso risolto si passa poi come prop ai componenti client.
 */

export const IMAGE_DIR = path.join(process.cwd(), 'public', 'img', 'landing')

/** Estensioni provate, in ordine di preferenza. */
const EXTS = ['.avif', '.webp', '.jpg', '.jpeg', '.png']

export const SLOTS = {
    /** Hero: tetto con camino che fuma all'alba. È la promessa della pagina. */
    hero: 'hero',
    /** Fascia in parallax: unità esterna su parete chiara, luce netta. */
    unit: 'unit',
    /** Come funziona: installatore al lavoro. Verticale. */
    installer: 'installer',
    /** CTA finale: villa al crepuscolo, aspirazionale. */
    dusk: 'dusk',
    /** Copertura: quartiere dall'alto. */
    neighbourhood: 'neighbourhood',
    /** Beneficio: casa con la scala energetica A–G. */
    rating: 'rating',
    /** Tecnica: schema 3D della pompa di calore. */
    tech: 'tech',
    /** Comfort: terrazza di sera. */
    terrace: 'terrace',
    /** Nudge: la stanchezza da rimandare. Verticale. */
    nudge: 'nudge',
} as const

export type Slot = keyof typeof SLOTS

/** Percorso pubblico dello slot, o undefined se il file non c'è ancora. */
export function image(slot: Slot): string | undefined {
    const base = SLOTS[slot]
    for (const ext of EXTS) {
        const file = path.join(IMAGE_DIR, base + ext)
        try {
            if (fs.existsSync(file)) return `/img/landing/${base}${ext}`
        } catch {
            // In ambienti dove il filesystem non è leggibile restiamo sui
            // segnaposto disegnati: è il comportamento sicuro.
        }
    }
    return undefined
}

/** Tutti gli slot risolti in una volta, da passare ai componenti client. */
export function images(): Record<Slot, string | undefined> {
    return Object.fromEntries(
        (Object.keys(SLOTS) as Slot[]).map((s) => [s, image(s)])
    ) as Record<Slot, string | undefined>
}

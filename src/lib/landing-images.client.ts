/**
 * Percorsi delle immagini, utilizzabili dai componenti client.
 *
 * La versione server (`landing-images.ts`) controlla il filesystem e ricade
 * sui segnaposto disegnati quando un file manca. Qui non possiamo: il
 * browser non legge la cartella. Quindi questo modulo dà per buono che il
 * file ci sia, e va usato solo per gli slot che abbiamo davvero caricato.
 *
 * Se togli un file da public/img/landing/, togli anche la voce qui sotto.
 */

const AVAILABLE = {
    hero: '/img/landing/hero.jpg',
    unit: '/img/landing/unit.jpg',
    installer: '/img/landing/installer.jpg',
    dusk: '/img/landing/dusk.jpg',
    neighbourhood: '/img/landing/neighbourhood.jpg',
    rating: '/img/landing/rating.jpg',
    tech: '/img/landing/tech.jpg',
    terrace: '/img/landing/terrace.jpg',
    nudge: '/img/landing/nudge.jpg',
} as const

export type ClientSlot = keyof typeof AVAILABLE

export function image(slot: ClientSlot): string {
    return AVAILABLE[slot]
}

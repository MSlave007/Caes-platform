/**
 * Modalità dimostrativa — modulo isolato apposta.
 *
 * Sta separato da guard.ts perché lo usa anche il middleware, che gira
 * nell'Edge runtime: guard.ts importa il client Supabase server, che a sua
 * volta usa `next/headers`, e nell'Edge non esiste. Importarlo da lì fa
 * fallire il middleware in silenzio — cioè lascia passare tutti.
 *
 *   sviluppo (npm run dev)   → accesa: niente login, archivio su file
 *   produzione               → spenta: serve la sessione
 *   CAES_DEMO_MODE=1         → accesa comunque (sito vetrina)
 *   CAES_DEMO_MODE=0         → spenta comunque (per provare i blocchi)
 */
export function esModoDemo(): boolean {
    const flag = process.env.CAES_DEMO_MODE
    if (flag === '1' || flag === 'true') return true
    if (flag === '0' || flag === 'false') return false
    return process.env.NODE_ENV !== 'production'
}

/** Il cookie con cui una singola sessione rinuncia alla demo. */
export const COOKIE_SIN_DEMO = 'caes_sin_demo'

/**
 * La demo, ma per CHI sta chiedendo.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Per provare i blocchi bisogna spegnere la demo, e finora si faceva
 * cambiando `.env.local`. Ma il server di sviluppo è uno solo e lo usa
 * anche chi non sta provando niente: spegnerla gli faceva comparire la
 * pagina di accesso in mezzo al lavoro, senza capire perché.
 *
 * Con questo cookie una singola scheda del browser rinuncia alla demo e
 * vede la piattaforma come la vedrà in produzione, senza toccare niente
 * per gli altri.
 *
 * ── PERCHÉ NON PUÒ APRIRE NIENTE ──────────────────────────────────────
 *
 * Il cookie sa dire UNA cosa sola: «trattami come se la demo fosse
 * spenta». Non esiste il contrario. Un interruttore che dal browser
 * ACCENDE la demo sarebbe un modo per disattivare i controlli con una
 * riga in console — quindi non c'è, e non va aggiunto.
 */
export function esModoDemoPara(cookies: {
    get(name: string): { value: string } | undefined
}): boolean {
    if (cookies.get(COOKIE_SIN_DEMO)?.value === '1') return false
    return esModoDemo()
}

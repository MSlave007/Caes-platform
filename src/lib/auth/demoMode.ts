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

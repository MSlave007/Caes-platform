import { createAdminClient } from '@/lib/supabaseAdmin'
import type { Sesion } from './guard'

/**
 * Chi può guardare un file del deposito.
 *
 * ── IL BUCO CHE CHIUDE ────────────────────────────────────────────────
 *
 * `/api/documents/url` firmava QUALSIASI percorso a CHIUNQUE avesse una
 * sessione. Bastava registrarsi come installatore e chiedere il
 * percorso di un documento altrui per averne un indirizzo valido.
 * Dentro quei file ci sono carte d'identità, fatture e foto di case di
 * altre persone.
 *
 * Il controllo di accesso non c'era: c'era il controllo di
 * AUTENTICAZIONE, che risponde a «chi sei» e non a «questo è tuo».
 * Sono due domande diverse e serve rispondere a tutte e due.
 *
 * ── COME FUNZIONA ─────────────────────────────────────────────────────
 *
 * I percorsi nuovi nascono già intestati: `u/<id utente>/<uuid>`. Per
 * quelli il controllo è un confronto di prefisso, senza toccare il
 * database.
 *
 * I percorsi vecchi stanno nella radice del bucket e non dicono di chi
 * sono: per quelli si guarda se compaiono fra i documenti di un
 * espediente dell'utente. Costa una query, ma solo per i file di prima
 * di oggi.
 *
 * L'agenzia vede tutto: è il suo lavoro, e il ruolo è già verificato.
 */

/** Il prefisso sotto cui finisce tutto quello che carica un utente. */
export function prefijoDe(userId: string): string {
    return `u/${userId}/`
}

export async function puedeVer(path: string, quien: Sesion): Promise<boolean> {
    // In dimostrazione non c'è nessuno di cui verificare la proprietà.
    // Il ripiego dimostrativo è una scelta dichiarata, vedi guard.ts.
    if (quien.demo) return true

    // L'agenzia rivede i fascicoli di tutti: senza questo non potrebbe
    // fare il suo lavoro.
    if (quien.rol === 'admin') return true

    if (!quien.userId) return false

    // Percorsi nuovi: intestati a chi li ha caricati.
    if (path.startsWith(prefijoDe(quien.userId))) return true

    // Percorsi vecchi: si cerca il file fra i suoi espedienti.
    const supabase = createAdminClient()
    if (!supabase) return false

    const { data, error } = await supabase
        .from('projects')
        .select('docs')
        .eq('installer_id', quien.userId)

    if (error || !data) return false

    return data.some((p) =>
        ((p.docs ?? []) as { path?: string }[]).some((d) => d.path === path)
    )
}

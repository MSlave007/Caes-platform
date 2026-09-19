/**
 * Presidio di accesso — fonte unica.
 *
 * ── IL PROBLEMA CHE RISOLVE ───────────────────────────────────────────
 *
 * Per far funzionare le dimostrazioni senza login, le rotte ripiegavano
 * sull'archivio dimostrativo quando non c'era una sessione. Comodo in
 * locale, disastroso online: `/api/projects` rispondeva a CHIUNQUE, in
 * lettura e in scrittura, e `/api/leads` restituiva nome, telefono e email
 * di tutti i contatti a chi passava di lì.
 *
 * Il ripiego in sé non è sbagliato: è sbagliato che valga sempre. Qui la
 * modalità dimostrativa diventa una scelta esplicita, accesa in sviluppo e
 * spenta in produzione salvo dichiararlo a mano.
 *
 * ── COME SI COMPORTA ──────────────────────────────────────────────────
 *
 *   sviluppo (npm run dev)   → demo accesa: niente login, archivio su file
 *   produzione               → demo spenta: serve la sessione
 *   CAES_DEMO_MODE=1         → demo accesa comunque (per un sito vetrina)
 *   CAES_DEMO_MODE=0         → demo spenta comunque (per provare i blocchi)
 *
 * Chi accende CAES_DEMO_MODE su un dominio pubblico sta dichiarando che
 * quei dati sono finti. Non va fatto su dati veri di clienti.
 */

import { createClient } from '@/utils/supabase/server'
import { esModoDemo } from './demoMode'

export { esModoDemo }

export type Sesion = {
    /** L'utente autenticato, se c'è. */
    userId: string | null
    /** Vero quando si sta passando senza sessione grazie alla demo. */
    demo: boolean
}

/**
 * Chi sta chiamando.
 *
 * Restituisce `null` quando l'accesso va negato: fuori dalla modalità
 * dimostrativa, senza sessione non si entra.
 */
export async function quienLlama(): Promise<Sesion | null> {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (user) return { userId: user.id, demo: false }
    } catch {
        // Supabase irraggiungibile: in demo si prosegue, altrimenti si nega.
    }

    return esModoDemo() ? { userId: null, demo: true } : null
}

/** Risposta unica per chi non ha diritto di stare qui. */
export function negado() {
    return Response.json(
        { error: 'No autorizado. Inicia sesión.' },
        { status: 401 }
    )
}

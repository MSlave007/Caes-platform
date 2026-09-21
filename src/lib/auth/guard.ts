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
 *
 * ── I RUOLI ───────────────────────────────────────────────────────────
 *
 * Due, e fanno cose diverse:
 *
 *   installer → i propri espedienti e le proprie bozze
 *   admin     → la coda di revisione, i margini, i contatti
 *
 * Il ruolo si legge dal profilo, non da quello che dice il browser. E il
 * valore di ripiego è SEMPRE `installer`: se il profilo manca, se la
 * query fallisce, se il campo è vuoto, si ottiene il ruolo che può meno.
 * Un ripiego che concede è un buco che si apre da solo il giorno in cui
 * qualcosa si rompe.
 */

import { createClient } from '@/utils/supabase/server'
import { esModoDemo } from './demoMode'

export { esModoDemo }

export type Rol = 'admin' | 'installer'

export type Sesion = {
    /** L'utente autenticato, se c'è. */
    userId: string | null
    /**
     * La sua email. Serve a due cose: firmare in modo leggibile quello che
     * conferma («confermato da ana@…» invece di un identificatore di
     * trentasei caratteri) e avere un destinatario per le notifiche, che
     * oggi partono verso il vuoto.
     */
    email: string | null
    /** Il ruolo letto dal profilo. `null` solo in modalità dimostrativa. */
    rol: Rol | null
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

        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            return {
                userId: user.id,
                email: user.email ?? null,
                rol: data?.role === 'admin' ? 'admin' : 'installer',
                demo: false,
            }
        }
    } catch {
        // Supabase irraggiungibile: in demo si prosegue, altrimenti si nega.
    }

    return esModoDemo() ? { userId: null, email: null, rol: null, demo: true } : null
}

/**
 * Come sopra, ma solo per l'agenzia.
 *
 * Serve alle rotte che maneggiano roba di tutti: la coda di revisione, i
 * margini, i contatti dei privati. Un installatore autenticato è un
 * utente legittimo e resta comunque fuori da qui.
 *
 * In modalità dimostrativa passa, come tutto il resto: è la stessa scelta
 * dichiarata sopra, non un'eccezione nascosta.
 */
export async function soloAgencia(): Promise<Sesion | null> {
    const quien = await quienLlama()
    if (!quien) return null
    if (quien.demo) return quien
    return quien.rol === 'admin' ? quien : null
}

/** Risposta unica per chi non ha diritto di stare qui. */
export function negado() {
    return Response.json(
        { error: 'No autorizado. Inicia sesión.' },
        { status: 401 }
    )
}

/**
 * Diverso da `negado`: qui la sessione c'è ed è valida, manca il ruolo.
 * 401 direbbe «rifai il login», e rifarlo non cambierebbe niente.
 */
export function prohibido() {
    return Response.json(
        { error: 'Esta zona es de la agencia.' },
        { status: 403 }
    )
}

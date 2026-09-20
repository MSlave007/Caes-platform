import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Il cliente che tocca il deposito dei documenti.
 *
 * ── PERCHÉ NON BASTA QUELLO NORMALE ───────────────────────────────────
 *
 * `supabaseServer.ts` costruisce un cliente con la chiave PUBBLICA e i
 * cookie di chi naviga. Va benissimo per leggere le tabelle, ma sul
 * deposito no: le regole RLS del bucket `documents` non lasciano scrivere
 * a quella chiave, e ogni caricamento veniva rifiutato.
 *
 * Il guaio non era il rifiuto — era che nessuno lo vedeva. La rotta di
 * caricamento intercettava l'errore, rispondeva `{ mock: true }` e
 * registrava sul fascicolo un percorso che non esisteva. Dal pannello
 * sembrava tutto a posto finché non si apriva il documento e compariva
 * «Object not found». Un fallimento che si traveste da successo è peggio
 * di un fallimento: fa perdere il pomeriggio a cercarlo altrove.
 *
 * Qui si usa la chiave SEGRETA, che salta l'RLS. È legittimo perché ci si
 * arriva solo da rotte che hanno già verificato chi chiama con
 * `quienLlama()`: il controllo d'accesso lo fa il nostro codice, non il
 * database.
 *
 * ── SE LA CHIAVE NON C'È ──────────────────────────────────────────────
 *
 * Si restituisce `null` e chi chiama deve dirlo. Non si ripiega sul
 * cliente pubblico sperando che vada: è esattamente il ripiego che ha
 * prodotto i percorsi fantasma.
 */
export function createAdminClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY

    if (!url || !key || url.includes('YOUR_SUPABASE')) return null

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

/** Il bucket dei documenti del fascicolo. */
export const BUCKET = 'documents'

/** Messaggio unico per quando la chiave manca. */
export const SIN_DEPOSITO =
    'El almacén de documentos no está configurado: falta SUPABASE_SECRET_KEY en el servidor.'

/**
 * Traduce l'errore del deposito in qualcosa su cui si può agire.
 *
 * «Invalid Compact JWS» e «new row violates row-level security policy»
 * sono i due modi in cui Supabase dice «la tua chiave non va bene», e
 * nessuno dei due lo dice a chi deve rimediare. Chi legge questo
 * messaggio è davanti a un fascicolo, non a una dashboard: va detto cosa
 * fare, non cosa è successo.
 */
export function explicar(mensaje: string): string {
    // Quando l'oggetto non c'è, il deposito non risponde una frase:
    // risponde il JSON della richiesta fallita, con dentro l'indirizzo
    // interno del bucket. Non è una cosa da far vedere né da far leggere.
    if (/object not found/i.test(mensaje) || /^\s*\{[\s\S]*"url"/.test(mensaje)) {
        return 'El archivo ya no está en el almacén.'
    }
    if (/compact jws|invalid.*jwt|jwt.*invalid/i.test(mensaje)) {
        return 'La clave del almacén (SUPABASE_SECRET_KEY) ya no es válida. Hay que regenerarla en el panel de Supabase → Project Settings → API keys, y pegarla en .env.local.'
    }
    if (/row-level security|violates.*policy|unauthorized/i.test(mensaje)) {
        return 'El almacén ha denegado la operación: se está usando la clave pública, que no puede escribir en el bucket. Revisa SUPABASE_SECRET_KEY.'
    }
    return mensaje
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * La copia del documento com'era quando qualcuno l'ha firmato.
 *
 * ── PERCHÉ NON BASTA SAPERLO RICOMPORRE ───────────────────────────────
 *
 * Il PDF si ricompone dai dati, e per un po' è sembrato abbastanza. Non
 * lo è: si ricompone con il renderer di OGGI. Allargare un margine
 * cambia i byte, e allora la copia ricomposta non è più quella che quel
 * cliente ha letto — è quella che avrebbe letto se avesse firmato
 * adesso. Sono due cose diverse, e in una contestazione conta la prima.
 *
 * Quindi al momento della firma il foglio si mette da parte così com'è.
 * Una copia per firma, non una per documento: se il Cedente firma lunedì
 * e il Cesionario giovedì, sono due fogli diversi e tutti e due sono
 * successi davvero.
 *
 * ── DOVE FINISCE ──────────────────────────────────────────────────────
 *
 * Nel deposito privato, sotto `firmados/`. Con la chiave di servizio,
 * come tutto il resto: le regole di riga parlano di `auth.uid()` e qui
 * spesso non c'è nessuna sessione — il cliente firma da un link.
 *
 * In dimostrazione, in una cartella accanto all'archivio di prova.
 * Perché una funzione che esiste solo con il database è una funzione che
 * non si può far vedere.
 */

const CUBO = 'documents'
const CARPETA = join(process.cwd(), '.caes-demo-firmados')

function nombreDemo(ruta: string): string {
    return ruta.replace(/[\\/]/g, '__')
}

/**
 * Mette via il foglio. Restituisce dove l'ha messo, o `null`.
 *
 * `null` non ferma niente: la firma è già registrata e vale comunque.
 * Perdere l'archivio è un peccato, perdere la firma perché l'archivio
 * non si è scritto sarebbe assurdo.
 */
export async function guardarFirmado(
    proyectoId: string,
    plantillaId: string,
    rol: string,
    bytes: Uint8Array
): Promise<string | null> {
    // Il ruolo nel nome, ripulito: «EL CEDENTE» diventa «el-cedente». Un
    // percorso di deposito con uno spazio dentro è un percorso che un
    // giorno qualcuno non riesce a leggere.
    const quien = rol
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    const ruta = `firmados/${proyectoId}/${plantillaId}-${quien}-${Date.now()}.pdf`

    const admin = createAdminClient()
    if (admin) {
        const { error } = await admin.storage
            .from(CUBO)
            .upload(ruta, bytes, { contentType: 'application/pdf', upsert: false })
        if (!error) return ruta
        console.error('guardarFirmado:', error)
    }

    try {
        if (!existsSync(CARPETA)) mkdirSync(CARPETA, { recursive: true })
        writeFileSync(join(CARPETA, nombreDemo(ruta)), bytes)
        return ruta
    } catch (error) {
        console.error('guardarFirmado (demo):', error)
        return null
    }
}

export async function leerFirmado(ruta: string): Promise<Uint8Array | null> {
    const admin = createAdminClient()
    if (admin) {
        const { data } = await admin.storage.from(CUBO).download(ruta)
        if (data) return new Uint8Array(await data.arrayBuffer())
    }

    try {
        const f = join(CARPETA, nombreDemo(ruta))
        if (!existsSync(f)) return null
        return new Uint8Array(readFileSync(f))
    } catch {
        return null
    }
}

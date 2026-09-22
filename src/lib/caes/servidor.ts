import { createAdminClient } from '@/lib/supabaseAdmin'
import { mockDb } from '@/lib/mockDb'
import { CAMPOS, type Extraccion } from './extraction'
import {
    DATOS_EJEMPLO,
    datosDe,
    extrasDeAgencia,
    extrasDePerfil,
    type PerfilInstalador,
} from './expediente'
import type { Datos } from './plantillas'
import type { Firmas } from './firma'

/**
 * I dati di un fascicolo, rimontati sul server.
 *
 * ── PERCHÉ NON ARRIVANO DAL BROWSER ───────────────────────────────────
 *
 * Perché sono i dati che finiscono su un foglio che qualcuno firma. Il
 * browser li ha già tutti sullo schermo e sarebbe più corto fargliene
 * mandare una copia — ma allora il NIF del cesionario lo decide chi apre
 * gli strumenti di sviluppo.
 *
 * ── PERCHÉ STA IN UN FILE SUO ─────────────────────────────────────────
 *
 * Perché lo chiedono in due: la rotta che genera il PDF e quella che
 * raccoglie le firme. Se ognuna se lo rimontasse per conto suo, il
 * documento che si firma e il documento che si scarica potrebbero
 * divergere — e divergerebbero il giorno in cui una delle due impara un
 * campo nuovo. È lo stesso motivo per cui i tre documenti nascono da un
 * dato solo.
 */

export type Proyecto = {
    id: string
    client_name?: string | null
    installer_id?: string | null
    proveedor?: string | null
    tarifa_eur_mwh?: number | null
    extraccion?: Extraccion | null
    documentos?: { retoques?: Datos } | null
    firmas?: Firmas | null
    /** Il link di firma in attesa, quando ce n'è uno. */
    firma_token?: string | null
    firma_caduca?: string | null
    firma_plantilla?: string | null
    firma_rol?: string | null
}

// Una stringa sola, non una concatenazione: i tipi di Supabase leggono
// l'elenco delle colonne a compilazione, e di una somma non sanno niente.
const COLUMNAS =
    'id, client_name, installer_id, proveedor, tarifa_eur_mwh, extraccion, documentos, firmas, firma_token, firma_caduca, firma_plantilla, firma_rol'

const VACIA: Extraccion = Object.fromEntries(
    CAMPOS.map((c) => [c.id, { valor: null, estado: 'vacio' as const }])
) as Extraccion

export async function cargarProyecto(id: string): Promise<Proyecto | null> {
    const admin = createAdminClient()
    if (admin) {
        const { data } = await admin
            .from('projects')
            .select(COLUMNAS)
            .eq('id', id)
            .maybeSingle()
        if (data) return data as Proyecto
    }
    // E se non è del database, è dimostrativo.
    return (mockDb.getProjectById(id) as Proyecto | undefined) ?? null
}

/** Scrive sul fascicolo, dove sta: database vero o archivio di prova. */
export async function guardarEnProyecto(
    id: string,
    parche: Partial<import('@/lib/mockDb').Project>
): Promise<boolean> {
    if (mockDb.getProjectById(id)) {
        return Boolean(mockDb.updateProject(id, parche))
    }
    const admin = createAdminClient()
    if (!admin) return false

    /**
     * `undefined` diventa `null` prima di partire.
     *
     * PostgREST le chiavi con valore `undefined` non le manda proprio:
     * `update({ firma_token: undefined })` è una UPDATE senza colonne, e
     * il link che si voleva revocare resta vivo. Con l'archivio di prova
     * funzionava — è il tipo di differenza che si scopre in produzione.
     */
    const limpio = Object.fromEntries(
        Object.entries(parche).map(([k, v]) => [k, v === undefined ? null : v])
    )

    const { error } = await admin.from('projects').update(limpio).eq('id', id)
    if (error) {
        console.error('guardarEnProyecto:', error)
        return false
    }
    return true
}

/**
 * L'anagrafica di chi ha installato: cinque campi dei documenti.
 *
 * Se non c'è non si ferma niente. I cinque buchi restano vuoti, escono
 * scritti per esteso dentro al testo e il documento porta il timbro —
 * che è esattamente quello che deve succedere quando manca un dato.
 */
export async function cargarPerfil(
    installerId?: string | null
): Promise<PerfilInstalador | null> {
    if (!installerId) return null
    const admin = createAdminClient()
    if (!admin) return null
    const { data } = await admin
        .from('profiles')
        .select('name, nif, address, phone')
        .eq('id', installerId)
        .maybeSingle()
    return (data as PerfilInstalador | null) ?? null
}

export async function datosDelExpediente(
    p: Proyecto,
    conEjemplo = false
): Promise<Datos> {
    if (conEjemplo) return DATOS_EJEMPLO

    return {
        ...datosDe(p.extraccion ?? VACIA, {
            ...extrasDePerfil(await cargarPerfil(p.installer_id)),
            ...extrasDeAgencia({
                proveedor: p.proveedor,
                tarifa_eur_mwh: p.tarifa_eur_mwh,
            }),
        }),
        // I ritocchi vincono sempre: sono l'ultima parola di una persona
        // su un documento che quella persona firma. Arrivano dal
        // fascicolo, dove li ha salvati una rotta che controlla il ruolo.
        ...(p.documentos?.retoques ?? {}),
    }
}

/**
 * Il numero corto, quello che si dice al telefono.
 *
 * Sul database gli id sono UUID, e «expediente
 * f449b9de-2c85-45fd-a6a2-f97024fb4f58» non lo ripete nessuno.
 */
export function numeroCorto(id: string | number): string {
    return String(id).slice(0, 8).toUpperCase()
}

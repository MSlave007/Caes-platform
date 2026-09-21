import { HUECOS, type Datos } from './plantillas'
import { proveedor, tarifaDe, type Proveedor } from './proveedores'
import { FP, RENDIMIENTO_CALDERA_DEFECTO } from './estimate'
import type { Extraccion } from './extraction'

/**
 * Da quello che si è estratto a quello che i documenti chiedono.
 *
 * ── UN DATO SOLO, TRE CARTE ───────────────────────────────────────────
 *
 * Questa funzione è il punto in cui il fascicolo diventa documenti. Tutto
 * quello che finisce nel Convenio, nella RES060 e nell'Anexo I passa da
 * qui, e passa una volta sola: è la ragione per cui l'email del cliente
 * non può più risultare diversa fra un documento e l'altro, come succede
 * negli esemplari compilati a mano.
 *
 * Quello che non c'è resta vuoto. Non si inventa un ripiego «tanto per
 * far vedere qualcosa»: un buco vuoto blocca l'emissione e si vede,
 * mentre un valore plausibile messo lì per riempire finisce firmato.
 */

const es = (n: number, decimales = 2) =>
    n.toLocaleString('es-ES', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
    })

const numero = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
}

/**
 * Il risparmio annuo secondo la RES060.
 *
 *   AETOTAL = FP · [ (DCAL · S) · (1/η − 1/SCOP) + DACS · (1/η − 1/SCOPdhw) ]
 *
 * Non si estrae e non si scrive a mano: si calcola. Negli esemplari è
 * 14.793,33 kWh/año, ed è la cifra che compare tre volte fra Convenio e
 * ficha — un altro posto dove un valore ricopiato a mano può divergere.
 */
export function ahorroRES060(e: Extraccion): number | null {
    const dcal = numero(e.dcal?.valor)
    const s = numero(e.superficie_m2?.valor)
    const dacs = numero(e.dacs?.valor)
    const scop = numero(e.scop?.valor)
    const scopAcs = numero(e.scop_acs?.valor)
    const eta = numero(e.rendimiento_anterior?.valor) ?? RENDIMIENTO_CALDERA_DEFECTO

    if (dcal === null || s === null || dacs === null || scop === null || scopAcs === null) {
        return null
    }
    if (eta <= 0 || scop <= 0 || scopAcs <= 0) return null

    return FP * (dcal * s * (1 / eta - 1 / scop) + dacs * (1 / eta - 1 / scopAcs))
}

/**
 * I dati per i documenti.
 *
 * `extras` è quello che non sta nei documenti del fascicolo: l'anagrafica
 * dell'installatore, la tariffa dell'agenzia, la referenza catastrale.
 * Oggi arrivano vuoti — è la parte da collegare, ed è per questo che la
 * funzione li tiene separati invece di fingere che siano estratti.
 */
export function datosDe(e: Extraccion, extras: Partial<Datos> = {}): Datos {
    const datos: Datos = {}

    for (const h of Object.values(HUECOS)) {
        if (h.origen === 'fijo') {
            datos[h.id] = h.valor ?? ''
            continue
        }
        if (h.origen === 'extraido' && h.campo) {
            const v = e[h.campo]?.valor
            datos[h.id] = v === null || v === undefined ? (h.valor ?? '') : String(v)
            continue
        }
        datos[h.id] = extras[h.id] ?? h.valor ?? ''
    }

    const ahorro = ahorroRES060(e)
    if (ahorro !== null) datos.ahorro_kwh = es(ahorro)

    return datos
}

/**
 * Tutti i buchi riempiti con l'esemplare di Marco.
 *
 * Serve a vedere i tre documenti finiti prima che l'estrazione sia
 * collegata, ed è l'unico posto dove va bene inventare: qui i dati sono
 * dichiaratamente falsi e l'anteprima lo scrive sopra a caratteri
 * cubitali.
 */
export const DATOS_EJEMPLO: Datos = Object.fromEntries(
    Object.values(HUECOS).map((h) => [h.id, h.ejemplo ?? h.valor ?? ''])
)

/**
 * Il profilo dell'installatore di questo espediente.
 *
 * Cinque buchi dei documenti vengono da qui — ragione sociale, NIF,
 * indirizzo, responsabile, telefono — e finora arrivavano vuoti: erano
 * scritti a mano nel Word, ogni volta, per ogni pratica. Sono dati che
 * non cambiano mai e che abbiamo gia' in `profiles`.
 */
export type PerfilInstalador = {
    name?: string | null
    nif?: string | null
    address?: string | null
    phone?: string | null
}

export function extrasDePerfil(perfil?: PerfilInstalador | null): Partial<Datos> {
    if (!perfil) return {}
    return {
        instalador_razon: perfil.name ?? '',
        instalador_nif: perfil.nif ?? '',
        instalador_direccion: perfil.address ?? '',
        instalador_telefono: perfil.phone ?? '',
        // Il responsabile che firma la Ficha. Finche' non e' un campo suo
        // nel profilo, e' chi intesta l'azienda: e' sempre stato cosi' nei
        // Word, ma qui si vede ed e' correggibile a mano sul documento.
        instalador_responsable: perfil.name ?? '',
    }
}

/**
 * Quello che mette l'agenzia.
 *
 * `tarifa` non e' un numero qualsiasi: e' la contraprestazione del
 * Convenio, la clausola che dice quanto incassa il cliente. Viene dallo
 * stesso posto da cui la prende il simulatore, cosi' il documento non
 * puo' dire una cifra diversa da quella promessa.
 */
export function extrasDeAgencia(
    e: { proveedor?: string | null; tarifa_eur_mwh?: number | null } = {},
    fecha = new Date()
): Partial<Datos> {
    const p: Proveedor = proveedor(e.proveedor)

    return {
        // Chi compra l'ahorro. Nove campi che stavano scritti dentro il
        // testo del Convenio come se fosse sempre la stessa societa'.
        cesionario_razon: p.razon,
        cesionario_nif: p.nif,
        cesionario_codigo_sd: p.codigoSD,
        cesionario_representante: p.representante,
        cesionario_dni: p.dni,
        cesionario_cargo: p.cargo,
        cesionario_domicilio: p.domicilio,
        cesionario_telefono: p.telefono,
        cesionario_email: p.email,

        // La contraprestazione: quella pattuita su QUESTO espediente, non
        // quella che vale oggi. E' la cifra che il cliente firma.
        tarifa: es(tarifaDe(e)),

        // Dove si firma: la sede del cesionario.
        lugar_firma: p.localidad,
        fecha_firma: fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }),
    }
}

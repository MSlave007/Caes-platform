import { DOCUMENTS } from '@/lib/documents'
import type { Project } from '@/lib/mockDb'
import { normalize } from '@/lib/caes/status'

/**
 * A che punto è davvero un fascicolo.
 *
 * ── PERCHÉ NON BASTAVA LO STATO ───────────────────────────────────────
 *
 * Lo stato (`status.ts`) dice cosa è stato DECISO: inviato, approvato,
 * emesso, pagato. È la storia ufficiale, e serve.
 *
 * Ma fra «inviato» e «approvato» ci stanno tre lavori diversi che
 * nessuno distingue, e sono il 90% del tempo:
 *
 *   · mancano le carte, e la palla è dell'installatore
 *   · le carte ci sono, tocca leggerle e preparare i documenti
 *   · i documenti sono pronti e si aspetta che qualcuno firmi
 *
 * Tutti e tre sono `submitted`. Chi rivede apre la coda e vede
 * ventitré righe uguali, di cui cinque sono lavoro suo, dodici sono
 * attesa e sei sono solleciti da fare. Sono tre code diverse.
 *
 * ── PERCHÉ NON È LO STESSO DI `riesgo.ts` ─────────────────────────────
 *
 * Il rischio dice QUANTO COSTA un fascicolo se lo apri adesso: carte
 * mancanti, letture dubbie, controlli in rosso. La fase dice DI CHI È LA
 * PALLA. Sono due domande diverse e si guardano insieme: dentro la
 * stessa fase, prima i puliti.
 *
 * ── SI DEDUCE, NON SI SCRIVE ──────────────────────────────────────────
 *
 * Nessuno la aggiorna a mano, e apposta: uno stato che qualcuno deve
 * ricordarsi di cambiare è uno stato che un martedì resta indietro e
 * mostra a un cliente una cosa falsa. Qui si guarda cosa c'è — carte,
 * firme, stato — e si risponde.
 */

export type FaseId =
    | 'parado'
    | 'papeles'
    | 'revisar'
    | 'firma'
    | 'aprobar'
    | 'fuera'
    | 'cobrado'

/** Chi deve muoversi perché avanzi. */
export type Mano = 'instalador' | 'nosotros' | 'cliente' | 'fuera' | 'nadie'

export type Fase = {
    id: FaseId
    /** Come si chiama nella coda dell'agenzia. */
    label: string
    /** Una riga: cosa vuol dire e cosa si fa. */
    hint: string
    /** Come si racconta all'installatore. Lui non dice «revisar». */
    paraInstalador: string
    /** Come si racconta al cliente, che non sa cosa sia un RITE. */
    paraCliente: string
    mano: Mano
}

export const FASES: Record<FaseId, Fase> = {
    parado: {
        id: 'parado',
        label: 'Parado',
        hint: 'Rechazado o con cambios pedidos: no avanza hasta que el instalador conteste.',
        paraInstalador: 'Te hemos pedido cambios',
        paraCliente: 'Estamos corrigiendo unos datos',
        mano: 'instalador',
    },
    papeles: {
        id: 'papeles',
        label: 'Faltan papeles',
        hint: 'No se puede aprobar aunque lo abras: hay que pedírselos al instalador.',
        paraInstalador: 'Faltan documentos por subir',
        paraCliente: 'Reuniendo la documentación de la obra',
        mano: 'instalador',
    },
    revisar: {
        id: 'revisar',
        label: 'Por revisar',
        hint: 'Están todos los papeles. Toca leerlos, confirmar los datos y preparar los documentos.',
        paraInstalador: 'Lo estamos revisando',
        paraCliente: 'Revisando la documentación',
        mano: 'nosotros',
    },
    firma: {
        id: 'firma',
        label: 'A la firma',
        hint: 'Los documentos están listos. Se espera una firma — tuya o del cliente.',
        paraInstalador: 'Pendiente de firmas',
        paraCliente: 'Te hemos mandado el Convenio para firmar',
        mano: 'cliente',
    },
    aprobar: {
        id: 'aprobar',
        label: 'Firmado · por aprobar',
        hint: 'Firmado por todas las partes. Falta darle el visto bueno y mandarlo.',
        paraInstalador: 'Firmado, pendiente de aprobación',
        paraCliente: 'Firmado. Lo estamos tramitando',
        mano: 'nosotros',
    },
    fuera: {
        id: 'fuera',
        label: 'Tramitándose',
        hint: 'Aprobado y en manos del sujeto delegado. Aquí ya no se hace nada.',
        paraInstalador: 'En trámite, esperando el certificado',
        paraCliente: 'En trámite con la Administración',
        mano: 'fuera',
    },
    cobrado: {
        id: 'cobrado',
        label: 'Cobrado',
        hint: 'Cerrado y repartido.',
        paraInstalador: 'Cobrado y repartido',
        paraCliente: 'Terminado',
        mano: 'nadie',
    },
}

/** L'ordine in cui si lavorano: prima quello che ci blocca, poi l'attesa. */
export const ORDEN: FaseId[] = [
    'aprobar',
    'revisar',
    'firma',
    'papeles',
    'parado',
    'fuera',
    'cobrado',
]

function obligatoriosQueFaltan(p: Project): number {
    const lista = DOCUMENTS[p.source] ?? DOCUMENTS.installer
    const aportados = new Set((p.docs ?? []).map((d) => d.id))
    return lista.filter((d) => d.required && !aportados.has(d.id)).length
}

/**
 * Quante firme ha ese documento, y cuántas le faltan.
 *
 * Si guarda il Convenio e basta: è quello che muove il denaro e quello
 * che il cliente firma. Gli altri due li firma chi rivede, e non sono
 * mai quello che tiene ferma una pratica.
 */
function firmasDelConvenio(p: Project): { puestas: number; enlaceVivo: boolean } {
    const r = p.firmas?.['convenio']
    return {
        puestas: r?.firmas?.length ?? 0,
        enlaceVivo: Boolean(p.firma_token && p.firma_plantilla === 'convenio'),
    }
}

/** El Convenio lo firman dos: el Cedente y el Cesionario. */
const FIRMAS_CONVENIO = 2

export function faseDe(p: Project): Fase {
    const estado = normalize(p.status)

    // Lo que ya está decidido manda sobre lo demás: un expediente pagado
    // no vuelve a «faltan papeles» porque alguien borre un archivo.
    if (estado === 'paid') return FASES.cobrado
    if (estado === 'issued' || estado === 'approved') return FASES.fuera
    if (estado === 'rejected' || estado === 'changes_requested') return FASES.parado

    if (obligatoriosQueFaltan(p) > 0) return FASES.papeles

    const { puestas, enlaceVivo } = firmasDelConvenio(p)
    if (puestas >= FIRMAS_CONVENIO) return FASES.aprobar

    /**
     * «A la firma» solo cuando ya se ha pedido de verdad.
     *
     * Un expediente con los papeles dentro y sin ninguna firma puede
     * estar en dos sitios muy distintos: todavía por leer, o leído y
     * esperando a que el cliente entre en el enlace. Lo que los separa
     * es si alguien ha dado el paso — un enlace mandado o una firma ya
     * puesta. Sin eso, la pelota sigue siendo nuestra.
     */
    if (puestas > 0 || enlaceVivo) return FASES.firma

    return FASES.revisar
}

/**
 * Quello che è GIÀ successo, accanto a quello che manca.
 *
 * La fase dice cosa blocca, ed è giusto: con documenti obbligatori
 * mancanti non si approva, nemmeno col Convenio firmato. Ma dicendo
 * solo quello, la firma spariva da ogni riassunto — e il caso peggiore
 * era il cliente, che firmava e cinque minuti dopo leggeva «reuniendo
 * la documentación». Chiunque penserebbe che non sia andata.
 *
 * Sono due informazioni diverse e servono tutte e due: cosa aspetto, e
 * cosa è successo.
 */
export type Hitos = {
    /** Firme del Convenio: quante ce ne sono e quante ne vuole. */
    convenio: { hechas: number; total: number }
    /** Firmato da tutte le parti. */
    convenioFirmado: boolean
}

export function hitosDe(p: Project): Hitos {
    const hechas = p.firmas?.['convenio']?.firmas?.length ?? 0
    return {
        convenio: { hechas, total: FIRMAS_CONVENIO },
        convenioFirmado: hechas >= FIRMAS_CONVENIO,
    }
}

export function faseCuenta(proyectos: Project[]): Record<FaseId, number> {
    const cuenta = Object.fromEntries(
        Object.keys(FASES).map((k) => [k, 0])
    ) as Record<FaseId, number>
    for (const p of proyectos) cuenta[faseDe(p).id]++
    return cuenta
}

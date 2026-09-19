/**
 * I dati che si estraggono dai documenti.
 *
 * ── A COSA SERVE QUESTO FILE ──────────────────────────────────────────
 *
 * Un fascicolo CAES è fatto di carte da cui bisogna tirare fuori una
 * quindicina di numeri. Quei numeri fanno due cose:
 *
 *   FORMULA     → entrano nella RES060 e determinano quanto vale il CAE
 *   DOCUMENTI   → finiscono nel Convenio CAE, nel RES60, nell'Anexo 1
 *
 * Qui c'è la mappa: quale campo, da quale documento, in quale unità, e a
 * cosa serve. È la fonte unica sia per l'estrazione automatica sia per il
 * pannello di revisione.
 *
 * ── L'ESTRAZIONE PROPONE, NON DECIDE ──────────────────────────────────
 *
 * Ogni valore arriva con una confidenza e uno stato. Chi rivede conferma o
 * corregge, campo per campo, con il documento aperto accanto. Un valore
 * scritto direttamente nel fascicolo senza passare da lì è un valore di
 * cui nessuno risponde — e questi finiscono in documenti che qualcuno
 * firma e per cui risponde dieci anni.
 *
 * ── SULLA PROVENIENZA ─────────────────────────────────────────────────
 *
 * Tre campi della formula — superficie, domanda di riscaldamento e
 * domanda di acqua calda — vengono dal CERTIFICADO DE EFICIENCIA
 * ENERGÉTICA, e la ficha RES060 lo dice testualmente: «según certificado
 * de eficiencia energética antes de la actuación». Senza quel documento il
 * calcolo resta una stima con valori di riferimento, non una cifra
 * difendibile.
 */

/** Dove finisce il dato una volta confermato. */
export type Destino = 'formula' | 'documentos' | 'ambos'

export type TipoCampo = 'numero' | 'texto' | 'fecha' | 'opcion'

export type CampoDef = {
    id: string
    label: string
    /** Id dello slot documento da cui si estrae. Vedi src/lib/documents.ts */
    documento: string
    tipo: TipoCampo
    unidad?: string
    destino: Destino
    /** Opzioni quando `tipo` è 'opcion'. */
    opciones?: { id: string; label: string }[]
    /** Riga di aiuto: dove guardare nel documento. */
    ayuda?: string
}

/**
 * I campi, raggruppati per documento di provenienza.
 * L'ordine è quello in cui conviene rivederli: prima quelli che muovono
 * la cifra, poi quelli che servono solo a compilare le carte.
 */
export const CAMPOS: CampoDef[] = [
    // ── Certificado de eficiencia energética: il cuore della formula ──
    {
        id: 'superficie_m2',
        label: 'Superficie útil',
        documento: 'cee',
        tipo: 'numero',
        unidad: 'm²',
        destino: 'ambos',
        ayuda: 'Superficie habitable del certificado, no la construida.',
    },
    {
        id: 'dcal',
        label: 'Demanda de calefacción',
        documento: 'cee',
        tipo: 'numero',
        unidad: 'kWh/m²·año',
        destino: 'formula',
        ayuda: 'Antes de la actuación. Es lo que multiplica la superficie.',
    },
    {
        id: 'dacs',
        label: 'Demanda de ACS',
        documento: 'cee',
        tipo: 'numero',
        unidad: 'kWh/año',
        destino: 'formula',
        ayuda: 'Agua caliente sanitaria, el segundo término de la fórmula.',
    },

    // ── Ficha técnica: i rendimenti della pompa ──
    {
        id: 'scop',
        label: 'SCOP calefacción',
        documento: 'ficha',
        tipo: 'numero',
        destino: 'ambos',
        ayuda: 'Debe superar el mínimo de la zona climática.',
    },
    {
        id: 'scop_acs',
        label: 'SCOP en ACS',
        documento: 'ficha',
        tipo: 'numero',
        destino: 'formula',
        ayuda: 'Siempre más bajo que el de calefacción.',
    },
    {
        id: 'potencia_kw',
        label: 'Potencia nominal',
        documento: 'ficha',
        tipo: 'numero',
        unidad: 'kW',
        destino: 'documentos',
    },

    // ── Equipo sustituido: il rendimento di partenza ──
    {
        id: 'tipo_anterior',
        label: 'Equipo sustituido',
        documento: 'antiguo',
        tipo: 'opcion',
        destino: 'formula',
        opciones: [
            { id: 'caldera_gas', label: 'Caldera de gas' },
            { id: 'caldera_gasoleo', label: 'Caldera de gasóleo' },
            { id: 'termo_electrico', label: 'Termo eléctrico' },
        ],
        ayuda: 'De aquí sale el rendimiento de partida de la fórmula.',
    },
    {
        id: 'rendimiento_anterior',
        label: 'Rendimiento anterior',
        documento: 'antiguo',
        tipo: 'numero',
        destino: 'formula',
        ayuda: 'Si no se lee en la placa, se aplica el 0,92 por defecto.',
    },

    // ── Factura: identificazione e deduzione ──
    {
        id: 'marca',
        label: 'Marca',
        documento: 'factura',
        tipo: 'texto',
        destino: 'documentos',
    },
    {
        id: 'modelo',
        label: 'Modelo',
        documento: 'factura',
        tipo: 'texto',
        destino: 'documentos',
    },
    {
        id: 'num_serie',
        label: 'Número de serie',
        documento: 'serie',
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'Debe coincidir con el de la factura.',
    },
    {
        id: 'importe',
        label: 'Importe de la instalación',
        documento: 'factura',
        tipo: 'numero',
        unidad: '€',
        destino: 'documentos',
        ayuda: 'Base de la deducción del 30 % en la renta del cliente.',
    },

    // ── RITE: la data che fa decorrere i tre anni ──
    {
        id: 'fecha_fin_obra',
        label: 'Fecha de fin de obra',
        documento: 'rite',
        tipo: 'fecha',
        destino: 'ambos',
        ayuda: 'Desde aquí cuentan los 3 años para presentar la actuación.',
    },
    {
        id: 'num_registro_rite',
        label: 'Nº de registro RITE',
        documento: 'rite',
        tipo: 'texto',
        destino: 'documentos',
    },

    // ── Identità: servono per le firme ──
    {
        id: 'nif_cliente',
        label: 'NIF del cliente',
        documento: 'dni-cliente',
        tipo: 'texto',
        destino: 'documentos',
    },
    {
        id: 'nif_instalador',
        label: 'NIF del instalador',
        documento: 'dni-instalador',
        tipo: 'texto',
        destino: 'documentos',
    },
]

/** Stato di un campo durante la revisione. */
export type EstadoCampo = 'extraido' | 'confirmado' | 'corregido' | 'vacio'

export type ValorCampo = {
    valor: string | number | null
    estado: EstadoCampo
    /** 0–1. Sotto 0,8 conviene guardare il documento. */
    confianza?: number
}

export type Extraccion = Record<string, ValorCampo>

/** I campi di un documento, nell'ordine di definizione. */
export function camposDe(documentoId: string): CampoDef[] {
    return CAMPOS.filter((c) => c.documento === documentoId)
}

/** I documenti che producono almeno un campo. */
export function documentosConCampos(): string[] {
    return [...new Set(CAMPOS.map((c) => c.documento))]
}

export function campo(id: string): CampoDef | undefined {
    return CAMPOS.find((c) => c.id === id)
}

/**
 * Quanti campi della formula mancano ancora.
 *
 * Serve per il blocco dell'approvazione: finché la formula non ha tutti i
 * suoi ingressi confermati, la cifra sul fascicolo non è difendibile.
 */
export function faltanParaFormula(e: Extraccion): CampoDef[] {
    return CAMPOS.filter(
        (c) =>
            (c.destino === 'formula' || c.destino === 'ambos') &&
            !['confirmado', 'corregido'].includes(e[c.id]?.estado ?? 'vacio')
    )
}

/** Confidenza sotto la quale conviene aprire il documento. */
export const CONFIANZA_BAJA = 0.8

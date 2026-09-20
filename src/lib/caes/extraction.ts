/**
 * I dati che si estraggono dai documenti.
 *
 * ── A COSA SERVE QUESTO FILE ──────────────────────────────────────────
 *
 * Un fascicolo CAES è fatto di carte da cui bisogna tirare fuori una
 * ventina di dati. Quei dati fanno due cose:
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
 * ── UN DATO, PIÙ CARTE ────────────────────────────────────────────────
 *
 * `documento` può essere una lista. Lo stesso dato compare spesso in due
 * posti — il modello sta sulla fattura e sull'etichetta, l'indirizzo sulla
 * fattura e sulla scrittura — e quale delle due arrivi prima non si sa in
 * anticipo. Il campo resta UNO: confermarlo da una parte lo conferma
 * dappertutto. Ma si mostra sotto ogni documento che dovrebbe contenerlo,
 * così chi rivede sa cosa cercare in ciascuna carta invece di indovinarlo.
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
    /**
     * Id dello slot documento da cui si estrae, o la lista degli slot in cui
     * il dato compare. Il primo è la fonte preferita.
     * Vedi src/lib/documents.ts
     */
    documento: string | string[]
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
        documento: 'cee-antes',
        tipo: 'numero',
        unidad: 'm²',
        destino: 'ambos',
        ayuda: 'Superficie habitable del certificado, no la construida.',
    },
    {
        id: 'dcal',
        label: 'Demanda de calefacción',
        documento: 'cee-antes',
        tipo: 'numero',
        unidad: 'kWh/m²·año',
        destino: 'formula',
        ayuda: 'Antes de la actuación. Es lo que multiplica la superficie.',
    },
    {
        id: 'dacs',
        label: 'Demanda de ACS',
        documento: 'cee-antes',
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
        documento: ['ficha', 'factura'],
        tipo: 'numero',
        unidad: 'kW',
        destino: 'documentos',
        ayuda: 'Manda la ficha; en la factura suele venir en la descripción del equipo.',
    },

    // ── Equipo sustituido: il rendimento di partenza ──
    {
        id: 'tipo_anterior',
        label: 'Equipo sustituido',
        documento: 'equipo-anterior',
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
        documento: 'equipo-anterior',
        tipo: 'numero',
        destino: 'formula',
        ayuda: 'Si no se lee en la placa, se aplica el 0,92 por defecto.',
    },

    // ── Identificazione dell'apparecchio ──
    //
    // Sta scritta due volte: sull'etichetta che l'installatore fotografa e
    // sulla riga della fattura. Sono la stessa cosa e devono coincidere —
    // se non coincidono, la fattura non prova l'acquisto di quello che è
    // stato montato, ed è uno dei modi in cui un fascicolo salta.
    {
        id: 'marca',
        label: 'Marca',
        documento: ['equipo-nuevo', 'factura'],
        tipo: 'texto',
        destino: 'documentos',
    },
    {
        id: 'modelo',
        label: 'Modelo',
        documento: ['equipo-nuevo', 'factura'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'El nombre comercial, tal cual: «Nuos Plus Wi-Fi 250».',
    },
    {
        id: 'codigo_modelo',
        label: 'Código de modelo',
        documento: ['factura', 'ficha', 'equipo-nuevo'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'La referencia del fabricante que identifica la variante exacta. Es lo que se contrasta con el catálogo, no el nombre comercial.',
    },
    {
        id: 'num_serie',
        label: 'Número de serie',
        documento: ['equipo-nuevo', 'factura'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'El de la etiqueta y el de la factura tienen que ser el mismo.',
    },

    // ── Factura: l'importo su cui si calcola la detrazione ──
    {
        id: 'importe',
        label: 'Importe de la instalación',
        documento: 'factura',
        tipo: 'numero',
        unidad: '€',
        destino: 'documentos',
        ayuda: 'Equipo y mano de obra. Base de la deducción del 30 % del cliente.',
    },
    {
        id: 'fecha_factura',
        label: 'Fecha de la factura',
        documento: 'factura',
        tipo: 'fecha',
        destino: 'documentos',
        ayuda: 'No debería ser posterior al fin de obra del RITE.',
    },

    // ── Dati del cliente: stanno già sulla fattura ──
    //
    // La fattura è intestata: nome, NIF/NIE, indirizzo e quasi sempre il
    // telefono sono lì, scritti da chi la emette. Prenderli da lì evita di
    // farli ribattere a mano e di ritrovarsi due versioni dello stesso
    // indirizzo nel fascicolo. Il DNI del cliente, quando c'è, serve a
    // controllare nome e NIF — non a riscriverli.
    {
        id: 'nombre_cliente',
        label: 'Nombre del cliente',
        documento: ['factura', 'dni-cliente'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'El titular de la factura. Es quien firma el Convenio CAE.',
    },
    {
        id: 'nif_cliente',
        label: 'NIF / NIE del cliente',
        documento: ['factura', 'dni-cliente'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'En la factura va junto al nombre del titular.',
    },
    {
        id: 'telefono_cliente',
        label: 'Teléfono del cliente',
        documento: 'factura',
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'Si la factura no lo trae, se rellena a mano con el del contacto.',
    },
    {
        id: 'direccion_actuacion',
        label: 'Dirección de la actuación',
        documento: ['factura', 'titularidad', 'cee-antes'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'Dónde se ha instalado el equipo. Tiene que coincidir con la del certificado energético.',
    },
    {
        id: 'cp',
        label: 'Código postal',
        documento: ['factura', 'titularidad', 'cee-antes'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'De aquí sale la zona climática, que fija el SCOP mínimo exigible.',
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

    // ── Identità dell'installatore: serve per le firme ──
    {
        id: 'nif_instalador',
        label: 'NIF del instalador',
        documento: 'dni-instalador',
        tipo: 'texto',
        destino: 'documentos',
    },

    // ── Consumo reale: quando il fascicolo arriva dal cliente ──
    {
        id: 'consumo_anual_kwh',
        label: 'Consumo anual',
        documento: 'factura-energia',
        tipo: 'numero',
        unidad: 'kWh/año',
        destino: 'documentos',
        ayuda: 'Con esto el ahorro deja de ser una estimación.',
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

/** Gli slot documento in cui un campo compare. */
export function documentosDe(c: CampoDef): string[] {
    return Array.isArray(c.documento) ? c.documento : [c.documento]
}

/** I campi di un documento, nell'ordine di definizione. */
export function camposDe(documentoId: string): CampoDef[] {
    return CAMPOS.filter((c) => documentosDe(c).includes(documentoId))
}

/** I documenti che producono almeno un campo. */
export function documentosConCampos(): string[] {
    return [...new Set(CAMPOS.flatMap(documentosDe))]
}

export function campo(id: string): CampoDef | undefined {
    return CAMPOS.find((c) => c.id === id)
}

/**
 * Le altre carte in cui lo stesso dato dovrebbe comparire.
 *
 * Serve al pannello: sotto la fattura, accanto al modello, dire «también
 * en la etiqueta» trasforma un campo da compilare in un riscontro da fare.
 */
export function otrasFuentes(c: CampoDef, documentoId: string): string[] {
    return documentosDe(c).filter((d) => d !== documentoId)
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

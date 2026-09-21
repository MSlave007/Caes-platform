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
 * ── QUELLO CHE SI CONTROLLA E BASTA ───────────────────────────────────
 *
 * Non tutto quello che si legge va confermato. Certi valori esistono solo
 * per essere confrontati con un altro — la domanda del certificato dopo
 * contro quella del certificato prima — e chiederne la spunta sarebbe
 * lavoro finto. Quelli hanno `control: true` e vivono in COMPROBACIONES,
 * in fondo al file: si confrontano da soli e parlano solo se non tornano.
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
    /**
     * Non si conferma: si legge e basta, per confrontarlo con un altro
     * campo. Non entra nel conteggio dei dati da rivedere — chiedere di
     * spuntare un valore che serve solo a un paragone è lavoro finto.
     */
    control?: boolean
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
    {
        id: 'num_personas',
        label: 'Ocupantes de la vivienda',
        documento: 'cee-antes',
        tipo: 'numero',
        destino: 'documentos',
        ayuda: 'De aquí sale la demanda de agua caliente. Si no consta, se estima por superficie.',
    },
    {
        id: 'zona_climatica',
        label: 'Zona climática',
        documento: 'cee-antes',
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'La del certificado (A3, D3, E1…). Decide el SCOP mínimo exigible.',
    },

    // ── Certificado energético posterior: niente da confermare ──
    //
    // Da questo non si prende niente per il fascicolo. La domanda di un
    // edificio dipende dall'involucro — muri, finestre, isolamento — non
    // dall'apparecchio che ci sta dentro: cambiare la caldaia con una
    // pompa di calore cambia il CONSUMO e la lettera, non la DOMANDA.
    // Quindi nei due certificati DCAL, DACS e superficie devono uscire
    // identici.
    //
    // Se non lo sono, o il certificatore ha toccato qualcos'altro, o i due
    // certificati non parlano della stessa casa. In tutti e due i casi la
    // cifra della RES060 poggia su un numero che non regge, e va guardato
    // prima di firmare. Questi tre campi servono solo a quel paragone:
    // `control: true`, quindi si leggono e non si spuntano.
    {
        id: 'superficie_despues',
        label: 'Superficie útil',
        documento: 'cee-despues',
        tipo: 'numero',
        unidad: 'm²',
        destino: 'documentos',
        control: true,
    },
    {
        id: 'dcal_despues',
        label: 'Demanda de calefacción',
        documento: 'cee-despues',
        tipo: 'numero',
        unidad: 'kWh/m²·año',
        destino: 'documentos',
        control: true,
    },
    {
        id: 'dacs_despues',
        label: 'Demanda de ACS',
        documento: 'cee-despues',
        tipo: 'numero',
        unidad: 'kWh/año',
        destino: 'documentos',
        control: true,
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
        documento: ['factura', 'ficha'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'La referencia del fabricante que identifica la variante exacta. Es lo que se contrasta con el catálogo, no el nombre comercial.',
    },
    {
        // Solo dall'etichetta. Sulla fattura, quando c'è, è un numero di
        // riga d'ordine che assomiglia a un numero di serie e non lo è:
        // mandare a cercarlo li fa solo sbagliare.
        id: 'num_serie',
        label: 'Número de serie',
        documento: 'equipo-nuevo',
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'El de la placa del equipo instalado.',
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
        // Senza questo non si puo' mandare niente a firmare: e'
        // l'indirizzo a cui arriva il Convenio. Il modello lo chiedeva
        // gia' e puntava a un campo che non esisteva.
        id: 'email_cliente',
        label: 'Correo del cliente',
        documento: 'factura',
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'Si la factura no lo trae, se rellena a mano. Es donde llega el documento a firmar.',
    },
    {
        id: 'direccion_actuacion',
        label: 'Dirección de la actuación',
        documento: ['factura', 'titularidad'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'Dónde se ha instalado el equipo.',
    },
    {
        id: 'cp',
        label: 'Código postal',
        documento: ['factura', 'titularidad'],
        tipo: 'texto',
        destino: 'documentos',
        ayuda: 'De aquí sale la zona climática, que fija el SCOP mínimo exigible.',
    },

    // ── RITE: solo la data di fine opera ──
    //
    // Il numero di registro stava qui e non serviva a niente: non entra
    // nel calcolo e non lo chiede nessun documento da firmare. Quello che
    // conta è la data, perché da lì decorrono i tre anni per presentare
    // l'actuación.
    {
        id: 'fecha_inicio_obra',
        label: 'Fecha de inicio de obra',
        documento: 'rite',
        tipo: 'fecha',
        destino: 'documentos',
        ayuda: 'La Ficha RES060 pide las dos fechas, inicio y fin.',
    },
    {
        id: 'fecha_fin_obra',
        label: 'Fecha de fin de obra',
        documento: 'rite',
        tipo: 'fecha',
        destino: 'ambos',
        ayuda: 'Desde aquí cuentan los 3 años para presentar la actuación.',
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
    /**
     * Chi ha confermato o corretto, e quando.
     *
     * Non è burocrazia: questi valori finiscono nel Convenio CAE e nel
     * RES60, documenti che qualcuno firma e per cui risponde dieci anni.
     * «Confermato» senza «da chi» non è una conferma, è un'affermazione
     * senza nessuno dietro.
     *
     * Li scrive il SERVER dalla sessione, mai il browser: un'attribuzione
     * che arriva dal client è un'attribuzione che si può scrivere a mano.
     */
    por?: string
    /** ISO 8601 */
    en?: string
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

/* ==================================================================== *
 *  CONTROLLI INCROCIATI
 * ==================================================================== */

/**
 * Un confronto fra due campi che devono dire la stessa cosa.
 *
 * ── PERCHÉ NON SONO CAMPI DA SPUNTARE ─────────────────────────────────
 *
 * Un errore di questo tipo — la domanda che cambia fra un certificato e
 * l'altro, la data della fattura dopo la fine dei lavori — non si vede
 * guardando un documento alla volta. Si vede solo mettendo due carte una
 * accanto all'altra, ed è esattamente la cosa che a mano non si fa mai:
 * si aprono otto PDF, si spunta, si va avanti.
 *
 * Quindi non chiediamo a nessuno di controllare. Si controlla da sé, e
 * parla solo quando c'è qualcosa che non torna.
 */
export type Comprobacion = {
    id: string
    /** Cosa si sta confrontando, detto in una riga. */
    titulo: string
    /** Perché è un problema. Si legge solo quando l'allarme scatta. */
    porque: string
    campos: [string, string]
    /** Come si confrontano i due valori. */
    modo: 'igual' | 'no_posterior'
    /** Scarto tollerato, per i numeri. Gli arrotondamenti non sono errori. */
    tolerancia?: number
}

export const COMPROBACIONES: Comprobacion[] = [
    {
        id: 'dcal-coincide',
        titulo: 'La demanda de calefacción no coincide entre los dos certificados',
        porque: 'La demanda depende del edificio, no del equipo: cambiar la caldera no la cambia. Si los dos certificados dan cifras distintas, o se ha tocado algo más en la obra o no son de la misma vivienda — y la demanda anterior es la que multiplica la superficie en el cálculo.',
        campos: ['dcal', 'dcal_despues'],
        modo: 'igual',
        tolerancia: 0.5,
    },
    {
        id: 'dacs-coincide',
        titulo: 'La demanda de ACS no coincide entre los dos certificados',
        porque: 'Igual que la de calefacción: depende de la vivienda y de quién la habita, no del equipo instalado. Una diferencia aquí mueve el segundo término de la fórmula.',
        campos: ['dacs', 'dacs_despues'],
        modo: 'igual',
        tolerancia: 1,
    },
    {
        id: 'superficie-coincide',
        titulo: 'La superficie útil no coincide entre los dos certificados',
        porque: 'La superficie no cambia con una instalación. Si cambia, lo más probable es que uno de los dos certificados sea de otra vivienda — y es el error más caro de los tres, porque la superficie multiplica toda la demanda de calefacción.',
        campos: ['superficie_m2', 'superficie_despues'],
        modo: 'igual',
        tolerancia: 0.5,
    },
    {
        id: 'fecha-factura-fin-obra',
        titulo: 'La factura es posterior al fin de obra',
        porque: 'No es imposible, pero conviene mirarlo: si la factura se emitió después de certificar el fin de obra, alguna de las dos fechas suele estar mal copiada.',
        campos: ['fecha_factura', 'fecha_fin_obra'],
        modo: 'no_posterior',
    },
]

export type EstadoAviso = 'ok' | 'alarma' | 'pendiente'

export type Aviso = {
    comprobacion: Comprobacion
    estado: EstadoAviso
    /** I due valori confrontati, per mostrarli affiancati. */
    valores: [string, string]
}

const num = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : null
}

function evaluar(c: Comprobacion, e: Extraccion): EstadoAviso {
    const [a, b] = c.campos.map((id) => e[id]?.valor ?? null)
    if (a === null || a === '' || b === null || b === '') return 'pendiente'

    if (c.modo === 'no_posterior') {
        const fa = Date.parse(String(a))
        const fb = Date.parse(String(b))
        if (Number.isNaN(fa) || Number.isNaN(fb)) return 'pendiente'
        return fa > fb ? 'alarma' : 'ok'
    }

    const na = num(a)
    const nb = num(b)
    // Non numerici: si confrontano come testo, normalizzato.
    if (na === null || nb === null) {
        const limpiar = (v: unknown) =>
            String(v).trim().toLowerCase().replace(/\s+/g, ' ')
        return limpiar(a) === limpiar(b) ? 'ok' : 'alarma'
    }
    return Math.abs(na - nb) <= (c.tolerancia ?? 0) ? 'ok' : 'alarma'
}

/**
 * Tutti i controlli, con il loro esito.
 *
 * `pendiente` non è un problema: vuol dire che una delle due carte non è
 * ancora arrivata. Diventa un'informazione solo quando ci sono entrambe.
 */
export function avisos(e: Extraccion): Aviso[] {
    return COMPROBACIONES.map((c) => ({
        comprobacion: c,
        estado: evaluar(c, e),
        valores: [
            String(e[c.campos[0]]?.valor ?? '—'),
            String(e[c.campos[1]]?.valor ?? '—'),
        ] as [string, string],
    }))
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

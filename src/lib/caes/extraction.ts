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

    // ── Seconde letture: lo stesso dato su un'altra carta ──
    //
    // Hanno `control: true`, quindi non si spuntano: esistono solo per
    // essere confrontate con il valore buono. Chiedere a qualcuno di
    // confermare un numero che serve solo a un paragone e lavoro finto.
    //
    // Sono la meta mancante dei controlli in fondo a questo file: senza
    // un secondo valore, «il NIF della fattura non e quello del DNI» non
    // e una cosa che il sistema puo accorgersi di dire.
    {
        id: 'nif_cliente_dni',
        label: 'NIF del cliente, en el DNI',
        documento: 'dni-cliente',
        tipo: 'texto',
        destino: 'documentos',
        control: true,
        ayuda: 'Solo para contrastarlo con el de la factura.',
    },
    {
        id: 'nombre_cliente_dni',
        label: 'Nombre del cliente, en el DNI',
        documento: 'dni-cliente',
        tipo: 'texto',
        destino: 'documentos',
        control: true,
        ayuda: 'Solo para contrastarlo con el titular de la factura.',
    },
    {
        id: 'direccion_titularidad',
        label: 'Dirección en el documento de titularidad',
        documento: 'titularidad',
        tipo: 'texto',
        destino: 'documentos',
        control: true,
        ayuda: 'Solo para contrastarla con la dirección de la actuación.',
    },
    {
        id: 'modelo_factura',
        label: 'Modelo, en la factura',
        documento: 'factura',
        tipo: 'texto',
        destino: 'documentos',
        control: true,
        ayuda: 'Solo para contrastarlo con la placa del equipo instalado.',
    },
    {
        id: 'potencia_factura',
        label: 'Potencia, en la factura',
        documento: 'factura',
        tipo: 'numero',
        unidad: 'kW',
        destino: 'documentos',
        control: true,
        ayuda: 'Solo para contrastarla con la ficha técnica.',
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
     * Quello che il modello aveva letto, prima che qualcuno lo
     * toccasse.
     *
     * ── PERCHE' SI TIENE ──────────────────────────────────────────────
     *
     * Correggendo un campo, `valor` diventa il valore giusto e quello
     * proposto dal modello sparisce. Ma e proprio la coppia (letto,
     * giusto) l'unica cosa che dice se il lettore funziona: senza, si
     * puo solo credere che vada bene.
     *
     * Si scrive una volta, quando la lettura arriva, e non si tocca
     * piu — nemmeno rileggendo lo stesso documento. Un valore che
     * cambia non e una misura.
     */
    leido?: string | number | null
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
    /**
     * Come si confrontano i due valori.
     *
     *   igual         stesso valore, con tolleranza per i numeri
     *   igual_laxo    stesse parole, in qualunque ordine — per nomi e
     *                 indirizzi, dove l'ordine cambia da un documento
     *                 all'altro senza che sia un errore
     *   no_posterior  il primo non deve venire dopo il secondo
     */
    modo: 'igual' | 'igual_laxo' | 'no_posterior'
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

    // -- Chi firma ----------------------------------------------------
    //
    // I due piu cari di tutto l'elenco. Il Convenio CAE lo firma il
    // titolare, e il titolare e quello della fattura. Se il DNI dice un
    // altro nome, il documento non ha un errore: non vale.
    {
        id: 'nif-cliente-coincide',
        titulo: 'El NIF de la factura no coincide con el del DNI',
        porque: 'El Convenio CAE lo firma el titular de la instalacion, y el titular es el de la factura. Si el DNI aportado es de otra persona, o falta un documento o lo va a firmar quien no debe, y un Convenio firmado por quien no es titular no vale.',
        campos: ['nif_cliente', 'nif_cliente_dni'],
        modo: 'igual',
    },
    {
        id: 'nombre-cliente-coincide',
        titulo: 'El nombre de la factura no coincide con el del DNI',
        porque: 'Mismo motivo que el NIF. Muchas veces es solo el orden de los apellidos y se ve en un segundo; cuando no lo es, conviene saberlo antes de generar el Convenio, no despues de mandarlo a firmar.',
        campos: ['nombre_cliente', 'nombre_cliente_dni'],
        modo: 'igual_laxo',
    },

    // -- Dove ---------------------------------------------------------
    {
        id: 'direccion-coincide',
        titulo: 'La direccion de la actuacion no coincide con la de titularidad',
        porque: 'La ayuda es para la vivienda del titular. Si la obra esta en una direccion y la titularidad en otra, o hay dos inmuebles por medio o uno de los dos papeles es de otro expediente.',
        campos: ['direccion_actuacion', 'direccion_titularidad'],
        modo: 'igual_laxo',
    },

    // -- Cosa e stato installato --------------------------------------
    {
        id: 'modelo-coincide',
        titulo: 'El modelo de la placa no coincide con el de la factura',
        porque: 'La placa dice lo que hay puesto en la pared; la factura, lo que se ha cobrado. Si no coinciden, el SCOP con el que se ha calculado el ahorro puede ser el de otro equipo.',
        campos: ['modelo', 'modelo_factura'],
        modo: 'igual',
    },
    {
        id: 'potencia-coincide',
        titulo: 'La potencia de la ficha no coincide con la de la factura',
        porque: 'Igual que el modelo, y mas facil de que se cuele: media unidad de diferencia es un redondeo, pero el doble o la mitad es otro equipo.',
        campos: ['potencia_kw', 'potencia_factura'],
        modo: 'igual',
        tolerancia: 0.6,
    },

    // -- Quando -------------------------------------------------------
    {
        id: 'obra-empieza-antes-de-acabar',
        titulo: 'La obra acaba antes de empezar',
        porque: 'Casi siempre es una fecha mal copiada del RITE. Importa porque las dos van tal cual a la ficha RES060 y al Anexo I.',
        campos: ['fecha_inicio_obra', 'fecha_fin_obra'],
        modo: 'no_posterior',
    },
]

/* ==================================================================== *
 *  INTERVALLI PLAUSIBILI
 * ==================================================================== */

/**
 * Un numero solo, fuori da quello che puo essere.
 *
 * -- PERCHE SERVE -----------------------------------------------------
 *
 * Il modo in cui un lettore automatico sbaglia piu spesso non e leggere
 * una parola per un'altra: e la virgola. 9,2 diventa 92, e passa tutti i
 * controlli incrociati, perche c'e una carta sola che lo dice e non c'e
 * niente con cui confrontarlo.
 *
 * Uno SCOP di 92 non e un valore da discutere: e un errore di lettura.
 *
 * -- PERCHE SONO LARGHI -----------------------------------------------
 *
 * Gli estremi sono generosi apposta. Un allarme su un valore legittimo
 * e peggio di un allarme mancato, perche insegna a ignorarli tutti:
 * dopo il terzo falso allarme nessuno li legge piu. Devono scattare
 * quando il numero e impossibile, non quando e insolito.
 */
export type Rango = {
    campo: string
    min: number
    max: number
    titulo: string
    porque: string
}

export const RANGOS: Rango[] = [
    {
        campo: 'scop',
        min: 1.5,
        max: 7,
        titulo: 'El SCOP esta fuera de lo que puede dar una aerotermia',
        porque: 'Por debajo de 1,5 no existe, y por encima de 7 tampoco. Casi siempre es la coma: 9,2 leido como 92. Y el SCOP entra directo en la formula, asi que se lleva por delante todo el ahorro.',
    },
    {
        campo: 'scop_acs',
        min: 1.2,
        max: 6,
        titulo: 'El SCOP en ACS esta fuera de rango',
        porque: 'Mismo motivo que el de calefaccion, y ademas siempre deberia quedar por debajo de aquel.',
    },
    {
        campo: 'rendimiento_anterior',
        min: 0.3,
        max: 1.1,
        titulo: 'El rendimiento del equipo anterior es imposible',
        porque: 'Es una fraccion, no un porcentaje: 0,92, no 92. Una caldera de combustion no pasa de 1,1 ni baja de 0,3. Si entra como porcentaje, el ahorro sale cien veces mas pequeno.',
    },
    {
        campo: 'superficie_m2',
        min: 15,
        max: 3000,
        titulo: 'La superficie util esta fuera de lo razonable',
        porque: 'La superficie multiplica toda la demanda de calefaccion: es el numero que mas mueve el resultado. Por debajo de 15 m2 no es una vivienda; por encima de 3.000 no es un certificado de vivienda.',
    },
    {
        campo: 'potencia_kw',
        min: 1,
        max: 150,
        titulo: 'La potencia nominal esta fuera de rango',
        porque: 'Una aerotermia domestica va de 3 a 16 kW; una de edificio llega a bastante mas. Fuera de estos margenes suele ser que se ha leido la potencia electrica absorbida, o una cifra de otra linea.',
    },
    {
        campo: 'dcal',
        min: 5,
        max: 400,
        titulo: 'La demanda de calefaccion esta fuera de rango',
        porque: 'Va en kWh por m2 y ano, no en total. Si se cuela el total de la vivienda, la formula lo vuelve a multiplicar por la superficie.',
    },
    {
        campo: 'dacs',
        min: 100,
        max: 40000,
        titulo: 'La demanda de ACS esta fuera de rango',
        porque: 'Esta si es el total anual, no por m2. Confundir las dos unidades es el error mas facil de los dos certificados.',
    },
    {
        campo: 'num_personas',
        min: 1,
        max: 30,
        titulo: 'El numero de ocupantes no cuadra',
        porque: 'De aqui sale la demanda de agua caliente cuando no consta en el certificado.',
    },
    {
        campo: 'importe',
        min: 300,
        max: 500000,
        titulo: 'El importe de la instalacion esta fuera de rango',
        porque: 'Es la base de la deduccion del 30 % del cliente: un cero de mas o de menos se nota en su bolsillo, no en el nuestro.',
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

/**
 * Toglie tutto quello che cambia da un documento all'altro senza
 * cambiare il dato: accenti, maiuscole, punti, trattini, spazi.
 *
 * Serve soprattutto ai NIF: «12345678-Z», «12345678 Z» e «12345678z»
 * sono lo stesso documento d'identita, e segnalarli come diversi
 * sarebbe un allarme che insegna a ignorare gli allarmi.
 */
function normalizarTexto(v: unknown): string {
    return String(v)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim()
}

/**
 * Le stesse parole, in qualunque ordine, ignorando quelle corte.
 *
 * Sui documenti ufficiali spagnoli il cognome va davanti: «MARIA GARCIA»
 * sulla fattura e «GARCIA LOPEZ, MARIA» sul DNI sono la stessa persona.
 * E negli indirizzi «C/», «de», «la» e i numeri civici scritti in due
 * modi non dicono niente di utile.
 */
function mismasPalabras(a: unknown, b: unknown): boolean {
    const partes = (v: unknown) =>
        new Set(normalizarTexto(v).split(' ').filter((p) => p.length > 2))
    const pa = partes(a)
    const pb = partes(b)
    if (pa.size === 0 || pb.size === 0) return normalizarTexto(a) === normalizarTexto(b)

    // Il piu corto dev'essere contenuto nel piu lungo: un documento puo
    // portare un cognome in piu, e non e una discordanza.
    const [corto, largo] = pa.size <= pb.size ? [pa, pb] : [pb, pa]
    for (const p of corto) if (!largo.has(p)) return false
    return true
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

    if (c.modo === 'igual_laxo') {
        return mismasPalabras(a, b) ? 'ok' : 'alarma'
    }

    const na = num(a)
    const nb = num(b)
    // Non numerici: si confrontano come testo, normalizzato.
    if (na === null || nb === null) {
        return normalizarTexto(a) === normalizarTexto(b) ? 'ok' : 'alarma'
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

/* ------------------------------------------------------------------ *
 *  Un elenco solo, per chi rivede
 * ------------------------------------------------------------------ */

/**
 * Tutto quello che non torna, confronti e intervalli insieme.
 *
 * Sono due meccanismi diversi — due carte che si contraddicono, un
 * numero impossibile da solo — ma per chi rivede sono la stessa cosa:
 * roba da guardare prima di approvare. Tenerli in due riquadri separati
 * vorrebbe dire far cercare in due posti.
 */
export type Senal = {
    id: string
    titulo: string
    porque: string
    estado: EstadoAviso
    /** I valori guardati: due per un confronto, uno per un intervallo. */
    valores: string[]
    /** Da dove viene: cambia solo come si scrive, non cosa si fa. */
    tipo: 'contraste' | 'rango'
}

/** Gli intervalli, valutati. */
export function avisosDeRango(e: Extraccion): Senal[] {
    return RANGOS.map((r) => {
        const bruto = e[r.campo]?.valor
        const n = num(bruto)
        return {
            id: r.campo + '-rango',
            titulo: r.titulo,
            porque: r.porque,
            estado: (n === null ? 'pendiente' : n < r.min || n > r.max ? 'alarma' : 'ok') as EstadoAviso,
            valores: [n === null ? '—' : String(bruto)],
            tipo: 'rango' as const,
        }
    })
}

/** Confronti e intervalli in un elenco solo, gli allarmi davanti. */
export function senales(e: Extraccion): Senal[] {
    const contrastes: Senal[] = avisos(e).map((a) => ({
        id: a.comprobacion.id,
        titulo: a.comprobacion.titulo,
        porque: a.comprobacion.porque,
        estado: a.estado,
        valores: a.valores,
        tipo: 'contraste' as const,
    }))

    const peso = { alarma: 0, pendiente: 1, ok: 2 }
    return [...contrastes, ...avisosDeRango(e)].sort(
        (x, y) => peso[x.estado] - peso[y.estado]
    )
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

/**
 * I tre documenti che il fascicolo deve produrre.
 *
 * ── DA COSA NASCE QUESTO FILE ─────────────────────────────────────────
 *
 * Marco ha passato tre documenti già compilati di un fascicolo vero: il
 * Convenio CAE, la ficha RES060 e l'Anexo I. Non sono template: sono
 * esemplari finiti. Quello che c'è qui è il calco — lo stesso testo con
 * al posto dei dati un buco che ha un nome.
 *
 * I valori in `ejemplo` sono INVENTATI, non quelli del fascicolo vero:
 * servono a vedere l'impaginazione, e i dati di una persona reale non
 * hanno ragione di finire in un repository.
 *
 * ⚠️ IL TESTO LEGALE È RICOPIATO DAGLI ESEMPLARI, NON DAI MODELLI
 * UFFICIALI. Va confrontato con i template puri prima di generare
 * qualcosa che qualcuno firma. Quello che è già giusto e verificabile
 * adesso è la STRUTTURA: quali buchi ci sono, da dove si riempiono, e
 * quali oggi non sappiamo riempire.
 *
 * ── PERCHÉ GENERARE INVECE DI COMPILARE A MANO ────────────────────────
 *
 * Negli esemplari che mi ha passato, l'email del cliente è scritta in
 * due modi diversi fra il Convenio e l'Anexo I: stesso fascicolo, due
 * documenti compilati a mano, e uno dei due è sbagliato. Nessuno se n'è accorto perché per
 * accorgersene bisogna aprire due PDF e confrontare una stringa.
 *
 * Generandoli da un dato solo, quell'errore non può esistere: o l'email
 * è giusta in tutti e tre o è sbagliata in tutti e tre, e in quel caso
 * la si corregge in un posto. È la stessa ragione dei controlli
 * incrociati in `extraction.ts`, applicata all'uscita invece che
 * all'entrata.
 */

import { CAMPOS } from './extraction'

/* ==================================================================== *
 *  I BUCHI
 * ==================================================================== */

/**
 * Da dove arriva un dato.
 *
 * Serve a rispondere alla domanda che conta: cosa manca per poter
 * generare. Un buco `extraido` che è vuoto si riempie leggendo una
 * carta; uno `perfil` si riempie una volta sola e vale per sempre; uno
 * `catastro` non lo sa nessuno dei due e va cercato altrove. Sono tre
 * lavori diversi e confonderli fa sembrare il problema più grande di
 * quello che è.
 */
export type Origen =
    /** Esce da un documento del fascicolo. Vedi CAMPOS in extraction.ts. */
    | 'extraido'
    /** Sta nell'anagrafica dell'installatore: si scrive una volta. */
    | 'perfil'
    /** Lo decide l'agenzia: tariffa, condizioni. */
    | 'agencia'
    /** Si calcola dagli altri. */
    | 'calculado'
    /** Catasto o geolocalizzazione: non è su nessuna carta del fascicolo. */
    | 'catastro'
    /** Fisso: non cambia mai da un fascicolo all'altro. */
    | 'fijo'

export type Hueco = {
    id: string
    label: string
    origen: Origen
    /** Id del campo in CAMPOS, quando l'origine è `extraido`. */
    campo?: string
    /** Valore quando l'origine è `fijo`, o ripiego quando manca. */
    valor?: string
    /** Dall'esemplare di Marco. Serve alla prova a vuoto e come promemoria. */
    ejemplo?: string
    /** Senza, il documento non si può emettere. */
    requerido?: boolean
    /** Perché serve, o dove si trova. */
    nota?: string
}

/* ------------------------------------------------------------------ *
 *  Il cessionario è sempre lo stesso: è l'agenzia che compra gli
 *  ahorros. Sta qui e non nei buchi perché non è un dato del fascicolo,
 *  è un dato nostro — e se cambia, cambia in un posto solo.
 * ------------------------------------------------------------------ */
/**
 * ⚠️ NON AGGIUNGERE QUI IL CESIONARIO.
 *
 * Stava qui, scritto fisso dentro il testo del Convenio: nome, NIF,
 * codice di accreditamento. Ma il cesionario e' la CONTROPARTE del
 * contratto e cambia con il soggetto delegato — Bettergy e' uno dei
 * possibili. Adesso sono buchi come tutti gli altri, riempiti da
 * src/lib/caes/proveedores.ts.
 */

/** La ficha: nome e testi che non cambiano mai. */
export const FICHA = {
    codigo: 'RES060',
    nombre:
        'Sustitución de caldera de combustión por una bomba de calor de accionamiento eléctrico',
    /** Anni di vita utile dell'actuación, per la clausola quinta. */
    vidaUtil: '15',
}

export const HUECOS: Record<string, Hueco> = {
    /* ── il cesionario: chi compra l'ahorro ─────────────────────── */
    cesionario_razon: {
        id: 'cesionario_razon',
        label: 'Razón social del sujeto delegado',
        origen: 'agencia',
        ejemplo: 'BETTERGY, S.L.',
        requerido: true,
        nota: 'Cambia con el sujeto delegado con el que se tramite. Se elige en el expediente.',
    },
    cesionario_nif: {
        id: 'cesionario_nif',
        label: 'NIF del sujeto delegado',
        origen: 'agencia',
        ejemplo: 'B93149870',
        requerido: true,
    },
    cesionario_codigo_sd: {
        id: 'cesionario_codigo_sd',
        label: 'Código de sujeto delegado',
        origen: 'agencia',
        ejemplo: 'SD-B93149870',
        requerido: true,
        nota: 'El código con el que el MITECO lo ha acreditado. Si no corresponde al NIF de arriba, el convenio no vale.',
    },
    cesionario_representante: {
        id: 'cesionario_representante',
        label: 'Representante del sujeto delegado',
        origen: 'agencia',
        ejemplo: 'Nombre Apellido Apellido',
        requerido: true,
    },
    cesionario_dni: {
        id: 'cesionario_dni',
        label: 'DNI del representante',
        origen: 'agencia',
        ejemplo: '00000000X',
        requerido: true,
    },
    cesionario_cargo: {
        id: 'cesionario_cargo',
        label: 'Cargo del representante',
        origen: 'agencia',
        ejemplo: 'Administrador Solidario',
        requerido: true,
    },
    cesionario_domicilio: {
        id: 'cesionario_domicilio',
        label: 'Domicilio social del sujeto delegado',
        origen: 'agencia',
        ejemplo: 'Calle Example, 1, C.P. 00000-Ciudad',
        requerido: true,
    },
    cesionario_telefono: {
        id: 'cesionario_telefono',
        label: 'Teléfono del sujeto delegado',
        origen: 'agencia',
        ejemplo: '900000000',
        requerido: true,
    },
    cesionario_email: {
        id: 'cesionario_email',
        label: 'Correo del sujeto delegado',
        origen: 'agencia',
        ejemplo: 'cae@ejemplo.es',
        requerido: true,
    },

    /* ── il cliente ─────────────────────────────────────────────── */
    cliente_nombre: {
        id: 'cliente_nombre',
        label: 'Nombre y apellidos del cliente',
        origen: 'extraido',
        campo: 'nombre_cliente',
        ejemplo: 'Nombre Apellido Apellido',
        requerido: true,
    },
    cliente_nif: {
        id: 'cliente_nif',
        label: 'NIF / NIE del cliente',
        origen: 'extraido',
        campo: 'nif_cliente',
        ejemplo: '00000000X',
        requerido: true,
    },
    cliente_domicilio: {
        id: 'cliente_domicilio',
        label: 'Domicilio del cliente',
        origen: 'extraido',
        campo: 'direccion_actuacion',
        ejemplo: 'Carrer Example, 1, 08000, Ciudad, Provincia',
        requerido: true,
        nota: 'A efectos de notificaciones. Suele coincidir con la dirección de la actuación, pero no siempre.',
    },
    cliente_telefono: {
        id: 'cliente_telefono',
        label: 'Teléfono del cliente',
        origen: 'extraido',
        campo: 'telefono_cliente',
        ejemplo: '600000000',
        requerido: true,
    },
    cliente_email: {
        id: 'cliente_email',
        label: 'Correo electrónico del cliente',
        origen: 'extraido',
        campo: 'email_cliente',
        ejemplo: 'cliente@example.com',
        requerido: true,
        nota: 'Hoy no se extrae de ningún documento. Es justo el dato que en los ejemplares aparece escrito distinto en el Convenio y en el Anexo I.',
    },

    /* ── dove si è fatta l'opera ────────────────────────────────── */
    direccion_actuacion: {
        id: 'direccion_actuacion',
        label: 'Dirección de la actuación',
        origen: 'extraido',
        campo: 'direccion_actuacion',
        ejemplo: 'Carrer Example, 1, Ciudad, 08000, Provincia',
        requerido: true,
    },
    localidad: {
        id: 'localidad',
        label: 'Localidad',
        origen: 'catastro',
        ejemplo: 'Ciudad',
        requerido: true,
        nota: 'Se deduce del código postal.',
    },
    provincia: {
        id: 'provincia',
        label: 'Provincia',
        origen: 'catastro',
        ejemplo: 'Provincia',
        requerido: true,
        nota: 'Se deduce del código postal.',
    },
    ccaa: {
        id: 'ccaa',
        label: 'Comunidad autónoma',
        origen: 'catastro',
        ejemplo: 'Cataluña',
        requerido: true,
        nota: 'Se deduce del código postal.',
    },
    ref_catastral: {
        id: 'ref_catastral',
        label: 'Referencia catastral',
        origen: 'catastro',
        ejemplo: '0000000XX0000X0000XX',
        requerido: true,
        nota: 'No está en ninguna carta del expediente. Se consulta en el Catastro por dirección, o se pide al cliente.',
    },
    utm_huso: {
        id: 'utm_huso',
        label: 'Huso UTM',
        origen: 'catastro',
        ejemplo: '31',
        requerido: true,
    },
    utm_x: {
        id: 'utm_x',
        label: 'Coordenada UTM X',
        origen: 'catastro',
        ejemplo: '400000.0000000',
        requerido: true,
        nota: 'Sale de la misma consulta que la referencia catastral.',
    },
    utm_y: {
        id: 'utm_y',
        label: 'Coordenada UTM Y',
        origen: 'catastro',
        ejemplo: '4600000.0000000',
        requerido: true,
    },

    /* ── l'installatore ─────────────────────────────────────────── */
    instalador_razon: {
        id: 'instalador_razon',
        label: 'Razón social del instalador',
        origen: 'perfil',
        ejemplo: 'EMPRESA INSTALADORA EJEMPLO S.L.',
        requerido: true,
    },
    instalador_nif: {
        id: 'instalador_nif',
        label: 'NIF / CIF del instalador',
        origen: 'perfil',
        ejemplo: 'B00000000',
        requerido: true,
    },
    instalador_direccion: {
        id: 'instalador_direccion',
        label: 'Dirección del instalador',
        origen: 'perfil',
        ejemplo: 'Calle Example 1, 08000 (Provincia)',
        requerido: true,
    },
    instalador_responsable: {
        id: 'instalador_responsable',
        label: 'Responsable de la instalación',
        origen: 'perfil',
        ejemplo: 'Responsable Ejemplo',
        requerido: true,
        nota: 'Quien firma la ficha RES060.',
    },
    instalador_telefono: {
        id: 'instalador_telefono',
        label: 'Teléfono del instalador',
        origen: 'perfil',
        ejemplo: '900000000',
        requerido: true,
    },

    /* ── le date dell'opera ─────────────────────────────────────── */
    fecha_inicio: {
        id: 'fecha_inicio',
        label: 'Fecha de inicio de la obra',
        origen: 'extraido',
        campo: 'fecha_inicio_obra',
        ejemplo: '29/10/2024',
        requerido: true,
        nota: 'Hoy no se extrae: del RITE solo tomamos la de fin.',
    },
    fecha_fin: {
        id: 'fecha_fin',
        label: 'Fecha de fin de obra',
        origen: 'extraido',
        campo: 'fecha_fin_obra',
        ejemplo: '07/11/2024',
        requerido: true,
    },

    /* ── l'apparecchio installato ───────────────────────────────── */
    marca: {
        id: 'marca',
        label: 'Marca del equipo instalado',
        origen: 'extraido',
        campo: 'marca',
        ejemplo: 'Panasonic',
        requerido: true,
    },
    modelo: {
        id: 'modelo',
        label: 'Modelo del equipo instalado',
        origen: 'extraido',
        campo: 'modelo',
        ejemplo: 'Panasonic Aquarea All in One Generación',
        requerido: true,
    },
    num_serie: {
        id: 'num_serie',
        label: 'Nº de serie del equipo',
        origen: 'extraido',
        campo: 'num_serie',
        ejemplo: '0000000000',
        requerido: true,
    },
    potencia: {
        id: 'potencia',
        label: 'Potencia calorífica',
        origen: 'extraido',
        campo: 'potencia_kw',
        ejemplo: '16',
        requerido: true,
    },
    scop: {
        id: 'scop',
        label: 'SCOP en calefacción',
        origen: 'extraido',
        campo: 'scop',
        ejemplo: '4,3',
        requerido: true,
    },
    scop_acs: {
        id: 'scop_acs',
        label: 'SCOP en ACS',
        origen: 'extraido',
        campo: 'scop_acs',
        ejemplo: '2,6',
        requerido: true,
    },

    /* ── l'apparecchio sostituito ───────────────────────────────── */
    anterior_marca: {
        id: 'anterior_marca',
        label: 'Marca del equipo sustituido',
        origen: 'extraido',
        campo: 'tipo_anterior',
        valor: 'NO SE CONOCE',
        ejemplo: 'NO SE CONOCE',
        nota: 'Cuando la placa no se lee, «NO SE CONOCE» es una respuesta válida y así consta en el ejemplar.',
    },
    rendimiento_anterior: {
        id: 'rendimiento_anterior',
        label: 'Rendimiento de la caldera sustituida',
        origen: 'extraido',
        campo: 'rendimiento_anterior',
        valor: '0,92',
        ejemplo: '0,92',
        requerido: true,
        nota: 'Por defecto 0,92, el valor de la ficha RES060.',
    },

    /* ── il calcolo ─────────────────────────────────────────────── */
    fp: { id: 'fp', label: 'Factor de ponderación', origen: 'fijo', valor: '1,00' },
    dcal: {
        id: 'dcal',
        label: 'Demanda de calefacción (DCAL)',
        origen: 'extraido',
        campo: 'dcal',
        ejemplo: '143,5',
        requerido: true,
    },
    superficie: {
        id: 'superficie',
        label: 'Superficie útil (S)',
        origen: 'extraido',
        campo: 'superficie_m2',
        ejemplo: '108,14',
        requerido: true,
    },
    dacs: {
        id: 'dacs',
        label: 'Demanda de ACS (DACS)',
        origen: 'extraido',
        campo: 'dacs',
        ejemplo: '2185,12',
        requerido: true,
    },
    num_personas: {
        id: 'num_personas',
        label: 'Número de personas',
        origen: 'extraido',
        campo: 'num_personas',
        ejemplo: '4',
        requerido: true,
        nota: 'Hoy no se extrae. Entra en el cálculo del ACS: 28 l/persona/día.',
    },
    zona_climatica: {
        id: 'zona_climatica',
        label: 'Zona climática',
        origen: 'extraido',
        campo: 'zona_climatica',
        ejemplo: 'C2',
        requerido: true,
        nota: 'Está en el certificado energético. Fija el SCOP mínimo exigible.',
    },
    ahorro_kwh: {
        id: 'ahorro_kwh',
        label: 'Ahorro anual (AETOTAL)',
        origen: 'calculado',
        ejemplo: '14.793,33',
        requerido: true,
        nota: 'Lo calcula la fórmula RES060 con los campos de arriba. Nunca se escribe a mano.',
    },

    /* ── la parte commerciale ───────────────────────────────────── */
    tarifa: {
        id: 'tarifa',
        label: 'Contraprestación',
        origen: 'agencia',
        ejemplo: '59',
        requerido: true,
        nota: '€/MWh que se reconocen al cedente.',
    },

    /* ── la firma ───────────────────────────────────────────────── */
    lugar_firma: {
        id: 'lugar_firma',
        label: 'Lugar de firma',
        origen: 'agencia',
        ejemplo: 'Barcelona',
        requerido: true,
    },
    fecha_firma: {
        id: 'fecha_firma',
        label: 'Fecha de firma',
        origen: 'agencia',
        // In spagnolo il mese va minuscolo, ed e cosi che lo scrive
        // `extrasDeAgencia`: l'esempio con la maiuscola faceva sembrare
        // sbagliato il documento vero.
        ejemplo: '07 de septiembre de 2026',
        requerido: true,
    },
}

/* ==================================================================== *
 *  I DOCUMENTI
 * ==================================================================== */

export type Bloque =
    | { tipo: 'titulo'; texto: string }
    | { tipo: 'seccion'; texto: string }
    | { tipo: 'parrafo'; texto: string }
    | { tipo: 'campos'; filas: { etiqueta: string; texto: string }[] }
    | { tipo: 'tabla'; cabeceras: string[]; filas: string[][] }
    | { tipo: 'firmas'; partes: { rol: string; nombre: string }[] }
    | { tipo: 'nota'; texto: string }

export type Plantilla = {
    id: 'convenio' | 'res060' | 'anexo1'
    nombre: string
    /** A cosa serve, in una riga. */
    queEs: string
    /** Chi lo firma. */
    firman: string
    bloques: Bloque[]
}

/**
 * Nel testo, `{{hueco}}` è un buco. Il renderer lo sostituisce col
 * valore o, se manca, con una pastiglia che dice quale dato è e da dove
 * dovrebbe arrivare — così l'anteprima di un fascicolo incompleto resta
 * leggibile invece di riempirsi di stringhe vuote.
 */
export const PLANTILLAS: Plantilla[] = [
    /* ---------------------------------------------------------------- */
    {
        id: 'convenio',
        nombre: 'Convenio CAE',
        queEs: 'La cesión de los ahorros del cliente al sujeto delegado. Es el documento que mueve el dinero.',
        firman: 'Cliente y agencia',
        bloques: [
            { tipo: 'titulo', texto: 'CONVENIO DE CESIÓN DE AHORROS ENERGÉTICOS (CONVENIO CAE)' },
            { tipo: 'parrafo', texto: 'En {{lugar_firma}} a {{fecha_firma}}' },
            { tipo: 'seccion', texto: 'REUNIDOS' },
            {
                tipo: 'parrafo',
                texto: 'De una parte, D. {{cliente_nombre}}, mayor de edad, con documento de identificación {{cliente_nif}} y domicilio a efectos de notificaciones en {{cliente_domicilio}}, teléfono de contacto {{cliente_telefono}} y correo electrónico {{cliente_email}}, en adelante el Cedente.',
            },
            {
                tipo: 'parrafo',
                texto: 'Don {{cesionario_representante}}, mayor de edad, con documento nacional de identidad {{cesionario_dni}} en nombre y representación de {{cesionario_razon}}, compañía debidamente constituida y válidamente existente conforme a legislación española, provista de NIF número {{cesionario_nif}}, domicilio social en {{cesionario_domicilio}}, teléfono de contacto {{cesionario_telefono}} y correo electrónico {{cesionario_email}} y acreditada por el Ministerio para la Transición Ecológica y el Reto Demográfico como Sujeto Delegado del sistema de Certificados de Ahorro Energético con el código de identificación {{cesionario_codigo_sd}}, actúa en su condición de {{cesionario_cargo}}, en adelante el Cesionario.',
            },
            { tipo: 'seccion', texto: 'EXPONEN' },
            {
                tipo: 'parrafo',
                texto: `Primero. Que el Cedente es propietario de un ahorro de energía de {{ahorro_kwh}} kWh/año como resultado de haber llevado a cabo la actuación de eficiencia energética estandarizada descrita como «${FICHA.codigo}: ${FICHA.nombre}».`,
            },
            {
                tipo: 'parrafo',
                texto: 'Segundo. Que el Cedente conoce que el Cesionario tiene la condición de sujeto obligado o sujeto delegado, según la definición recogida en el art. 2 del Real Decreto 36/2023, de 24 de enero.',
            },
            {
                tipo: 'parrafo',
                texto: 'Tercero. Que el Cedente está interesado en ceder la propiedad y posesión de dicho ahorro de energía al Cesionario, quien, a su vez, lo acepta.',
            },
            { tipo: 'seccion', texto: 'CLÁUSULAS' },
            {
                tipo: 'parrafo',
                texto: 'Segunda. Localización geográfica. La actuación se ha llevado a cabo en la localidad de {{localidad}}, provincia de {{provincia}}, Comunidad Autónoma de {{ccaa}}, siendo la referencia catastral de su ubicación {{ref_catastral}} y sus Coordenadas U.T.M. Huso: {{utm_huso}} X = {{utm_x}} Y = {{utm_y}}.',
            },
            {
                tipo: 'parrafo',
                texto: 'Tercera. Ahorro anual de energía. El ahorro anual de energía efectivo será de {{ahorro_kwh}} kWh/año, siendo el mismo real.',
            },
            {
                tipo: 'parrafo',
                texto: 'Cuarta. Tipo de contraprestación. Se acuerda que la contraprestación ofrecida por el Cesionario al Cedente sea de tipo MONETARIO por una cuantía de {{tarifa}} €/MWh.',
            },
            {
                tipo: 'parrafo',
                texto: `Quinta. Vida útil. Cedente y Cesionario se comprometen a mantener activa la medida generadora de ahorro durante toda su vida útil, estimada en ${FICHA.vidaUtil} años.`,
            },
            {
                tipo: 'firmas',
                partes: [
                    { rol: 'EL CEDENTE', nombre: '{{cliente_nombre}}' },
                    { rol: 'EL CESIONARIO', nombre: '{{cesionario_representante}}' },
                ],
            },
        ],
    },

    /* ---------------------------------------------------------------- */
    {
        id: 'res060',
        nombre: 'Ficha RES060',
        queEs: 'El certificado técnico de la actuación, con el cálculo del ahorro. Es el que sostiene la cifra.',
        firman: 'El responsable de la instalación',
        bloques: [
            {
                tipo: 'titulo',
                texto: 'Certificado de sustitución de caldera de combustión por una bomba de calor de accionamiento eléctrico (Ficha RES060)',
            },
            { tipo: 'seccion', texto: '1 · Datos del proyecto, instalador e instalación' },
            {
                tipo: 'campos',
                filas: [
                    { etiqueta: 'Proyecto', texto: FICHA.nombre },
                    { etiqueta: 'Código del proyecto', texto: FICHA.codigo },
                    { etiqueta: 'Instalador', texto: '{{instalador_razon}}' },
                    { etiqueta: 'NIF / CIF', texto: '{{instalador_nif}}' },
                    { etiqueta: 'Dirección', texto: '{{instalador_direccion}}' },
                    { etiqueta: 'Responsable de la instalación', texto: '{{instalador_responsable}}' },
                    { etiqueta: 'Teléfono', texto: '{{instalador_telefono}}' },
                    { etiqueta: 'Cliente', texto: '{{cliente_nombre}}' },
                    { etiqueta: 'Ubicación de la instalación', texto: '{{direccion_actuacion}}' },
                    { etiqueta: 'Fecha de inicio', texto: '{{fecha_inicio}}' },
                    { etiqueta: 'Fecha de finalización', texto: '{{fecha_fin}}' },
                ],
            },
            { tipo: 'seccion', texto: '2 · Descripción de los equipos' },
            {
                tipo: 'tabla',
                cabeceras: ['', 'Equipo sustituido', 'Equipo instalado'],
                filas: [
                    ['Marca', '{{anterior_marca}}', '{{marca}}'],
                    ['Modelo', 'NO SE CONOCE', '{{modelo}}'],
                    ['Nº de serie', 'NO SE CONOCE', '{{num_serie}}'],
                    ['Potencia calorífica', 'NO SE CONOCE', '{{potencia}} kW'],
                    ['Rendimiento', '{{rendimiento_anterior}}', '{{scop}} (Bdc) y {{scop_acs}} (dhw)'],
                ],
            },
            {
                tipo: 'parrafo',
                texto: 'Las bombas de calor utilizadas cumplen con el SCOP correspondiente determinado según el método [A14/W55] conforme a la norma EN 14825, para una zona climática [{{zona_climatica}}], valor obtenido del CEE.',
            },
            { tipo: 'seccion', texto: '3 · Cálculo del ahorro energético' },
            {
                tipo: 'tabla',
                cabeceras: ['FP', 'DCAL', 'S', 'DACS', 'ηi', 'SCOPbdc', 'SCOPdhw', 'AETOTAL'],
                filas: [
                    [
                        '{{fp}}',
                        '{{dcal}}',
                        '{{superficie}}',
                        '{{dacs}}',
                        '{{rendimiento_anterior}}',
                        '{{scop}}',
                        '{{scop_acs}}',
                        '{{ahorro_kwh}}',
                    ],
                ],
            },
            { tipo: 'seccion', texto: '4 · Justificación técnica' },
            {
                tipo: 'parrafo',
                texto: 'Demanda de ACS calculada para {{num_personas}} personas, a 28 litros por persona y día, con salto térmico entre la temperatura de suministro (60 ºC) y la media de red (14 ºC), conforme al CTE DB-HE.',
            },
            {
                tipo: 'parrafo',
                texto: 'Rendimiento de la caldera sustituida: {{rendimiento_anterior}}, valor por defecto de la ficha RES060 al no poder identificarse el año de fabricación del equipo sustituido.',
            },
            {
                tipo: 'firmas',
                partes: [
                    { rol: 'Responsable de la instalación', nombre: '{{instalador_responsable}}' },
                ],
            },
        ],
    },

    /* ---------------------------------------------------------------- */
    {
        id: 'anexo1',
        nombre: 'Anexo I',
        queEs: 'La declaración responsable del cliente sobre ayudas públicas recibidas para la misma actuación.',
        firman: 'El cliente',
        bloques: [
            {
                tipo: 'titulo',
                texto: 'ANEXO I · Declaración responsable del propietario inicial del ahorro referida a la solicitud y/u obtención de ayudas o subvenciones públicas',
            },
            { tipo: 'seccion', texto: '1 · Identificación de la actuación' },
            {
                tipo: 'campos',
                filas: [
                    { etiqueta: 'Nombre de la actuación', texto: FICHA.nombre },
                    { etiqueta: 'Código y nombre de la ficha', texto: `${FICHA.codigo}: ${FICHA.nombre}` },
                    { etiqueta: 'Comunidad autónoma', texto: '{{ccaa}}' },
                    { etiqueta: 'Dirección postal de la instalación', texto: '{{direccion_actuacion}}' },
                    { etiqueta: 'Referencia catastral', texto: '{{ref_catastral}}' },
                    { etiqueta: 'Nº de serie de los equipos', texto: '{{num_serie}}' },
                ],
            },
            { tipo: 'seccion', texto: '2 · Propietario inicial del ahorro' },
            {
                tipo: 'campos',
                filas: [
                    { etiqueta: 'Nombre y apellidos', texto: '{{cliente_nombre}}' },
                    { etiqueta: 'NIF / NIE', texto: '{{cliente_nif}}' },
                    { etiqueta: 'Domicilio', texto: '{{cliente_domicilio}}' },
                    { etiqueta: 'Teléfono', texto: '{{cliente_telefono}}' },
                    { etiqueta: 'Correo electrónico', texto: '{{cliente_email}}' },
                ],
            },
            {
                tipo: 'nota',
                texto: 'Beneficiario y representante: SIN COMPLETAR (coinciden con el propietario inicial).',
            },
            { tipo: 'seccion', texto: '3 · Bono social' },
            { tipo: 'parrafo', texto: '☑ Ninguno de los anteriores' },
            { tipo: 'seccion', texto: '4 · Declaración' },
            {
                tipo: 'parrafo',
                texto: '☑ NO SE HA SOLICITADO a otros organismos o administraciones una ayuda o subvención para la misma actuación.',
            },
            {
                tipo: 'parrafo',
                texto: 'Y para que así conste, firma la presente en {{lugar_firma}}, a {{fecha_firma}}.',
            },
            {
                tipo: 'firmas',
                partes: [{ rol: 'El propietario inicial del ahorro', nombre: '{{cliente_nombre}}' }],
            },
        ],
    },
]

/* ==================================================================== *
 *  COSA MANCA
 * ==================================================================== */

/** Gli id dei buchi usati da un documento, senza ripetizioni. */
export function huecosDe(p: Plantilla): string[] {
    const encontrados = new Set<string>()
    const buscar = (t: string) => {
        for (const m of t.matchAll(/\{\{(\w+)\}\}/g)) encontrados.add(m[1])
    }

    for (const b of p.bloques) {
        if (b.tipo === 'titulo' || b.tipo === 'seccion' || b.tipo === 'parrafo' || b.tipo === 'nota')
            buscar(b.texto)
        if (b.tipo === 'campos') b.filas.forEach((f) => buscar(f.texto))
        if (b.tipo === 'tabla') b.filas.forEach((f) => f.forEach(buscar))
        if (b.tipo === 'firmas') b.partes.forEach((f) => buscar(f.nombre))
    }
    return [...encontrados]
}

export type Datos = Record<string, string>

/** I buchi obbligatori che restano vuoti. Vuoto = si può emettere. */
export function faltanEn(p: Plantilla, datos: Datos): Hueco[] {
    return huecosDe(p)
        .map((id) => HUECOS[id])
        .filter((h): h is Hueco => Boolean(h))
        .filter((h) => h.requerido && !datos[h.id])
}

export type EstadoDocumento = 'incompleto' | 'listo_revisar' | 'listo_firmar'

/**
 * Lo stato di un documento.
 *
 * Tre gradini, e il salto dal secondo al terzo non è automatico: lo fa
 * una persona. Un documento «listo para revisar» ha tutti i dati; per
 * diventare «listo para firmar» qualcuno deve averlo guardato. È la
 * stessa regola dell'estrazione — la macchina propone, la firma la
 * copre qualcuno.
 */
export function estadoDe(p: Plantilla, datos: Datos, revisado: boolean): EstadoDocumento {
    if (faltanEn(p, datos).length > 0) return 'incompleto'
    return revisado ? 'listo_firmar' : 'listo_revisar'
}

/**
 * I buchi che oggi nessun campo estratto può riempire.
 *
 * È la lista di lavoro per arrivare a generare davvero: o si aggiunge il
 * campo all'estrazione, o si prende il dato da un'altra parte.
 */
export function huecosSinOrigen(): Hueco[] {
    const idsCampos = new Set(CAMPOS.map((c) => c.id))
    return Object.values(HUECOS).filter(
        (h) => h.origen === 'extraido' && h.campo && !idsCampos.has(h.campo)
    )
}

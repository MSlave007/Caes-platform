/**
 * Elenchi documentali, divisi per chi li carica.
 *
 * ⚠️ DA CONFERMARE CON MARCO — questa è la mia lettura di
 * docs/REGULATIONS.md più quello che di norma serve per un espediente CAES.
 * L'elenco dell'installatore è quello solido, perché sta nel documento.
 * Quello del cliente finale è ricostruito: nel modello vecchio caricava tutto
 * l'installatore, ma se il cliente arriva prima (dal calcolatore) alcune cose
 * le ha solo lui. Va rivisto insieme prima di andare in produzione.
 *
 * `required: false` significa che l'espediente si può inviare senza, non che
 * sia inutile: quelli facoltativi migliorano l'estrazione automatica.
 */

export type Role = 'installer' | 'client'

export type DocSpec = {
    id: string
    /** Etichetta, in spagnolo */
    label: string
    /** A cosa serve, detto a chi lo carica */
    why: string
    required: boolean
    /** Tipi accettati */
    accept: string
    /**
     * Conviene scattarla in cantiere. È un consiglio, NON un obbligo:
     * prima qui c'era `capture` sull'input, che sul telefono apriva la
     * fotocamera e toglieva la possibilità di prendere un file già fatto.
     * Una foto scattata mezz'ora prima è valida uguale.
     */
    onSite?: boolean
    /** Se true, l'estrazione automatica legge questo file */
    extracted?: boolean
    /** Più file nello stesso riquadro: le tre foto dell'impianto, gli extra. */
    multiple?: boolean
    /** Quanti file servono perché il riquadro si consideri completo. */
    minFiles?: number
    /** Cosa devono mostrare, una riga per file. */
    checklist?: string[]
}

export const DOCUMENTS: Record<Role, DocSpec[]> = {
    /* ---------------------------------------------------------------- */
    installer: [
        {
            id: 'factura',
            label: 'Factura de la instalación',
            why: 'La factura completa, no solo la del aparato: tiene que verse también la mano de obra. Es el documento que más trabajo ahorra: de aquí salen marca, modelo, código, potencia, el importe que el cliente se deduce y, porque va a su nombre, sus datos — NIF o NIE, teléfono y dirección de la actuación.',
            required: true,
            accept: 'application/pdf,image/*',
            extracted: true,
        },
        {
            // Le tre foto dell'impianto nuovo stanno in un riquadro solo:
            // sono un unico gesto in cantiere, e tre riquadri separati
            // facevano sembrare il modulo il triplo piu lungo.
            id: 'equipo-nuevo',
            label: 'Fotos del equipo instalado',
            why: 'Tres fotos del equipo nuevo. La de la etiqueta es la que más trabajo ahorra: de ahí salen modelo y número de serie.',
            required: true,
            accept: 'image/*',
            onSite: true,
            extracted: true,
            multiple: true,
            minFiles: 3,
            checklist: [
                'La bomba de calor, entera',
                'La etiqueta del fabricante, legible sin ampliar',
                'El depósito de agua',
            ],
        },
        {
            // Obbligatoria e solo la collocazione: serve a dimostrare che
            // c'era un impianto e dove stava. La foto dell'apparecchio
            // vecchio e un di piu, non un requisito.
            id: 'ubicacion-anterior',
            label: 'Foto de dónde estaba el equipo anterior',
            why: 'Que se vea la estancia, no solo el aparato. Es lo que acredita dónde estaba lo que se ha sustituido.',
            required: true,
            accept: 'image/*',
            onSite: true,
        },
        {
            id: 'equipo-anterior',
            label: 'Fotos del equipo sustituido',
            why: 'Mejor tenerlas, pero no bloquean el envío. Si se lee la etiqueta sacamos el rendimiento real; si no, se aplica el valor por defecto y el certificado vale menos.',
            required: false,
            accept: 'image/*',
            onSite: true,
            extracted: true,
            multiple: true,
        },
        {
            id: 'rite',
            label: 'Certificado de la instalación (RITE)',
            why: 'El certificado firmado por el instalador habilitado.',
            required: true,
            accept: 'application/pdf,image/*',
            extracted: true,
        },
        {
            id: 'rite-resguardo',
            label: 'Resguardo del registro del RITE',
            why: 'El justificante de que el RITE ha quedado registrado. Es un documento aparte del certificado.',
            required: true,
            accept: 'application/pdf,image/*',
        },
        {
            // Il certificato energetico e l'unica fonte di superficie e
            // domande: la ficha RES060 lo dice testualmente. Servono
            // entrambi, prima e dopo, perche il risparmio e la differenza.
            id: 'cee-antes',
            label: 'Certificado energético · antes',
            why: 'El anterior a la obra. De aquí salen la superficie y las demandas: son las que deciden cuánto vale el certificado.',
            required: true,
            accept: 'application/pdf,image/*',
            extracted: true,
        },
        {
            id: 'cee-despues',
            label: 'Certificado energético · después',
            why: 'El emitido tras la instalación. La diferencia entre los dos es el ahorro que se certifica.',
            required: true,
            accept: 'application/pdf,image/*',
            extracted: true,
        },
        {
            id: 'ficha',
            label: 'Ficha técnica del equipo',
            why: 'De aquí sale el SCOP, que entra en el cálculo y tiene que superar el mínimo de la zona.',
            required: true,
            accept: 'application/pdf,image/*',
            extracted: true,
        },
        {
            id: 'dni-instalador',
            label: 'DNI del instalador',
            why: 'Del profesional que firma el certificado.',
            required: true,
            accept: 'image/*,application/pdf',
        },
        {
            // Sfogo: tutto quello che non rientra negli slot ma serve.
            id: 'extras',
            label: 'Otras fotos o documentos',
            why: 'Lo que no encaje arriba y creas que hace falta: detalles de la obra, un plano, un albarán. No es obligatorio.',
            required: false,
            accept: 'application/pdf,image/*',
            multiple: true,
        },
    ],

    /* ---------------------------------------------------------------- */
    client: [
        {
            id: 'dni-cliente',
            label: 'Tu DNI o NIE',
            why: 'Por las dos caras. Solo se usa para el expediente: no se comparte con nadie más.',
            required: true,
            accept: 'image/*,application/pdf',
        },
        {
            id: 'factura-energia',
            label: 'Una factura de luz o de gas',
            why: 'La última que tengas. De aquí sacamos tu consumo real, y el ahorro deja de ser una estimación.',
            required: true,
            accept: 'image/*,application/pdf',
            extracted: true,
        },
        {
            id: 'titularidad',
            label: 'Justificante de la vivienda',
            why: 'Escritura, recibo del IBI o contrato de alquiler con permiso del propietario. Sirve para acreditar que puedes autorizar la obra.',
            required: true,
            accept: 'image/*,application/pdf',
        },
        {
            id: 'equipo-actual',
            label: 'Foto de tu caldera o termo',
            why: 'Con el modelo visible si se ve. Nos ahorra una visita para saber qué hay que sustituir.',
            required: false,
            accept: 'image/*',
        },
        {
            id: 'ubicacion',
            label: 'Foto de dónde iría la unidad exterior',
            why: 'Fachada, patio o terraza. Con esto el instalador llega sabiendo lo que se va a encontrar.',
            required: false,
            accept: 'image/*',
        },
    ],
}

export function requiredCount(role: Role) {
    return DOCUMENTS[role].filter((d) => d.required).length
}

/**
 * L'etichetta di uno slot, cercata in tutti e due gli elenchi.
 *
 * Serve al pannello di revisione: un campo può comparire in carte che in
 * quel fascicolo non si chiedono — il NIF del cliente sta sulla fattura
 * dell'installatore e sul DNI che carica il cliente — e per scrivere
 * «también en …» bisogna poter nominare uno slot che non è nella lista
 * corrente.
 */
export function docLabel(id: string): string {
    for (const role of Object.keys(DOCUMENTS) as Role[]) {
        const found = DOCUMENTS[role].find((d) => d.id === id)
        if (found) return found.label
    }
    return id
}

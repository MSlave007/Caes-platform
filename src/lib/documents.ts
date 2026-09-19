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
    /** Se true, la foto va scattata sul posto e non recuperata dall'archivio */
    onSite?: boolean
    /** Se true, l'estrazione automatica legge questo file */
    extracted?: boolean
}

export const DOCUMENTS: Record<Role, DocSpec[]> = {
    /* ---------------------------------------------------------------- */
    installer: [
        {
            id: 'factura',
            label: 'Factura del equipo nuevo',
            why: 'De aquí salen marca, modelo, potencia y número de serie. Es el documento que más trabajo te ahorra.',
            required: true,
            accept: 'image/*,application/pdf',
            extracted: true,
        },
        {
            id: 'serie',
            label: 'Foto del número de serie',
            why: 'Tiene que leerse sin ampliar. Es lo primero que mira una auditoría.',
            required: true,
            accept: 'image/*',
            onSite: true,
            extracted: true,
        },
        {
            id: 'placa',
            label: 'Foto de la placa del modelo',
            why: 'La etiqueta del fabricante, con las características técnicas visibles.',
            required: true,
            accept: 'image/*',
            onSite: true,
            extracted: true,
        },
        {
            id: 'antiguo',
            label: 'Foto del equipo sustituido',
            why: 'Antes de retirarlo. Justifica la línea base sobre la que se calcula el ahorro.',
            required: true,
            accept: 'image/*',
            onSite: true,
        },
        {
            id: 'rite',
            label: 'Certificado de la instalación (RITE)',
            why: 'El certificado de la instalación térmica, firmado por el instalador habilitado.',
            required: true,
            accept: 'application/pdf,image/*',
        },
        {
            // Il certificato energetico e il documento piu importante del
            // fascicolo: la ficha RES060 dice testualmente che superficie,
            // domanda di riscaldamento e domanda di ACS si prendono da qui,
            // «antes de la actuacion». Sono i tre ingressi della formula.
            id: 'cee',
            label: 'Certificado de eficiencia energética',
            why: 'El anterior a la instalación. De aquí salen la superficie y las demandas: son las que deciden cuánto vale el certificado.',
            required: true,
            accept: 'application/pdf,image/*',
            extracted: true,
        },
        {
            // Da qui esce lo SCOP, che e nella formula e deve superare un
            // minimo per zona climatica. Era marcata opzionale per errore.
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

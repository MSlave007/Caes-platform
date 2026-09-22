import {
    PDFDocument,
    PDFFont,
    PDFPage,
    StandardFonts,
    degrees,
    rgb,
    type RGB,
} from 'pdf-lib'
import { PLANTILLAS, faltanEn, HUECOS, type Bloque, type Datos, type Plantilla } from './plantillas'

/**
 * I documenti, in carta.
 *
 * ── PERCHÉ NON C'ERA E ADESSO C'È ─────────────────────────────────────
 *
 * C'era una rotta che diceva di generarli. Faceva un PDF in inglese con
 * scritto «Energy Savings Contract» e tre righe di condizioni inventate:
 * non era il Convenio, non era la ficha, non era l'Anexo. Ed era rotta
 * comunque — `pdfkit` cerca i suoi font su disco, il bundler gli
 * riscrive il percorso, e ogni chiamata moriva con
 *
 *     ENOENT: open 'C:\ROOT\node_modules\pdfkit\js\data\Helvetica.afm'
 *
 * Cioè: nessuno l'aveva mai provata. Qui si usa `pdf-lib`, che i font se
 * li porta dentro e non tocca il disco.
 *
 * ── DA DOVE VIENE IL TESTO ────────────────────────────────────────────
 *
 * Da `plantillas.ts`, che è il calco degli esemplari veri. Qui non c'è
 * una parola di contenuto: c'è solo come si dispone sulla pagina. Se il
 * testo legale cambia, cambia lì e i tre documenti cambiano insieme —
 * che è tutto il punto di generarli invece di compilarli a mano.
 *
 * ── LA REGOLA CHE NON SI PUÒ AGGIRARE ─────────────────────────────────
 *
 * Se manca anche un solo dato obbligatorio, il PDF esce con «BORRADOR»
 * attraverso ogni pagina. Non è un'opzione del chiamante: la decide
 * questo file guardando i dati. Un'anteprima incompleta che si può
 * scambiare per il documento buono è il modo in cui si fa firmare a un
 * cliente un foglio con dentro «[ falta: NIF del sujeto delegado ]».
 */

/* ==================================================================== *
 *  LA PAGINA
 * ==================================================================== */

/** A4 in punti. Non pollici: in Spagna si stampa e si archivia in A4. */
const A4: [number, number] = [595.28, 841.89]
const MARGEN = { arriba: 66, abajo: 74, lado: 62 }
const ANCHO = A4[0] - MARGEN.lado * 2

const TINTA = rgb(0.09, 0.11, 0.1)
const GRIS = rgb(0.42, 0.45, 0.43)
const LINEA = rgb(0.81, 0.83, 0.81)
const BANDA = rgb(0.957, 0.961, 0.949)
const AVISO = rgb(0.55, 0.36, 0.06)

/**
 * Due famiglie, e ognuna ha un mestiere.
 *
 * Times per il testo del contratto, perché è quello che finisce in un
 * fascicolo amministrativo e deve somigliare agli altri fogli che ci
 * stanno dentro. Helvetica per l'apparato — etichette, testatine, numeri
 * di pagina — che non è il documento ma serve a girarci dentro. Tenerle
 * separate fa capire a colpo d'occhio cosa è contratto e cosa è nostro.
 */
type Fuentes = {
    texto: PDFFont
    negrita: PDFFont
    cursiva: PDFFont
    seca: PDFFont
    secaNegrita: PDFFont
}

type Lienzo = {
    doc: PDFDocument
    pagina: PDFPage
    /** Quanto si è scesi: si misura dall'alto, che è come si legge. */
    y: number
    f: Fuentes
    /** Deciso prima di aprire la prima pagina: vedi `sello()`. */
    borrador: boolean
}

function nuevaPagina(l: Lienzo) {
    l.pagina = l.doc.addPage(A4)
    l.y = MARGEN.arriba
    if (l.borrador) sello(l.pagina, l.f)
}

/**
 * Il timbro, di traverso e SOTTO al testo.
 *
 * Sotto, non sopra: in un PDF si disegna in ordine, e messo alla fine
 * copriva le righe che attraversava. Un documento incompleto diventava
 * un documento illeggibile — cioè il timbro nascondeva proprio le
 * clausole che qualcuno doveva rileggere prima di firmare.
 *
 * Per stare sotto va disegnato appena nasce la pagina, e per questo
 * `borrador` si decide prima di aprirne una: `componer()` guarda i dati
 * e solo dopo comincia.
 *
 * Chiaro abbastanza da leggerci sopra, scuro abbastanza da vedersi in
 * una fotocopia in bianco e nero — che è dove finisce per essere
 * guardato.
 */
function sello(pagina: PDFPage, f: Fuentes) {
    pagina.drawText('BORRADOR', {
        x: 96,
        y: 210,
        size: 86,
        font: f.secaNegrita,
        color: rgb(0.88, 0.89, 0.87),
        rotate: degrees(52),
    })
}

/** Quanto spazio resta prima del piede. */
function libre(l: Lienzo): number {
    return A4[1] - MARGEN.abajo - l.y
}

/** Chiede posto per un blocco alto `alto`; se non c'è, gira pagina. */
function sitio(l: Lienzo, alto: number) {
    if (alto > libre(l)) nuevaPagina(l)
}

/** La y di pdf-lib parte dal basso; qui si ragiona dall'alto. */
function desde(l: Lienzo, bajada = 0): number {
    return A4[1] - l.y - bajada
}

/* ==================================================================== *
 *  IL TESTO
 * ==================================================================== */

/**
 * Caratteri che la codifica del PDF non sa scrivere.
 *
 * `pdf-lib` con i font standard scrive in WinAnsi, che copre lo spagnolo
 * intero e quasi tutta la punteggiatura tipografica. Quasi. Su un
 * carattere che non conosce NON scrive niente di storto: alza un'
 * eccezione, e il documento non esce. Che è meglio di un quadratino, ma
 * solo se qualcuno ha deciso prima cosa metterci.
 */
const SUSTITUCIONES: Record<string, string> = {
    '\u2010': '-',
    '\u2011': '-',
    '\u2012': '-',
    '\u2610': '[ ]',
    '\u2611': '[X]',
    '\u2612': '[X]',
    // Il rendimento della caldaia si scrive con una eta greca, che
    // in WinAnsi non c'è. Usciva «?i» dentro l'intestazione di una
    // colonna della ficha — cioè una tabella ufficiale con dentro
    // un punto interrogativo.
    '\u03b7': 'eta',
    '\u2192': '->',
    '\u21d2': '=>',
    '\u2264': '<=',
    '\u2265': '>=',
    '\u2260': '!=',
    '\u2713': 'Si',
    '\u2717': 'No',
    '\u00a0': ' ',
    '\u202f': ' ',
    '\u2009': ' ',
    '\u200b': '',
}

/**
 * Notazioni che vanno tradotte intere, non lettera per lettera.
 *
 * `etai` da solo non si capisce; `eta_i` si legge come eta con pedice i,
 * che e quello che dice la ficha ufficiale.
 */
const NOTACIONES: [RegExp, string][] = [[/\u03b7i/g, 'eta_i']]

function limpiar(crudo: string): string {
    const texto = NOTACIONES.reduce((t, [de, a]) => t.replace(de, a), crudo)
    let salida = ''
    for (const c of texto) {
        if (c in SUSTITUCIONES) {
            salida += SUSTITUCIONES[c]
            continue
        }
        // Oltre la latina-1 si sa scrivere solo la punteggiatura qui
        // sotto. Il resto diventa un punto interrogativo visibile, che
        // e meglio di un documento che non esce.
        const n = c.codePointAt(0) ?? 0
        salida += n > 0xff && !ESCRIBIBLES.has(c) ? '?' : c
    }
    return salida
}

/** Punteggiatura sopra la latina-1 che WinAnsi sa comunque scrivere. */
const ESCRIBIBLES = new Set([
    '\u20ac', '\u201a', '\u0192', '\u201e', '\u2026', '\u2020', '\u2021',
    '\u02c6', '\u2030', '\u0160', '\u2039', '\u0152', '\u017d', '\u2018',
    '\u2019', '\u201c', '\u201d', '\u2022', '\u2013', '\u2014', '\u02dc',
    '\u2122', '\u0161', '\u203a', '\u0153', '\u017e', '\u0178',
])

/**
 * Maiuscolo, ma dopo aver ripulito.
 *
 * Nell'ordine sbagliato «ηi» diventa «ΗΙ» — due lettere greche
 * maiuscole, che nessuna sostituzione riconosce piu — e usciva «?I»
 * dentro l'intestazione di una tabella ufficiale.
 */
function alta(texto: string): string {
    return limpiar(limpiar(texto).toUpperCase())
}

function ancho(f: PDFFont, texto: string, tam: number): number {
    return f.widthOfTextAtSize(texto, tam)
}

/** Le righe, ognuna come elenco di parole: servono separate per giustificare. */
function partir(texto: string, f: PDFFont, tam: number, max: number): string[][] {
    const lineas: string[][] = []
    let actual: string[] = []
    let largo = 0
    const espacio = ancho(f, ' ', tam)

    for (const palabra of texto.split(/\s+/).filter(Boolean)) {
        const w = ancho(f, palabra, tam)
        if (actual.length > 0 && largo + espacio + w > max) {
            lineas.push(actual)
            actual = [palabra]
            largo = w
            continue
        }
        largo += (actual.length > 0 ? espacio : 0) + w
        actual.push(palabra)
    }
    if (actual.length > 0) lineas.push(actual)
    return lineas.length > 0 ? lineas : [[]]
}

type Estilo = {
    fuente: PDFFont
    tam: number
    interlinea: number
    color?: RGB
    /** `justificado` allarga gli spazi fino al margine: è come si stampa un contratto. */
    alinea?: 'izquierda' | 'centro' | 'derecha' | 'justificado'
}

/**
 * Una riga, parola per parola quando va giustificata.
 *
 * Giustificare vuol dire distribuire lo spazio che avanza FRA le parole,
 * non dentro di esse, quindi ogni parola va posata alla sua x. È l'unico
 * punto in cui vale la pena di non usare `drawText` una volta sola.
 */
function escribirLinea(
    p: PDFPage,
    palabras: string[],
    x: number,
    y: number,
    e: Estilo,
    max: number,
    ultima: boolean
) {
    const color = e.color ?? TINTA
    const texto = palabras.join(' ')
    if (palabras.length === 0) return

    if (e.alinea === 'justificado' && !ultima && palabras.length > 1) {
        const sinEspacios = palabras.reduce((a, w) => a + ancho(e.fuente, w, e.tam), 0)
        const hueco = (max - sinEspacios) / (palabras.length - 1)
        let cursor = x
        for (const w of palabras) {
            p.drawText(w, { x: cursor, y, size: e.tam, font: e.fuente, color })
            cursor += ancho(e.fuente, w, e.tam) + hueco
        }
        return
    }

    const w = ancho(e.fuente, texto, e.tam)
    const izq =
        e.alinea === 'centro'
            ? x + (max - w) / 2
            : e.alinea === 'derecha'
              ? x + max - w
              : x
    p.drawText(texto, { x: izq, y, size: e.tam, font: e.fuente, color })
}

/**
 * Un blocco di testo, che gira pagina da solo se non ci sta.
 *
 * Riga per riga e non blocco per blocco: una clausola di quindici righe
 * a cavallo del margine deve spezzarsi, non saltare in blocco alla
 * pagina dopo lasciando mezzo foglio bianco.
 */
function escribir(l: Lienzo, texto: string, e: Estilo, max = ANCHO, x = MARGEN.lado): number {
    const lineas = partir(limpiar(texto), e.fuente, e.tam, max)
    let escritas = 0

    lineas.forEach((palabras, i) => {
        sitio(l, e.interlinea)
        escribirLinea(
            l.pagina,
            palabras,
            x,
            desde(l, e.tam),
            e,
            max,
            i === lineas.length - 1
        )
        l.y += e.interlinea
        escritas++
    })

    return escritas
}

/** Quanto sarebbe alto, senza scriverlo: serve a decidere se gira pagina. */
function alto(texto: string, e: Estilo, max = ANCHO): number {
    return partir(limpiar(texto), e.fuente, e.tam, max).length * e.interlinea
}

function regla(l: Lienzo, color = LINEA, grosor = 0.6, sangria = 0) {
    l.pagina.drawLine({
        start: { x: MARGEN.lado + sangria, y: desde(l) },
        end: { x: A4[0] - MARGEN.lado, y: desde(l) },
        thickness: grosor,
        color,
    })
}

/* ==================================================================== *
 *  I BUCHI
 * ==================================================================== */

/**
 * `{{hueco}}` diventa il valore, o dice a voce alta che non c'è.
 *
 * Non si lascia vuoto. Uno spazio bianco in mezzo a una clausola si
 * legge come una spaziatura larga, e un documento a cui manca il NIF del
 * cesionario sembra un documento completo. Scritto per esteso, invece,
 * non si riesce a non vederlo — e con il timbro BORRADOR addosso non si
 * riesce nemmeno a stamparlo per sbaglio.
 */
function rellenar(texto: string, datos: Datos): string {
    return texto.replace(/\{\{(\w+)\}\}/g, (_, id: string) => {
        const v = datos[id]
        if (v && String(v).trim()) return String(v).trim()
        const h = HUECOS[id]
        return `[ falta: ${h?.label ?? id} ]`
    })
}

/* ==================================================================== *
 *  I BLOCCHI
 * ==================================================================== */

function titulo(l: Lienzo, texto: string) {
    const e: Estilo = {
        fuente: l.f.negrita,
        tam: 13,
        interlinea: 17,
        alinea: 'centro',
    }
    sitio(l, alto(texto, e) + 22)
    escribir(l, alta(texto), e)
    l.y += 9
    regla(l, TINTA, 1)
    l.y += 16
}

function seccion(l: Lienzo, texto: string) {
    const e: Estilo = { fuente: l.f.negrita, tam: 10.5, interlinea: 14, alinea: 'centro' }
    // Una sezione sola in fondo alla pagina, col suo primo paragrafo di
    // là, è il difetto tipografico che si nota di più: chiede almeno
    // quattro righe di seguito o gira.
    sitio(l, 18 + alto(texto, e) + 58)
    l.y += 18
    escribir(l, alta(texto), e)
    l.y += 12
}

function parrafo(l: Lienzo, texto: string) {
    escribir(l, texto, {
        fuente: l.f.texto,
        tam: 10,
        interlinea: 14.6,
        alinea: 'justificado',
    })
    l.y += 9
}

const ETIQUETA = 132

function campos(l: Lienzo, filas: { etiqueta: string; texto: string }[]) {
    const eVal: Estilo = { fuente: l.f.texto, tam: 10, interlinea: 13.6 }
    /**
     * L'etichetta va a capo dentro la sua colonna.
     *
     * Su una riga sola, «RESPONSABLE DE LA INSTALACIÓN» sconfinava
     * dentro al valore e le due colonne si toccavano: sembrava una sola
     * frase composta male. E le etichette lunghe sono proprio quelle che
     * si leggono per capire cosa c'è scritto accanto.
     */
    const eEtq: Estilo = {
        fuente: l.f.secaNegrita,
        tam: 7.5,
        interlinea: 9.6,
        color: GRIS,
    }
    const anchoVal = ANCHO - ETIQUETA
    const anchoEtq = ETIQUETA - 14

    for (const fila of filas) {
        const etiqueta = alta(fila.etiqueta)
        const h =
            Math.max(
                alto(fila.texto, eVal, anchoVal),
                alto(etiqueta, eEtq, anchoEtq),
                13.6
            ) + 9
        sitio(l, h)

        const arriba = l.y

        // L'etichetta si allinea alla PRIMA riga del valore, non al
        // centro della riga: è in orizzontale che si legge la coppia.
        l.y = arriba + 2.2
        escribir(l, etiqueta, eEtq, anchoEtq, MARGEN.lado)

        l.y = arriba
        escribir(l, fila.texto, eVal, anchoVal, MARGEN.lado + ETIQUETA)

        l.y = arriba + h
        regla(l)
    }
    l.y += 12
}

function tabla(l: Lienzo, cabeceras: string[], filas: string[][]) {
    const columnas = cabeceras.length
    const anchoCol = ANCHO / columnas
    const eCelda: Estilo = { fuente: l.f.texto, tam: 9, interlinea: 12.4 }

    const cabecera = () => {
        sitio(l, 20)
        l.pagina.drawRectangle({
            x: MARGEN.lado,
            y: desde(l, 19),
            width: ANCHO,
            height: 19,
            color: BANDA,
        })
        // Senza maiuscolizzare: «SCOPbdc» e «SCOPdhw» sono la notazione
        // della ficha ufficiale, e «SCOPBDC» e un'altra cosa.
        cabeceras.forEach((c, i) => {
            l.pagina.drawText(limpiar(c), {
                x: MARGEN.lado + i * anchoCol + 7,
                y: desde(l, 13),
                size: 7.5,
                font: l.f.secaNegrita,
                color: GRIS,
            })
        })
        l.y += 19
        regla(l)
    }

    cabecera()

    for (const fila of filas) {
        const h =
            Math.max(
                ...fila.map((c) => alto(c, eCelda, anchoCol - 14)),
                12.4
            ) + 9
        // Una riga spezzata a metà fra due pagine non si legge: gira
        // tutta, e la testata si ristampa perché senza non si sa più
        // cosa sono le colonne.
        if (h > libre(l)) {
            nuevaPagina(l)
            cabecera()
        }

        const arriba = l.y
        fila.forEach((c, i) => {
            l.y = arriba + 5
            escribir(l, c, eCelda, anchoCol - 14, MARGEN.lado + i * anchoCol + 7)
        })
        l.y = arriba + h
        regla(l)
    }
    l.y += 12
}

/** Una firma già raccolta: il tratto, chi l'ha messo e quando. */
export type FirmaGrafica = {
    /** PNG del tratto, in base64 senza intestazione. */
    png?: string
    nombre: string
    fecha: string
    /** La riga di prova: chi, quando, da dove. */
    prueba?: string
}

async function firmas(
    l: Lienzo,
    partes: { rol: string; nombre: string }[],
    puestas: Record<string, FirmaGrafica>
) {
    const ALTO = 108
    const columnas = Math.min(partes.length, 2)
    const anchoCol = (ANCHO - 26 * (columnas - 1)) / columnas

    for (let i = 0; i < partes.length; i += columnas) {
        const grupo = partes.slice(i, i + columnas)
        sitio(l, ALTO + 20)
        l.y += 14
        const arriba = l.y

        for (const [j, parte] of grupo.entries()) {
            const x = MARGEN.lado + j * (anchoCol + 26)
            l.y = arriba

            l.pagina.drawText(alta(parte.rol), {
                x,
                y: desde(l, 8),
                size: 7.5,
                font: l.f.secaNegrita,
                color: GRIS,
            })
            l.y += 16

            const firma = puestas[parte.rol]

            // Il tratto, se c'è. Dentro il riquadro e senza deformarlo:
            // una firma stirata è una firma che non somiglia più a
            // quella di nessuno.
            if (firma?.png) {
                try {
                    const img = await l.doc.embedPng(
                        Uint8Array.from(Buffer.from(firma.png, 'base64'))
                    )
                    const escala = Math.min(
                        (anchoCol - 16) / img.width,
                        46 / img.height
                    )
                    l.pagina.drawImage(img, {
                        x,
                        y: desde(l, 52),
                        width: img.width * escala,
                        height: img.height * escala,
                    })
                } catch {
                    /* senza il tratto resta la riga da firmare a mano */
                }
            }

            l.y += 54
            l.pagina.drawLine({
                start: { x, y: desde(l) },
                end: { x: x + anchoCol, y: desde(l) },
                thickness: 0.8,
                color: LINEA,
            })
            l.y += 11

            const nombre = firma?.nombre ?? parte.nombre
            escribir(
                l,
                nombre,
                { fuente: l.f.texto, tam: 9.5, interlinea: 12 },
                anchoCol,
                x
            )

            if (firma?.fecha) {
                escribir(
                    l,
                    `Firmado el ${firma.fecha}`,
                    { fuente: l.f.seca, tam: 7.5, interlinea: 10, color: GRIS },
                    anchoCol,
                    x
                )
            }
            if (firma?.prueba) {
                escribir(
                    l,
                    firma.prueba,
                    { fuente: l.f.seca, tam: 6.5, interlinea: 8.4, color: GRIS },
                    anchoCol,
                    x
                )
            }
        }

        l.y = Math.max(l.y, arriba + ALTO)
    }
    l.y += 10
}

function nota(l: Lienzo, texto: string) {
    const e: Estilo = { fuente: l.f.cursiva, tam: 8.8, interlinea: 12, color: GRIS }
    const h = alto(texto, e, ANCHO - 22) + 18
    sitio(l, h + 10)
    l.y += 6

    const arriba = l.y
    l.pagina.drawRectangle({
        x: MARGEN.lado,
        y: desde(l, h),
        width: 2.5,
        height: h,
        color: LINEA,
    })

    l.y += 9
    escribir(l, texto, e, ANCHO - 22, MARGEN.lado + 14)
    l.y = arriba + h + 8
}

/* ==================================================================== *
 *  IL DOCUMENTO
 * ==================================================================== */

export type Opciones = {
    /** Il numero del fascicolo, in testa a ogni pagina. */
    expediente?: string
    /** Firme già raccolte, per ruolo. */
    firmas?: Record<string, FirmaGrafica>
    /**
     * Forza il timbro anche con i dati completi.
     *
     * Il contrario non si può: con un dato obbligatorio mancante il
     * timbro c'è comunque. Vedi in testa al file.
     */
    borrador?: boolean
}

export type Compuesto = {
    bytes: Uint8Array
    /** Vero se il PDF porta il timbro: il chiamante deve poterlo dire. */
    borrador: boolean
    /** Cosa mancava, quando mancava qualcosa. */
    faltan: string[]
    nombreArchivo: string
}

export async function componer(
    p: Plantilla,
    datos: Datos,
    o: Opciones = {}
): Promise<Compuesto> {
    const faltan = faltanEn(p, datos).map((h) => h.label)
    const borrador = faltan.length > 0 || Boolean(o.borrador)

    const doc = await PDFDocument.create()
    const f: Fuentes = {
        texto: await doc.embedFont(StandardFonts.TimesRoman),
        negrita: await doc.embedFont(StandardFonts.TimesRomanBold),
        cursiva: await doc.embedFont(StandardFonts.TimesRomanItalic),
        seca: await doc.embedFont(StandardFonts.Helvetica),
        secaNegrita: await doc.embedFont(StandardFonts.HelveticaBold),
    }

    doc.setTitle(`${p.nombre}${o.expediente ? ` · expediente ${o.expediente}` : ''}`)
    doc.setSubject(p.queEs)
    doc.setProducer('CAES')
    doc.setCreator('CAES')
    doc.setCreationDate(new Date())

    const l: Lienzo = {
        doc,
        pagina: doc.addPage(A4),
        y: MARGEN.arriba,
        f,
        borrador,
    }
    if (borrador) sello(l.pagina, f)

    for (const b of p.bloques) {
        await pintar(l, b, datos, o.firmas ?? {})
    }

    adornar(l, p, o.expediente, borrador)

    return {
        bytes: await doc.save(),
        borrador,
        faltan,
        nombreArchivo: nombreArchivo(p, o.expediente, borrador),
    }
}

async function pintar(
    l: Lienzo,
    b: Bloque,
    datos: Datos,
    puestas: Record<string, FirmaGrafica>
) {
    switch (b.tipo) {
        case 'titulo':
            return titulo(l, rellenar(b.texto, datos))
        case 'seccion':
            return seccion(l, rellenar(b.texto, datos))
        case 'parrafo':
            return parrafo(l, rellenar(b.texto, datos))
        case 'campos':
            return campos(
                l,
                b.filas.map((x) => ({
                    etiqueta: x.etiqueta,
                    texto: rellenar(x.texto, datos),
                }))
            )
        case 'tabla':
            return tabla(
                l,
                b.cabeceras,
                b.filas.map((fila) => fila.map((c) => rellenar(c, datos)))
            )
        case 'firmas':
            return firmas(
                l,
                b.partes.map((x) => ({
                    rol: x.rol,
                    nombre: rellenar(x.nombre, datos),
                })),
                puestas
            )
        case 'nota':
            return nota(l, rellenar(b.texto, datos))
    }
}

/**
 * Testatine, piedi e timbro: un secondo giro su tutte le pagine.
 *
 * Il «di quante» del numero di pagina si sa solo alla fine, ed è la
 * ragione per cui questo non si può fare mentre si scrive. Tanto vale
 * mettere qui tutto quello che sta sul bordo.
 */
function adornar(l: Lienzo, p: Plantilla, expediente: string | undefined, borrador: boolean) {
    const paginas = l.doc.getPages()
    const cabecera = limpiar(
        expediente ? `${p.nombre} · Expediente ${expediente}` : p.nombre
    )

    paginas.forEach((pagina, i) => {
        // La testata dalla seconda in poi: sulla prima c'è già il
        // titolo, e ripeterlo due centimetri sopra è rumore.
        if (i > 0) {
            pagina.drawText(cabecera, {
                x: MARGEN.lado,
                y: A4[1] - 40,
                size: 7.5,
                font: l.f.seca,
                color: GRIS,
            })
            pagina.drawLine({
                start: { x: MARGEN.lado, y: A4[1] - 50 },
                end: { x: A4[0] - MARGEN.lado, y: A4[1] - 50 },
                thickness: 0.5,
                color: LINEA,
            })
        }

        const pie = limpiar(`Página ${i + 1} de ${paginas.length}`)
        pagina.drawText(pie, {
            x: (A4[0] - ancho(l.f.seca, pie, 7.5)) / 2,
            y: 42,
            size: 7.5,
            font: l.f.seca,
            color: GRIS,
        })

        if (borrador) {
            // Il timbro sta già sotto al testo da quando la pagina è
            // nata. Qui resta la riga al piede, che va sopra perché al
            // piede non c'è niente da coprire.
            pagina.drawText(limpiar('Documento incompleto · sin validez'), {
                x: MARGEN.lado,
                y: 56,
                size: 7.5,
                font: l.f.secaNegrita,
                color: AVISO,
            })
        }
    })
}

function nombreArchivo(p: Plantilla, expediente: string | undefined, borrador: boolean): string {
    const partes = [p.id, expediente ?? '', borrador ? 'borrador' : '']
    return `${partes.filter(Boolean).join('-')}.pdf`
}

/** La plantilla per id, o niente: il chiamante arriva da un URL. */
export function plantillaPorId(id: string): Plantilla | undefined {
    return PLANTILLAS.find((p) => p.id === id)
}

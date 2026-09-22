/**
 * Il riquadro dove sta una firma, in punti PDF.
 *
 * ── PERCHÉ È UN FILE A PARTE ──────────────────────────────────────────
 *
 * Perché lo devono usare in due, e uno dei due è il browser: chi compone
 * il PDF e chi fa trascinare la firma sul foglio a schermo. Se i due
 * numeri stanno in due posti, prima o poi divergono — e divergere qui
 * vuol dire che la firma si piazza dove si vede e si stampa altrove.
 *
 * Sta fuori da `pdf.ts` perché quello importa `pdf-lib` e `Buffer`: roba
 * da server, che in un componente si tirerebbe dietro mezzo megabyte di
 * libreria per leggere quattro costanti.
 *
 * ── IL RIQUADRO ───────────────────────────────────────────────────────
 *
 *   ┌─ colonna ──────────────────────┐  ← larga `anchoColumna(partes)`
 *   │  EL CEDENTE                    │
 *   │                                │
 *   │      ╭─╮  ╭╮                   │  ← qui dentro si muove il tratto
 *   │    ╭─╯ ╰──╯╰──╮                │     alto al massimo ALTO_TRAZO
 *   │  ──────────────────────────    │  ← la riga: ALTO_CAJA dall'alto
 *   │  Ana Belén Ruiz Moreno         │
 *   └────────────────────────────────┘
 */

/** Larghezza utile della pagina: A4 meno i due margini laterali. */
export const ANCHO_PAGINA = 471.28

/** Aria fra due colonne di firma. */
export const HUECO = 26

/** Dal bordo alto del riquadro alla riga su cui si firma. */
export const ALTO_CAJA = 82

/**
 * Quanto può essere alto il tratto.
 *
 * Meno del riquadro: sopra ci sta l'etichetta del ruolo, e una firma che
 * ci arriva sopra è una firma tagliata.
 */
export const ALTO_TRAZO = 74

/** Aria dentro la colonna, perché il tratto non tocchi i bordi. */
export const AIRE = 8

export function anchoColumna(partes: number): number {
    const columnas = Math.max(1, Math.min(partes, 2))
    return (ANCHO_PAGINA - HUECO * (columnas - 1)) / columnas
}

/**
 * Quanto viene grande il tratto se nessuno ci mette mano.
 *
 * Mai oltre il vero (`, 1`): un tratto tirato su sgrana, e un tratto
 * sgranato sembra un tratto rifatto.
 */
export function escalaNatural(ancho: number, alto: number, anchoCol: number): number {
    if (!ancho || !alto) return 1
    return Math.min((anchoCol - 16) / ancho, 46 / alto, 1)
}

/**
 * Dove finisce davvero il tratto, tenuto dentro il riquadro.
 *
 * Gli aggiustamenti arrivano da un dito che trascina: possono uscire, e
 * un tratto che esce finisce nella colonna dell'altra parte o sopra una
 * clausola. Si stringe invece di rifiutare — chi sta trascinando una
 * firma non vuole un messaggio d'errore, vuole che si fermi al bordo.
 *
 * Le stesse quattro righe girano sul server e nel browser: è tutto il
 * motivo per cui questo file esiste.
 */
export function colocar(
    img: { ancho: number; alto: number },
    anchoCol: number,
    ajuste: { escala: number; dx: number; dy: number }
): { x: number; y: number; ancho: number; alto: number } {
    const natural = escalaNatural(img.ancho, img.alto, anchoCol)
    const tope = Math.min((anchoCol - AIRE) / img.ancho, ALTO_TRAZO / img.alto)
    const escala = Math.min(natural * (ajuste.escala || 1), tope)

    const ancho = img.ancho * escala
    const alto = img.alto * escala

    // `y` è il bordo ALTO del tratto, contato dall'alto del riquadro.
    const x = Math.min(Math.max(ajuste.dx, 0), Math.max(0, anchoCol - ancho))
    const abajo = ALTO_CAJA - 2 + ajuste.dy
    const y = Math.min(Math.max(abajo - alto, 0), Math.max(0, ALTO_CAJA - alto))

    return { x, y, ancho, alto }
}

/** L'inverso: da dove sta sullo schermo ai tre numeri che si salvano. */
export function desdeCaja(
    img: { ancho: number; alto: number },
    anchoCol: number,
    caja: { x: number; y: number; ancho: number }
): { escala: number; dx: number; dy: number } {
    const natural = escalaNatural(img.ancho, img.alto, anchoCol)
    const escala = natural > 0 ? caja.ancho / img.ancho / natural : 1
    const alto = (img.alto * caja.ancho) / img.ancho
    return {
        escala: Math.round(escala * 1000) / 1000,
        dx: Math.round(caja.x * 10) / 10,
        dy: Math.round((caja.y + alto - (ALTO_CAJA - 2)) * 10) / 10,
    }
}

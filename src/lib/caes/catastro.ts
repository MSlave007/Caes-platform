/**
 * I sette buchi che oggi si riempiono a mano andando sul portale.
 *
 * `localidad`, `provincia`, `ccaa`, `ref_catastral`, `utm_huso`, `utm_x`,
 * `utm_y`. Non stanno su nessuna carta del fascicolo, e vanno cercati
 * uno per uno in un'altra finestra, per ogni espediente.
 *
 * ── SI DIVIDONO IN DUE, E VANNO TRATTATI DIVERSAMENTE ─────────────────
 *
 * **Due escono dal codice postale e basta.** Le prime due cifre di un CP
 * spagnolo sono la provincia, e la provincia dà la comunità autonoma.
 * È una tabella di 52 righe, non chiede rete, non fallisce e non costa
 * niente. Sono i due più facili e nessuno li stava automatizzando.
 *
 * **Quattro vogliono il Catastro.** Referencia catastral e coordinate
 * non si deducono: si consultano. Vedi `/api/catastro`.
 *
 * ── E `localidad`? ────────────────────────────────────────────────────
 *
 * Dal CP non si ricava: un codice postale copre più paesi e un paese può
 * averne parecchi. Ci vorrebbe una tabella di undicimila comuni che
 * cambia da sola ogni anno. Ma il Catastro la restituisce insieme alle
 * coordinate, quindi arriva gratis con quella consulta — ed è la
 * ragione per cui conviene partire dalla referencia catastral invece
 * che dall'indirizzo.
 */

/* ------------------------------------------------- codice postale */

/**
 * Le 52 province spagnole, per le prime due cifre del CP, con la loro
 * comunità autonoma.
 *
 * Scritta a mano e non presa da un pacchetto: cambia una volta ogni
 * trent'anni, e una dipendenza per cinquantadue righe che non si
 * muovono è una dipendenza in più da aggiornare.
 */
const PROVINCIAS: Record<string, [provincia: string, ccaa: string]> = {
    '01': ['Álava', 'País Vasco'],
    '02': ['Albacete', 'Castilla-La Mancha'],
    '03': ['Alicante', 'Comunidad Valenciana'],
    '04': ['Almería', 'Andalucía'],
    '05': ['Ávila', 'Castilla y León'],
    '06': ['Badajoz', 'Extremadura'],
    '07': ['Baleares', 'Illes Balears'],
    '08': ['Barcelona', 'Cataluña'],
    '09': ['Burgos', 'Castilla y León'],
    '10': ['Cáceres', 'Extremadura'],
    '11': ['Cádiz', 'Andalucía'],
    '12': ['Castellón', 'Comunidad Valenciana'],
    '13': ['Ciudad Real', 'Castilla-La Mancha'],
    '14': ['Córdoba', 'Andalucía'],
    '15': ['A Coruña', 'Galicia'],
    '16': ['Cuenca', 'Castilla-La Mancha'],
    '17': ['Girona', 'Cataluña'],
    '18': ['Granada', 'Andalucía'],
    '19': ['Guadalajara', 'Castilla-La Mancha'],
    '20': ['Gipuzkoa', 'País Vasco'],
    '21': ['Huelva', 'Andalucía'],
    '22': ['Huesca', 'Aragón'],
    '23': ['Jaén', 'Andalucía'],
    '24': ['León', 'Castilla y León'],
    '25': ['Lleida', 'Cataluña'],
    '26': ['La Rioja', 'La Rioja'],
    '27': ['Lugo', 'Galicia'],
    '28': ['Madrid', 'Comunidad de Madrid'],
    '29': ['Málaga', 'Andalucía'],
    '30': ['Murcia', 'Región de Murcia'],
    '31': ['Navarra', 'Comunidad Foral de Navarra'],
    '32': ['Ourense', 'Galicia'],
    '33': ['Asturias', 'Principado de Asturias'],
    '34': ['Palencia', 'Castilla y León'],
    '35': ['Las Palmas', 'Canarias'],
    '36': ['Pontevedra', 'Galicia'],
    '37': ['Salamanca', 'Castilla y León'],
    '38': ['Santa Cruz de Tenerife', 'Canarias'],
    '39': ['Cantabria', 'Cantabria'],
    '40': ['Segovia', 'Castilla y León'],
    '41': ['Sevilla', 'Andalucía'],
    '42': ['Soria', 'Castilla y León'],
    '43': ['Tarragona', 'Cataluña'],
    '44': ['Teruel', 'Aragón'],
    '45': ['Toledo', 'Castilla-La Mancha'],
    '46': ['Valencia', 'Comunidad Valenciana'],
    '47': ['Valladolid', 'Castilla y León'],
    '48': ['Bizkaia', 'País Vasco'],
    '49': ['Zamora', 'Castilla y León'],
    '50': ['Zaragoza', 'Aragón'],
    '51': ['Ceuta', 'Ceuta'],
    '52': ['Melilla', 'Melilla'],
}

export type DesdeCP = { provincia: string; ccaa: string } | null

/**
 * Provincia e comunità autonoma dal codice postale.
 *
 * Accetta anche un indirizzo intero: pesca le prime cinque cifre
 * consecutive che trova, perché il CP nel fascicolo a volte è in un
 * campo suo e a volte è in fondo alla riga dell'indirizzo.
 */
export function desdeCodigoPostal(v: string | number | null | undefined): DesdeCP {
    const texto = String(v ?? '')
    const m = texto.match(/\b(\d{5})\b/)
    const cp = m ? m[1] : texto.replace(/\D/g, '').slice(0, 5)
    if (cp.length < 2) return null

    const par = PROVINCIAS[cp.slice(0, 2)]
    if (!par) return null
    return { provincia: par[0], ccaa: par[1] }
}

/* ------------------------------------------- referencia catastral */

/** Toglie spazi e minuscole. Sui documenti si scrive in mille modi. */
export function limpiarRC(v: string | null | undefined): string {
    return String(v ?? '')
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, '')
}

/**
 * Le prime 14 posizioni, che sono quelle dell'immobile.
 *
 * Una referencia completa ne ha 20: le ultime sei identificano il
 * singolo appartamento dentro l'edificio. Il servizio delle coordinate
 * ne vuole 14 e con venti risponde «DEBE SER DE 14 POSICIONES» — che è
 * un errore che si prende una volta e si ricorda per sempre.
 */
export function rcDeInmueble(v: string | null | undefined): string | null {
    const limpia = limpiarRC(v)
    if (limpia.length < 14) return null
    return limpia.slice(0, 14)
}

/* ---------------------------------------------------------- huso */

/**
 * Il huso UTM dalla longitudine.
 *
 * La Spagna non sta tutta in uno: 29 all'estremo ovest, 30 quasi
 * dappertutto, 31 in Catalogna e Baleari, 27 e 28 alle Canarie. Il
 * Convenio chiede il huso insieme alle coordinate, e darlo sbagliato
 * sposta il punto di centinaia di chilometri — il documento resta
 * valido a vedersi e indica un posto che non è quello.
 *
 * Per questo si chiede prima la longitudine e poi le coordinate nel
 * huso giusto, invece di indovinarlo dalla provincia: ai confini fra
 * due husi una tabella di province sbaglia, e sbaglia in silenzio.
 */
export function husoDeLongitud(lon: number): number {
    return Math.floor((lon + 180) / 6) + 1
}

/** Quello che una consulta riuscita restituisce. */
export type Localizacion = {
    ref_catastral: string
    utm_huso: string
    utm_x: string
    utm_y: string
    /** Comune e provincia, come li scrive il Catastro. */
    localidad: string | null
    provincia: string | null
    ccaa: string | null
    /** L'indirizzo ufficiale, per controllare che sia lo stesso immobile. */
    direccion: string | null
}

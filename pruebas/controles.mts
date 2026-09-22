// Prova i controlli nuovi sul codice vero, non su una copia.
// I falsi allarmi sono il modo in cui questa funzione fallisce, quindi
// meta dei casi qui sotto sono fascicoli SANI che non devono suonare.
import {
    senales,
    type Extraccion,
    type ValorCampo,
} from '../src/lib/caes/extraction'

const c = (valor: string | number): ValorCampo => ({
    valor,
    estado: 'confirmado',
    confianza: 0.95,
})

const casos: { nombre: string; e: Extraccion; espero: Record<string, string> }[] = [
    {
        nombre: 'SANO — stesso NIF scritto in tre modi',
        e: { nif_cliente: c('12345678-Z'), nif_cliente_dni: c('12345678 z') },
        espero: { 'nif-cliente-coincide': 'ok' },
    },
    {
        nombre: 'SANO — cognome davanti sul DNI, accenti diversi',
        e: {
            nombre_cliente: c('María García'),
            nombre_cliente_dni: c('GARCIA LOPEZ, MARIA'),
        },
        espero: { 'nombre-cliente-coincide': 'ok' },
    },
    {
        nombre: 'SANO — indirizzo scritto in due modi',
        e: {
            direccion_actuacion: c('C/ Gran Vía 12, 3ºB, Madrid'),
            direccion_titularidad: c('Calle Gran Via, 12 - 3 B (Madrid)'),
        },
        espero: { 'direccion-coincide': 'ok' },
    },
    {
        nombre: 'MALATO — il DNI e di un altro',
        e: { nif_cliente: c('12345678Z'), nif_cliente_dni: c('87654321X') },
        espero: { 'nif-cliente-coincide': 'alarma' },
    },
    {
        nombre: 'MALATO — SCOP con la virgola persa',
        e: { scop: c(92) },
        espero: { 'scop-rango': 'alarma' },
    },
    {
        nombre: 'SANO — SCOP normale',
        e: { scop: c('4,1') },
        espero: { 'scop-rango': 'ok' },
    },
    {
        nombre: 'MALATO — rendimento come percentuale',
        e: { rendimiento_anterior: c(92) },
        espero: { 'rendimiento_anterior-rango': 'alarma' },
    },
    {
        nombre: 'SANO — rendimento come frazione',
        e: { rendimiento_anterior: c('0,92') },
        espero: { 'rendimiento_anterior-rango': 'ok' },
    },
    {
        nombre: 'MALATO — la potenza della fattura e un altro apparecchio',
        e: { potencia_kw: c(8), potencia_factura: c(16) },
        espero: { 'potencia-coincide': 'alarma' },
    },
    {
        nombre: 'SANO — mezzo kW di scarto e un arrotondamento',
        e: { potencia_kw: c(8), potencia_factura: c('8,5') },
        espero: { 'potencia-coincide': 'ok' },
    },
    {
        nombre: 'MALATO — la obra finisce prima di cominciare',
        e: { fecha_inicio_obra: c('2026-05-10'), fecha_fin_obra: c('2026-04-02') },
        espero: { 'obra-empieza-antes-de-acabar': 'alarma' },
    },
    {
        nombre: 'NIENTE DA DIRE — manca la seconda carta',
        e: { nif_cliente: c('12345678Z') },
        espero: { 'nif-cliente-coincide': 'pendiente' },
    },
]

let mal = 0
for (const caso of casos) {
    const todas = senales(caso.e)
    for (const [id, esperado] of Object.entries(caso.espero)) {
        const s = todas.find((x) => x.id === id)
        const real = s ? s.estado : '(non trovato)'
        const bien = real === esperado
        if (!bien) mal++
        console.log(`${bien ? '  ok  ' : '  NO  '} ${caso.nombre}`)
        if (!bien) console.log(`         ${id}: aspettavo ${esperado}, ho ${real}`)
    }
}
console.log(`\n${casos.length} casi, ${mal} sbagliati`)
process.exit(mal ? 1 : 0)

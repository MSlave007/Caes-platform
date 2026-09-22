import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { mockDb, type Project } from './mockDb'

/**
 * Clienti per la modalità dimostrativa.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * In dimostrazione non c'è sessione, quindi la tabella `clientes` non
 * restituisce niente: le regole di riga filtrano per utente e utente non
 * ce n'è. L'elenco risultava vuoto e non si poteva vedere come funziona.
 *
 * ── DUE SORGENTI, E NON È UN CASO ─────────────────────────────────────
 *
 * Quelli DERIVATI si ricavano dagli espedienti della dimostrazione: non
 * sono inventati, quindi la scheda mostra davvero le sue pratiche e i
 * due elenchi non possono contraddirsi.
 *
 * Quelli SCRITTI A MANO stanno in un file, come le bozze. Servono a
 * poter provare «crea un cliente» e «modificane i dati» senza login: un
 * pulsante che in dimostrazione non fa niente è peggio di un pulsante
 * che non c'è.
 */

export type ClienteDemo = {
    id: string
    nombre: string
    nif: string | null
    telefono: string | null
    email: string | null
    direccion: string | null
    notas?: string | null
    created_at: string
}

const ARCHIVO = join(process.cwd(), '.caes-demo.clientes.json')

/** Un id stabile ricavato dal nome: due letture danno lo stesso. */
const idDe = (nombre: string) =>
    'demo-' +
    nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

// Contatti verosimili ma dichiaratamente finti. I NIF seguono la forma
// spagnola senza essere di nessuno: otto cifre ripetute e una lettera.
const EXTRA: Record<string, { nif: string; tel: string; email: string | null }> = {
    'María García': { nif: '11111111H', tel: '611 223 344', email: 'maria.garcia@ejemplo.es' },
    'Josep Vidal': { nif: '22222222J', tel: '622 334 455', email: 'josep.vidal@ejemplo.es' },
    'Nuria Castro': { nif: '33333333P', tel: '633 445 566', email: 'nuria.castro@ejemplo.es' },
    'Hotel Guadalquivir': { nif: 'B44444444', tel: '954 112 233', email: 'reservas@hotelguadalquivir.es' },
    'Instal·lacions Roca': { nif: 'B55555555', tel: '972 334 455', email: 'info@installacionsroca.cat' },
    'Rocío Delgado': { nif: '66666666Q', tel: '666 778 899', email: 'rocio.delgado@ejemplo.es' },
    // I clienti arrivati con la cartera. Due restano senza contatti
    // apposta — «Sin datos de contacto» e uno stato vero, e una
    // dimostrazione in cui non capita mai nasconde il problema che la
    // rubrica serve a risolvere.
    'Inmobiliaria Sol y Mar': { nif: 'B77777777', tel: '963 118 220', email: 'administracion@solymar.es' },
    'Residencial Los Olivos': { nif: 'H88888888', tel: '954 667 120', email: 'presidencia@losolivos.es' },
    'Comunidad Plaza Nueva': { nif: 'H99999999', tel: '954 221 907', email: 'admin@plazanueva7.es' },
    'Ana Belén Ruiz': { nif: '77777777T', tel: '677 889 900', email: 'anabelen.ruiz@ejemplo.es' },
    'Vicente Alcaraz': { nif: '52341198K', tel: '655 210 344', email: null },
    'Lucía Ferrer': { nif: '88888888V', tel: '688 990 011', email: 'lucia.ferrer@ejemplo.es' },
    'Javier Ibáñez': { nif: '99999999R', tel: '699 001 122', email: 'javier.ibanez@ejemplo.es' },
    'Pilar Lasheras': { nif: '12345678Z', tel: '610 334 556', email: 'pilar.lasheras@ejemplo.es' },
}

/* ------------------------------------------------- il file dei manuali */

function leerArchivo(): ClienteDemo[] {
    try {
        if (!existsSync(ARCHIVO)) return []
        const v = JSON.parse(readFileSync(ARCHIVO, 'utf8'))
        return Array.isArray(v) ? (v as ClienteDemo[]) : []
    } catch {
        return []
    }
}

function escribirArchivo(rows: ClienteDemo[]) {
    try {
        writeFileSync(ARCHIVO, JSON.stringify(rows, null, 2), 'utf8')
    } catch {
        /* sola lettura: la dimostrazione continua senza persistenza */
    }
}

function derivados(): ClienteDemo[] {
    const vistos = new Map<string, ClienteDemo>()
    for (const p of mockDb.getProjects()) {
        const nombre = p.client_name?.trim()
        if (!nombre || vistos.has(nombre)) continue
        const e = EXTRA[nombre]
        vistos.set(nombre, {
            id: idDe(nombre),
            nombre,
            nif: e?.nif ?? null,
            telefono: e?.tel ?? null,
            email: e?.email ?? null,
            direccion: p.address || null,
            created_at: p.created_at,
        })
    }
    return [...vistos.values()]
}

/**
 * Tutti, con le modifiche a mano sopra a quelli derivati.
 *
 * L'ordine conta: se qualcuno ha corretto il telefono di un cliente
 * derivato, vince la correzione. Altrimenti modificare un cliente
 * sembrerebbe non fare niente.
 */
function todos(): ClienteDemo[] {
    const manuales = leerArchivo()
    const mapa = new Map(derivados().map((c) => [c.id, c]))
    for (const m of manuales) mapa.set(m.id, { ...mapa.get(m.id), ...m })
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/* ---------------------------------------------------------- pubblico */

export const mockClientes = {
    all: (q?: string): ClienteDemo[] => {
        const lista = todos()
        if (!q) return lista
        const t = q.toLowerCase()
        return lista.filter((c) =>
            [c.nombre, c.nif, c.telefono, c.direccion]
                .filter(Boolean)
                .some((v) => v!.toLowerCase().includes(t))
        )
    },

    byId: (id: string): ClienteDemo | undefined => todos().find((c) => c.id === id),

    /** Gli espedienti di un cliente. In demo si legano per nome. */
    expedientes: (id: string): Project[] => {
        const c = todos().find((x) => x.id === id)
        if (!c) return []
        return mockDb
            .getProjects()
            .filter((p) => p.client_name?.trim() === c.nombre)
            .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    },

    crear: (datos: Partial<ClienteDemo> & { nombre: string }): ClienteDemo => {
        const nuevo: ClienteDemo = {
            id: idDe(datos.nombre) + '-' + Math.random().toString(36).slice(2, 6),
            nombre: datos.nombre,
            nif: datos.nif ?? null,
            telefono: datos.telefono ?? null,
            email: datos.email ?? null,
            direccion: datos.direccion ?? null,
            notas: datos.notas ?? null,
            created_at: new Date().toISOString(),
        }
        escribirArchivo([...leerArchivo(), nuevo])
        return nuevo
    },

    actualizar: (id: string, parche: Partial<ClienteDemo>): ClienteDemo | null => {
        const actual = todos().find((c) => c.id === id)
        if (!actual) return null
        const fusionado = { ...actual, ...parche, id }
        const manuales = leerArchivo()
        const i = manuales.findIndex((m) => m.id === id)
        if (i >= 0) manuales[i] = fusionado
        else manuales.push(fusionado)
        escribirArchivo(manuales)
        return fusionado
    },
}

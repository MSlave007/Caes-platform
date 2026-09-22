// Archivio dimostrativo, appoggiato a un file su disco.
//
// Prima era un array a livello di modulo. Non funzionava: in sviluppo le
// due rotte (/api/projects e /api/projects/[id]) finiscono in bundle
// diversi e ciascuna si ritrova la SUA copia del modulo — una pratica
// creata dalla prima era invisibile alla seconda. In più ogni
// ricompilazione azzerava tutto, quindi bastava salvare un file mentre
// stavi mostrando qualcosa e i dati sparivano.
//
// Il file risolve entrambe le cose: è uno solo per tutte le rotte e
// sopravvive alle ricompilazioni. Resta comunque un ripiego per le
// dimostrazioni, non un database: per un pilota vero serve Supabase.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { DocSpec } from './documents'
import type { EstadoId } from './caes/status'

/** Chi ha aperto l'espediente. Cambia i documenti richiesti e la lavorazione. */
export type Source = 'installer' | 'client'

export type ProjectDoc = {
    /** id dello slot in DOCUMENTS */
    id: string
    name: string
    /** Verificato dall'agenzia */
    verified: boolean
    /**
     * Percorso nel deposito. Senza questo il visore non ha niente da
     * aprire: era il pezzo che mancava per poter verificare guardando.
     */
    path?: string
}

export type Project = {
    id: string
    created_at: string
    source: Source
    client_name: string
    /** Vuoto quando l'espediente arriva dal cliente e non è ancora assegnato */
    installer_name: string | null
    /** Ciclo di vita completo: vedi src/lib/caes/status.ts */
    status: EstadoId
    /** Risparmio annuo riconosciuto, € */
    savings_eur: number
    /** Percentuale trattenuta dall'installatore, bloccata all'invio */
    installer_pct: number
    /** Percentuale dell'agenzia sul residuo, decisa in approvazione */
    agency_pct: number | null
    /** Risparmio verificato sulla linea base, % */
    savings_pct: number
    address: string
    make: string
    model: string
    power_kw: number
    docs: ProjectDoc[]
    /**
     * L'identificatore pubblico, per la pagina che vede il cliente.
     *
     * Lo genera il database (uuid v4). In dimostrazione non c'e: la
     * pagina ripiega sull'id, che basta a farla vedere ma non sarebbe
     * accettabile in produzione — un id progressivo si indovina.
     */
    seguimiento_token?: string
    /**
     * Il link per caricare documenti senza entrare: token, scadenza e
     * la riga che scrive chi rivede.
     *
     * Stanno anche qui e non solo sul database perche meta della
     * piattaforma lavora su espedienti dimostrativi, e una funzione che
     * c'e solo con il database e una funzione che non si puo far
     * vedere. Vedi src/app/api/subida.
     */
    subida_token?: string
    subida_caduca?: string
    subida_nota?: string | null
    /** Note libere dell'installatore, scritte al caricamento. */
    notas?: string
    /** Come l'ha chiamato chi l'ha aperto, quando il cliente non c'era ancora. */
    nombre?: string
    /**
     * I dati letti dai documenti, campo per campo, col loro stato.
     *
     * Stavano solo nello stato della pagina: chi rivedeva dodici campi e
     * poi ricaricava li ritrovava tutti vuoti. Il lavoro di revisione e
     * lavoro, e va salvato mentre si fa, non alla fine.
     */
    extraccion?: Record<string, { valor: string | number | null; estado: string; confianza?: number }>
    /**
     * Lo stato dei tre documenti generati: i ritocchi scritti a mano
     * dentro il testo e quali sono stati dati per buoni.
     *
     * Vivevano nella schermata: una referenza catastrale cercata sul
     * portale del Catastro e scritta a mano spariva al primo
     * aggiornamento della pagina.
     */
    documentos?: {
        retoques?: Record<string, string>
        revisados?: Record<string, boolean>
    }
    /**
     * Le firme raccolte, documento per documento.
     *
     * Non solo il tratto: anche l istante in cui il documento si e
     * congelato e la sua impronta. Da quei due, il PDF firmato si
     * ricompone identico quando si vuole. Vedi src/lib/caes/firma.ts.
     */
    firmas?: import('./caes/firma').Firmas
    /** Chi l'ha aperto. Da qui si prende la sua anagrafica per i documenti. */
    installer_id?: string
    /** La scheda del cliente, quando c'e'. Vedi la tabella `clientes`. */
    cliente_id?: string
    /** Ultimo movimento. Da qui si contano i giorni di attesa. */
    updated_at?: string
    /**
     * Il motivo scritto dall'agenzia quando rimanda indietro o rifiuta.
     *
     * Lo legge l'installatore tal quale. Un «cambios solicitados» senza
     * motivo ferma la pratica e produce una telefonata: e' la settimana
     * di silenzio che questa piattaforma dovrebbe togliere, fatta da noi.
     */
    admin_notes?: string | null
    /**
     * Il soggetto delegato a cui si cede l'ahorro. Vedi proveedores.ts.
     *
     * Non e' un dettaglio commerciale: e' la controparte del Convenio, e
     * con lui cambiano NIF, codice di accreditamento e chi firma.
     */
    proveedor?: string
    /**
     * €/MWh pattuiti su QUESTO espediente.
     *
     * Vuoto vuol dire «quella del soggetto». Si riempie quando il prezzo
     * negoziato e' diverso: vale quello scritto sul contratto firmato
     * quel giorno, non quello di oggi.
     */
    tarifa_eur_mwh?: number | null
    files: unknown[]
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

const docs = (ids: string[], verified = false): ProjectDoc[] =>
    ids.map((id) => ({ id, name: `${id}.pdf`, verified }))

const ARCHIVO = join(process.cwd(), '.caes-demo.json')

const SEMILLA: Project[] = [
    {
        id: '2481',
        created_at: hoursAgo(2),
        source: 'installer',
        client_name: 'María García',
        installer_name: 'Clima Levante S.L.',
        status: 'submitted',
        savings_eur: 400,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 26.4,
        address: 'Calle Gran Vía 12, Madrid',
        make: 'Ariston',
        model: 'Nuos Plus',
        power_kw: 3.5,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-instalador']),
        files: [],
    },
    {
        id: '2480',
        created_at: hoursAgo(9),
        source: 'client',
        client_name: 'Josep Vidal',
        installer_name: null,
        status: 'submitted',
        savings_eur: 512,
        installer_pct: 0,
        agency_pct: null,
        savings_pct: 31.8,
        address: 'Carrer de Sabadell 40, Barcelona',
        make: '—',
        model: '—',
        power_kw: 0,
        docs: docs(['dni-cliente', 'factura-energia', 'titularidad']),
        files: [],
    },
    {
        id: '2478',
        created_at: hoursAgo(26),
        source: 'installer',
        client_name: 'Instal·lacions Roca',
        installer_name: 'Instal·la Girona',
        status: 'submitted',
        savings_eur: 336,
        installer_pct: 20,
        agency_pct: null,
        savings_pct: 18.2,
        address: 'Carrer Nou 8, Girona',
        make: 'Vaillant',
        model: 'aroSTOR',
        power_kw: 2.5,
        docs: docs(['factura', 'serie', 'rite'], true),
        files: [],
    },
    {
        id: '2477',
        created_at: hoursAgo(50),
        source: 'installer',
        client_name: 'Hotel Guadalquivir',
        installer_name: 'Termosur Sevilla',
        status: 'approved',
        savings_eur: 448,
        installer_pct: 25,
        agency_pct: 65,
        savings_pct: 29.1,
        address: 'Av. de la Palmera 22, Sevilla',
        make: 'Daikin',
        model: 'Altherma 3',
        power_kw: 6,
        docs: docs(
            ['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-instalador'],
            true
        ),
        files: [],
    },
    {
        id: '2475',
        created_at: hoursAgo(72),
        source: 'client',
        client_name: 'Rocío Delgado',
        installer_name: 'Termosur Sevilla',
        status: 'rejected',
        savings_eur: 180,
        installer_pct: 0,
        agency_pct: null,
        savings_pct: 14.6,
        address: 'Calle Real 5, Dos Hermanas',
        make: 'Baxi',
        model: 'Platinum BC',
        power_kw: 2.5,
        docs: docs(['dni-cliente', 'factura-energia']),
        files: [],
    },
    {
        id: '2470',
        created_at: hoursAgo(2160),
        source: 'installer',
        client_name: 'Hotel Guadalquivir',
        installer_name: 'Termosur Sevilla',
        status: 'paid',
        savings_eur: 1800,
        installer_pct: 22,
        agency_pct: 18,
        savings_pct: 29.4,
        address: 'Avenida de la Palmera 18, Sevilla',
        make: 'Daikin',
        model: 'Altherma 3',
        power_kw: 11.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
    {
        id: '2468',
        created_at: hoursAgo(2880),
        source: 'installer',
        client_name: 'Residencial Los Olivos',
        installer_name: 'Termosur Sevilla',
        status: 'paid',
        savings_eur: 3200,
        installer_pct: 20,
        agency_pct: 18,
        savings_pct: 33.1,
        address: 'Calle Olivos 3, Mairena del Aljarafe',
        make: 'Mitsubishi',
        model: 'Ecodan',
        power_kw: 14.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
    {
        id: '2466',
        created_at: hoursAgo(1080),
        source: 'installer',
        client_name: 'Comunidad Plaza Nueva',
        installer_name: 'Termosur Sevilla',
        status: 'issued',
        savings_eur: 2100,
        installer_pct: 22,
        agency_pct: 18,
        savings_pct: 27.8,
        address: 'Plaza Nueva 7, Sevilla',
        make: 'Daikin',
        model: 'Altherma 3',
        power_kw: 9.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite']),
        files: [],
    },
    {
        id: '2464',
        created_at: hoursAgo(30),
        source: 'installer',
        client_name: 'Ana Belén Ruiz',
        installer_name: 'Termosur Sevilla',
        status: 'submitted',
        savings_eur: 520,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 28.2,
        address: 'Calle Feria 44, Sevilla',
        make: 'Ariston',
        model: 'Nuos Plus',
        power_kw: 3.5,
        docs: docs(['factura', 'serie', 'placa', 'antiguo']),
        files: [],
    },
    {
        id: '2462',
        created_at: hoursAgo(480),
        source: 'installer',
        client_name: 'Hotel Guadalquivir',
        installer_name: 'Termosur Sevilla',
        status: 'approved',
        savings_eur: 1500,
        installer_pct: 22,
        agency_pct: 18,
        savings_pct: 26.0,
        address: 'Avenida de la Palmera 18, Sevilla',
        make: 'Daikin',
        model: 'Altherma 3',
        power_kw: 8.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
    {
        id: '2441',
        created_at: hoursAgo(40),
        source: 'installer',
        client_name: 'Inmobiliaria Sol y Mar',
        installer_name: 'Termosur Sevilla',
        status: 'submitted',
        savings_eur: 1050,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 30.2,
        address: 'Calle Betis 22, Sevilla',
        make: 'Saunier Duval',
        model: 'Genia Air',
        power_kw: 7.0,
        docs: docs(['factura', 'serie', 'placa']),
        files: [],
    },
    {
        id: '2459',
        created_at: hoursAgo(528),
        source: 'installer',
        client_name: 'Vicente Alcaraz',
        installer_name: 'Clima Levante S.L.',
        status: 'changes_requested',
        savings_eur: 640,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 24.9,
        address: 'Avenida del Puerto 61, Valencia',
        make: 'Baxi',
        model: 'Platinum BC',
        power_kw: 4.5,
        docs: docs(['factura', 'serie', 'antiguo']),
        files: [],
    },
    {
        id: '2457',
        created_at: hoursAgo(384),
        source: 'installer',
        client_name: 'Inmobiliaria Sol y Mar',
        installer_name: 'Clima Levante S.L.',
        status: 'changes_requested',
        savings_eur: 980,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 31.0,
        address: 'Carrer de la Reina 210, Valencia',
        make: 'Saunier Duval',
        model: 'Genia Air',
        power_kw: 6.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo']),
        files: [],
    },
    {
        id: '2455',
        created_at: hoursAgo(336),
        source: 'installer',
        client_name: 'Inmobiliaria Sol y Mar',
        installer_name: 'Clima Levante S.L.',
        status: 'changes_requested',
        savings_eur: 860,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 29.6,
        address: 'Carrer de la Reina 214, Valencia',
        make: 'Saunier Duval',
        model: 'Genia Air',
        power_kw: 6.0,
        docs: docs(['factura', 'serie', 'antiguo']),
        files: [],
    },
    {
        id: '2453',
        created_at: hoursAgo(264),
        source: 'installer',
        client_name: 'Inmobiliaria Sol y Mar',
        installer_name: 'Clima Levante S.L.',
        status: 'draft',
        savings_eur: 900,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 0,
        address: 'Carrer de la Reina 218, Valencia',
        make: 'Saunier Duval',
        model: 'Genia Air',
        power_kw: 6.0,
        docs: docs(['factura']),
        files: [],
    },
    {
        id: '2451',
        created_at: hoursAgo(1440),
        source: 'installer',
        client_name: 'Lucía Ferrer',
        installer_name: 'Clima Levante S.L.',
        status: 'paid',
        savings_eur: 1100,
        installer_pct: 25,
        agency_pct: 18,
        savings_pct: 30.4,
        address: 'Carrer de Russafa 8, Valencia',
        make: 'Ariston',
        model: 'Nuos Plus',
        power_kw: 3.5,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
    {
        id: '2449',
        created_at: hoursAgo(1800),
        source: 'installer',
        client_name: 'Javier Ibáñez',
        installer_name: 'Aerotermia Norte S.L.',
        status: 'paid',
        savings_eur: 1150,
        installer_pct: 20,
        agency_pct: 18,
        savings_pct: 32.7,
        address: 'Calle Vitoria 90, Burgos',
        make: 'Mitsubishi',
        model: 'Ecodan',
        power_kw: 8.5,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
    {
        id: '2447',
        created_at: hoursAgo(2400),
        source: 'installer',
        client_name: 'Nuria Castro',
        installer_name: 'Aerotermia Norte S.L.',
        status: 'paid',
        savings_eur: 950,
        installer_pct: 20,
        agency_pct: 18,
        savings_pct: 28.9,
        address: 'Calle Nueva 2, Burgos',
        make: 'Mitsubishi',
        model: 'Ecodan',
        power_kw: 6.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
    {
        id: '2445',
        created_at: hoursAgo(5),
        source: 'installer',
        client_name: 'Marta Puig',
        installer_name: 'Instal·la Girona',
        status: 'submitted',
        savings_eur: 480,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 25.7,
        address: 'Carrer Nou 15, Girona',
        make: 'Ariston',
        model: 'Nuos Plus',
        power_kw: 3.5,
        docs: docs(['factura', 'serie', 'placa']),
        files: [],
    },
    {
        id: '2443',
        created_at: hoursAgo(72),
        source: 'installer',
        client_name: 'Ferran Sabaté',
        installer_name: 'Instal·la Girona',
        status: 'draft',
        savings_eur: 0,
        installer_pct: 25,
        agency_pct: null,
        savings_pct: 0,
        address: 'Carrer del Carme 3, Girona',
        make: '',
        model: '',
        power_kw: 0,
        docs: [],
        files: [],
    },
    {
        id: '2439',
        created_at: hoursAgo(5040),
        source: 'installer',
        client_name: 'Pilar Lasheras',
        installer_name: 'Calor Verde Aragón',
        status: 'paid',
        savings_eur: 1250,
        installer_pct: 20,
        agency_pct: 18,
        savings_pct: 31.5,
        address: 'Paseo Independencia 24, Zaragoza',
        make: 'Daikin',
        model: 'Altherma 3',
        power_kw: 7.0,
        docs: docs(['factura', 'serie', 'placa', 'antiguo', 'rite', 'dni-cliente']),
        files: [],
    },
]

/**
 * Lettura e scrittura del file. I dati sono pochi: leggere ogni volta
 * costa niente ed evita di tenere una cache che può divergere fra rotte,
 * che è esattamente il problema da cui veniamo.
 */
function leer(): Project[] {
    try {
        if (!existsSync(ARCHIVO)) {
            escribir(SEMILLA)
            return SEMILLA
        }
        return JSON.parse(readFileSync(ARCHIVO, 'utf8')) as Project[]
    } catch {
        // File corrotto o illeggibile: si riparte dalla semilla invece di
        // far cadere la pagina durante una dimostrazione.
        return SEMILLA
    }
}

function escribir(rows: Project[]) {
    try {
        writeFileSync(ARCHIVO, JSON.stringify(rows, null, 2), 'utf8')
    } catch {
        /* sola lettura: la dimostrazione continua, senza persistenza */
    }
}

export const mockDb = {
    getProjects: () => leer(),
    getProjectById: (id: string) => leer().find((p) => p.id === id),

    /** Riporta la demo allo stato iniziale. Comodo fra una dimostrazione e l'altra. */
    reset: () => {
        escribir(SEMILLA)
        return SEMILLA
    },

    createProject: (project: Omit<Project, 'id' | 'created_at'>) => {
        // Id progressivo sopra il più alto esistente: accanto ai 2477-2481
        // della demo, un id casuale tipo "k3f9x" si nota subito ed è brutto
        // da leggere ad alta voce durante una dimostrazione.
        const rows = leer()
        const maxId = rows.reduce((m, p) => {
            const n = Number(p.id)
            return Number.isFinite(n) && n > m ? n : m
        }, 2481)

        const newProject: Project = {
            ...project,
            id: String(maxId + 1),
            created_at: new Date().toISOString(),
        }
        rows.unshift(newProject)
        escribir(rows)
        return newProject
    },

    updateProjectStatus: (id: string, status: Project['status']) => {
        const rows = leer()
        const idx = rows.findIndex((p) => p.id === id)
        if (idx === -1) return null
        rows[idx].status = status
        escribir(rows)
        return rows[idx]
    },

    /** Approvazione: fissa il risparmio riconosciuto e il margine dell'agenzia. */
    updateProject: (id: string, patch: Partial<Project>) => {
        const rows = leer()
        const idx = rows.findIndex((p) => p.id === id)
        if (idx === -1) return null
        rows[idx] = { ...rows[idx], ...patch }
        escribir(rows)
        return rows[idx]
    },
}

export type { DocSpec }

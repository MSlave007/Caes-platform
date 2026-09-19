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

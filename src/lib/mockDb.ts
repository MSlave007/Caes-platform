// Archivio in memoria per la sessione dimostrativa.
// Vive finché il processo del server è vivo: serve a far funzionare l'area
// admin mentre Supabase non è raggiungibile, non a sostituirlo.

import type { DocSpec } from './documents'

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
    status: 'submitted' | 'under_review' | 'approved' | 'rejected'
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

let projects: Project[] = [
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
        status: 'under_review',
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

export const mockDb = {
    getProjects: () => projects,
    getProjectById: (id: string) => projects.find((p) => p.id === id),

    createProject: (project: Omit<Project, 'id' | 'created_at'>) => {
        const newProject: Project = {
            ...project,
            id: Math.random().toString(36).substring(7),
            created_at: new Date().toISOString(),
        }
        projects.unshift(newProject)
        return newProject
    },

    updateProjectStatus: (id: string, status: Project['status']) => {
        const idx = projects.findIndex((p) => p.id === id)
        if (idx === -1) return null
        projects[idx].status = status
        return projects[idx]
    },

    /** Approvazione: fissa il risparmio riconosciuto e il margine dell'agenzia. */
    updateProject: (id: string, patch: Partial<Project>) => {
        const idx = projects.findIndex((p) => p.id === id)
        if (idx === -1) return null
        projects[idx] = { ...projects[idx], ...patch }
        return projects[idx]
    },
}

export type { DocSpec }

// Basic in-memory store for the demo session
// This persists data as long as the server process is running

export type Project = {
    id: string
    created_at: string
    client_name: string
    installer_name: string
    status: 'submitted' | 'under_review' | 'approved' | 'rejected'
    savings_eur: number
    address: string
    make: string
    model: string
    files: any[]
}

// Initial seed data
let projects: Project[] = [
    {
        id: '1',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        client_name: 'Maria Garcia',
        installer_name: 'SolarInstall Pro',
        status: 'submitted',
        savings_eur: 450,
        address: 'Calle Gran Vía 12, Madrid',
        make: 'Ariston',
        model: 'Nuos Plus',
        files: []
    },
    {
        id: '2',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        client_name: 'Hotel California',
        installer_name: 'EcoEnergy SL',
        status: 'approved',
        savings_eur: 1250,
        address: 'Av. Diagonal 405, Barcelona',
        make: 'Daikin',
        model: 'Altherma 3',
        files: []
    }
]

export const mockDb = {
    getProjects: () => projects,
    getProjectById: (id: string) => projects.find(p => p.id === id),
    createProject: (project: Omit<Project, 'id' | 'created_at'>) => {
        const newProject: Project = {
            ...project,
            id: Math.random().toString(36).substring(7),
            created_at: new Date().toISOString()
        }
        projects.unshift(newProject) // Add to top
        return newProject
    },
    updateProjectStatus: (id: string, status: Project['status']) => {
        const idx = projects.findIndex(p => p.id === id)
        if (idx !== -1) {
            projects[idx].status = status
            return projects[idx]
        }
        return null
    }
}

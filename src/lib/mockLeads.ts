// Archivio in memoria dei lead, finché la tabella su Supabase non esiste.

export type Lead = {
    id: string
    created_at: string
    name: string
    phone: string
    email: string
    postal: string
    /** Urgenza dichiarata: è il campo che qualifica il lead */
    when: 'ya' | 'meses' | 'mirando'
    sistema: string
    factura_mensual: number
    zona: string
    /** La stima mostrata al cliente, allegata così l'installatore chiama informato */
    estimacion: Record<string, number>
    status: 'new' | 'assigned' | 'contacted' | 'discarded'
    installer_name: string | null
}

const leads: Lead[] = [
    {
        id: 'L-0031',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        name: 'Ana Ruiz',
        phone: '600 118 224',
        email: 'ana.ruiz@example.com',
        postal: '28903',
        when: 'ya',
        sistema: 'gas',
        factura_mensual: 120,
        zona: 'centro',
        estimacion: { coste_bruto: 8160, coste_neto: 5386, ahorro_anual: 545, anos_retorno: 9.9 },
        status: 'new',
        installer_name: null,
    },
    {
        id: 'L-0030',
        created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
        name: 'Carlos Benítez',
        phone: '655 903 471',
        email: '',
        postal: '41703',
        when: 'meses',
        sistema: 'electrico',
        factura_mensual: 95,
        zona: 'sur',
        estimacion: { coste_bruto: 6360, coste_neto: 4329, ahorro_anual: 371, anos_retorno: 11.7 },
        status: 'new',
        installer_name: null,
    },
    {
        id: 'L-0029',
        created_at: new Date(Date.now() - 74 * 3600000).toISOString(),
        name: 'Núria Camps',
        phone: '677 240 118',
        email: 'nuria@example.com',
        postal: '08201',
        when: 'ya',
        sistema: 'gasoleo',
        factura_mensual: 175,
        zona: 'norte',
        estimacion: { coste_bruto: 9600, coste_neto: 6161, ahorro_anual: 1170, anos_retorno: 5.3 },
        status: 'assigned',
        installer_name: 'Instal·la Girona',
    },
]

export const mockLeads = {
    all: () => leads,
    create: (l: Omit<Lead, 'id' | 'created_at'>) => {
        const lead: Lead = {
            ...l,
            id: 'L-' + String(3000 + leads.length).slice(-4),
            created_at: new Date().toISOString(),
        }
        leads.unshift(lead)
        return lead
    },
    update: (id: string, patch: Partial<Lead>) => {
        const i = leads.findIndex((l) => l.id === id)
        if (i === -1) return null
        leads[i] = { ...leads[i], ...patch }
        return leads[i]
    },
}

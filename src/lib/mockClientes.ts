import { mockDb, type Project } from './mockDb'

/**
 * Clienti per la modalità dimostrativa.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * In dimostrazione non c'è sessione, quindi la tabella `clientes` non
 * restituisce niente: le regole di riga filtrano per utente e utente non
 * ce n'è. L'elenco clienti risultava vuoto e non si poteva vedere come
 * funziona.
 *
 * Questi non sono dati inventati a caso: sono ricavati dagli espedienti
 * della dimostrazione, quindi la scheda di un cliente mostra davvero le
 * sue pratiche e i due elenchi non possono contraddirsi. È lo stesso
 * criterio dell'archivio dimostrativo dei fascicoli.
 */

export type ClienteDemo = {
    id: string
    nombre: string
    nif: string | null
    telefono: string | null
    email: string | null
    direccion: string | null
    created_at: string
}

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
const EXTRA: Record<string, { nif: string; tel: string; email: string }> = {
    'María García': { nif: '11111111H', tel: '611 223 344', email: 'maria.garcia@ejemplo.es' },
    'Josep Vidal': { nif: '22222222J', tel: '622 334 455', email: 'josep.vidal@ejemplo.es' },
    'Nuria Castro': { nif: '33333333P', tel: '633 445 566', email: 'nuria.castro@ejemplo.es' },
    'Hotel Guadalquivir': { nif: 'B44444444', tel: '954 112 233', email: 'reservas@hotelguadalquivir.es' },
    'Instal·lacions Roca': { nif: 'B55555555', tel: '972 334 455', email: 'info@installacionsroca.cat' },
    'Rocío Delgado': { nif: '66666666Q', tel: '666 778 899', email: 'rocio.delgado@ejemplo.es' },
}

function deProyectos(): ClienteDemo[] {
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

    return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export const mockClientes = {
    all: (q?: string): ClienteDemo[] => {
        const todos = deProyectos()
        if (!q) return todos
        const t = q.toLowerCase()
        return todos.filter((c) =>
            [c.nombre, c.nif, c.telefono, c.direccion]
                .filter(Boolean)
                .some((v) => v!.toLowerCase().includes(t))
        )
    },

    byId: (id: string): ClienteDemo | undefined =>
        deProyectos().find((c) => c.id === id),

    /** Gli espedienti di un cliente. In demo si legano per nome. */
    expedientes: (id: string): Project[] => {
        const c = deProyectos().find((x) => x.id === id)
        if (!c) return []
        return mockDb
            .getProjects()
            .filter((p) => p.client_name?.trim() === c.nombre)
            .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    },
}

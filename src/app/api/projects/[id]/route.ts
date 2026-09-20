import { createClient } from '@/lib/supabaseServer'
import { mockDb } from '@/lib/mockDb'
import { quienLlama, soloAgencia, negado, prohibido } from '@/lib/auth/guard'
import { enviar, debeAvisar } from '@/lib/notify/email'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const id = (await params).id
    const supabase = await createClient()

    // Real DB Fetch
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        // Mock Fallback
        const mockProject = mockDb.getProjectById(id)
        if (mockProject) {
            return NextResponse.json({ data: mockProject })
        }
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Solo l'agenzia. Prima bastava una sessione qualsiasi, e le regole di
    // riga lasciano all'installatore la modifica dei PROPRI espedienti:
    // messe insieme, le due cose gli permettevano di approvarsi la pratica
    // da solo, azzerare la quota dell'agenzia e riscriversi il risparmio
    // riconosciuto. Chi fa il lavoro non e chi lo verifica.
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!(await soloAgencia())) return prohibido()

    const id = (await params).id
    const body = await request.json()
    const supabase = await createClient()

    // Real DB Update
    const { data, error } = await supabase
        .from('projects')
        .update(body)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        // Ripiego sull'archivio in memoria: accetta qualsiasi campo, non solo
        // lo stato, perché in approvazione si fissano anche risparmio e margine.
        const updated = mockDb.updateProject(id, body)
        if (updated) {
            // La notifica non deve mai far fallire il salvataggio: enviar()
            // non solleva eccezioni e restituisce false se non parte.
            if (body.status && debeAvisar(body.status)) {
                void enviar(
                    {
                        expedienteId: updated.id,
                        clienteNombre: updated.client_name,
                        estado: body.status,
                        motivo: body.admin_feedback,
                        enlace: `/installer/project/${updated.id}`,
                    },
                    { email: '', rol: 'installer' } // DA COLLEGARE: email dal profilo
                )
            }
            return NextResponse.json({ data: updated })
        }
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
}

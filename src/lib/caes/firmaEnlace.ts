import { createAdminClient } from '@/lib/supabaseAdmin'
import { mockDb } from '@/lib/mockDb'
import { plantillaPorId } from './pdf'
import { cargarProyecto, type Proyecto } from './servidor'

/**
 * Chi apre un link di firma, cosa gli stiamo chiedendo di firmare.
 *
 * Sta in un file suo e non dentro la rotta perché lo chiedono in due —
 * la rotta che raccoglie la firma e quella che serve il PDF da leggere
 * — e perché un `route.ts` che esporta funzioni proprie non è un
 * `route.ts`: Next controlla i nomi che un file di rotta esporta.
 */

function vigente(caduca?: string | null): boolean {
    return !caduca || Date.parse(caduca) >= Date.now()
}

type Pedido = {
    p: Proyecto & {
        firma_plantilla?: string | null
        firma_rol?: string | null
        firma_nota?: string | null
    }
    plantillaId: string
    rol: string
    nota: string | null
}

/**
 * Cosa si sta chiedendo di firmare.
 *
 * Scaduto, revocato e mai esistito rispondono uguale: una risposta
 * diversa direbbe a chi prova indirizzi che quel token è esistito.
 */
export async function abrir(token: string): Promise<Pedido | null> {
    const admin = createAdminClient()
    let fila: Record<string, unknown> | null = null

    if (admin) {
        const { data } = await admin
            .from('projects')
            .select('id, firma_caduca, firma_plantilla, firma_rol, firma_nota')
            .eq('firma_token', token)
            .maybeSingle()
        if (data) fila = data as Record<string, unknown>
    }
    if (!fila) {
        const demo = mockDb.getProjects().find((x) => x.firma_token === token)
        if (demo) fila = demo as unknown as Record<string, unknown>
    }
    if (!fila) return null
    if (!vigente(fila.firma_caduca as string | undefined)) return null

    const plantillaId = String(fila.firma_plantilla ?? '')
    const rol = String(fila.firma_rol ?? '')
    if (!plantillaPorId(plantillaId) || !rol) return null

    const p = await cargarProyecto(String(fila.id))
    if (!p) return null

    return {
        p,
        plantillaId,
        rol,
        nota: (fila.firma_nota as string | null) ?? null,
    }
}

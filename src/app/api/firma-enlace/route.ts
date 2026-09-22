import { NextResponse } from 'next/server'
import { soloAgencia, negado } from '@/lib/auth/guard'
import { plantillaPorId } from '@/lib/caes/pdf'
import { faltanEn } from '@/lib/caes/plantillas'
import {
    cargarProyecto,
    datosDelExpediente,
    guardarEnProyecto,
} from '@/lib/caes/servidor'

/**
 * Creare e uccidere il link con cui il cliente firma da casa sua.
 *
 * ── PERCHÉ IL LINK PORTA DENTRO CHI E COSA ────────────────────────────
 *
 * Il token non dice solo «entra»: dice quale documento e quale ruolo.
 * Deciderlo qui e non là vuol dire che chi apre il link non sceglie
 * niente — apre una cosa sola, firma per un ruolo solo, e finisce.
 *
 * ── PERCHÉ NON SI MANDA UN BORRADOR ───────────────────────────────────
 *
 * Il controllo sta anche sulla porta pubblica, ma serve prima: mandare
 * un link che si apre e dice «no se puede firmar» fa fare al cliente un
 * giro a vuoto e a noi una telefonata.
 */

/** Una settimana: il tempo di aprirlo con calma, non di dimenticarlo. */
const DIAS = 7

export async function POST(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const body = (await request.json().catch(() => null)) as {
        id?: string
        plantilla?: string
        rol?: string
        nota?: string
    } | null

    const id = String(body?.id ?? '').trim()
    const plantilla = plantillaPorId(String(body?.plantilla ?? '').trim())
    const rol = String(body?.rol ?? '').trim()

    if (!id || !plantilla) {
        return NextResponse.json({ error: 'Falta el documento' }, { status: 400 })
    }

    const roles = plantilla.bloques.flatMap((b) =>
        b.tipo === 'firmas' ? b.partes.map((x) => x.rol) : []
    )
    if (!roles.includes(rol)) {
        return NextResponse.json(
            { error: 'Ese firmante no existe en este documento' },
            { status: 400 }
        )
    }

    const p = await cargarProyecto(id)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const datos = await datosDelExpediente(p)
    const faltan = faltanEn(plantilla, datos)
    if (faltan.length > 0) {
        return NextResponse.json(
            {
                error: `Faltan ${faltan.length} datos. No se manda a firmar un borrador.`,
                faltan: faltan.map((h) => h.label),
            },
            { status: 409 }
        )
    }

    if ((p.firmas?.[plantilla.id]?.firmas ?? []).some((f) => f.rol === rol)) {
        return NextResponse.json({ error: 'Ya ha firmado' }, { status: 409 })
    }

    const token = crypto.randomUUID()
    const caduca = new Date(Date.now() + DIAS * 86_400_000).toISOString()
    const nota = String(body?.nota ?? '').slice(0, 300) || null

    const guardado = await guardarEnProyecto(id, {
        firma_token: token,
        firma_caduca: caduca,
        firma_plantilla: plantilla.id,
        firma_rol: rol,
        firma_nota: nota,
    })
    if (!guardado) {
        return NextResponse.json(
            { error: 'No se ha podido crear el enlace.' },
            { status: 502 }
        )
    }

    return NextResponse.json({
        data: {
            firma_token: token,
            firma_caduca: caduca,
            firma_rol: rol,
            firma_plantilla: plantilla.id,
            firma_nota: nota,
        },
    })
}

/** Ucciderlo. Sta accanto al link e non nascosto: i secondi contano. */
export async function DELETE(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const id = new URL(request.url).searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ error: 'Falta el expediente' }, { status: 400 })

    const guardado = await guardarEnProyecto(id, {
        firma_token: undefined,
        firma_caduca: undefined,
        firma_plantilla: undefined,
        firma_rol: undefined,
        firma_nota: undefined,
    })
    if (!guardado) {
        return NextResponse.json({ error: 'No se ha podido anular.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
}

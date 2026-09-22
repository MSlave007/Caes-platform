import { NextResponse } from 'next/server'
import { soloAgencia, negado } from '@/lib/auth/guard'
import { plantillaPorId } from '@/lib/caes/pdf'
import { leerFirmado } from '@/lib/caes/archivoFirmado'
import { cargarProyecto, numeroCorto } from '@/lib/caes/servidor'

/**
 * Il foglio com'era quando quella persona l'ha firmato.
 *
 * ── PERCHÉ NON BASTA SCARICARE IL DOCUMENTO ───────────────────────────
 *
 * Perché quello che si scarica dal fascicolo si ricompone adesso: con i
 * dati di adesso, con il renderer di adesso, con la firma spostata dove
 * qualcuno l'ha messa stamattina. È il documento buono, ed è giusto che
 * sia così.
 *
 * Questa è un'altra cosa: è il foglio esatto che quella persona aveva
 * davanti nel momento in cui ha premuto «Firmar». Serve una volta ogni
 * mille, e quella volta non c'è altro modo di averlo.
 *
 * ── PERCHÉ NON HA UN LINK PUBBLICO ────────────────────────────────────
 *
 * Perché è un Convenio firmato: NIF, indirizzo, telefono e una firma
 * autografa. Si scarica da dentro, dopo aver verificato il ruolo.
 */

export async function GET(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    const cual = url.searchParams.get('plantilla')?.trim() ?? ''
    const rol = url.searchParams.get('rol')?.trim() ?? ''

    const plantilla = plantillaPorId(cual)
    if (!id || !plantilla) {
        return NextResponse.json({ error: 'Falta el documento' }, { status: 400 })
    }

    const p = await cargarProyecto(id)
    const firma = p?.firmas?.[cual]?.firmas.find((f) => f.rol === rol)

    if (!firma?.archivo) {
        // Le firme raccolte prima che si archiviasse non hanno copia. Si
        // dice, invece di dare un file sbagliato.
        return NextResponse.json(
            { error: 'De esa firma no se guardó copia.' },
            { status: 404 }
        )
    }

    const bytes = await leerFirmado(firma.archivo)
    if (!bytes) {
        return NextResponse.json(
            { error: 'La copia ya no está en el almacén.' },
            { status: 404 }
        )
    }

    const quien_ = rol.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const nombre = `${cual}-${numeroCorto(p!.id)}-${quien_}-firmado.pdf`

    return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${nombre}"`,
            'Cache-Control': 'no-store, max-age=0',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    })
}

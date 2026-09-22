import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { negado, soloAgencia } from '@/lib/auth/guard'
import { mockDb } from '@/lib/mockDb'

/**
 * Gli installatori a cui si può assegnare un espediente.
 *
 * ── PERCHÉ NON BASTAVA QUELLO CHE C'ERA ───────────────────────────────
 *
 * La cartera l'elenco degli installatori se lo ricava dagli espedienti:
 * chi ha mandato qualcosa compare, chi non ha mai mandato niente no.
 * Per guardare chi lavora va bene; per **assegnare** no — l'installatore
 * nuovo, quello che non ha ancora mandato la sua prima pratica, è
 * esattamente quello a cui serve che gliene diamo una.
 *
 * Qui si leggono gli account veri: `profiles` con ruolo `installer`.
 *
 * ── SOLO L'AGENZIA ────────────────────────────────────────────────────
 *
 * È l'elenco di chi lavora con noi, coi loro contatti. Un installatore
 * non ha nessun motivo di sapere chi sono gli altri.
 */
export async function GET() {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const admin = createAdminClient()

    /**
     * I nomi finti solo quando non c'è proprio il database.
     *
     * Prima bastava non avere una sessione — cioè in dimostrazione — e
     * l'elenco diventava «i nomi che compaiono negli espedienti di
     * prova». Ma dare di alta un installatore CREA un account vero
     * (serve la chiave di servizio), e poi quell'account non compariva
     * mai in questa lista.
     *
     * Cioè: creavi una persona e spariva. Il difetto peggiore di tutti —
     * l'azione riesce e non si vede, quindi la rifai.
     *
     * Se il database c'è, si leggono gli account veri. I nomi inventati
     * restano per quando non c'è niente dietro.
     */
    if (!admin) {
        const nombres = [
            ...new Set(
                mockDb
                    .getProjects()
                    .map((p) => p.installer_name)
                    .filter(Boolean) as string[]
            ),
        ].sort()
        return NextResponse.json({
            data: nombres.map((n) => ({ id: `demo-${n}`, nombre: n, email: null })),
            demo: true,
        })
    }

    const { data, error } = await admin
        .from('profiles')
        .select('id, name, company_name, email')
        .eq('role', 'installer')
        .order('company_name', { nullsFirst: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })

    return NextResponse.json({
        data: (data ?? []).map((p) => ({
            id: p.id,
            // La ragione sociale quando c'è: è come si chiamano fra loro
            // e come compare sui documenti. Il nome della persona è il
            // ripiego.
            nombre: p.company_name || p.name || p.email,
            email: p.email,
        })),
    })
}

/* ==================================================================== *
 *  DARE DI ALTA UN INSTALLATORE
 * ==================================================================== */

/**
 * Una password che nessuno deve ricordare.
 *
 * Serve una volta: per entrare la prima volta e cambiarla. Quindi lunga
 * e casuale, non «leggibile al telefono» — si copia e si incolla.
 *
 * `randomBytes` e non `Math.random()`: la seconda è prevedibile, e qui
 * si sta aprendo l'accesso a un account.
 */
function contraseñaNueva(): string {
    return randomBytes(12).toString('base64url')
}

export async function POST(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const body = (await request.json().catch(() => null)) as {
        nombre?: string
        email?: string
        telefono?: string
        empresa?: string
    } | null

    const nombre = String(body?.nombre ?? '').trim().slice(0, 140)
    const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 190)
    const empresa = String(body?.empresa ?? '').trim().slice(0, 140)
    const telefono = String(body?.telefono ?? '').trim().slice(0, 40)

    if (nombre.length < 2) {
        return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })
    }
    // Un controllo minimo, non una convalida di indirizzi: quella la fa
    // il servizio di posta il giorno che gli si scrive, e le espressioni
    // regolari per le email sbagliano sempre qualcosa di legittimo.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return NextResponse.json(
            { error: 'Ese correo no parece un correo' },
            { status: 400 }
        )
    }

    const admin = createAdminClient()
    if (!admin) {
        /**
         * In dimostrazione non si creano account.
         *
         * Fingere che sia andata creerebbe un installatore che compare
         * nell'elenco e non può entrare da nessuna parte — cioè la cosa
         * peggiore, perché si scopre quando qualcuno ci prova.
         */
        return NextResponse.json(
            {
                error: 'Aquí no se pueden crear cuentas: es la versión de demostración.',
            },
            { status: 503 }
        )
    }

    const contraseña = contraseñaNueva()

    const { data, error } = await admin.auth.admin.createUser({
        email,
        password: contraseña,
        // Senza questo resterebbe in attesa di confermare un'email che
        // non gli abbiamo mandato, e non potrebbe entrare.
        email_confirm: true,
        user_metadata: { full_name: nombre },
    })

    if (error || !data.user) {
        const ya = /already|exist|registered|duplicate/i.test(error?.message ?? '')
        console.error('POST /api/instaladores:', error)
        return NextResponse.json(
            {
                error: ya
                    ? 'Ya hay una cuenta con ese correo. Búscala en la lista.'
                    : 'No se ha podido crear la cuenta.',
            },
            { status: ya ? 409 : 502 }
        )
    }

    /**
     * Il profilo lo crea il trigger, con ruolo `installer`.
     *
     * Qui si aggiunge solo quello che il trigger non sa: azienda e
     * telefono. E NON il ruolo — questa rotta non ha nemmeno un campo
     * dove qualcuno possa scrivere `admin`.
     */
    if (empresa || telefono) {
        await admin
            .from('profiles')
            .update({
                ...(empresa ? { company_name: empresa } : {}),
                ...(telefono ? { phone: telefono } : {}),
            })
            .eq('id', data.user.id)
    }

    return NextResponse.json({
        data: {
            id: data.user.id,
            nombre: empresa || nombre,
            email,
            /**
             * Si vede una volta e non si salva.
             *
             * Un elenco di password in chiaro dentro la piattaforma
             * sarebbe un elenco di password in chiaro dentro la
             * piattaforma. Se si perde, si rigenera.
             */
            contraseña,
        },
    })
}

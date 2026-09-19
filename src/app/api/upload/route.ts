import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'
import { quienLlama, negado } from '@/lib/auth/guard'

/**
 * Tipi accettati. Un fascicolo CAES contiene fatture e certificati (PDF) e
 * fotografie della caldaia: nient'altro deve poter entrare.
 */
const TIPOS = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
])

/** 15 MB: una foto da telefono ci sta larga, un video no. */
const MAX_BYTES = 15 * 1024 * 1024

/** Estensione dedotta dal TIPO, mai dal nome del file. */
const EXT: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
}

export async function POST(request: Request) {
    try {
        const quien = await quienLlama()
        if (!quien) return negado()

        const formData = await request.formData()
        const file = formData.get('file') as File
        const bucket = 'documents'

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // Prima non c'era nessuna validazione: si poteva caricare qualsiasi
        // cosa, di qualsiasi dimensione.
        if (!TIPOS.has(file.type)) {
            return NextResponse.json(
                { error: 'Formato no admitido. Solo PDF o fotografía.' },
                { status: 415 }
            )
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { error: 'El archivo supera los 15 MB.' },
                { status: 413 }
            )
        }

        const supabase = await createClient()
        // Il nome lo scriviamo noi: quello dell'utente puo contenere percorsi
        // (../) o caratteri che cambiano la destinazione.
        const fileExt = EXT[file.type] ?? 'bin'
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        // 1. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file)

        if (uploadError) {
            console.warn('Storage upload failed (likely mock mode or permissions):', uploadError.message)
            // In mock mode, we just return a fake URL
            return NextResponse.json({
                url: `https://mock-storage.com/${bucket}/${fileName}`,
                path: filePath,
                mock: true
            })
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return NextResponse.json({ url: publicUrl, path: filePath })

    } catch (error: any) {
        console.error('Upload Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}

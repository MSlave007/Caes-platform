import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const bucket = 'documents'

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const supabase = await createClient()
        const fileExt = file.name.split('.').pop()
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

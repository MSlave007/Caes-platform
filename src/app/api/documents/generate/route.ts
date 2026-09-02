import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, projectData } = body

        // Create a PDF document
        const doc = new PDFDocument()

        // Push to a buffer
        let buffers: any[] = []
        doc.on('data', buffers.push.bind(buffers))

        // Content
        doc.fontSize(20).text(`CAES Platform - Official Document`, { align: 'center' })
        doc.moveDown()
        doc.fontSize(14).text(`Document Type: ${type === 'contract' ? 'Energy Savings Contract' : 'Annex A'}`, { align: 'center' })
        doc.moveDown()

        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`)
        doc.text(`Project ID: ${projectData.id}`)
        doc.text(`Client: ${projectData.client_name}`)
        doc.text(`Installer: ${projectData.installer_name}`)
        doc.moveDown()

        doc.text(`Terms and Conditions:`)
        doc.fontSize(10).text(`
        1. The installer agrees to provide accurate data regarding the energy efficiency upgrade.
        2. The CAE credits generated will be managed by the platform administrator.
        3. The estimated savings of ${projectData.savings_eur} EUR are based on standard calculations.
        `)

        doc.moveDown()
        doc.text(`(Signed Electronically)`, { align: 'right' })

        doc.end()

        // Wait for streaming to finish
        const pdfBuffer = await new Promise<Buffer>((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers)
                resolve(pdfData)
            })
        })

        // I tipi dei typed array ora distinguono il buffer sottostante, e un
        // Buffer di Node non passa più come BodyInit. Ricopiarlo in un
        // Uint8Array su ArrayBuffer risolve senza forzature di tipo.
        const pdfBody = Uint8Array.from(pdfBuffer)

        return new NextResponse(pdfBody, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${type}_${projectData.id}.pdf"`
            }
        })

    } catch (error: any) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

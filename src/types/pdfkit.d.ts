/**
 * pdfkit non porta i propri tipi e @types/pdfkit non è installato.
 * Dichiarazione minima per non lasciare un `any` implicito che blocca
 * il typecheck: quando si installeranno i tipi veri, questo file sparisce.
 */
declare module 'pdfkit' {
    import { Readable } from 'node:stream'

    interface PDFDocumentOptions {
        size?: string | [number, number]
        margin?: number
        margins?: { top: number; bottom: number; left: number; right: number }
        info?: Record<string, string>
        bufferPages?: boolean
    }

    class PDFDocument extends Readable {
        constructor(options?: PDFDocumentOptions)
        page: { width: number; height: number; margins: Record<string, number> }
        y: number
        x: number
        font(name: string, size?: number): this
        fontSize(size: number): this
        fillColor(color: string): this
        strokeColor(color: string): this
        lineWidth(width: number): this
        text(text: string, options?: Record<string, unknown>): this
        text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this
        moveDown(lines?: number): this
        moveTo(x: number, y: number): this
        lineTo(x: number, y: number): this
        stroke(): this
        rect(x: number, y: number, w: number, h: number): this
        fill(color?: string): this
        addPage(options?: PDFDocumentOptions): this
        image(src: string | Buffer, x?: number, y?: number, options?: Record<string, unknown>): this
        end(): void
    }

    export = PDFDocument
}

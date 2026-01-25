import { NextResponse } from 'next/server'

// Mock response simulating Claude 3.5 Sonnet analysis
const MOCK_EXTRACTION = {
    make: "Ariston",
    model: "Nuos Plus Wi-Fi 250",
    serial_number: "320198745612",
    type: "Aerothermal",
    power_kw: 2.5,
    confidence: 0.98,
    legacy_system: "Electric Heater (Resistive)",
    estimated_savings_eur: 450
}

export async function POST(request: Request) {
    try {
        const { fileUrl, fileType } = await request.json()

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 2500))

        console.log(`[Mock AI] Analyzing ${fileType} at ${fileUrl}...`)

        // In a real app, we would call Anthropic API here:
        // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        // const msg = await anthropic.messages.create({ ... })

        return NextResponse.json({
            success: true,
            data: MOCK_EXTRACTION,
            analysis_id: `ana_${Date.now()}`
        })

    } catch (error: any) {
        return NextResponse.json(
            { error: 'AI Extraction Failed', details: error.message },
            { status: 500 }
        )
    }
}

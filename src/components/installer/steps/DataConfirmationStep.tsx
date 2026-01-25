'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Zap } from 'lucide-react'

interface DataConfirmationStepProps {
    onNext: (data: any) => void
    onBack: () => void
    initialData: any
}

export function DataConfirmationStep({ onNext, onBack, initialData }: DataConfirmationStepProps) {
    const [formData, setFormData] = useState({
        clientName: initialData.extracted?.clientName || 'Juan Perez',
        address: initialData.extracted?.address || 'Calle Gran Vía 12, Madrid',
        make: initialData.extracted?.make || 'Ariston',
        model: initialData.extracted?.model || 'Nuos Plus',
        serialNumber: initialData.extracted?.serialNumber || 'SN987654321',
        legacySystem: initialData.extracted?.legacySystem || 'Electric Heater',
    })

    const handleChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }))
    }

    useEffect(() => {
        // Trigger AI extraction if not already done
        const performExtraction = async () => {
            // Mocking the input file URL
            try {
                const res = await fetch('/api/extract', {
                    method: 'POST',
                    body: JSON.stringify({ fileUrl: 'mock-url', fileType: 'invoice' })
                })
                const { data } = await res.json()
                if (data) console.log("AI Data:", data)
            } catch (e) {
                console.error("AI Extraction error", e)
            }
        }
        performExtraction()
    }, [])

    const handleConfirm = () => {
        onNext({
            extracted: formData
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Confirm Details</h2>
                <p className="text-sm text-slate-400">
                    Please verify the information extracted from your documents.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Make (Brand)</Label>
                    <Input
                        value={formData.make}
                        onChange={(e) => handleChange('make', e.target.value)}
                        className="bg-slate-800 border-slate-700"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                        value={formData.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className="bg-slate-800 border-slate-700"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Power (kW)</Label>
                        <Input
                            type="number"
                            value={formData.power}
                            onChange={(e) => handleChange('power', parseFloat(e.target.value))}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(val) => handleChange('type', val)}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aerothermal">Aerothermal</SelectItem>
                                <SelectItem value="gas">Gas Boiler</SelectItem>
                                <SelectItem value="electric">Electric</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input
                        value={formData.serial}
                        onChange={(e) => handleChange('serial', e.target.value)}
                        className="bg-slate-800 border-slate-700 font-mono"
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={onBack} className="flex-1 border-slate-700 text-slate-300">
                    Back
                </Button>
                <Button onClick={handleNext} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                    Confirm & Next
                </Button>
            </div>
        </div>
    )
}

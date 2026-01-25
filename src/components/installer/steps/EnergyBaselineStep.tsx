'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, AlertTriangle } from 'lucide-react'

interface EnergyBaselineStepProps {
    onNext: (data: any) => void
    onBack: () => void
    initialData: any
}

export function EnergyBaselineStep({ onNext, onBack, initialData }: EnergyBaselineStepProps) {
    const [annualCost, setAnnualCost] = useState<string>(initialData.annualCost || '')
    const [calculation, setCalculation] = useState<any>(null)

    // Mock calculation logic
    useEffect(() => {
        if (!annualCost) {
            setCalculation(null)
            return
        }

        const cost = parseFloat(annualCost)
        if (isNaN(cost)) return

        // Formula from regulations (simplified for mock):
        // Old kWh = cost / 0.13
        // New kWh = Old kWh * 0.25 (assuming 75% savings for Aerothermal)
        // Savings = Old - New
        // Savings EUR = Savings * 0.086

        const oldKwh = cost / 0.13
        const newKwh = oldKwh * 0.25
        const savingsKwh = oldKwh - newKwh
        const savingsEur = savingsKwh * 0.086
        const savingsPercent = (savingsKwh / oldKwh) * 100

        setCalculation({
            savingsKwh: Math.round(savingsKwh),
            savingsEur: savingsEur.toFixed(2),
            savingsPercent: Math.round(savingsPercent),
            isEligible: savingsPercent >= 20
        })
    }, [annualCost])

    const handleNext = () => {
        onNext({
            annualCost,
            calculation
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Energy Baseline</h2>
                <p className="text-sm text-slate-400">
                    Enter the client's previous annual energy cost to calculate potential savings.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Annual Energy Cost (€)</Label>
                    <div className="relative">
                        <Input
                            type="number"
                            value={annualCost}
                            onChange={(e) => setAnnualCost(e.target.value)}
                            className="bg-slate-800 border-slate-700 pl-8 text-lg"
                            placeholder="e.g. 1200"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                    </div>
                </div>

                {calculation && (
                    <div className={`p-4 rounded-xl border ${calculation.isEligible
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-orange-500/10 border-orange-500/20'
                        } animate-in zoom-in-95 duration-300`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${calculation.isEligible ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'
                                }`}>
                                {calculation.isEligible ? <Zap className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-300">Estimated Annual Savings</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <h3 className={`text-3xl font-bold ${calculation.isEligible ? 'text-emerald-400' : 'text-orange-400'
                                        }`}>
                                        €{calculation.savingsEur}
                                    </h3>
                                    <span className="text-sm text-slate-500">
                                        ({calculation.savingsPercent}%)
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {calculation.savingsKwh} kWh/year saved based on standard usage.
                                </p>
                                {!calculation.isEligible && (
                                    <p className="text-xs text-orange-400 mt-2 font-medium">
                                        Warning: Savings below 20% threshold. May not be eligible.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={onBack} className="flex-1 border-slate-700 text-slate-300">
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={!annualCost || !calculation}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                    Calculate & Next
                </Button>
            </div>
        </div>
    )
}

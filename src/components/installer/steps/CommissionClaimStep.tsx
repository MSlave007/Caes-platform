'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Lock } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'

interface CommissionClaimStepProps {
    onBack: () => void
    initialData: any
}

export function CommissionClaimStep({ onBack, initialData }: CommissionClaimStepProps) {
    const [commissionPercent, setCommissionPercent] = useState<number>(15)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const totalSavingsEur = parseFloat(initialData.calculation?.savingsEur || '0')
    const commissionEur = (totalSavingsEur * (commissionPercent / 100)).toFixed(2)

    const handleSubmit = async () => {
        setIsSubmitting(true)

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Create Project Payload
        const payload = {
            client_name: initialData.extracted?.clientName || 'Unknown Client',
            installer_name: 'Demo Installer', // Should come from auth
            status: 'submitted',
            savings_eur: totalSavingsEur,
            address: initialData.extracted?.address || 'Unknown Address',
            make: initialData.extracted?.make || 'Generic',
            model: initialData.extracted?.model || 'Generic',
            documents: initialData.fileUrls || {} // Pass the real file URLs
        }

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Submission failed')

            // Trigger confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#059669']
            })

            // Redirect
            setTimeout(() => {
                router.push('/installer/dashboard')
            }, 1000)
        } catch (e) {
            console.error(e)
            alert('Failed to submit project')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Your Commission</h2>
                <p className="text-sm text-muted-foreground">
                    Select the percentage of the savings you want to claim as your commission.
                </p>
            </div>

            <div className="p-6 bg-card rounded-xl border border-border space-y-8 shadow-sm">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">You will earn</p>
                    <h3 className="text-4xl font-bold text-primary">€{commissionEur}</h3>
                    <p className="text-xs text-muted-foreground mt-2">per year for 5 years*</p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">0%</span>
                        <span className="font-bold text-foreground">{commissionPercent}%</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> 30% Max</span>
                    </div>
                    <Slider
                        value={[commissionPercent]}
                        onValueChange={(vals) => setCommissionPercent(vals[0])}
                        max={30}
                        step={1}
                        className="py-4"
                    />
                </div>

                <div className="bg-muted p-4 rounded-lg text-xs text-muted-foreground">
                    <p>Total Project Value: <span className="text-foreground">€{totalSavingsEur}</span></p>
                    <p>Platform Fee & Admin: <span className="text-foreground">€{(totalSavingsEur - parseFloat(commissionEur)).toFixed(2)}</span></p>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1">
                    Back
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Project'}
                </Button>
            </div>
        </div>
    )
}

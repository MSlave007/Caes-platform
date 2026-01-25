'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, Download, FileText, AlertTriangle, Eye } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'

export function ProjectReviewForm({ project }: { project: any }) {
    const router = useRouter()
    const [adminMargin, setAdminMargin] = useState(65)
    const [isApproved, setIsApproved] = useState(project.status === 'approved')
    const [isSaving, setIsSaving] = useState(false)

    // Real Calculations
    const PROJECT_VALUE_EUR = project.savings_eur || 0
    // If savings are 0 (e.g. draft), assume a dummy base to show calculations
    const displayValue = PROJECT_VALUE_EUR > 0 ? PROJECT_VALUE_EUR : 0

    // Logic: Installer gets X%, Admin gets Y% of remainder
    // This is just a sample logic
    const INSTALLER_PERCENT = 25

    const installerCut = displayValue * (INSTALLER_PERCENT / 100)
    const remainder = displayValue - installerCut
    const adminCut = remainder * (adminMargin / 100)

    const handleApprove = async () => {
        setIsSaving(true)
        try {
            // Call API to update status
            const res = await fetch('/api/projects', {
                method: 'POST', // or explicit /api/approve route if we had one
                body: JSON.stringify({ id: project.id, status: 'approved' })
            })

            if (res.ok) {
                setIsApproved(true)
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399']
                })
                setTimeout(() => {
                    router.push('/admin/dashboard')
                }, 2000)
            }
        } catch (e) {
            console.error(e)
            alert('Failed to approve')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto pr-2 pb-20">
            <div>
                <h3 className="font-semibold text-foreground mb-4">Extracted Data</h3>

                {/* Verification Form */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Make</Label>
                            <Input defaultValue={project.make || ''} className="bg-background border-border h-8" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Model</Label>
                            <Input defaultValue={project.model || ''} className="bg-background border-border h-8" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Client Name</Label>
                            <Input defaultValue={project.client_name || ''} className="bg-background border-border h-8" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Address</Label>
                            <Input defaultValue={project.address || ''} className="bg-background border-border h-8" />
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-border" />

            {/* Document Drafts Preview */}


            <Separator className="bg-border" />

            {/* Financials & Margin */}
            <div>
                <h3 className="font-semibold text-foreground mb-4">Margin & Approval</h3>

                <Card className="bg-card border-border shadow-sm mb-6">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Project Savings</span>
                            <span className="font-bold text-foreground">€{displayValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Installer Cut ({INSTALLER_PERCENT}%)</span>
                            <span className="text-foreground">-€{installerCut.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-border" />

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-primary font-medium">Your Margin</span>
                                <span className="font-bold text-primary">{adminMargin}%</span>
                            </div>
                            <Slider
                                value={[adminMargin]}
                                onValueChange={(vals) => setAdminMargin(vals[0])}
                                max={100}
                                step={5}
                                className="py-2"
                            />
                            <div className="text-right text-xs text-muted-foreground">
                                Admin Revenue: <span className="text-foreground font-bold ml-1">€{adminCut.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                    <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10">
                        <X className="mr-2 h-4 w-4" />
                        Reject
                    </Button>
                    <div className="flex-1 flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-primary text-primary hover:bg-primary/10"
                            onClick={async () => {
                                alert('In a real app, this would open the generated PDF.')
                            }}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                        </Button>
                        <Button
                            className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleApprove}
                            disabled={isApproved || isSaving}
                        >
                            <Check className="mr-2 h-4 w-4" />
                            {isApproved ? 'Approved' : isSaving ? 'Approving...' : 'Approve'}
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 justify-center text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Approve generates final legal documents.</span>
                </div>
            </div>
        </div>
    )
}

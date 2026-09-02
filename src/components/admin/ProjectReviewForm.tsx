'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, Download, FileText, AlertTriangle, Eye, Send } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'

export function ProjectReviewForm({ project }: { project: any }) {
    const router = useRouter()
    const [adminMargin, setAdminMargin] = useState(65)
    const [isApproved, setIsApproved] = useState(project.status === 'approved')
    const [isSaving, setIsSaving] = useState(false)
    const [isRequestingChanges, setIsRequestingChanges] = useState(false)
    const [feedback, setFeedback] = useState('')

    // ... existing calculations ...

    const handleRequestChanges = async () => {
        setIsSaving(true)
        try {
            await fetch('/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    id: project.id,
                    status: 'draft',
                    admin_feedback: feedback
                })
            })
            router.push('/admin/dashboard')
        } catch (e) {
            console.error(e)
            alert('Failed to update')
        } finally {
            setIsSaving(false)
        }
    }

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

                <Card className="bg-white border border-slate-200 shadow-sm mb-6 rounded-xl overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                        {/* Breakdown */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Project Savings</span>
                                <span className="font-bold text-slate-900 text-lg">€{displayValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Installer Cut ({INSTALLER_PERCENT}%)</span>
                                <span className="text-slate-500">-€{installerCut.toFixed(2)}</span>
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* Interactive Slider Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wide">Your Margin</span>
                                <span className="font-bold text-emerald-600 text-xl">{adminMargin}%</span>
                            </div>

                            <div className="px-1">
                                <Slider
                                    value={[adminMargin]}
                                    onValueChange={(vals) => setAdminMargin(vals[0])}
                                    max={100}
                                    step={1}
                                    className="py-4 cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end items-end gap-2 pt-2">
                                <span className="text-slate-400 text-sm mb-1">Admin Revenue:</span>
                                <span className="text-slate-900 font-extrabold text-2xl tracking-tight">€{adminCut.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                {!isRequestingChanges ? (
                    <div className="flex gap-4 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-10 rounded-lg"
                            onClick={() => setIsRequestingChanges(true)}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Request Changes
                        </Button>
                        <div className="flex-[2] flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 h-10 rounded-lg"
                                onClick={async () => {
                                    alert('In a real app, this would open the generated PDF.')
                                }}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-lg shadow-sm shadow-emerald-200"
                                onClick={handleApprove}
                                disabled={isApproved || isSaving}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                {isApproved ? 'Approved' : isSaving ? 'Approving...' : 'Approve'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-semibold text-slate-700">Reason for returning to Draft</Label>
                            <Button variant="ghost" size="sm" onClick={() => setIsRequestingChanges(false)} className="h-6 w-6 p-0 text-slate-400">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Please explain what needs to be corrected..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsRequestingChanges(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={handleRequestChanges}
                                disabled={!feedback || isSaving}
                            >
                                <Send className="mr-2 h-3 w-3" />
                                {isSaving ? 'Sending...' : 'Send Back to Installer'}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex items-center gap-2 justify-center bg-amber-50 border border-amber-100 text-amber-600 p-2 rounded-lg text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Approve generates final legal documents.</span>
                </div>
            </div>
        </div>
    )
}

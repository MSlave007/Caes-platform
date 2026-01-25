'use client'

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { DocumentationStep } from './steps/DocumentationStep'
import { PhotosStep } from './steps/PhotosStep'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import confetti from 'canvas-confetti'

interface ProjectWizardProps {
    initialData?: any
}

export default function ProjectWizard({ initialData }: ProjectWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [projectData, setProjectData] = useState<any>(initialData || {
        status: 'draft',
        documents: {}
    })
    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()

    const updateData = (data: any) => {
        setProjectData((prev: any) => ({ ...prev, ...data }))
    }

    const handleNext = (data?: any) => {
        if (data) updateData(data)
        if (currentStep === 4) {
            submitProject('submitted') // Final submission
        } else {
            setCurrentStep((prev) => Math.min(prev + 1, 4))
        }
    }

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1))
    }

    const saveDraft = async (data?: any) => {
        if (data) updateData(data)
        await submitProject('draft', data)
    }

    const submitProject = async (status: string, currentStepData?: any) => {
        setIsSaving(true)
        try {
            const payload = {
                ...projectData,
                ...currentStepData,
                status: status,
                // Ensure required fields have defaults if saving draft early
                installer_name: 'Demo Installer',
                client_name: projectData.client_name || currentStepData?.client_name || 'Draft Project',
            }

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || errorData.details?.message || 'Failed to save')
            }

            if (status === 'submitted') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399', '#059669']
                })
                router.push('/installer/dashboard')
            } else {
                alert('Draft saved successfully!')
                router.push('/installer/dashboard')
            }

        } catch (error: any) {
            console.error(error)
            alert(`Error: ${error.message || 'Failed to save project'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <BasicInfoStep onNext={handleNext} onSaveDraft={saveDraft} initialData={projectData} />
            case 2:
                return <DocumentationStep onNext={handleNext} onBack={handleBack} onSaveDraft={saveDraft} initialData={projectData} />
            case 3:
                return <PhotosStep onNext={handleNext} onBack={handleBack} onSaveDraft={saveDraft} initialData={projectData} />
            case 4:
                // Simple Review for now, can reuse basic info visualization or create specific Review Step
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold">Ready to Submit?</h2>
                            <p className="text-slate-500">Review your information before final submission.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                            <p><span className="font-semibold">Client:</span> {projectData.client_name}</p>
                            <p><span className="font-semibold">Address:</span> {projectData.address}</p>
                            <p><span className="font-semibold">Documents:</span> {Object.keys(projectData.documents || {}).length} files attached</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={handleBack}>Back</Button>
                            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleNext()}>
                                {isSaving ? 'Submitting...' : 'Confirm Submission'}
                            </Button>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    const steps = [
        { id: 1, label: 'Basics' },
        { id: 2, label: 'Docs' },
        { id: 3, label: 'Photos' },
        { id: 4, label: 'Review' },
    ]

    return (
        <div className="max-w-xl mx-auto pb-20">
            {/* Clickable Stepper Header */}
            <div className="mb-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <Button variant="ghost" asChild className="text-slate-500 hover:text-emerald-600 gap-2 pl-0">
                        <Link href="/installer/dashboard">
                            <ArrowLeft className="h-5 w-5" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <div className="text-right">
                        <h1 className="text-lg font-bold text-slate-900">
                            {initialData ? 'Edit Project' : 'New Project'}
                        </h1>
                        {initialData && <p className="text-xs text-slate-400">ID: {initialData.id.slice(0, 8)}...</p>}
                    </div>
                </div>

                <div className="relative flex justify-between">
                    {/* Connecting Line */}
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                    <div
                        className="absolute top-4 left-0 h-0.5 bg-emerald-500 -z-10 transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                    />

                    {steps.map((step) => {
                        const isCompleted = currentStep > step.id
                        const isActive = currentStep === step.id

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center gap-2 cursor-pointer group"
                                onClick={() => setCurrentStep(step.id)}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${isActive ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30' :
                                    isCompleted ? 'bg-emerald-100 border-emerald-500 text-emerald-600' :
                                        'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
                                    }`}>
                                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                                </div>
                                <span className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'text-emerald-600' : 'text-slate-400'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-8 shadow-sm">
                {renderStep()}
            </div>
        </div>
    )
}

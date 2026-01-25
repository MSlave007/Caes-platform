'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, CheckCircle2, Building2, Zap, Calculator, BarChart3, MapPin, Home, Euro, Leaf } from 'lucide-react'

// --- Types ---
type SimulatorData = {
    province: string
    propertyType: 'residential' | 'commercial' | 'industrial'
    monthlyBill: number
    heatingSystem: 'gas' | 'oil' | 'electric'
    projectCost: number
}

// --- Steps Configuration ---
const STEPS = [
    {
        id: 1,
        title: 'Basics',
        description: 'Location and property type',
        icon: Building2
    },
    {
        id: 2,
        title: 'Energy',
        description: 'Current consumption details',
        icon: Zap
    },
    {
        id: 3,
        title: 'Investment',
        description: 'Project cost estimation',
        icon: Euro
    },
    {
        id: 4,
        title: 'Results',
        description: 'Your potential savings',
        icon: BarChart3
    }
]

export default function SimulatorPage() {
    const [currentStep, setCurrentStep] = useState(1)
    const [data, setData] = useState<SimulatorData>({
        province: '',
        propertyType: 'residential',
        monthlyBill: 150,
        heatingSystem: 'gas',
        projectCost: 8000
    })

    const nextStep = () => setCurrentStep(Math.min(currentStep + 1, 4))
    const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1))

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Simple Header */}
            <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
                    <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <Calculator className="h-5 w-5" />
                    </div>
                    CAES <span className="text-slate-400 font-medium">Simulator</span>
                </Link>
                <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                    Exit Simulator
                </Link>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                <div className="grid md:grid-cols-12 gap-8 md:gap-16 items-start h-full">

                    {/* LEFT: Vertical Stepper */}
                    <div className="md:col-span-4 lg:col-span-3 sticky top-24 hidden md:block">
                        <div className="space-y-8">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">ROI Calculator</h1>
                                <p className="text-slate-500 text-sm">Calculate your Energy Efficiency Certificate value in 2 minutes.</p>
                            </div>

                            <div className="relative">
                                {/* Connecting Line */}
                                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200" />

                                <div className="space-y-6 relative z-10">
                                    {STEPS.map((step) => {
                                        const isActive = step.id === currentStep
                                        const isCompleted = step.id < currentStep

                                        return (
                                            <div key={step.id} className="flex items-start gap-4 group">
                                                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-white ${isActive ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 scale-110' :
                                                        isCompleted ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                                                    }`}>
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                                    ) : (
                                                        <step.icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                    )}
                                                </div>
                                                <div className={`pt-2 transition-colors duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                                    <h3 className={`font-bold text-sm ${isActive ? 'text-emerald-900' : 'text-slate-900'}`}>{step.title}</h3>
                                                    <p className="text-xs text-slate-500">{step.description}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Form Wizard */}
                    <div className="md:col-span-8 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10 min-h-[500px] flex flex-col justify-between relative overflow-hidden">

                        {/* Mobile Step Indicator */}
                        <div className="md:hidden flex items-center gap-2 mb-8 text-sm font-medium text-slate-500">
                            <span className="text-emerald-600">Step {currentStep}</span> of 4: {STEPS[currentStep - 1].title}
                        </div>

                        <div className="flex-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    {currentStep === 1 && (
                                        <div className="space-y-6">
                                            <h2 className="text-2xl font-bold text-slate-900">Let's verify your location</h2>
                                            <p className="text-slate-500">Subsidies and CAE values vary by climate zone.</p>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-700">Province</label>
                                                    <select
                                                        className="w-full p-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50 hover:bg-white transition-colors"
                                                        value={data.province}
                                                        onChange={(e) => setData({ ...data, province: e.target.value })}
                                                    >
                                                        <option value="">Select Province</option>
                                                        <option value="madrid">Madrid</option>
                                                        <option value="barcelona">Barcelona</option>
                                                        <option value="valencia">Valencia</option>
                                                        <option value="sevilla">Sevilla</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-700">Property Type</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={() => setData({ ...data, propertyType: 'residential' })}
                                                            className={`p-4 rounded-xl border text-center transition-all ${data.propertyType === 'residential' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:border-slate-300'}`}
                                                        >
                                                            <Home className="h-6 w-6 mx-auto mb-2 opacity-80" />
                                                            <span className="text-sm font-medium">Home</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setData({ ...data, propertyType: 'commercial' })}
                                                            className={`p-4 rounded-xl border text-center transition-all ${data.propertyType === 'commercial' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:border-slate-300'}`}
                                                        >
                                                            <Building2 className="h-6 w-6 mx-auto mb-2 opacity-80" />
                                                            <span className="text-sm font-medium">Business</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-6">
                                            <h2 className="text-2xl font-bold text-slate-900">Current Consumption</h2>
                                            <div className="space-y-6 max-w-md">
                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-slate-700">Existing Heating System</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {['gas', 'oil', 'electric'].map((sys) => (
                                                            <button
                                                                key={sys}
                                                                onClick={() => setData({ ...data, heatingSystem: sys as any })}
                                                                className={`p-3 rounded-lg border text-sm capitalize transition-all ${data.heatingSystem === sys ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 hover:bg-slate-50'}`}
                                                            >
                                                                {sys}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <label className="text-sm font-semibold text-slate-700">Average Monthly Bill</label>
                                                        <span className="text-emerald-600 font-bold text-lg">€{data.monthlyBill}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="50" max="1000" step="10"
                                                        value={data.monthlyBill}
                                                        onChange={(e) => setData({ ...data, monthlyBill: parseInt(e.target.value) })}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-400">
                                                        <span>€50</span>
                                                        <span>€1000+</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div className="space-y-6">
                                            <h2 className="text-2xl font-bold text-slate-900">Project Investment</h2>
                                            <p className="text-slate-500">Estimate the cost of the new Heat Pump installation.</p>

                                            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto text-center">
                                                <div className="text-sm text-slate-500 mb-2">Estimated Cost</div>
                                                <div className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-1">
                                                    €
                                                    <input
                                                        type="number"
                                                        value={data.projectCost}
                                                        onChange={(e) => setData({ ...data, projectCost: parseInt(e.target.value) })}
                                                        className="w-32 bg-transparent border-b-2 border-slate-300 focus:border-emerald-500 outline-none text-center"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 4 && (
                                        <div className="space-y-8 text-center pt-8">
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-bold mb-4"
                                            >
                                                <Leaf className="h-5 w-5" />
                                                Results Calculated
                                            </motion.div>

                                            <h2 className="text-4xl font-bold text-slate-900 mb-2">
                                                You can recover <span className="text-emerald-500">€{Math.round(data.projectCost * 0.35)}</span>
                                            </h2>
                                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                                Based on your location and consumption, your project qualifies for roughly **35%** in Energy Efficiency Certificates (CAEs).
                                            </p>

                                            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-10">
                                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                                    <div className="text-sm text-slate-500 mb-1">CAE Value</div>
                                                    <div className="text-2xl font-bold text-emerald-600">€{Math.round(data.projectCost * 0.22)}</div>
                                                </div>
                                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                                    <div className="text-sm text-slate-500 mb-1">Extra Subsidy</div>
                                                    <div className="text-2xl font-bold text-blue-600">€{Math.round(data.projectCost * 0.13)}</div>
                                                </div>
                                            </div>

                                            <div className="max-w-md mx-auto space-y-3">
                                                <Button size="lg" className="w-full h-14 text-lg rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20">
                                                    <Link href="/register">Claim These Savings</Link>
                                                </Button>
                                                <p className="text-xs text-slate-400">
                                                    *Estimates are indicative. Sign up for a precise audit.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Navigation */}
                        {currentStep < 4 && (
                            <div className="pt-8 border-t border-slate-100 flex justify-between items-center mt-auto">
                                <button
                                    onClick={prevStep}
                                    disabled={currentStep === 1}
                                    className={`text-slate-500 font-medium hover:text-slate-900 flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                                >
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>

                                <Button
                                    onClick={nextStep}
                                    className="bg-slate-900 text-white hover:bg-emerald-600 px-8 rounded-full h-12"
                                >
                                    Next Step <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

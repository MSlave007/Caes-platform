'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Check, Star, Zap, Shield, TrendingUp, Sparkles, FileText, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { CaseStudyCard } from '@/components/case-study-card'

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      title: "AI-Powered Extraction",
      desc: "Upload invoices and let Claude Vision handle the data entry with 99% accuracy.",
      visual: (
        <div className="pt-10 h-full bg-[#0f172a] p-6 flex gap-6">
          {/* Left Panel: Upload Zone */}
          <div className="w-1/3 space-y-4">
            <div className="h-4 w-24 bg-slate-800 rounded" />
            <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/30 flex items-center justify-center relative overflow-hidden">
              {/* Simulated Scanner Effect */}
              <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
              <div className="text-center p-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-slate-600 rounded" />
                </div>
                <span className="text-xs text-slate-500">Scanning Invoice...</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Extracted Data */}
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-6 w-20 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded px-2 flex items-center justify-center">AI Confidence 98%</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><div className="h-2 w-12 bg-slate-700 rounded" /><div className="h-4 w-full bg-slate-900 rounded border border-slate-700" /></div>
                <div className="space-y-1"><div className="h-2 w-12 bg-slate-700 rounded" /><div className="h-4 w-full bg-slate-900 rounded border border-slate-700" /></div>
              </div>
              <div className="space-y-1"><div className="h-2 w-16 bg-slate-700 rounded" /><div className="h-4 w-full bg-slate-900 rounded border border-slate-700" /></div>
            </div>

            {/* Result Card */}
            <div className="bg-emerald-950/30 rounded-lg p-4 border border-emerald-500/20 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-emerald-200/70">Calculated Savings</div>
                <div className="text-xl font-bold text-white">€450.00 / yr</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Instant Compliance Checks",
      desc: "Automatic validation against 2026 Energy Efficiency laws.",
      visual: (
        <div className="pt-10 h-full bg-[#0f172a] p-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle className="h-12 w-12 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Algorithm Verified</h3>
            <p className="text-slate-400 max-w-sm">Your project meets the 20% savings threshold required by the BOE.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded bg-slate-800 text-xs text-slate-400 font-mono">Annex A: PASS</div>
            <div className="px-4 py-2 rounded bg-slate-800 text-xs text-slate-400 font-mono">Annex B: PASS</div>
          </div>
        </div>
      )
    },
    {
      title: "One-Click PDF Generation",
      desc: "Generate perfectly formatted Legal Annexes instantly.",
      visual: (
        <div className="pt-10 h-full bg-[#0f172a] p-8">
          <div className="h-full bg-white w-3/4 mx-auto rounded shadow-2xl relative">
            <div className="absolute -right-4 top-10 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">Generating...</div>
            <div className="p-8 space-y-4 opacity-50 blur-[1px]">
              <div className="h-8 w-1/2 bg-slate-200 rounded" />
              <div className="space-y-2 pt-4">
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-2/3 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      )

    }
  ]
  const reviews = [
    {
      quote: "I used to spend 2 hours per project on paperwork. Now it takes 15 minutes. This tool is a game changer for my business.",
      author: "Miguel Angel",
      role: "HVAC Installer, Madrid",
      rating: 5,
      image: "MA"
    },
    {
      quote: "The AI extraction is surprisingly accurate. It reads the model numbers from the sticker perfectly even in bad light.",
      author: "Sarah Connor",
      role: "Energy Auditor, Valencia",
      rating: 5,
      image: "SC"
    },
    {
      quote: "Finally a platform that feels modern. The commission calculation slider helps me show value to clients instantly.",
      author: "David R.",
      role: "Solar Tech, Barcelona",
      rating: 5,
      image: "DR"
    },
    {
      quote: "The audit-proof guarantee helps me sleep at night. Knowing my certificates are BOE compliant is priceless.",
      author: "Elena G.",
      role: "Agency Manager, Seville",
      rating: 5,
      image: "EG"
    },
    {
      quote: "Super fast workflow. The mobile upload feature works flawlessly on site.",
      author: "Carlos M.",
      role: "Installer, Bilbao",
      rating: 4,
      image: "CM"
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">

      {/* Navbar - Transparent & Light for Dark Hero */}
      <nav className="absolute top-0 w-full z-50 py-4">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="h-8 w-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white border border-white/20">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            CAES
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-full px-6 py-2 hidden md:flex items-center gap-8 text-sm font-medium text-emerald-50 border border-white/10">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#benefits" className="hover:text-white transition-colors">Benefits</Link>
            <Link href="/simulator" className="hover:text-white transition-colors">Simulator</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-emerald-50 hover:text-white transition-colors">
              Log in
            </Link>
            <Button asChild className="bg-white text-emerald-950 hover:bg-emerald-50 rounded-full px-6 transition-all font-semibold">
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section (Dark Expensify Style) */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden bg-[#022c22]">

        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-400 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left Column: Copy & Inputs */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
                  The <span className="text-emerald-400 italic font-serif">easiest</span> way to <br />
                  manage certificates.
                </h1>

                {/* Checklist */}
                <div className="space-y-3 mb-10">
                  {[
                    "All inclusive. AI extraction, compliance checks, and PDF generation.",
                    "Bring your own installer. Collaborative profiles for agencies.",
                    "BOE Ready. Updated instantly with 2026 regulations."
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-emerald-50/90 text-sm md:text-base font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Selector Cards */}
                <div className="space-y-4">
                  <p className="text-white font-semibold">I want to:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Link href="/register?role=installer" className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                      <div className="h-4 w-4 rounded-full border border-white/30 group-hover:border-emerald-400 mb-3" />
                      <span className="block text-white font-medium text-sm">Install Heat Pumps</span>
                      <span className="text-xs text-white/50">For Installers</span>
                    </Link>
                    <Link href="/register?role=admin" className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                      <div className="h-4 w-4 rounded-full border border-white/30 group-hover:border-emerald-400 mb-3" />
                      <span className="block text-white font-medium text-sm">Manage Projects</span>
                      <span className="text-xs text-white/50">For Agencies</span>
                    </Link>
                  </div>
                </div>

                {/* Email Input */}
                <div className="flex gap-2 p-1 bg-white rounded-full max-w-md mt-6">
                  <input
                    type="email"
                    placeholder="Enter your email or phone number"
                    className="flex-1 bg-transparent border-0 px-6 text-slate-900 placeholder:text-slate-400 focus:ring-0 outline-none"
                  />
                  <Button className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-8">
                    Get Started
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Floating Dashboard Card */}
              <div className="relative rounded-xl bg-white shadow-2xl overflow-hidden aspect-[16/10] border-4 border-white/10">
                {/* Mock UI Header */}
                <div className="absolute top-0 w-full h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="ml-4 h-2 w-32 bg-slate-200 rounded-full" />
                </div>
                {/* Mock UI Body */}
                <div className="pt-12 px-6 pb-6 bg-slate-50/50 h-full">
                  <div className="flex gap-6 h-full pt-6">
                    {/* Sidebar */}
                    <div className="w-16 flex flex-col gap-4 items-center pt-2">
                      <div className="w-8 h-8 rounded bg-emerald-600 shadow-sm" />
                      <div className="w-8 h-8 rounded bg-white border border-slate-200" />
                      <div className="w-8 h-8 rounded bg-white border border-slate-200" />
                      <div className="w-8 h-8 rounded bg-white border border-slate-200" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-6 w-32 bg-slate-100 rounded" />
                        <div className="h-8 w-24 bg-emerald-500 rounded text-xs flex items-center justify-center text-white font-bold">Approved</div>
                      </div>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 w-48 bg-slate-100 rounded" />
                            <div className="h-2 w-24 bg-slate-50 rounded" />
                          </div>
                          <div className="text-emerald-600 font-mono text-xs font-bold">+€450.00</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Trusted by industry leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-2xl font-bold text-slate-400 flex items-center gap-2"><div className="w-8 h-8 bg-slate-300 rounded-full" /> SOLARIS</div>
            <div className="text-2xl font-bold text-slate-400 flex items-center gap-2"><div className="w-8 h-8 bg-slate-300 rounded-full" /> EcoPower</div>
            <div className="text-2xl font-bold text-slate-400 flex items-center gap-2"><div className="w-8 h-8 bg-slate-300 rounded-full" /> GREENERGY</div>
            <div className="text-2xl font-bold text-slate-400 flex items-center gap-2"><div className="w-8 h-8 bg-slate-300 rounded-full" /> IberClima</div>
            <div className="text-2xl font-bold text-slate-400 flex items-center gap-2"><div className="w-8 h-8 bg-slate-300 rounded-full" /> NATURGY</div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Focus on your business, not paperwork.</h2>
            <p className="text-lg text-slate-500">We handled the regulatory complexity so you can focus on installing more heat pumps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <BenefitCard
              icon={<TrendingUp className="h-6 w-6 text-emerald-600" />}
              title="Instant Cashflow"
              description="Calculate your commission in real-time. No more waiting for months to know your project value."
            />
            <BenefitCard
              icon={<Shield className="h-6 w-6 text-emerald-600" />}
              title="Audit-Proof"
              description="Our engine strictly follows BOE regulations. If it passes our check, it passes the audit."
            />
            <BenefitCard
              icon={<Zap className="h-6 w-6 text-emerald-600" />}
              title="Speed of Light"
              description="From photo to signed contract in minutes. AI parses the data for you."
            />
          </div>
        </div>
      </section>

      {/* Interactive Features Section (Replacing Bento Grid) */}
      <section id="features" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left Column: List */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-6 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  CAES Platform v2.0
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Smart Certification <br /> for <span className="text-emerald-600">Modern Installers</span>.
                </h2>
                <p className="text-lg text-slate-500 mb-8">
                  Replace generic paperwork with an intelligent operating system designed for the new BOE regulations.
                </p>
              </div>

              <div className="space-y-2">
                {features.map((feature, index) => (
                  <FeatureItem
                    key={index}
                    title={feature.title}
                    desc={feature.desc}
                    active={activeFeature === index}
                    onClick={() => setActiveFeature(index)}
                  />
                ))}
              </div>
            </div>

            {/* Right Column: Visual */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-2xl bg-[#0f172a] shadow-2xl overflow-hidden aspect-[16/10] border border-slate-700/50 ring-1 ring-slate-900/10 group">
                {/* Mock Browser Header */}
                <div className="absolute top-0 w-full h-10 bg-[#1e293b] border-b border-slate-700/50 flex items-center px-4 gap-2 z-10">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="ml-4 h-5 w-48 bg-slate-800 rounded text-[10px] flex items-center px-2 text-slate-500 font-mono">caes-platform.com/dashboard</div>
                </div>
                {/* Dynamic Content */}
                {features[activeFeature].visual}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Section (New) */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 uppercase tracking-wider">
              <TrendingUp className="h-3 w-3" />
              Proven Results
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">See how they grow</h2>
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="rounded-full">See All Stories</Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Case Study 1 */}
            <CaseStudyCard
              logo="SOLARIS"
              image="/case_study_background_office_1769363898376.png"
              headline={<span>Automated <span className="text-emerald-600">100%</span> of CAES entries</span>}
              description="Solaris saved 40 hours/week by automating their certificate workflow."
            />
            {/* Case Study 2 */}
            <CaseStudyCard
              logo="EcoPower"
              image="/case_study_background_hvac_1769363912259.png"
              headline={<span>Rolled out <span className="text-emerald-600">company-wide</span> compliance</span>}
              description="Standardized regulatory checks across 50+ installers in the field."
            />
            {/* Case Study 3 */}
            <CaseStudyCard
              logo="GREENERGY"
              image="/case_study_background_meeting_1769363927423.png"
              headline={<span>Achieved <span className="text-emerald-600">50% faster</span> project approval</span>}
              description="Reduced administrative rejection rate from 20% to nearly zero."
            />
          </div>
        </div>
      </section>

      {/* Reviews / Wall of Love */}
      <section className="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden">
        <div className="container mx-auto px-6 mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 uppercase tracking-wider">
            <Star className="h-3 w-3 fill-emerald-800" />
            Testimonials
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Real Feedback from Installers</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Discover how CAES Platform helps professionals save time and manage their certificates effortlessly.
          </p>
        </div>

        {/* Marquee Row 1 (Left) */}
        <div className="flex overflow-hidden mb-8 mask-linear-gradient">
          <motion.div
            className="flex gap-6 px-6"
            animate={{ x: "-50%" }}
            transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
          >
            {[...reviews, ...reviews].map((review, i) => (
              <ReviewCard key={i} {...review} />
            ))}
          </motion.div>
        </div>

        {/* Marquee Row 2 (Right) */}
        <div className="flex overflow-hidden mask-linear-gradient">
          <motion.div
            className="flex gap-6 px-6"
            initial={{ x: "-50%" }}
            animate={{ x: "0%" }}
            transition={{ repeat: Infinity, ease: "linear", duration: 45 }}
          >
            {[...reviews.reverse(), ...reviews].map((review, i) => (
              <ReviewCard key={i} {...review} />
            ))}
          </motion.div>
        </div>
      </section >

      {/* CTA / Simulator Teaser (New Section) */}
      < section className="py-24 bg-slate-50 border-t border-slate-200" >
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="bg-[#022c22] rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden group">

            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Social Proof Header */}
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-emerald-100/60 text-sm ml-2 font-medium">4.9/5 from 500+ Installers</span>
              </div>

              {/* Avatars */}
              <div className="flex -space-x-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-[#022c22] bg-slate-200 relative overflow-hidden">
                    {/* Placeholder for avatars, using colors for now */}
                    <div className={`w-full h-full ${['bg-emerald-200', 'bg-blue-200', 'bg-amber-200', 'bg-purple-200'][i - 1]}`} />
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-2 border-[#022c22] bg-white flex items-center justify-center text-xs font-bold text-slate-900">
                  +500
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Still doubting?
              </h2>

              {/* Subheadline */}
              <p className="text-xl text-emerald-100/80 max-w-2xl mb-10 leading-relaxed">
                Check with our free simulator how much you can save. No credit card required, instant results.
              </p>

              {/* CTA Button */}
              <Button asChild size="lg" className="h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 flex items-center gap-2">
                <Link href="/simulator">Try Simulator Free <ArrowRight className="h-5 w-5" /></Link>
              </Button>

              <p className="mt-6 text-sm text-emerald-100/40">
                Simulate your first project in less than 2 minutes.
              </p>
            </div>
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="bg-slate-900 text-white py-20 border-t border-slate-800" >
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                  <Zap className="h-5 w-5 fill-current" />
                </div>
                CAES
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The operating system for energy efficiency certificates.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Platform</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            &copy; 2026 CAES Platform. All rights reserved.
          </div>
        </div>
      </footer >
    </div >
  )
}



function FeatureItem({ title, desc, active, onClick }: { title: string, desc: string, active: boolean, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer group ${active ? 'bg-white shadow-md border-emerald-500' : 'bg-transparent border-transparent hover:bg-slate-100'}`}
    >
      <h3 className={`font-bold text-lg mb-1 flex items-center gap-2 ${active ? 'text-emerald-900' : 'text-slate-500 group-hover:text-slate-900'}`}>
        {title}
        {active && <ArrowRight className="h-4 w-4 text-emerald-600" />}
      </h3>
      <p className="text-sm text-slate-400 group-hover:text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}

function BenefitCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}


function ReviewCard({ quote, author, role, rating, image }: { quote: string, author: string, role: string, rating: number, image?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-w-[350px] max-w-[350px] hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
          {image || author.charAt(0)}
        </div>
        <div>
          <div className="font-bold text-slate-900 text-sm">{author}</div>
          <div className="text-xs text-slate-500">{role}</div>
        </div>
      </div>
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
        ))}
      </div>
      <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">"{quote}"</p>
    </div>
  )
}

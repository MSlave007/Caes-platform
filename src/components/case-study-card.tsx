import Image from 'next/image'

export function CaseStudyCard({ logo, image, headline, description }: { logo: string, image: string, headline: React.ReactNode, description: string }) {
    return (
        <div className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            {/* Background Image */}
            <div className="absolute inset-0">
                <Image
                    src={image}
                    alt="Case study"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                />
                {/* White Fade Gradient (Top->Bottom) for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white/95" />
            </div>

            {/* Content Container */}
            <div className="relative h-full flex flex-col p-8 z-10 transition-all duration-300">
                {/* Logo Area */}
                <div className="absolute top-8 left-8 font-bold text-slate-800 text-lg flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {logo}
                </div>

                {/* Bottom Content Wrapper (Pushed to bottom via flex-col + mt-auto) */}
                <div className="mt-auto transform transition-transform duration-500 group-hover:-translate-y-2">
                    <h3 className="text-3xl font-bold text-slate-900 leading-tight mb-4 transition-colors group-hover:text-emerald-950">
                        {headline}
                    </h3>

                    {/* Expandable Description Area */}
                    <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
                        <div className="overflow-hidden">
                            <p className="text-slate-600 font-medium leading-relaxed pb-6 text-sm md:text-base">
                                {description}
                            </p>
                        </div>
                    </div>

                    {/* Button */}
                    <div>
                        <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-200/50 hover:bg-emerald-100 text-slate-900 font-semibold text-sm transition-colors backdrop-blur-sm group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg shadow-emerald-900/10">
                            Read story
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

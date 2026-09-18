import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Calculator from '@/components/landing/Calculator'
import Hero from '@/components/landing/Hero'
import Nav from '@/components/landing/Nav'
import StatsBand from '@/components/landing/StatsBand'
import ParallaxBand from '@/components/landing/ParallaxBand'
import Benefits from '@/components/landing/Benefits'
import Reviews from '@/components/landing/Reviews'
import Nudge from '@/components/landing/Nudge'
import HeatFlow from '@/components/landing/HeatFlow'
import { Reveal, Stagger, StaggerItem } from '@/components/landing/motion'
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/landing'
import { getConsumerDictionary } from '@/lib/i18n/consumer'
import { images } from '@/lib/landing-images'

export function generateStaticParams() {
    return LOCALES.map((lang) => ({ lang }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ lang: string }>
}): Promise<Metadata> {
    const { lang } = await params
    if (!isLocale(lang)) return {}
    const d = getConsumerDictionary(lang)
    return {
        title: d.meta.title,
        description: d.meta.description,
        alternates: { languages: { es: '/es', en: '/en' } },
    }
}

/** Segnaposto del marchio: resta finché non si decide il nome. */
function Wordmark({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
    const isInk = tone === 'ink'
    return (
        <span className="flex items-center gap-2.5">
            <span
                className={`relative block h-[18px] w-[18px] rounded-[3px] ${isInk ? 'bg-[var(--caes-ink)]' : 'bg-[var(--caes-paper)]'}`}
            >
                <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
            </span>
            <span
                className={`font-mono text-[14px] font-medium tracking-[.15em] ${isInk ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-paper)]'}`}
            >
                CAES
            </span>
        </span>
    )
}

export default async function ConsumerLanding({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    if (!isLocale(lang)) notFound()

    const locale = lang as Locale
    const d = getConsumerDictionary(locale)
    // Risolto sul server: gli slot senza file restano segnaposto disegnati.
    const img = images()

    return (
        <div className="min-h-screen bg-[var(--caes-paper)] font-sans text-[var(--caes-ink)]">
            <Nav dict={d} locale={locale} />

            {/* --------------------------------------------------------- HERO */}
            <Hero dict={d} photo={img.hero} />

            {/* ------- CALCOLATORE: scavalca il bordo fra hero scuro e carta ------- */}
            <section
                id="calculadora"
                className="relative z-30 -mt-[132px] scroll-mt-28 px-6 pb-24 sm:px-10"
            >
                <Reveal y={30} className="mx-auto max-w-[880px]">
                    <Calculator dict={d} locale={lang} />
                </Reveal>
            </section>

            {/* ------------- BENEFICI: il pezzo che deve convincere ------------- */}
            <section id="beneficios" className="scroll-mt-24 pb-28">
                <Benefits dict={d} />
            </section>

            {/* --------------------------------------------- NUMERI CHE CONTANO */}
            <section className="pb-24">
                <StatsBand dict={d} />
            </section>

            {/* ------------------------------------------- FASCIA IN PARALLAX */}
            <ParallaxBand dict={d} src={img.unit} />

            {/* ------------------------------------------------ COME FUNZIONA */}
            <section
                id="como-funciona"
                className="scroll-mt-24 border-t border-[var(--caes-line)] bg-[var(--caes-band)]"
            >
                <div className="mx-auto max-w-[1180px] px-6 py-28 sm:px-10">
                    <div className="grid gap-16 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-24">
                        <Reveal className="lg:sticky lg:top-32 lg:self-start">
                            <p className="label-mono text-[var(--caes-mut)]">{d.how.eyebrow}</p>
                            <h2 className="mt-5 text-balance text-[clamp(30px,4vw,46px)] font-semibold leading-[1.04] tracking-[-0.04em]">
                                {d.how.title}
                            </h2>
                            <a
                                href="#calculadora"
                                className="group mt-10 inline-flex items-center gap-2.5 rounded-full border border-[var(--caes-ink)] px-6 py-3 text-[14.5px] font-medium transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]"
                            >
                                {d.nav.cta}
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </a>

                            {img.installer && (
                                <div className="relative mt-12 hidden aspect-[3/4] overflow-hidden rounded-2xl lg:block">
                                    <Image
                                        src={img.installer}
                                        alt=""
                                        fill
                                        sizes="(min-width:1024px) 22rem, 100vw"
                                        className="object-cover"
                                    />
                                </div>
                            )}
                        </Reveal>

                        {/* i passi, con la spina dorsale che li collega */}
                        <ol className="relative">
                            <span
                                aria-hidden
                                className="absolute left-[27px] top-4 bottom-16 hidden w-px bg-[var(--caes-line)] sm:block"
                            />
                            <Stagger className="flex flex-col gap-14">
                                {d.how.steps.map((s) => (
                                    <StaggerItem key={s.n}>
                                        <li className="relative flex gap-8">
                                            <span className="relative z-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] font-mono text-[13px] tracking-[.06em] text-[var(--caes-green)] sm:flex">
                                                {s.n}
                                            </span>
                                            <div className="pt-2">
                                                <span className="label-mono text-[var(--caes-green)] sm:hidden">
                                                    {s.n}
                                                </span>
                                                <h3 className="mt-2 text-[clamp(21px,2.4vw,28px)] font-semibold tracking-[-0.028em] sm:mt-0">
                                                    {s.title}
                                                </h3>
                                                <p className="mt-3.5 max-w-[46ch] text-[clamp(15px,1.35vw,17px)] leading-[1.62] text-[var(--caes-mut)]">
                                                    {s.body}
                                                </p>
                                            </div>
                                        </li>
                                    </StaggerItem>
                                ))}
                            </Stagger>
                        </ol>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------------- PERCHÉ */}
            <section className="border-t border-[var(--caes-line)]">
                <div className="mx-auto max-w-[1180px] px-6 py-24 sm:px-10">
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
                        <Reveal>
                            <p className="label-mono text-[var(--caes-mut)]">{d.why.eyebrow}</p>
                            <h2 className="mt-5 max-w-[14ch] text-balance text-[clamp(28px,4vw,44px)] font-semibold leading-[1.06] tracking-[-0.036em]">
                                {d.why.title}
                            </h2>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <p className="max-w-[54ch] text-[clamp(16px,1.5vw,19px)] leading-[1.65] text-[var(--caes-mut)] lg:pt-16">
                                {d.why.body}
                            </p>
                        </Reveal>
                    </div>

                    {/* il meccanismo, disegnato mentre scorri */}
                    <div className="mt-20">
                        <HeatFlow dict={d} />
                    </div>

                </div>
            </section>

            {/* --------------------------------------------------- RECENSIONI */}
            <section className="border-t border-[var(--caes-line)] py-28">
                <Reviews dict={d} />
            </section>

            {/* -------------------------------------------------------- NUDGE */}
            <Nudge dict={d} photo={img.nudge} />

            {/* ---------------------------------------------------------- FAQ */}
            <section
                id="preguntas"
                className="scroll-mt-24 border-t border-[var(--caes-line)] bg-[var(--caes-band)]"
            >
                <div className="mx-auto max-w-[1180px] px-6 py-24 sm:px-10">
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
                        <Reveal className="lg:sticky lg:top-28 lg:self-start">
                            <p className="label-mono text-[var(--caes-mut)]">{d.faq.eyebrow}</p>
                            <h2 className="mt-5 text-balance text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.036em]">
                                {d.faq.title}
                            </h2>
                        </Reveal>

                        <Stagger className="flex flex-col">
                            {d.faq.items.map((f) => (
                                <StaggerItem key={f.q}>
                                    <details className="group border-b border-[var(--caes-line)] py-6 first:border-t">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold tracking-[-0.02em] marker:hidden">
                                            {f.q}
                                            <span className="relative h-4 w-4 shrink-0">
                                                <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-[var(--caes-ink)]" />
                                                <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-[var(--caes-ink)] transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
                                            </span>
                                        </summary>
                                        <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.65] text-[var(--caes-mut)]">
                                            {f.a}
                                        </p>
                                    </details>
                                </StaggerItem>
                            ))}
                        </Stagger>
                    </div>
                </div>
            </section>

            {/* ---------------------------------------------------- CTA FINALE */}
            <section id="presupuesto" className="scroll-mt-24 px-6 py-24 sm:px-10">
                <Reveal className="mx-auto max-w-[1180px]">
                    <div className="relative isolate overflow-hidden rounded-[24px] bg-[var(--caes-deep)] px-8 py-20 text-center sm:px-14">
                        {img.dusk && (
                            <>
                                <Image
                                    src={img.dusk}
                                    alt=""
                                    fill
                                    sizes="100vw"
                                    className="-z-20 object-cover"
                                />
                                <div
                                    aria-hidden
                                    className="absolute inset-0 -z-10"
                                    style={{
                                        background:
                                            'linear-gradient(180deg,rgba(4,16,12,.82) 0%,rgba(4,16,12,.7) 55%,rgba(4,16,12,.88) 100%)',
                                    }}
                                />
                            </>
                        )}
                        <h2 className="mx-auto max-w-[18ch] text-balance text-[clamp(30px,4.4vw,50px)] font-semibold leading-[1.04] tracking-[-0.04em] text-white">
                            {d.cta.title}
                        </h2>
                        <p className="mx-auto mt-5 max-w-[44ch] text-[16.5px] text-[rgba(221,233,225,.66)]">
                            {d.cta.sub}
                        </p>
                        <a
                            href="#calculadora"
                            className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-lime)] px-9 py-4 text-[16px] font-semibold text-[var(--caes-lime-ink)] transition-opacity hover:opacity-90"
                        >
                            {d.cta.button}
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </a>
                    </div>
                </Reveal>
            </section>

            {/* --------------------------------------------------- INSTALADORES */}
            <section className="border-t border-[var(--caes-line)]">
                <div className="mx-auto max-w-[1180px] px-6 py-16 sm:px-10">
                    <Reveal>
                        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
                            <div>
                                <p className="label-mono text-[var(--caes-mut)]">
                                    {d.installers.eyebrow}
                                </p>
                                <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.028em]">
                                    {d.installers.title}
                                </h2>
                                <p className="mt-2 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                                    {d.installers.body}
                                </p>
                            </div>
                            <Link
                                href={`/${locale}/instaladores`}
                                className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--caes-ink)] px-6 py-3 text-[14.5px] font-medium transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]"
                            >
                                {d.installers.cta}
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ------------------------------------------------------- FOOTER */}
            <footer className="border-t border-[var(--caes-line)]">
                <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-6 py-10 sm:px-10">
                    <div className="flex items-center gap-4">
                        <Wordmark />
                        <span className="text-[12.5px] text-[var(--caes-faint)]">
                            {d.footer.descriptor}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-[12.5px] text-[var(--caes-faint)]">
                        <Link
                            href="/login"
                            className="transition-colors hover:text-[var(--caes-ink)]"
                        >
                            {d.nav.login}
                        </Link>
                        <Link
                            href="/register"
                            className="transition-colors hover:text-[var(--caes-ink)]"
                        >
                            {d.installers.eyebrow === 'Para profesionales'
                                ? 'Solicitar acceso'
                                : 'Request access'}
                        </Link>
                        <span className="label-mono">{d.footer.langLabel}</span>
                        {LOCALES.map((l) => (
                            <Link
                                key={l}
                                href={`/${l}`}
                                className={`font-mono text-[11px] tracking-[.12em] ${l === locale ? 'text-[var(--caes-ink)]' : 'transition-colors hover:text-[var(--caes-ink)]'}`}
                            >
                                {l.toUpperCase()}
                            </Link>
                        ))}
                        <span>© {new Date().getFullYear()}</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}

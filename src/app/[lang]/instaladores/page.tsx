import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import SimulatorBar from '@/components/landing/SimulatorBar'
import InstallerEarnings from '@/components/landing/InstallerEarnings'
import {
    LOCALES,
    isLocale,
    getDictionary,
    type Locale,
} from '@/lib/i18n/landing'
import { eur } from '@/lib/caes/estimate'

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
    const d = getDictionary(lang)
    return {
        title: d.meta.title,
        description: d.meta.description,
        alternates: { languages: { es: '/es', en: '/en' } },
    }
}

/* ------------------------------------------------------------------ *
 * Dati d'esempio del pannello di revisione.
 * Numeri presi da docs/MARGIN_LOGIC.md — le aziende sono inventate e
 * vanno sostituite con installatori reali solo dopo il loro consenso.
 * ------------------------------------------------------------------ */
const QUEUE = [
    { id: '#2481', who: 'Clima Levante S.L.', saving: 400, status: 'ok', margin: 195 },
    { id: '#2480', who: 'Aerotec Madrid', saving: 512, status: 'wait', margin: null },
    { id: '#2478', who: 'Instal·la Girona', saving: 336, status: 'rev', margin: null },
    { id: '#2477', who: 'Termosur Sevilla', saving: 448, status: 'ok', margin: 218.4 },
] as const

const STATUS_LABEL: Record<string, Record<string, string>> = {
    es: { ok: 'Aprobado', wait: 'Pendiente', rev: 'Revisión' },
    en: { ok: 'Approved', wait: 'Pending', rev: 'In review' },
}

const STATUS_CLASS: Record<string, string> = {
    ok: 'bg-[rgba(199,240,74,.16)] text-[var(--caes-lime)]',
    wait: 'bg-[rgba(245,190,80,.14)] text-[#F0C264]',
    rev: 'bg-[rgba(110,170,245,.14)] text-[#8CBBF5]',
}

/* Segnaposto del marchio: resta finché non si decide il nome. */
function Wordmark({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
    return (
        <span className="flex items-center gap-2.5">
            <span
                className={`relative block h-[18px] w-[18px] rounded-[3px] ${tone === 'ink' ? 'bg-[var(--caes-ink)]' : 'bg-[var(--caes-paper)]'
                    }`}
            >
                <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
            </span>
            <span
                className={`font-mono text-[14px] font-medium tracking-[.15em] ${tone === 'ink' ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-paper)]'
                    }`}
            >
                CAES
            </span>
        </span>
    )
}

export default async function InstalladoresPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    if (!isLocale(lang)) notFound()

    const locale = lang as Locale
    const d = getDictionary(locale)
    const money = (n: number) => eur(n, d.intlLocale)
    const other: Locale = locale === 'es' ? 'en' : 'es'

    return (
        <div className="min-h-screen bg-[var(--caes-paper)] text-[var(--caes-ink)] font-sans">
            {/* ---------------------------------------------------------- NAV */}
            <header className="sticky top-0 z-50 pt-5 px-4">
                <nav className="mx-auto flex max-w-fit items-center gap-6 rounded-full border border-[var(--caes-line)] bg-[rgba(253,253,250,.86)] py-[7px] pl-6 pr-[7px] shadow-[0_1px_2px_rgba(6,35,26,.04),0_10px_30px_-18px_rgba(6,35,26,.3)] backdrop-blur-md">
                    <Link href={`/${locale}`} aria-label="CAES">
                        <Wordmark />
                    </Link>
                    <div className="hidden items-center gap-6 text-[13px] text-[var(--caes-mut)] md:flex">
                        {d.nav.items.map((i) => (
                            <a
                                key={i.href}
                                href={i.href}
                                className="transition-colors hover:text-[var(--caes-ink)]"
                            >
                                {i.label}
                            </a>
                        ))}
                    </div>
                    <a
                        href="#empezar"
                        className="rounded-full bg-[var(--caes-ink)] px-[18px] py-2 text-[13px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        {d.nav.cta}
                    </a>
                    <span className="hidden border-l border-[var(--caes-line)] pl-4 pr-1 font-mono text-[10.5px] tracking-[.1em] text-[var(--caes-mut)] sm:block">
                        <span className="font-medium text-[var(--caes-ink)]">
                            {locale.toUpperCase()}
                        </span>{' '}
                        ·{' '}
                        <Link
                            href={`/${other}`}
                            className="transition-colors hover:text-[var(--caes-ink)]"
                        >
                            {other.toUpperCase()}
                        </Link>
                    </span>
                </nav>
            </header>

            {/* --------------------------------------------------------- HERO */}
            <section className="relative mx-auto max-w-[1440px] px-6 pt-16 sm:px-10 lg:px-16">
                <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.04fr] lg:gap-14">
                    {/* colonna testo */}
                    <div className="pt-4">
                        <p className="label-mono flex items-center gap-2.5 text-[var(--caes-mut)]">
                            <i className="block h-1.5 w-1.5 rounded-full bg-[var(--caes-lime)] shadow-[0_0_0_3px_rgba(199,240,74,.3)]" />
                            {d.hero.eyebrow}
                        </p>

                        <h1 className="mt-5 max-w-[13ch] text-[clamp(36px,5.6vw,56px)] font-semibold leading-[1.03] tracking-[-0.038em] text-balance">
                            {d.hero.titleBefore}
                            <em className="serif-accent">{d.hero.titleAccent}</em>
                            {d.hero.titleAfter}
                        </h1>

                        <p className="mt-5 max-w-[42ch] text-[16.5px] leading-[1.55] text-[var(--caes-mut)]">
                            {d.hero.sub}
                        </p>

                        <div className="mt-9 flex border-t border-[var(--caes-line)]">
                            {d.hero.facts.map((f) => (
                                <div
                                    key={f.value}
                                    className="flex-1 border-r border-[var(--caes-line)] pr-4 pt-4 last:border-0 last:pr-0"
                                >
                                    <div className="font-mono tabular text-[16px] font-medium tracking-[-0.01em]">
                                        {f.value}
                                    </div>
                                    <div className="mt-1 text-[11.5px] leading-[1.35] text-[var(--caes-mut)]">
                                        {f.label}
                                        <br />
                                        {f.sub}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* colonna prodotto */}
                    <div>
                        <div className="overflow-hidden rounded-[9px] bg-[var(--caes-deep)] text-[#DDE9E1] shadow-[0_2px_4px_rgba(6,35,26,.08),0_34px_60px_-28px_rgba(6,35,26,.55)]">
                            <div className="flex items-center justify-between border-b border-white/10 px-[18px] py-3">
                                <span className="label-mono text-[rgba(221,233,225,.5)]">
                                    {d.hero.panel.title} · {d.hero.panel.pending}
                                </span>
                                <span className="rounded border border-white/10 px-2 py-[3px] font-mono text-[10px] text-[rgba(221,233,225,.42)]">
                                    ⌘K
                                </span>
                            </div>

                            <div className="grid grid-cols-[64px_1fr_84px_92px_84px] items-center gap-3 border-b border-white/[.07] px-[18px] py-2.5 font-mono text-[9.5px] uppercase tracking-[.13em] text-[rgba(221,233,225,.36)]">
                                <span>{d.hero.panel.cols.id}</span>
                                <span>{d.hero.panel.cols.installer}</span>
                                <span className="text-right">{d.hero.panel.cols.savings}</span>
                                <span>{d.hero.panel.cols.status}</span>
                                <span className="text-right">{d.hero.panel.cols.margin}</span>
                            </div>

                            {QUEUE.map((r, idx) => (
                                <div
                                    key={r.id}
                                    className={`grid grid-cols-[64px_1fr_84px_92px_84px] items-center gap-3 border-b border-white/[.045] px-[18px] py-2.5 text-[12.5px] ${idx === 0
                                            ? 'bg-[rgba(199,240,74,.06)] shadow-[inset_2px_0_0_var(--caes-lime)]'
                                            : ''
                                        }`}
                                >
                                    <span className="font-mono text-[11px] text-[rgba(221,233,225,.45)]">
                                        {r.id}
                                    </span>
                                    <span className="truncate text-[rgba(221,233,225,.66)]">
                                        {r.who}
                                    </span>
                                    <span className="text-right font-mono tabular text-[12px]">
                                        {money(r.saving)}
                                    </span>
                                    <span
                                        className={`rounded px-[7px] py-1 text-center font-mono text-[9px] font-medium uppercase tracking-[.09em] ${STATUS_CLASS[r.status]}`}
                                    >
                                        {STATUS_LABEL[locale][r.status]}
                                    </span>
                                    <span className="text-right font-mono tabular text-[12px]">
                                        {r.margin === null ? '—' : money(r.margin)}
                                    </span>
                                </div>
                            ))}

                            <div className="grid border-t border-white/[.07] sm:grid-cols-[1fr_190px]">
                                <div className="px-[18px] py-[15px]">
                                    <div className="label-mono text-[rgba(221,233,225,.42)]">
                                        {d.hero.panel.sliderLabel.replace('{amount}', money(300))}
                                    </div>
                                    <div className="relative mt-3.5 h-[5px] rounded-full bg-white/10">
                                        <div className="absolute inset-y-0 left-0 w-[65%] rounded-full bg-[var(--caes-lime)]" />
                                        <div className="absolute -top-[5px] left-[65%] h-[15px] w-[15px] -translate-x-1/2 rounded-full bg-[#EDF4EF] shadow-[0_2px_8px_rgba(0,0,0,.5)]" />
                                    </div>
                                    <div className="mt-[11px] flex justify-between font-mono text-[10.5px] text-[rgba(221,233,225,.5)]">
                                        <span>0 %</span>
                                        <span>65 %</span>
                                        <span>100 %</span>
                                    </div>
                                </div>
                                <div className="border-t border-white/[.07] bg-[rgba(199,240,74,.045)] px-[18px] py-[15px] sm:border-l sm:border-t-0">
                                    <div className="label-mono text-[rgba(221,233,225,.42)]">
                                        {d.hero.panel.totalLabel}
                                    </div>
                                    <div className="mt-[7px] font-mono tabular text-[26px] tracking-[-0.03em] text-[var(--caes-lime)]">
                                        {money(195)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* riparto, sotto il pannello */}
                        <div className="mt-4 rounded-md border border-[var(--caes-line)] bg-[var(--caes-panel)] px-[18px] py-[15px] shadow-[0_1px_2px_rgba(6,35,26,.04),0_16px_34px_-22px_rgba(6,35,26,.32)]">
                            <span className="label-mono text-[var(--caes-mut)]">
                                {d.hero.split.title.replace('{amount}', money(400))}
                            </span>
                            <div className="mt-3 flex h-[7px] overflow-hidden rounded-full bg-[#EDECE3]">
                                <i className="block h-full w-[25%] bg-[var(--caes-lime)]" />
                                <i className="block h-full w-[48.75%] bg-[var(--caes-green)]" />
                                <i className="block h-full w-[26.25%] bg-[#C9CDC4]" />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-[var(--caes-mut)]">
                                {[
                                    { c: 'var(--caes-lime)', l: `${d.hero.split.installer} 25 %`, v: 100 },
                                    { c: 'var(--caes-green)', l: `${d.hero.split.agency} 65 %`, v: 195 },
                                    { c: '#C9CDC4', l: d.hero.split.reserve, v: 105 },
                                ].map((x) => (
                                    <span key={x.l} className="flex items-center gap-2">
                                        <i
                                            className="block h-[7px] w-[7px] shrink-0 rounded-[2px]"
                                            style={{ background: x.c }}
                                        />
                                        {x.l}
                                        <b className="font-mono tabular text-[12px] font-medium text-[var(--caes-ink)]">
                                            {money(x.v)}
                                        </b>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------- BARRA SIMULATORE */}
            <section className="relative">
                {/* la fascia parte a metà della barra: l'oggetto scavalca il bordo */}
                <div className="absolute inset-x-0 bottom-0 top-[92px] border-t border-[var(--caes-line)] bg-[var(--caes-band)]" />
                <div className="relative mx-auto max-w-[1440px] px-6 pt-12 pb-14 sm:px-10 lg:px-16">
                    <SimulatorBar dict={d} locale={locale} />
                </div>
            </section>

            {/* ------------------------------- QUANTO GUADAGNA L'INSTALLATORE */}
            <section
                id="ganancias"
                className="scroll-mt-24 border-t border-[var(--caes-line)] bg-[var(--caes-band)]"
            >
                <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16">
                    <div className="max-w-[62ch]">
                        <p className="label-mono text-[var(--caes-mut)]">{d.ganancias.eyebrow}</p>
                        <h2 className="mt-4 text-[clamp(30px,4vw,48px)] font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--caes-ink)]">
                            {d.ganancias.title}
                        </h2>
                        <p className="mt-5 text-[16.5px] leading-[1.6] text-[var(--caes-mut)]">
                            {d.ganancias.sub}
                        </p>
                    </div>
                    <div className="mt-11">
                        <InstallerEarnings dict={d} locale={locale} />
                    </div>
                </div>
            </section>

            {/* ----------------------------------------------------- PARTNER */}
            <section className="border-t border-[var(--caes-line)] bg-[var(--caes-band)]">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-6 py-9 sm:px-10 lg:px-16">
                    <span className="label-mono whitespace-nowrap text-[var(--caes-faint)]">
                        {d.partners.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-10">
                        {['Naturgy', 'Bettergy'].map((p) => (
                            <span
                                key={p}
                                className="text-[21px] font-semibold tracking-[-0.02em] text-[#9EA79C]"
                            >
                                {p}
                            </span>
                        ))}
                    </div>
                    {/* DA CONFERMARE — vedi documento direzione, punto 01 */}
                    <span className="whitespace-nowrap rounded-[3px] border border-dashed border-[#C3C8BB] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[.1em] text-[#A3AB9F]">
                        {d.partners.note}
                    </span>
                </div>
            </section>

            {/* ------------------------------------------------ COME FUNZIONA */}
            <section
                id="como-funciona"
                className="scroll-mt-24 border-t border-[var(--caes-line)]"
            >
                <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16">
                    <p className="label-mono text-[var(--caes-mut)]">{d.how.eyebrow}</p>
                    <h2 className="mt-4 max-w-[18ch] text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.08] tracking-[-0.032em] text-balance">
                        {d.how.title}
                    </h2>
                    <p className="mt-4 max-w-[58ch] text-[15.5px] text-[var(--caes-mut)]">
                        {d.how.sub}
                    </p>

                    <ol className="mt-14 grid gap-0 border-t border-[var(--caes-line)] md:grid-cols-4">
                        {d.how.steps.map((s) => (
                            <li
                                key={s.n}
                                className="relative border-b border-[var(--caes-line)] py-7 pr-8 md:border-b-0 md:border-r md:last:border-r-0"
                            >
                                <span className="absolute -top-px left-0 h-px w-10 bg-[var(--caes-green)]" />
                                <span className="font-mono text-[11px] tracking-[.14em] text-[var(--caes-green)]">
                                    {s.n}
                                </span>
                                <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.018em]">
                                    {s.title}
                                </h3>
                                <p className="mt-2.5 max-w-[36ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                                    {s.body}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ------------------------------------------------------ NUMERI */}
            <section
                id="numeros"
                className="scroll-mt-24 border-t border-[var(--caes-line)] bg-[var(--caes-band)]"
            >
                <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16">
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
                        <div>
                            <p className="label-mono text-[var(--caes-mut)]">
                                {d.numbers.eyebrow}
                            </p>
                            <h2 className="mt-4 text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.08] tracking-[-0.032em] text-balance">
                                {d.numbers.title}
                            </h2>
                            <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.6] text-[var(--caes-mut)]">
                                {d.numbers.sub}
                            </p>

                            {/* riparto, versione narrativa */}
                            <div className="mt-9 rounded-md border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6">
                                <h3 className="text-[15px] font-semibold tracking-[-0.015em]">
                                    {d.numbers.splitTitle}
                                </h3>
                                <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#EDECE3]">
                                    <i className="block h-full w-[25%] bg-[var(--caes-lime)]" />
                                    <i className="block h-full w-[48.75%] bg-[var(--caes-green)]" />
                                    <i className="block h-full w-[26.25%] bg-[#C9CDC4]" />
                                </div>
                                <p className="mt-4 text-[13.5px] leading-[1.6] text-[var(--caes-mut)]">
                                    {d.numbers.splitBody}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-px overflow-hidden rounded-md border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-2">
                            {d.numbers.cards.map((c) => (
                                <div
                                    key={c.title}
                                    className="bg-[var(--caes-panel)] p-7"
                                >
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-mono tabular text-[34px] leading-none tracking-[-0.035em]">
                                            {c.value}
                                        </span>
                                        <span className="text-[12.5px] text-[var(--caes-faint)]">
                                            {c.unit}
                                        </span>
                                    </div>
                                    <h3 className="mt-5 text-[14.5px] font-semibold tracking-[-0.015em]">
                                        {c.title}
                                    </h3>
                                    <p className="mt-2 max-w-[38ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                                        {c.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------------------------------------------- PER CHI */}
            <section className="border-t border-[var(--caes-line)]">
                <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16">
                    <p className="label-mono text-[var(--caes-mut)]">{d.who.eyebrow}</p>
                    <h2 className="mt-4 text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.08] tracking-[-0.032em]">
                        {d.who.title}
                    </h2>

                    <div className="mt-12 grid gap-5 lg:grid-cols-2">
                        {/* installatore — chiaro */}
                        <div className="rounded-lg border border-[var(--caes-line)] bg-[var(--caes-panel)] p-8">
                            <span className="label-mono rounded-[3px] bg-[var(--caes-lime)] px-2.5 py-1.5 text-[var(--caes-lime-ink)]">
                                {d.who.installer.tag}
                            </span>
                            <h3 className="mt-6 text-[21px] font-semibold tracking-[-0.025em]">
                                {d.who.installer.title}
                            </h3>
                            <ul className="mt-6 flex flex-col gap-3.5">
                                {d.who.installer.bullets.map((b) => (
                                    <li key={b} className="flex gap-3 text-[14px] text-[var(--caes-mut)]">
                                        <Check
                                            className="mt-[3px] h-4 w-4 shrink-0 text-[var(--caes-green)]"
                                            aria-hidden
                                        />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* agenzia — scuro */}
                        <div className="rounded-lg bg-[var(--caes-deep)] p-8 text-[#DDE9E1]">
                            <span className="label-mono rounded-[3px] border border-white/15 px-2.5 py-1.5 text-[rgba(221,233,225,.7)]">
                                {d.who.agency.tag}
                            </span>
                            <h3 className="mt-6 text-[21px] font-semibold tracking-[-0.025em] text-white">
                                {d.who.agency.title}
                            </h3>
                            <ul className="mt-6 flex flex-col gap-3.5">
                                {d.who.agency.bullets.map((b) => (
                                    <li
                                        key={b}
                                        className="flex gap-3 text-[14px] text-[rgba(221,233,225,.72)]"
                                    >
                                        <Check
                                            className="mt-[3px] h-4 w-4 shrink-0 text-[var(--caes-lime)]"
                                            aria-hidden
                                        />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --------------------------------------------------------- FAQ */}
            <section
                id="faq"
                className="scroll-mt-24 border-t border-[var(--caes-line)] bg-[var(--caes-band)]"
            >
                <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16">
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
                        <div className="lg:sticky lg:top-28 lg:self-start">
                            <p className="label-mono text-[var(--caes-mut)]">{d.faq.eyebrow}</p>
                            <h2 className="mt-4 text-[clamp(26px,3.4vw,36px)] font-semibold leading-[1.08] tracking-[-0.032em] text-balance">
                                {d.faq.title}
                            </h2>
                            <p className="mt-4 max-w-[38ch] text-[15px] text-[var(--caes-mut)]">
                                {d.faq.sub}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            {d.faq.items.map((f, i) => (
                                <div
                                    key={f.q}
                                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 rounded-md border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6"
                                >
                                    <span className="pt-[3px] font-mono text-[11px] text-[var(--caes-faint)]">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <h3 className="text-[15.5px] font-semibold tracking-[-0.018em]">
                                            {f.q}
                                        </h3>
                                        <p className="mt-2.5 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                                            {f.a}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------------------------------------------- CTA FINALE */}
            <section id="empezar" className="scroll-mt-24 px-6 pb-16 pt-20 sm:px-10 lg:px-16">
                <div className="mx-auto grid max-w-[1440px] gap-12 overflow-hidden rounded-xl bg-[var(--caes-deep)] px-8 py-14 text-[#DDE9E1] sm:px-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
                    <div>
                        <p className="label-mono text-[rgba(221,233,225,.5)]">{d.cta.eyebrow}</p>
                        <h2 className="mt-4 max-w-[18ch] text-[clamp(27px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.034em] text-white text-balance">
                            {d.cta.title}
                        </h2>
                        <p className="mt-4 max-w-[46ch] text-[15.5px] text-[rgba(221,233,225,.66)]">
                            {d.cta.sub}
                        </p>

                        {/* form non ancora collegato: vedi checklist pre-lancio */}
                        <form
                            className="mt-8 flex w-full max-w-[440px] items-center rounded-full border border-white/15 bg-white/[.06] py-[5px] pl-5 pr-[5px]"
                            action="#"
                        >
                            <label htmlFor="email" className="sr-only">
                                {d.cta.placeholder}
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                placeholder={d.cta.placeholder}
                                className="min-w-0 flex-1 bg-transparent text-[14px] text-white placeholder:text-[rgba(221,233,225,.45)] outline-none"
                            />
                            <button
                                type="submit"
                                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[var(--caes-lime)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--caes-lime-ink)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                                {d.cta.button}
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </button>
                        </form>
                        <p className="mt-3.5 pl-1 text-[12px] text-[rgba(221,233,225,.45)]">
                            {d.cta.note}
                        </p>
                    </div>

                    {/* timeline della fiducia: cosa succede dopo aver lasciato il contatto */}
                    <div className="lg:border-l lg:border-white/10 lg:pl-14">
                        <p className="label-mono text-[rgba(221,233,225,.5)]">
                            {d.cta.timelineTitle}
                        </p>
                        <ol className="mt-6 flex flex-col">
                            {d.cta.timeline.map((s, i) => (
                                <li key={s.when} className="relative flex gap-5 pb-7 last:pb-0">
                                    {i < d.cta.timeline.length - 1 && (
                                        <span className="absolute left-[5px] top-4 h-full w-px bg-white/12" />
                                    )}
                                    <span className="relative mt-[6px] h-[11px] w-[11px] shrink-0 rounded-full border-2 border-[var(--caes-lime)] bg-[var(--caes-deep)]" />
                                    <div>
                                        <div className="font-mono text-[10.5px] uppercase tracking-[.13em] text-[var(--caes-lime)]">
                                            {s.when}
                                        </div>
                                        <p className="mt-2 max-w-[34ch] text-[14px] leading-[1.55] text-[rgba(221,233,225,.72)]">
                                            {s.what}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------------ FOOTER */}
            <footer className="border-t border-[var(--caes-line)]">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-6 py-10 sm:px-10 lg:px-16">
                    <div className="flex items-center gap-4">
                        <Wordmark />
                        <span className="text-[12.5px] text-[var(--caes-faint)]">
                            {d.footer.descriptor}
                        </span>
                    </div>
                    <div className="flex items-center gap-6 text-[12.5px] text-[var(--caes-faint)]">
                        <span className="label-mono">{d.footer.langLabel}</span>
                        {LOCALES.map((l) => (
                            <Link
                                key={l}
                                href={`/${l}`}
                                className={`font-mono text-[11px] tracking-[.12em] ${l === locale
                                        ? 'text-[var(--caes-ink)]'
                                        : 'transition-colors hover:text-[var(--caes-ink)]'
                                    }`}
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

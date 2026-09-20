import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * Dove finisce chi è entrato ma non in questa zona.
 *
 * Il middleware potrebbe rimandarlo alla sua dashboard e basta, ma un
 * rimbalzo silenzioso si legge come un errore dell'applicazione: si
 * clicca, si finisce altrove, e uno ci riprova. Una riga che dice cos'è
 * successo costa una pagina e toglie una telefonata.
 *
 * Non dice cosa c'è dentro l'area agenzia, e non dovrebbe: a chi non può
 * entrare non si elenca quello che si sta perdendo.
 */
export default function SinAccesoPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--caes-paper)] px-6 py-16 font-sans">
            <div className="w-full max-w-[46ch]">
                <span className="flex items-center gap-2.5">
                    <span className="relative block h-[16px] w-[16px] rounded-[3px] bg-[var(--caes-ink)]">
                        <span className="absolute bottom-[3px] left-[3px] block h-[5px] w-[5px] rounded-[1px] bg-[var(--caes-lime)]" />
                    </span>
                    <span className="font-mono text-[13px] font-medium tracking-[.15em] text-[var(--caes-ink)]">
                        CAES
                    </span>
                </span>

                <h1 className="mt-9 text-balance text-[clamp(26px,3.4vw,34px)] font-semibold leading-[1.1] tracking-[-0.034em] text-[var(--caes-ink)]">
                    Esta zona es de la agencia.
                </h1>

                <p className="mt-4 text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Tu cuenta es de instalador, así que aquí no hay nada que
                    puedas hacer. No es un error: tus expedientes y tus borradores
                    están en tu panel.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-4">
                    <Link
                        href="/installer/dashboard"
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        Ir a mis expedientes
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>

                    <Link
                        href="/es"
                        className="text-[14px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                    >
                        Volver al inicio
                    </Link>
                </div>

                <p className="mt-12 border-t border-[var(--caes-line)] pt-6 text-[13px] leading-[1.55] text-[var(--caes-faint)]">
                    Si tendrías que tener acceso de agencia, escríbenos: lo
                    cambiamos nosotros desde tu perfil.
                </p>
            </div>
        </div>
    )
}

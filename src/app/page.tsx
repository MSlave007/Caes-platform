import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE } from '@/lib/i18n/landing'

/**
 * La radice non ha più una pagina propria: la vecchia landing in inglese è
 * stata rimossa per non tenere in giro due versioni che si contraddicono.
 *
 * Qui si sceglierà la lingua dalle preferenze del browser; per ora si va
 * sullo spagnolo, che è la lingua base del prodotto.
 */
export default function RootPage() {
    redirect(`/${DEFAULT_LOCALE}`)
}

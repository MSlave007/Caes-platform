import PaginaCuenta from '@/components/cuenta/PaginaCuenta'

/**
 * «Mi cuenta» dentro l'area agenzia.
 *
 * La pagina è una sola (il componente condiviso): qui ci sono due
 * indirizzi perché così eredita il guscio dell'area da cui arrivi, e la
 * barra in alto non sparisce. Prima stava fuori da tutte e due e
 * passando da «Perfil» a «Mi cuenta» la navigazione svaniva — sembrava
 * di essere usciti dall'applicazione.
 */
export default function Page() {
    return <PaginaCuenta />
}

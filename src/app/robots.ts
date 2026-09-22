import type { MetadataRoute } from 'next'

/**
 * Cosa può finire su Google e cosa no.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * `/seguimiento/<token>` è una pagina **pubblica**: niente login, perché
 * chiedere al cliente di registrarsi per guardare una pratica che ha già
 * firmato sarebbe chiedergli lavoro in cambio di niente.
 *
 * Ma sopra c'è l'indirizzo di casa sua, il nome di chi gli ha fatto il
 * lavoro e quanti soldi gli tocca. Un indirizzo non indovinabile va
 * benissimo contro chi prova a caso; non vale niente contro un motore
 * di ricerca che trova il link da qualche parte — una mail inoltrata,
 * un messaggio in un gruppo, un sito che lo ricopia.
 *
 * Questo file, più il `robots: noindex` sulla pagina stessa, dicono di
 * no in due modi. Due, perché il primo che i crawler onesti rispettano
 * è il meta, e il secondo vale anche per chi non arriva mai a leggerlo.
 *
 * Le aree con login stanno qui per igiene: sono già dietro il
 * middleware, ma un crawler che le prova genera rumore nei log e
 * un'occasione in meno di sbagliare.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                // Dati personali di clienti che non hanno mai scelto di
                // essere su internet.
                '/seguimiento/',
                // La porta per caricare documenti: pubblica per forza,
                // ma non e una cosa da far trovare a chi cerca.
                '/subida/',
                '/admin/',
                '/installer/',
                '/cuenta',
                '/api/',
            ],
        },
    }
}

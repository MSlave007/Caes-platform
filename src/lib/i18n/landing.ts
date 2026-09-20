/**
 * Stringhe della landing. Lo spagnolo è la lingua base — è quella scritta
 * per prima e quella che vale in caso di dubbio; l'inglese è la traduzione.
 *
 * Le stringhe marcate DA CONFERMARE contengono numeri o promesse commerciali
 * che nessun documento di progetto sostiene ancora. Cercare "DA CONFERMARE"
 * in questo file prima di mettere la pagina online.
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const dictionary = {
  es: {
    htmlLang: "es",
    intlLocale: "es-ES",
    meta: {
      title: "CAES — Del albarán al certificado en quince minutos",
      description:
        "La plataforma que convierte cada instalación de aerotermia en un certificado de ahorro energético auditable. La IA lee tus facturas, el motor aplica el BOE, el contrato sale firmado.",
    },
    nav: {
      items: [
        { label: "Plataforma", href: "#como-funciona" },
        { label: "Normativa", href: "#numeros" },
        { label: "Simulador", href: "#simulador" },
        { label: "Precios", href: "#faq" },
      ],
      login: "Acceder",
      cta: "Solicitar acceso",
    },
    hero: {
      eyebrow: "Certificados de Ahorro Energético · Aerotermia",
      titleBefore: "Del albarán al certificado en ",
      titleAccent: "quince minutos",
      titleAfter: ".",
      sub: "La IA lee tus facturas, el motor aplica la normativa BOE y el contrato sale firmado. Tú solo instalas.",
      facts: [
        { value: "130 €", label: "por MWh ahorrado", sub: "tarifa CAES vigente" },
        { value: "20 %", label: "ahorro mínimo", sub: "sobre línea base" },
        { value: "10 años", label: "validez del", sub: "certificado emitido" },
      ],
      panel: {
        title: "Cola de revisión",
        pending: "4 pendientes",
        cols: {
          id: "Expte.",
          installer: "Instalador",
          savings: "Ahorro",
          status: "Estado",
          margin: "Margen",
        },
        sliderLabel: "Margen agencia sobre {amount} restantes",
        totalLabel: "Tu margen",
      },
      split: {
        title: "Reparto · Expte. 2481 · {amount}",
        installer: "Instalador",
        agency: "Agencia",
        reserve: "Reserva",
      },
    },
    simulator: {
      segInstaller: "Soy instalador",
      segAgency: "Soy agencia",
      fields: {
        equipo: "Equipo instalado",
        potencia: "Potencia",
        superficie: "Superficie útil",
        zona: "Zona climática",
        sustituido: "Equipo sustituido",
      },
      equipoValue: "Aerotermia ACS",
      submit: "Calcular CAES",
      recalculate: "Volver a calcular",
      footnotes: [
        "Tarifa oficial 130 €/MWh",
        "Resultado inmediato",
        "Sin registro previo",
      ],
      result: {
        heading: "Estimación para esta instalación",
        annual: "Valor CAES anual",
        yours: "Tu parte como instalador",
        savings: "Ahorro sobre línea base",
        threshold: "mínimo BOE 20 %",
        qualifies: "Cumple el mínimo",
        notQualifies: "No llega al mínimo",
        disclaimer:
          "Estimación orientativa. El valor definitivo se calcula sobre las facturas reales durante la revisión del expediente.",
        cta: "Abrir expediente",
      },
      substitutes: {
        termo_electrico: "Termo eléctrico",
        caldera_gas: "Caldera de gas",
        caldera_gasoleo: "Caldera de gasóleo",
      },
    },
    ganancias: {
      eyebrow: "Lo que ya has instalado",
      title: "Tres años de trabajo hecho, sin cobrar.",
      sub: "Desde febrero de 2023 cada caldera que has cambiado por una bomba de calor generaba derecho a un certificado. Tienes tres años desde el fin de obra para pedirlo: lo instalado en 2024 empieza a caducar el año que viene.",
      controls: {
        heading: "Pon tus números",
        instalaciones: "Instalaciones al año",
        comision: "Tu parte de la bolsa",
        comisionHint: "tu cliente se lleva el {pct} %",
        perfil: "Instalación tipo",
      },
      window: {
        title: "Tres años recuperables",
        body: "La ventana legal son tres años desde el fin de cada instalación. Lo que montaste en 2024 caduca en 2027, así que ese es el lote por el que se empieza.",
      },
      results: {
        /* I tre numeri che comandano la pagina. Il primo è il piatto intero
           sui tre anni: non si muove col cursore ed è l'unico fatto
           oggettivo della schermata. Gli altri due sono le due metà di quel
           piatto, anno per anno. Tutto il resto è di servizio. */
        headTable: "Lo que hay sobre la mesa desde 2024",
        headTableSub: "{n} expedientes de 2024, 2025 y 2026",
        poolNote: "Ninguna de las dos cifras se mueve con el reparto: es la bolsa entera, tuya y de tus clientes. Tú sólo decides dónde cae la raya.",
        headTableSplit: "{mine} para ti · {client} para tus clientes",
        headYearTotal: "Y el total de cada año",
        headYearTotalSub: "{n} al año · {each} por expediente",
        headYear: "Lo que ganas cada año",
        headYearSub: "{each} por expediente",
        headClient: "Lo que ahorras a tus clientes cada año",
        headClientSub: "{each} por cliente, antes de firmar",
        asideHeading: "De dónde sale",
        legendGestion: "gestión CAES",
        legendYou: "tú",
        legendClient: "tu cliente",
        certValue: "Valor del certificado",
        certSub: "{kwh} kWh ahorrados al año, a 130 €/MWh",
        hours: "Horas de papeleo",
        hoursSub: "{h} h al año · {hour} por hora de papeleo",
        reparto: "Reparto de cada certificado",
        repartoSub: "la bolsa son {pool} por expediente: tú {pct} %, tu cliente {cpct} %",
        capAviso: "Por encima del {tope} % del total, la comisión del instalador supera el tope del acuerdo CAES. En la plataforma el expediente no se puede firmar así.",
        windowChip: "3 años recuperables · lo de 2024 caduca en 2027",
      },
      belowMin:
        "Con estos datos la instalación no llega al 20 % de ahorro mínimo. Cambia el equipo sustituido o la zona climática.",
      disclaimer:
        "Estimación sobre la tarifa vigente de 130 €/MWh. El valor real se calcula sobre las facturas durante la revisión.",
      cta: "Calcular con mis facturas",
    },
    partners: {
      title: "Con la confianza de",
      note: "Logos pendientes de autorización",
    },
    how: {
      eyebrow: "Cómo funciona",
      title: "Cuatro pasos, ninguna hoja de cálculo.",
      sub: "El instalador hace lo que ya sabe hacer. Todo lo demás pasa solo.",
      steps: [
        {
          n: "01",
          title: "Tres fotos desde la obra",
          body: "Factura del equipo nuevo, número de serie visible y placa del modelo. Desde el móvil, sin salir de la instalación.",
        },
        {
          n: "02",
          title: "La IA extrae los datos",
          body: "Marca, modelo, potencia y número de serie salen de la foto. Si algo no se lee, se corrige a mano en un campo, no en un formulario entero.",
        },
        {
          n: "03",
          title: "El motor verifica el BOE",
          body: "Comprueba el 20 % de ahorro mínimo, la documentación obligatoria y el tope del 30 % de comisión. Si algo falla, lo dice antes de enviar.",
        },
        {
          n: "04",
          title: "Contrato firmado y expediente cerrado",
          body: "El acuerdo CAES se genera con el reparto ya aplicado. La agencia revisa y aprueba; el certificado queda válido diez años.",
        },
      ],
    },
    numbers: {
      eyebrow: "La normativa, en cuatro cifras",
      title: "Las reglas no las ponemos nosotros.",
      sub: "Están en el BOE desde enero de 2023. Nosotros solo nos aseguramos de que tu expediente las cumpla todas antes de que lo envíes.",
      cards: [
        {
          value: "130 €",
          unit: "/ MWh",
          title: "Tarifa oficial",
          body: "Fija, la misma para todos. No se negocia y no depende de la agencia con la que trabajes.",
        },
        {
          value: "20 %",
          unit: "mínimo",
          title: "Ahorro sobre línea base",
          body: "Por debajo de esta cifra la instalación no es elegible. El motor lo comprueba antes de que pierdas tiempo.",
        },
        {
          value: "30 %",
          unit: "máximo",
          title: "Comisión del instalador",
          body: "Puedes elegir cuánto te quedas, hasta este tope. Por encima, el acuerdo CAES es inválido y hay que rehacerlo.",
        },
        {
          value: "10",
          unit: "años",
          title: "Validez del certificado",
          body: "Desde la fecha de aprobación. A partir de ese momento el expediente es legal y auditable.",
        },
      ],
      splitTitle: "Cómo se reparte un expediente de 400 €",
      splitBody:
        "El instalador fija su comisión al enviar y queda bloqueada. La agencia elige su margen solo al aprobar, sobre lo que queda. Las dos partes ven el mismo número en todo momento.",
    },
    who: {
      eyebrow: "Dos oficios, una plataforma",
      title: "Cada uno ve lo suyo.",
      installer: {
        tag: "Instalador",
        title: "Desde el móvil, en la obra",
        bullets: [
          "Un asistente de cuatro pasos, una decisión por pantalla",
          "Guardado como borrador en cualquier momento",
          "Tu comisión, elegida por ti y visible desde el primer paso",
          "Aviso en cuanto la agencia aprueba",
        ],
      },
      agency: {
        tag: "Agencia",
        title: "Desde el escritorio, en control",
        bullets: [
          "Cola de revisión con el estado de cada expediente",
          "Documento y datos extraídos en la misma pantalla",
          "Margen ajustable sobre el importe restante",
          "Certificado y contrato generados al aprobar",
        ],
      },
    },
    faq: {
      eyebrow: "Antes de que lo preguntes",
      title: "Las cinco dudas de siempre.",
      sub: "Si falta la tuya, escríbenos: la añadimos.",
      items: [
        {
          q: "¿Y si el BOE cambia?",
          a: "El motor de normativa está separado del resto de la plataforma justamente por eso. Cuando cambia una tarifa o un requisito, se actualiza en un sitio y los expedientes nuevos ya salen con las reglas nuevas. Los expedientes ya aprobados mantienen las reglas vigentes en su fecha de aprobación, que es como funciona la validez legal.",
        },
        {
          q: "¿Quién responde en una auditoría?",
          a: "El expediente. Por eso guardamos todo lo que se usó para generarlo: las fotos originales, los datos extraídos, las correcciones manuales y la fecha exacta de cada paso. Si la extracción automática se equivocó y alguien la corrigió, queda registrado quién y cuándo.",
        },
        {
          q: "¿Cuánto cobro yo por instalación?",
          a: "Lo eliges tú, hasta el 30 % del ahorro calculado, que es el tope legal. En el ejemplo de un expediente de 400 € al año, un 25 % son 100 € para ti. Lo fijas al enviar y queda bloqueado: la agencia no puede tocarlo después.",
        },
        {
          q: "¿Qué pasa si falta un documento?",
          a: "No puedes enviar, y te decimos cuál falta antes de que te vayas de la obra. Es preferible a descubrirlo una semana después, cuando volver a hacer la foto del número de serie significa volver a la casa del cliente.",
        },
        {
          q: "¿Cuánto tarda la aprobación?",
          a: "Depende de la agencia, no de nosotros. La recomendación del sector está entre cinco y diez días hábiles. En la plataforma ves en qué estado está tu expediente en cada momento, sin llamar a nadie.",
        },
      ],
    },
    cta: {
      eyebrow: "Empezar",
      title: "Tu próxima instalación puede salir certificada.",
      sub: "Cuéntanos cuántas haces al mes y te damos acceso. Sin permanencia.",
      placeholder: "Tu email de trabajo",
      button: "Solicitar acceso",
      // DA CONFERMARE — tempo di attivazione non supportato da nessun documento
      note: "Alta verificada en 24 h · Sin permanencia",
      timelineTitle: "Qué pasa después",
      timeline: [
        {
          when: "Hoy",
          what: "Nos dejas el email y cuántas instalaciones haces al mes.",
        },
        {
          // DA CONFERMARE — chi risponde e in quanto tempo
          when: "En 24 h",
          what: "Te escribe una persona del equipo, no un formulario automático.",
        },
        {
          when: "Después",
          what: "Pruebas la plataforma con un expediente real antes de decidir nada.",
        },
      ],
    },
    footer: {
      descriptor: "Plataforma de certificados de ahorro energético",
      rights: "Todos los derechos reservados.",
      langLabel: "Idioma",
    },
  },

  en: {
    htmlLang: "en",
    intlLocale: "en-IE",
    meta: {
      title: "CAES — From delivery note to certificate in fifteen minutes",
      description:
        "The platform that turns every heat pump installation into an auditable energy savings certificate. AI reads your invoices, the engine applies Spanish regulation, the contract comes out signed.",
    },
    nav: {
      items: [
        { label: "Platform", href: "#como-funciona" },
        { label: "Regulation", href: "#numeros" },
        { label: "Simulator", href: "#simulador" },
        { label: "Pricing", href: "#faq" },
      ],
      login: "Log in",
      cta: "Request access",
    },
    hero: {
      eyebrow: "Energy Savings Certificates · Heat pumps",
      titleBefore: "From delivery note to certificate in ",
      titleAccent: "fifteen minutes",
      titleAfter: ".",
      sub: "AI reads your invoices, the engine applies the regulation and the contract comes out signed. You just install.",
      facts: [
        { value: "€130", label: "per MWh saved", sub: "official rate" },
        { value: "20%", label: "minimum saving", sub: "against baseline" },
        { value: "10 years", label: "validity of the", sub: "issued certificate" },
      ],
      panel: {
        title: "Review queue",
        pending: "4 pending",
        cols: {
          id: "Case",
          installer: "Installer",
          savings: "Saving",
          status: "Status",
          margin: "Margin",
        },
        sliderLabel: "Agency margin on {amount} remaining",
        totalLabel: "Your margin",
      },
      split: {
        title: "Split · Case 2481 · {amount}",
        installer: "Installer",
        agency: "Agency",
        reserve: "Reserve",
      },
    },
    simulator: {
      segInstaller: "I install",
      segAgency: "I review",
      fields: {
        equipo: "Installed unit",
        potencia: "Power",
        superficie: "Floor area",
        zona: "Climate zone",
        sustituido: "Replaced unit",
      },
      equipoValue: "Heat pump · DHW",
      submit: "Calculate CAES",
      recalculate: "Calculate again",
      footnotes: [
        "Official rate €130/MWh",
        "Instant result",
        "No sign-up needed",
      ],
      result: {
        heading: "Estimate for this installation",
        annual: "Annual CAES value",
        yours: "Your share as installer",
        savings: "Saving against baseline",
        threshold: "20% legal minimum",
        qualifies: "Above the minimum",
        notQualifies: "Below the minimum",
        disclaimer:
          "Indicative estimate. The final value is calculated from the real invoices during case review.",
        cta: "Open a case",
      },
      substitutes: {
        termo_electrico: "Electric water heater",
        caldera_gas: "Gas boiler",
        caldera_gasoleo: "Oil boiler",
      },
    },
    ganancias: {
      eyebrow: "What you have already installed",
      title: "Three years of work done, never invoiced.",
      sub: "Since February 2023, every boiler you replaced with a heat pump earned the right to a certificate. You have three years from completion to claim it: 2024 jobs start expiring next year.",
      controls: {
        heading: "Put in your numbers",
        instalaciones: "Installations per year",
        comision: "Your share of the pot",
        comisionHint: "your customer gets {pct} %",
        perfil: "Typical installation",
      },
      window: {
        title: "Three years to recover",
        body: "The legal window is three years from the end of each installation. What you fitted in 2024 expires in 2027, so that is the batch to start with.",
      },
      results: {
        headTable: "On the table since 2024",
        headTableSub: "{n} cases from 2024, 2025 and 2026",
        poolNote: "Neither figure moves with the split: it is the whole pot, yours and your customers'. You only decide where the line falls.",
        headTableSplit: "{mine} for you · {client} for your customers",
        headYearTotal: "And the total every year",
        headYearTotalSub: "{n} a year · {each} per case",
        headYear: "What you earn every year",
        headYearSub: "{each} per case",
        headClient: "What you save your customers every year",
        headClientSub: "{each} per customer, before signing",
        asideHeading: "Where it comes from",
        legendGestion: "CAES handling",
        legendYou: "you",
        legendClient: "your customer",
        certValue: "Certificate value",
        certSub: "{kwh} kWh saved per year, at 130 €/MWh",
        hours: "Hours of paperwork",
        hoursSub: "{h} h a year · {hour} per hour of paperwork",
        reparto: "How each certificate splits",
        repartoSub: "the pot is {pool} per case: you {pct} %, your customer {cpct} %",
        capAviso: "Above {tope} % of the total, the installer commission exceeds the CAES agreement cap. On the platform a case cannot be signed like this.",
        windowChip: "3 years recoverable · 2024 expires in 2027",
      },
      belowMin:
        "With these inputs the installation does not reach the 20 % minimum saving. Change the replaced unit or the climate zone.",
      disclaimer:
        "Estimate based on the current 130 €/MWh tariff. The real value is calculated from the invoices during review.",
      cta: "Calculate with my invoices",
    },
    partners: {
      title: "Trusted by",
      note: "Logos pending authorisation",
    },
    how: {
      eyebrow: "How it works",
      title: "Four steps, zero spreadsheets.",
      sub: "The installer does what they already know how to do. Everything else happens on its own.",
      steps: [
        {
          n: "01",
          title: "Three photos from the site",
          body: "Invoice for the new unit, visible serial number and model plate. From the phone, without leaving the installation.",
        },
        {
          n: "02",
          title: "AI pulls out the data",
          body: "Make, model, power and serial number come straight from the photo. If something can't be read, you fix one field, not a whole form.",
        },
        {
          n: "03",
          title: "The engine checks the regulation",
          body: "It verifies the 20% minimum saving, the required documents and the 30% commission cap. If something fails, you hear about it before you submit.",
        },
        {
          n: "04",
          title: "Contract signed, case closed",
          body: "The CAES agreement is generated with the split already applied. The agency reviews and approves; the certificate stays valid for ten years.",
        },
      ],
    },
    numbers: {
      eyebrow: "The regulation, in four figures",
      title: "We don't set the rules.",
      sub: "They have been in Spanish law since January 2023. We just make sure your case meets all of them before you submit it.",
      cards: [
        {
          value: "€130",
          unit: "/ MWh",
          title: "Official rate",
          body: "Fixed, the same for everyone. Not negotiable and not dependent on the agency you work with.",
        },
        {
          value: "20%",
          unit: "minimum",
          title: "Saving against baseline",
          body: "Below this figure the installation is not eligible. The engine checks it before you waste your time.",
        },
        {
          value: "30%",
          unit: "maximum",
          title: "Installer commission",
          body: "You choose how much you keep, up to this cap. Above it the CAES agreement is invalid and has to be redone.",
        },
        {
          value: "10",
          unit: "years",
          title: "Certificate validity",
          body: "From the approval date. From that moment the case is legal and auditable.",
        },
      ],
      splitTitle: "How a €400 case is split",
      splitBody:
        "The installer sets their commission on submission and it locks. The agency picks its margin only on approval, out of what remains. Both sides see the same number the whole way through.",
    },
    who: {
      eyebrow: "Two jobs, one platform",
      title: "Each side sees its own.",
      installer: {
        tag: "Installer",
        title: "On the phone, on site",
        bullets: [
          "A four-step wizard, one decision per screen",
          "Save as draft at any point",
          "Your commission, chosen by you, visible from step one",
          "A notification the moment the agency approves",
        ],
      },
      agency: {
        tag: "Agency",
        title: "At the desk, in control",
        bullets: [
          "Review queue with the state of every case",
          "Document and extracted data on the same screen",
          "Adjustable margin on the remaining amount",
          "Certificate and contract generated on approval",
        ],
      },
    },
    faq: {
      eyebrow: "Before you ask",
      title: "The five questions everyone asks.",
      sub: "If yours is missing, write to us and we'll add it.",
      items: [
        {
          q: "What if the regulation changes?",
          a: "The regulation engine is kept separate from the rest of the platform precisely for this. When a rate or a requirement changes, it is updated in one place and new cases come out under the new rules. Already approved cases keep the rules in force on their approval date, which is how legal validity works.",
        },
        {
          q: "Who answers in an audit?",
          a: "The case file does. That is why we keep everything used to produce it: the original photos, the extracted data, the manual corrections and the exact timestamp of every step. If the automatic extraction got something wrong and someone fixed it, it is on record who and when.",
        },
        {
          q: "How much do I earn per installation?",
          a: "You choose, up to 30% of the calculated saving, which is the legal cap. On a €400-a-year case, 25% is €100 for you. You set it on submission and it locks: the agency cannot change it afterwards.",
        },
        {
          q: "What happens if a document is missing?",
          a: "You cannot submit, and we tell you which one before you leave the site. That beats finding out a week later, when retaking the photo of the serial number means going back to the customer's house.",
        },
        {
          q: "How long does approval take?",
          a: "That depends on the agency, not on us. The industry recommendation is five to ten working days. On the platform you can see the state of your case at any moment without calling anyone.",
        },
      ],
    },
    cta: {
      eyebrow: "Get started",
      title: "Your next installation can come out certified.",
      sub: "Tell us how many you do a month and we'll set you up. No lock-in.",
      placeholder: "Your work email",
      button: "Request access",
      // DA CONFERMARE — activation time is not backed by any project document
      note: "Verified within 24 h · No lock-in",
      timelineTitle: "What happens next",
      timeline: [
        {
          when: "Today",
          what: "You leave your email and how many installations you do a month.",
        },
        {
          // DA CONFERMARE — who replies, and how fast
          when: "Within 24 h",
          what: "Someone from the team writes to you — not an automated form.",
        },
        {
          when: "After that",
          what: "You try the platform on a real case before committing to anything.",
        },
      ],
    },
    footer: {
      descriptor: "Energy savings certificate platform",
      rights: "All rights reserved.",
      langLabel: "Language",
    },
  },
} as const;

export type Dict = (typeof dictionary)["es"];

export function getDictionary(locale: Locale): Dict {
  return dictionary[locale] as unknown as Dict;
}

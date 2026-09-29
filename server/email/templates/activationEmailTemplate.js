import { renderEmailShell, escapeHtml, BRAND_NAVY } from "./emailLayout.js";

// Generalización de la plantilla de bienvenida (antes welcomeEmailTemplate.js)
// para que un único template sirva a los tres flujos que envían "aquí tienes
// un enlace para entrar y fijar tu contraseña": alta, reactivación y
// regenerar contraseña. Solo cambia el copy (motivo), nunca el layout —
// evita triplicar HTML/texto para el mismo email con distinto contexto.
export const ACTIVATION_EMAIL_COPY = {
  signup: {
    subject: "Tu acceso a Ocean Flow ya está listo",
    preheader: "Entra y crea tu contraseña para empezar.",
    title: "Bienvenido/a a Ocean Flow",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Ya tienes cuenta en Ocean Flow, la herramienta que usamos para llevar el control de clases, comisiones y pagos.",
    ctaLabel: "Entrar en Ocean Flow",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
    footer: "Ocean Flow",
  },
  // Registro externo (ADR-0023) — a diferencia de "signup" (alta manual
  // por un admin), aquí la propia persona se ha registrado, así que el
  // tono confirma su propia acción ("gracias por registrarte") en vez de
  // avisar de un alta hecha por otra persona.
  external_signup: {
    subject: "Confirma tu cuenta en Ocean Flow",
    preheader: "Entra y crea tu contraseña para empezar.",
    title: "¡Gracias por registrarte en Ocean Flow!",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Ya casi está — confirma tu cuenta para empezar a llevar el control de tus clases, comisiones y pagos.",
    ctaLabel: "Confirmar cuenta",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, vuelve a registrarte desde la pantalla de acceso.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Tu acceso a Ocean Flow ha sido reactivado",
    preheader: "Entra y crea tu contraseña para volver a acceder.",
    title: "Bienvenido/a de nuevo a Ocean Flow",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "¡Buenas noticias! Tu cuenta en Ocean Flow ya está activa de nuevo.",
    ctaLabel: "Entrar en Ocean Flow",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Se ha restablecido tu contraseña en Ocean Flow",
    preheader: "Crea tu nueva contraseña para volver a acceder.",
    title: "Restablece tu contraseña",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Hemos restablecido tu contraseña en Ocean Flow — crea una nueva con el siguiente enlace.",
    ctaLabel: "Crear nueva contraseña",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu nueva contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
    footer: "Ocean Flow",
  },
  // Distinto de "password_reset" (ese es cuando UN ADMIN invalida la
  // contraseña de otra cuenta). Este es autoservicio — la propia persona
  // lo ha pedido desde "¿Olvidaste tu contraseña?" en el login — así que el
  // tono es "lo pediste tú" en vez de "un admin te la ha invalidado", y
  // añade la nota de seguridad estándar de "si no has sido tú, ignóralo".
  password_reset_request: {
    subject: "Restablece tu contraseña en Ocean Flow",
    preheader: "Crea una nueva contraseña para volver a acceder.",
    title: "Restablece tu contraseña",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Has solicitado restablecer tu contraseña en Ocean Flow. Si no has sido tú, puedes ignorar este email — tu contraseña actual seguirá funcionando.",
    ctaLabel: "Crear nueva contraseña",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu nueva contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, vuelve a solicitar la recuperación desde la pantalla de acceso.",
    footer: "Ocean Flow",
  },
};

// Copy en inglés (2026-09-29, primer corte de idiomas para el email de
// bienvenida — pedido explícito: "el email de bienvenida se enviará en el
// idioma elegido por supuesto"). De los 15 idiomas que soporta la app,
// solo español (arriba) e inglés (aquí) tienen plantilla propia por ahora;
// el resto cae a español vía resolveActivationEmailCopy() más abajo hasta
// un pase de traducción aparte — decisión explícita del usuario para no
// bloquear el resto del cableado (selector de idioma + enlaces con
// ?lang=) a tener las 15 traducciones listas de golpe.
export const ACTIVATION_EMAIL_COPY_EN = {
  signup: {
    subject: "Your Ocean Flow access is ready",
    preheader: "Sign in and create your password to get started.",
    title: "Welcome to Ocean Flow",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "You now have an Ocean Flow account, the tool we use to track classes, commissions and payments.",
    ctaLabel: "Sign in to Ocean Flow",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your own password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, ask an administrator to resend it.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Confirm your Ocean Flow account",
    preheader: "Sign in and create your password to get started.",
    title: "Thanks for signing up to Ocean Flow!",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "Almost there — confirm your account to start tracking your classes, commissions and payments.",
    ctaLabel: "Confirm account",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your own password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, sign up again from the login screen.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Your Ocean Flow access has been reactivated",
    preheader: "Sign in and create your password to access again.",
    title: "Welcome back to Ocean Flow",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "Good news! Your Ocean Flow account is active again.",
    ctaLabel: "Sign in to Ocean Flow",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your own password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, ask an administrator to resend it.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Your Ocean Flow password has been reset",
    preheader: "Create your new password to access again.",
    title: "Reset your password",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "We've reset your password on Ocean Flow — create a new one with the link below.",
    ctaLabel: "Create new password",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your new password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, ask an administrator to resend it.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Reset your Ocean Flow password",
    preheader: "Create a new password to access again.",
    title: "Reset your password",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "You requested to reset your password on Ocean Flow. If this wasn't you, you can ignore this email — your current password will keep working.",
    ctaLabel: "Create new password",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your new password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, request password recovery again from the login screen.",
    footer: "Ocean Flow",
  },
};

// Resto de idiomas de la app (2026-09-29, pedido explícito: "traduce el
// email de bienvenida a los idiomas disponibles"). Registro de tuteo/
// formalidad verificado contra el resto de copy ya existente de cada
// idioma (register.jsx/auth.json, la diapositiva de WhatsNew del libro de
// Koh Tao) antes de traducir, para no introducir una segunda voz dentro
// del mismo idioma — francés usa "vous" (no "tu": "gérez vos cours",
// register.jsx) y portugués usa "você" (no "tu": "Junte-se ao Ocean
// Flow", "controle suas aulas", vocabulario brasileño real en
// register.jsx) — la diapositiva de Koh Tao en portugués quedó con
// formas de "tu" por error en su momento, es la excepción, no la norma;
// se sigue aquí el registro real y mayoritario de la app, no ese error.
export const ACTIVATION_EMAIL_COPY_FR = {
  signup: {
    subject: "Votre accès à Ocean Flow est prêt",
    preheader: "Connectez-vous et créez votre mot de passe pour commencer.",
    title: "Bienvenue sur Ocean Flow",
    greeting: (firstName) => `Bonjour${firstName ? ` ${firstName}` : ""},`,
    intro: "Vous avez maintenant un compte Ocean Flow, l'outil qu'on utilise pour suivre les cours, les commissions et les paiements.",
    ctaLabel: "Se connecter à Ocean Flow",
    securityNote: "En cliquant sur le bouton, vous serez connecté(e) directement. Comme première étape, nous vous demanderons de créer votre propre mot de passe.",
    expiryNote: "Ce lien est à usage unique et expire bientôt — s'il a expiré, demandez à un administrateur de vous le renvoyer.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Confirmez votre compte Ocean Flow",
    preheader: "Connectez-vous et créez votre mot de passe pour commencer.",
    title: "Merci de vous être inscrit(e) sur Ocean Flow !",
    greeting: (firstName) => `Bonjour${firstName ? ` ${firstName}` : ""},`,
    intro: "Presque terminé — confirmez votre compte pour commencer à suivre vos cours, commissions et paiements.",
    ctaLabel: "Confirmer le compte",
    securityNote: "En cliquant sur le bouton, vous serez connecté(e) directement. Comme première étape, nous vous demanderons de créer votre propre mot de passe.",
    expiryNote: "Ce lien est à usage unique et expire bientôt — s'il a expiré, réinscrivez-vous depuis l'écran de connexion.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Votre accès à Ocean Flow a été réactivé",
    preheader: "Connectez-vous et créez votre mot de passe pour accéder à nouveau.",
    title: "Bon retour sur Ocean Flow",
    greeting: (firstName) => `Bonjour${firstName ? ` ${firstName}` : ""},`,
    intro: "Bonne nouvelle ! Votre compte Ocean Flow est de nouveau actif.",
    ctaLabel: "Se connecter à Ocean Flow",
    securityNote: "En cliquant sur le bouton, vous serez connecté(e) directement. Comme première étape, nous vous demanderons de créer votre propre mot de passe.",
    expiryNote: "Ce lien est à usage unique et expire bientôt — s'il a expiré, demandez à un administrateur de vous le renvoyer.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Votre mot de passe Ocean Flow a été réinitialisé",
    preheader: "Créez votre nouveau mot de passe pour accéder à nouveau.",
    title: "Réinitialisez votre mot de passe",
    greeting: (firstName) => `Bonjour${firstName ? ` ${firstName}` : ""},`,
    intro: "Nous avons réinitialisé votre mot de passe sur Ocean Flow — créez-en un nouveau avec le lien ci-dessous.",
    ctaLabel: "Créer un nouveau mot de passe",
    securityNote: "En cliquant sur le bouton, vous serez connecté(e) directement. Comme première étape, nous vous demanderons de créer votre nouveau mot de passe.",
    expiryNote: "Ce lien est à usage unique et expire bientôt — s'il a expiré, demandez à un administrateur de vous le renvoyer.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Réinitialisez votre mot de passe Ocean Flow",
    preheader: "Créez un nouveau mot de passe pour accéder à nouveau.",
    title: "Réinitialisez votre mot de passe",
    greeting: (firstName) => `Bonjour${firstName ? ` ${firstName}` : ""},`,
    intro: "Vous avez demandé à réinitialiser votre mot de passe sur Ocean Flow. Si ce n'est pas vous, vous pouvez ignorer cet email — votre mot de passe actuel continuera de fonctionner.",
    ctaLabel: "Créer un nouveau mot de passe",
    securityNote: "En cliquant sur le bouton, vous serez connecté(e) directement. Comme première étape, nous vous demanderons de créer votre nouveau mot de passe.",
    expiryNote: "Ce lien est à usage unique et expire bientôt — s'il a expiré, redemandez la récupération depuis l'écran de connexion.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_IT = {
  signup: {
    subject: "Il tuo accesso a Ocean Flow è pronto",
    preheader: "Accedi e crea la tua password per iniziare.",
    title: "Benvenuto/a su Ocean Flow",
    greeting: (firstName) => `Ciao${firstName ? ` ${firstName}` : ""},`,
    intro: "Ora hai un account Ocean Flow, lo strumento che usiamo per tenere traccia di corsi, commissioni e pagamenti.",
    ctaLabel: "Accedi a Ocean Flow",
    securityNote: "Cliccando sul pulsante accederai direttamente. Come primo passo, ti chiederemo di creare la tua password.",
    expiryNote: "Questo link è a uso singolo e scade presto — se è scaduto, chiedi a un amministratore di rinviartelo.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Conferma il tuo account Ocean Flow",
    preheader: "Accedi e crea la tua password per iniziare.",
    title: "Grazie per esserti registrato/a su Ocean Flow!",
    greeting: (firstName) => `Ciao${firstName ? ` ${firstName}` : ""},`,
    intro: "Ci siamo quasi — conferma il tuo account per iniziare a tenere traccia di corsi, commissioni e pagamenti.",
    ctaLabel: "Conferma account",
    securityNote: "Cliccando sul pulsante accederai direttamente. Come primo passo, ti chiederemo di creare la tua password.",
    expiryNote: "Questo link è a uso singolo e scade presto — se è scaduto, registrati di nuovo dalla schermata di accesso.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Il tuo accesso a Ocean Flow è stato riattivato",
    preheader: "Accedi e crea la tua password per accedere di nuovo.",
    title: "Bentornato/a su Ocean Flow",
    greeting: (firstName) => `Ciao${firstName ? ` ${firstName}` : ""},`,
    intro: "Buone notizie! Il tuo account Ocean Flow è di nuovo attivo.",
    ctaLabel: "Accedi a Ocean Flow",
    securityNote: "Cliccando sul pulsante accederai direttamente. Come primo passo, ti chiederemo di creare la tua password.",
    expiryNote: "Questo link è a uso singolo e scade presto — se è scaduto, chiedi a un amministratore di rinviartelo.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "La tua password di Ocean Flow è stata reimpostata",
    preheader: "Crea la tua nuova password per accedere di nuovo.",
    title: "Reimposta la tua password",
    greeting: (firstName) => `Ciao${firstName ? ` ${firstName}` : ""},`,
    intro: "Abbiamo reimpostato la tua password su Ocean Flow — creane una nuova con il link qui sotto.",
    ctaLabel: "Crea nuova password",
    securityNote: "Cliccando sul pulsante accederai direttamente. Come primo passo, ti chiederemo di creare la tua nuova password.",
    expiryNote: "Questo link è a uso singolo e scade presto — se è scaduto, chiedi a un amministratore di rinviartelo.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Reimposta la tua password di Ocean Flow",
    preheader: "Crea una nuova password per accedere di nuovo.",
    title: "Reimposta la tua password",
    greeting: (firstName) => `Ciao${firstName ? ` ${firstName}` : ""},`,
    intro: "Hai richiesto di reimpostare la tua password su Ocean Flow. Se non sei stato/a tu, puoi ignorare questa email — la tua password attuale continuerà a funzionare.",
    ctaLabel: "Crea nuova password",
    securityNote: "Cliccando sul pulsante accederai direttamente. Come primo passo, ti chiederemo di creare la tua nuova password.",
    expiryNote: "Questo link è a uso singolo e scade presto — se è scaduto, richiedi di nuovo il recupero dalla schermata di accesso.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_DE = {
  signup: {
    subject: "Dein Zugang zu Ocean Flow ist bereit",
    preheader: "Melde dich an und erstelle dein Passwort, um loszulegen.",
    title: "Willkommen bei Ocean Flow",
    greeting: (firstName) => `Hallo${firstName ? ` ${firstName}` : ""},`,
    intro: "Du hast jetzt ein Ocean Flow-Konto, das Tool, mit dem wir Kurse, Provisionen und Zahlungen verfolgen.",
    ctaLabel: "Bei Ocean Flow anmelden",
    securityNote: "Wenn du auf die Schaltfläche klickst, wirst du direkt angemeldet. Als ersten Schritt bitten wir dich, dein eigenes Passwort zu erstellen.",
    expiryNote: "Dieser Link ist nur einmal gültig und läuft bald ab — falls er abgelaufen ist, bitte einen Administrator, ihn dir erneut zu senden.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Bestätige dein Ocean Flow-Konto",
    preheader: "Melde dich an und erstelle dein Passwort, um loszulegen.",
    title: "Danke für deine Anmeldung bei Ocean Flow!",
    greeting: (firstName) => `Hallo${firstName ? ` ${firstName}` : ""},`,
    intro: "Fast geschafft — bestätige dein Konto, um mit dem Verfolgen deiner Kurse, Provisionen und Zahlungen zu beginnen.",
    ctaLabel: "Konto bestätigen",
    securityNote: "Wenn du auf die Schaltfläche klickst, wirst du direkt angemeldet. Als ersten Schritt bitten wir dich, dein eigenes Passwort zu erstellen.",
    expiryNote: "Dieser Link ist nur einmal gültig und läuft bald ab — falls er abgelaufen ist, melde dich erneut über den Anmeldebildschirm an.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Dein Zugang zu Ocean Flow wurde reaktiviert",
    preheader: "Melde dich an und erstelle dein Passwort, um wieder zuzugreifen.",
    title: "Willkommen zurück bei Ocean Flow",
    greeting: (firstName) => `Hallo${firstName ? ` ${firstName}` : ""},`,
    intro: "Gute Nachrichten! Dein Ocean Flow-Konto ist wieder aktiv.",
    ctaLabel: "Bei Ocean Flow anmelden",
    securityNote: "Wenn du auf die Schaltfläche klickst, wirst du direkt angemeldet. Als ersten Schritt bitten wir dich, dein eigenes Passwort zu erstellen.",
    expiryNote: "Dieser Link ist nur einmal gültig und läuft bald ab — falls er abgelaufen ist, bitte einen Administrator, ihn dir erneut zu senden.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Dein Ocean Flow-Passwort wurde zurückgesetzt",
    preheader: "Erstelle dein neues Passwort, um wieder zuzugreifen.",
    title: "Setze dein Passwort zurück",
    greeting: (firstName) => `Hallo${firstName ? ` ${firstName}` : ""},`,
    intro: "Wir haben dein Passwort bei Ocean Flow zurückgesetzt — erstelle ein neues über den folgenden Link.",
    ctaLabel: "Neues Passwort erstellen",
    securityNote: "Wenn du auf die Schaltfläche klickst, wirst du direkt angemeldet. Als ersten Schritt bitten wir dich, dein neues Passwort zu erstellen.",
    expiryNote: "Dieser Link ist nur einmal gültig und läuft bald ab — falls er abgelaufen ist, bitte einen Administrator, ihn dir erneut zu senden.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Setze dein Ocean Flow-Passwort zurück",
    preheader: "Erstelle ein neues Passwort, um wieder zuzugreifen.",
    title: "Setze dein Passwort zurück",
    greeting: (firstName) => `Hallo${firstName ? ` ${firstName}` : ""},`,
    intro: "Du hast beantragt, dein Passwort bei Ocean Flow zurückzusetzen. Falls du das nicht warst, kannst du diese E-Mail ignorieren — dein aktuelles Passwort funktioniert weiterhin.",
    ctaLabel: "Neues Passwort erstellen",
    securityNote: "Wenn du auf die Schaltfläche klickst, wirst du direkt angemeldet. Als ersten Schritt bitten wir dich, dein neues Passwort zu erstellen.",
    expiryNote: "Dieser Link ist nur einmal gültig und läuft bald ab — falls er abgelaufen ist, fordere die Wiederherstellung erneut über den Anmeldebildschirm an.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_CA = {
  signup: {
    subject: "El teu accés a Ocean Flow ja està llest",
    preheader: "Entra i crea la teva contrasenya per començar.",
    title: "Benvingut/da a Ocean Flow",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Ja tens un compte a Ocean Flow, l'eina que fem servir per portar el control de classes, comissions i pagaments.",
    ctaLabel: "Entra a Ocean Flow",
    securityNote: "En prémer el botó entraràs directament. Com a primer pas, et demanarem que creïs la teva pròpia contrasenya.",
    expiryNote: "Aquest enllaç és d'un sol ús i caduca aviat — si ha caducat, demana a un administrador que te'l torni a enviar.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Confirma el teu compte a Ocean Flow",
    preheader: "Entra i crea la teva contrasenya per començar.",
    title: "Gràcies per registrar-te a Ocean Flow!",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Ja gairebé hi ets — confirma el teu compte per començar a portar el control de les teves classes, comissions i pagaments.",
    ctaLabel: "Confirmar compte",
    securityNote: "En prémer el botó entraràs directament. Com a primer pas, et demanarem que creïs la teva pròpia contrasenya.",
    expiryNote: "Aquest enllaç és d'un sol ús i caduca aviat — si ha caducat, torna a registrar-te des de la pantalla d'accés.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "El teu accés a Ocean Flow s'ha reactivat",
    preheader: "Entra i crea la teva contrasenya per tornar a accedir.",
    title: "Benvingut/da de nou a Ocean Flow",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Bones notícies! El teu compte a Ocean Flow ja torna a estar actiu.",
    ctaLabel: "Entra a Ocean Flow",
    securityNote: "En prémer el botó entraràs directament. Com a primer pas, et demanarem que creïs la teva pròpia contrasenya.",
    expiryNote: "Aquest enllaç és d'un sol ús i caduca aviat — si ha caducat, demana a un administrador que te'l torni a enviar.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "S'ha restablert la teva contrasenya a Ocean Flow",
    preheader: "Crea la teva nova contrasenya per tornar a accedir.",
    title: "Restableix la teva contrasenya",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Hem restablert la teva contrasenya a Ocean Flow — crea'n una de nova amb el següent enllaç.",
    ctaLabel: "Crear nova contrasenya",
    securityNote: "En prémer el botó entraràs directament. Com a primer pas, et demanarem que creïs la teva nova contrasenya.",
    expiryNote: "Aquest enllaç és d'un sol ús i caduca aviat — si ha caducat, demana a un administrador que te'l torni a enviar.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Restableix la teva contrasenya a Ocean Flow",
    preheader: "Crea una nova contrasenya per tornar a accedir.",
    title: "Restableix la teva contrasenya",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Has sol·licitat restablir la teva contrasenya a Ocean Flow. Si no has estat tu, pots ignorar aquest correu — la teva contrasenya actual seguirà funcionant.",
    ctaLabel: "Crear nova contrasenya",
    securityNote: "En prémer el botó entraràs directament. Com a primer pas, et demanarem que creïs la teva nova contrasenya.",
    expiryNote: "Aquest enllaç és d'un sol ús i caduca aviat — si ha caducat, torna a sol·licitar la recuperació des de la pantalla d'accés.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_EU = {
  signup: {
    subject: "Zure Ocean Flow sarbidea prest dago",
    preheader: "Sartu eta sortu zure pasahitza hasteko.",
    title: "Ongi etorri Ocean Flow-era",
    greeting: (firstName) => `Kaixo${firstName ? ` ${firstName}` : ""},`,
    intro: "Jada baduzu Ocean Flow kontua, klaseak, komisioak eta ordainketak kontrolatzeko erabiltzen dugun tresna.",
    ctaLabel: "Sartu Ocean Flow-en",
    securityNote: "Botoia sakatzean zuzenean sartuko zara. Lehen urrats gisa, zure pasahitza sortzeko eskatuko dizugu.",
    expiryNote: "Esteka hau erabilera bakarrekoa da eta laster iraungiko da — iraungi bada, eskatu administratzaile bati berriro bidaltzeko.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Berretsi zure Ocean Flow kontua",
    preheader: "Sartu eta sortu zure pasahitza hasteko.",
    title: "Eskerrik asko Ocean Flow-en izena emateagatik!",
    greeting: (firstName) => `Kaixo${firstName ? ` ${firstName}` : ""},`,
    intro: "Ia bukatuta — berretsi zure kontua zure klaseak, komisioak eta ordainketak kontrolatzen hasteko.",
    ctaLabel: "Kontua berretsi",
    securityNote: "Botoia sakatzean zuzenean sartuko zara. Lehen urrats gisa, zure pasahitza sortzeko eskatuko dizugu.",
    expiryNote: "Esteka hau erabilera bakarrekoa da eta laster iraungiko da — iraungi bada, izena eman berriro sarrera pantailatik.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Zure Ocean Flow sarbidea berraktibatu da",
    preheader: "Sartu eta sortu zure pasahitza berriro sartzeko.",
    title: "Ongi etorri berriro Ocean Flow-era",
    greeting: (firstName) => `Kaixo${firstName ? ` ${firstName}` : ""},`,
    intro: "Berri onak! Zure Ocean Flow kontua berriro aktibo dago.",
    ctaLabel: "Sartu Ocean Flow-en",
    securityNote: "Botoia sakatzean zuzenean sartuko zara. Lehen urrats gisa, zure pasahitza sortzeko eskatuko dizugu.",
    expiryNote: "Esteka hau erabilera bakarrekoa da eta laster iraungiko da — iraungi bada, eskatu administratzaile bati berriro bidaltzeko.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Zure Ocean Flow pasahitza berrezarri da",
    preheader: "Sortu zure pasahitz berria berriro sartzeko.",
    title: "Berrezarri zure pasahitza",
    greeting: (firstName) => `Kaixo${firstName ? ` ${firstName}` : ""},`,
    intro: "Zure pasahitza berrezarri dugu Ocean Flow-en — sortu berri bat beheko estekarekin.",
    ctaLabel: "Sortu pasahitz berria",
    securityNote: "Botoia sakatzean zuzenean sartuko zara. Lehen urrats gisa, zure pasahitz berria sortzeko eskatuko dizugu.",
    expiryNote: "Esteka hau erabilera bakarrekoa da eta laster iraungiko da — iraungi bada, eskatu administratzaile bati berriro bidaltzeko.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Berrezarri zure Ocean Flow pasahitza",
    preheader: "Sortu pasahitz berria berriro sartzeko.",
    title: "Berrezarri zure pasahitza",
    greeting: (firstName) => `Kaixo${firstName ? ` ${firstName}` : ""},`,
    intro: "Zure pasahitza berrezartzeko eskatu duzu Ocean Flow-en. Ez bazara zu izan, mezu hau ez ikusi dezakezu — zure oraingo pasahitzak funtzionatzen jarraituko du.",
    ctaLabel: "Sortu pasahitz berria",
    securityNote: "Botoia sakatzean zuzenean sartuko zara. Lehen urrats gisa, zure pasahitz berria sortzeko eskatuko dizugu.",
    expiryNote: "Esteka hau erabilera bakarrekoa da eta laster iraungiko da — iraungi bada, eskatu berriro berreskurapena sarrera pantailatik.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_NL = {
  signup: {
    subject: "Je toegang tot Ocean Flow is klaar",
    preheader: "Log in en maak je wachtwoord aan om te beginnen.",
    title: "Welkom bij Ocean Flow",
    greeting: (firstName) => `Hoi${firstName ? ` ${firstName}` : ""},`,
    intro: "Je hebt nu een Ocean Flow-account, de tool die we gebruiken om lessen, commissies en betalingen bij te houden.",
    ctaLabel: "Inloggen bij Ocean Flow",
    securityNote: "Als je op de knop klikt, word je direct ingelogd. Als eerste stap vragen we je om je eigen wachtwoord aan te maken.",
    expiryNote: "Deze link is eenmalig en verloopt binnenkort — als hij is verlopen, vraag een beheerder om hem opnieuw te sturen.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Bevestig je Ocean Flow-account",
    preheader: "Log in en maak je wachtwoord aan om te beginnen.",
    title: "Bedankt voor je aanmelding bij Ocean Flow!",
    greeting: (firstName) => `Hoi${firstName ? ` ${firstName}` : ""},`,
    intro: "Bijna klaar — bevestig je account om je lessen, commissies en betalingen te gaan bijhouden.",
    ctaLabel: "Account bevestigen",
    securityNote: "Als je op de knop klikt, word je direct ingelogd. Als eerste stap vragen we je om je eigen wachtwoord aan te maken.",
    expiryNote: "Deze link is eenmalig en verloopt binnenkort — als hij is verlopen, meld je opnieuw aan via het inlogscherm.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Je toegang tot Ocean Flow is gereactiveerd",
    preheader: "Log in en maak je wachtwoord aan om weer toegang te krijgen.",
    title: "Welkom terug bij Ocean Flow",
    greeting: (firstName) => `Hoi${firstName ? ` ${firstName}` : ""},`,
    intro: "Goed nieuws! Je Ocean Flow-account is weer actief.",
    ctaLabel: "Inloggen bij Ocean Flow",
    securityNote: "Als je op de knop klikt, word je direct ingelogd. Als eerste stap vragen we je om je eigen wachtwoord aan te maken.",
    expiryNote: "Deze link is eenmalig en verloopt binnenkort — als hij is verlopen, vraag een beheerder om hem opnieuw te sturen.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Je Ocean Flow-wachtwoord is opnieuw ingesteld",
    preheader: "Maak je nieuwe wachtwoord aan om weer toegang te krijgen.",
    title: "Stel je wachtwoord opnieuw in",
    greeting: (firstName) => `Hoi${firstName ? ` ${firstName}` : ""},`,
    intro: "We hebben je wachtwoord bij Ocean Flow opnieuw ingesteld — maak een nieuwe aan via de onderstaande link.",
    ctaLabel: "Nieuw wachtwoord aanmaken",
    securityNote: "Als je op de knop klikt, word je direct ingelogd. Als eerste stap vragen we je om je nieuwe wachtwoord aan te maken.",
    expiryNote: "Deze link is eenmalig en verloopt binnenkort — als hij is verlopen, vraag een beheerder om hem opnieuw te sturen.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Stel je Ocean Flow-wachtwoord opnieuw in",
    preheader: "Maak een nieuw wachtwoord aan om weer toegang te krijgen.",
    title: "Stel je wachtwoord opnieuw in",
    greeting: (firstName) => `Hoi${firstName ? ` ${firstName}` : ""},`,
    intro: "Je hebt gevraagd om je wachtwoord bij Ocean Flow opnieuw in te stellen. Als jij dit niet was, kun je deze e-mail negeren — je huidige wachtwoord blijft werken.",
    ctaLabel: "Nieuw wachtwoord aanmaken",
    securityNote: "Als je op de knop klikt, word je direct ingelogd. Als eerste stap vragen we je om je nieuwe wachtwoord aan te maken.",
    expiryNote: "Deze link is eenmalig en verloopt binnenkort — als hij is verlopen, vraag het herstel opnieuw aan via het inlogscherm.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_TH = {
  signup: {
    subject: "บัญชี Ocean Flow ของคุณพร้อมใช้งานแล้ว",
    preheader: "เข้าสู่ระบบและตั้งรหัสผ่านเพื่อเริ่มต้น",
    title: "ยินดีต้อนรับสู่ Ocean Flow",
    greeting: (firstName) => `สวัสดี${firstName ? ` ${firstName}` : ""},`,
    intro: "ตอนนี้คุณมีบัญชี Ocean Flow แล้ว เครื่องมือที่เราใช้ติดตามคลาส ค่าคอมมิชชัน และการชำระเงิน",
    ctaLabel: "เข้าสู่ระบบ Ocean Flow",
    securityNote: "เมื่อกดปุ่มนี้ คุณจะเข้าสู่ระบบทันที ขั้นตอนแรกเราจะให้คุณตั้งรหัสผ่านของคุณเอง",
    expiryNote: "ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุเร็วๆ นี้ — หากหมดอายุแล้ว ให้ขอให้ผู้ดูแลระบบส่งให้ใหม่",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "ยืนยันบัญชี Ocean Flow ของคุณ",
    preheader: "เข้าสู่ระบบและตั้งรหัสผ่านเพื่อเริ่มต้น",
    title: "ขอบคุณที่สมัครใช้งาน Ocean Flow!",
    greeting: (firstName) => `สวัสดี${firstName ? ` ${firstName}` : ""},`,
    intro: "ใกล้จะเสร็จแล้ว — ยืนยันบัญชีของคุณเพื่อเริ่มติดตามคลาส ค่าคอมมิชชัน และการชำระเงิน",
    ctaLabel: "ยืนยันบัญชี",
    securityNote: "เมื่อกดปุ่มนี้ คุณจะเข้าสู่ระบบทันที ขั้นตอนแรกเราจะให้คุณตั้งรหัสผ่านของคุณเอง",
    expiryNote: "ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุเร็วๆ นี้ — หากหมดอายุแล้ว ให้สมัครใหม่จากหน้าจอเข้าสู่ระบบ",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "บัญชี Ocean Flow ของคุณถูกเปิดใช้งานอีกครั้ง",
    preheader: "เข้าสู่ระบบและตั้งรหัสผ่านเพื่อเข้าใช้งานอีกครั้ง",
    title: "ยินดีต้อนรับกลับสู่ Ocean Flow",
    greeting: (firstName) => `สวัสดี${firstName ? ` ${firstName}` : ""},`,
    intro: "ข่าวดี! บัญชี Ocean Flow ของคุณกลับมาใช้งานได้อีกครั้งแล้ว",
    ctaLabel: "เข้าสู่ระบบ Ocean Flow",
    securityNote: "เมื่อกดปุ่มนี้ คุณจะเข้าสู่ระบบทันที ขั้นตอนแรกเราจะให้คุณตั้งรหัสผ่านของคุณเอง",
    expiryNote: "ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุเร็วๆ นี้ — หากหมดอายุแล้ว ให้ขอให้ผู้ดูแลระบบส่งให้ใหม่",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "รหัสผ่าน Ocean Flow ของคุณถูกรีเซ็ตแล้ว",
    preheader: "ตั้งรหัสผ่านใหม่เพื่อเข้าใช้งานอีกครั้ง",
    title: "รีเซ็ตรหัสผ่านของคุณ",
    greeting: (firstName) => `สวัสดี${firstName ? ` ${firstName}` : ""},`,
    intro: "เราได้รีเซ็ตรหัสผ่านของคุณใน Ocean Flow แล้ว — ตั้งรหัสผ่านใหม่ด้วยลิงก์ด้านล่าง",
    ctaLabel: "ตั้งรหัสผ่านใหม่",
    securityNote: "เมื่อกดปุ่มนี้ คุณจะเข้าสู่ระบบทันที ขั้นตอนแรกเราจะให้คุณตั้งรหัสผ่านใหม่ของคุณ",
    expiryNote: "ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุเร็วๆ นี้ — หากหมดอายุแล้ว ให้ขอให้ผู้ดูแลระบบส่งให้ใหม่",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "รีเซ็ตรหัสผ่าน Ocean Flow ของคุณ",
    preheader: "ตั้งรหัสผ่านใหม่เพื่อเข้าใช้งานอีกครั้ง",
    title: "รีเซ็ตรหัสผ่านของคุณ",
    greeting: (firstName) => `สวัสดี${firstName ? ` ${firstName}` : ""},`,
    intro: "คุณได้ขอรีเซ็ตรหัสผ่านใน Ocean Flow หากไม่ใช่คุณ สามารถเพิกเฉยต่ออีเมลนี้ได้ — รหัสผ่านปัจจุบันของคุณจะยังใช้งานได้ตามปกติ",
    ctaLabel: "ตั้งรหัสผ่านใหม่",
    securityNote: "เมื่อกดปุ่มนี้ คุณจะเข้าสู่ระบบทันที ขั้นตอนแรกเราจะให้คุณตั้งรหัสผ่านใหม่ของคุณ",
    expiryNote: "ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุเร็วๆ นี้ — หากหมดอายุแล้ว ให้ขอกู้คืนรหัสผ่านอีกครั้งจากหน้าจอเข้าสู่ระบบ",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_ID = {
  signup: {
    subject: "Akses Ocean Flow kamu sudah siap",
    preheader: "Masuk dan buat kata sandimu untuk memulai.",
    title: "Selamat datang di Ocean Flow",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Kamu sekarang punya akun Ocean Flow, alat yang kami gunakan untuk melacak kelas, komisi, dan pembayaran.",
    ctaLabel: "Masuk ke Ocean Flow",
    securityNote: "Dengan mengklik tombol ini, kamu akan langsung masuk. Sebagai langkah pertama, kami akan meminta kamu membuat kata sandimu sendiri.",
    expiryNote: "Tautan ini hanya untuk sekali pakai dan akan segera kedaluwarsa — jika sudah kedaluwarsa, minta administrator untuk mengirim ulang.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Konfirmasi akun Ocean Flow kamu",
    preheader: "Masuk dan buat kata sandimu untuk memulai.",
    title: "Terima kasih telah mendaftar di Ocean Flow!",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Hampir selesai — konfirmasi akunmu untuk mulai melacak kelas, komisi, dan pembayaranmu.",
    ctaLabel: "Konfirmasi akun",
    securityNote: "Dengan mengklik tombol ini, kamu akan langsung masuk. Sebagai langkah pertama, kami akan meminta kamu membuat kata sandimu sendiri.",
    expiryNote: "Tautan ini hanya untuk sekali pakai dan akan segera kedaluwarsa — jika sudah kedaluwarsa, daftar ulang dari layar masuk.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Akses Ocean Flow kamu telah diaktifkan kembali",
    preheader: "Masuk dan buat kata sandimu untuk mengakses lagi.",
    title: "Selamat datang kembali di Ocean Flow",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Kabar baik! Akun Ocean Flow kamu sudah aktif kembali.",
    ctaLabel: "Masuk ke Ocean Flow",
    securityNote: "Dengan mengklik tombol ini, kamu akan langsung masuk. Sebagai langkah pertama, kami akan meminta kamu membuat kata sandimu sendiri.",
    expiryNote: "Tautan ini hanya untuk sekali pakai dan akan segera kedaluwarsa — jika sudah kedaluwarsa, minta administrator untuk mengirim ulang.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Kata sandi Ocean Flow kamu telah direset",
    preheader: "Buat kata sandi barumu untuk mengakses lagi.",
    title: "Atur ulang kata sandimu",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Kami telah mereset kata sandimu di Ocean Flow — buat yang baru dengan tautan di bawah ini.",
    ctaLabel: "Buat kata sandi baru",
    securityNote: "Dengan mengklik tombol ini, kamu akan langsung masuk. Sebagai langkah pertama, kami akan meminta kamu membuat kata sandi barumu.",
    expiryNote: "Tautan ini hanya untuk sekali pakai dan akan segera kedaluwarsa — jika sudah kedaluwarsa, minta administrator untuk mengirim ulang.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Atur ulang kata sandi Ocean Flow kamu",
    preheader: "Buat kata sandi baru untuk mengakses lagi.",
    title: "Atur ulang kata sandimu",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Kamu telah meminta untuk mereset kata sandimu di Ocean Flow. Jika ini bukan kamu, kamu bisa mengabaikan email ini — kata sandimu saat ini akan tetap berfungsi.",
    ctaLabel: "Buat kata sandi baru",
    securityNote: "Dengan mengklik tombol ini, kamu akan langsung masuk. Sebagai langkah pertama, kami akan meminta kamu membuat kata sandi barumu.",
    expiryNote: "Tautan ini hanya untuk sekali pakai dan akan segera kedaluwarsa — jika sudah kedaluwarsa, minta pemulihan lagi dari layar masuk.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_VI = {
  signup: {
    subject: "Quyền truy cập Ocean Flow của bạn đã sẵn sàng",
    preheader: "Đăng nhập và tạo mật khẩu để bắt đầu.",
    title: "Chào mừng đến với Ocean Flow",
    greeting: (firstName) => `Chào${firstName ? ` ${firstName}` : ""},`,
    intro: "Bây giờ bạn đã có tài khoản Ocean Flow, công cụ chúng tôi dùng để theo dõi các lớp học, hoa hồng và thanh toán.",
    ctaLabel: "Đăng nhập Ocean Flow",
    securityNote: "Khi nhấn nút này, bạn sẽ đăng nhập trực tiếp. Bước đầu tiên, chúng tôi sẽ yêu cầu bạn tạo mật khẩu riêng của mình.",
    expiryNote: "Liên kết này chỉ dùng một lần và sẽ sớm hết hạn — nếu đã hết hạn, hãy nhờ quản trị viên gửi lại.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Xác nhận tài khoản Ocean Flow của bạn",
    preheader: "Đăng nhập và tạo mật khẩu để bắt đầu.",
    title: "Cảm ơn bạn đã đăng ký Ocean Flow!",
    greeting: (firstName) => `Chào${firstName ? ` ${firstName}` : ""},`,
    intro: "Sắp xong rồi — xác nhận tài khoản để bắt đầu theo dõi các lớp học, hoa hồng và thanh toán của bạn.",
    ctaLabel: "Xác nhận tài khoản",
    securityNote: "Khi nhấn nút này, bạn sẽ đăng nhập trực tiếp. Bước đầu tiên, chúng tôi sẽ yêu cầu bạn tạo mật khẩu riêng của mình.",
    expiryNote: "Liên kết này chỉ dùng một lần và sẽ sớm hết hạn — nếu đã hết hạn, hãy đăng ký lại từ màn hình đăng nhập.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Quyền truy cập Ocean Flow của bạn đã được kích hoạt lại",
    preheader: "Đăng nhập và tạo mật khẩu để truy cập lại.",
    title: "Chào mừng trở lại Ocean Flow",
    greeting: (firstName) => `Chào${firstName ? ` ${firstName}` : ""},`,
    intro: "Tin tốt đây! Tài khoản Ocean Flow của bạn đã hoạt động trở lại.",
    ctaLabel: "Đăng nhập Ocean Flow",
    securityNote: "Khi nhấn nút này, bạn sẽ đăng nhập trực tiếp. Bước đầu tiên, chúng tôi sẽ yêu cầu bạn tạo mật khẩu riêng của mình.",
    expiryNote: "Liên kết này chỉ dùng một lần và sẽ sớm hết hạn — nếu đã hết hạn, hãy nhờ quản trị viên gửi lại.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Mật khẩu Ocean Flow của bạn đã được đặt lại",
    preheader: "Tạo mật khẩu mới để truy cập lại.",
    title: "Đặt lại mật khẩu của bạn",
    greeting: (firstName) => `Chào${firstName ? ` ${firstName}` : ""},`,
    intro: "Chúng tôi đã đặt lại mật khẩu của bạn trên Ocean Flow — hãy tạo mật khẩu mới bằng liên kết bên dưới.",
    ctaLabel: "Tạo mật khẩu mới",
    securityNote: "Khi nhấn nút này, bạn sẽ đăng nhập trực tiếp. Bước đầu tiên, chúng tôi sẽ yêu cầu bạn tạo mật khẩu mới.",
    expiryNote: "Liên kết này chỉ dùng một lần và sẽ sớm hết hạn — nếu đã hết hạn, hãy nhờ quản trị viên gửi lại.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Đặt lại mật khẩu Ocean Flow của bạn",
    preheader: "Tạo mật khẩu mới để truy cập lại.",
    title: "Đặt lại mật khẩu của bạn",
    greeting: (firstName) => `Chào${firstName ? ` ${firstName}` : ""},`,
    intro: "Bạn đã yêu cầu đặt lại mật khẩu trên Ocean Flow. Nếu không phải bạn, bạn có thể bỏ qua email này — mật khẩu hiện tại của bạn sẽ vẫn hoạt động bình thường.",
    ctaLabel: "Tạo mật khẩu mới",
    securityNote: "Khi nhấn nút này, bạn sẽ đăng nhập trực tiếp. Bước đầu tiên, chúng tôi sẽ yêu cầu bạn tạo mật khẩu mới.",
    expiryNote: "Liên kết này chỉ dùng một lần và sẽ sớm hết hạn — nếu đã hết hạn, hãy yêu cầu khôi phục lại từ màn hình đăng nhập.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_MY = {
  signup: {
    subject: "သင့် Ocean Flow အသုံးပြုခွင့် အဆင်သင့်ဖြစ်ပါပြီ",
    preheader: "စတင်ရန် ဝင်ရောက်ပြီး စကားဝှက်သတ်မှတ်ပါ။",
    title: "Ocean Flow မှ ကြိုဆိုပါတယ်",
    greeting: (firstName) => `မင်္ဂလာပါ${firstName ? ` ${firstName}` : ""}၊`,
    intro: "အတန်းများ၊ ကော်မရှင်နှင့် ငွေပေးချေမှုများကို ခြေရာခံရန် ကျွန်ုပ်တို့အသုံးပြုသည့် Ocean Flow အကောင့်ကို ယခု သင်ရရှိပါပြီ။",
    ctaLabel: "Ocean Flow သို့ ဝင်ရောက်ရန်",
    securityNote: "ခလုတ်ကိုနှိပ်ခြင်းဖြင့် တိုက်ရိုက်ဝင်ရောက်နိုင်ပါမည်။ ပထမဆုံးအဆင့်အနေဖြင့် သင့်ကိုယ်ပိုင်စကားဝှက်ကို သတ်မှတ်ရန် တောင်းဆိုပါမည်။",
    expiryNote: "ဤလင့်ခ်ကို တစ်ကြိမ်သာ အသုံးပြုနိုင်ပြီး မကြာမီသက်တမ်းကုန်ပါမည် — သက်တမ်းကုန်ပါက စီမံခန့်ခွဲသူကို ပြန်ပို့ပေးရန် တောင်းဆိုပါ။",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "သင့် Ocean Flow အကောင့်ကို အတည်ပြုပါ",
    preheader: "စတင်ရန် ဝင်ရောက်ပြီး စကားဝှက်သတ်မှတ်ပါ။",
    title: "Ocean Flow တွင် စာရင်းသွင်းပေးသည့်အတွက် ကျေးဇူးတင်ပါသည်!",
    greeting: (firstName) => `မင်္ဂလာပါ${firstName ? ` ${firstName}` : ""}၊`,
    intro: "ဆိုက်မှတော်တော်နီးပါးပြီးပါပြီ — သင့်အတန်းများ၊ ကော်မရှင်နှင့် ငွေပေးချေမှုများကို ခြေရာခံနိုင်ရန် အကောင့်ကို အတည်ပြုပါ။",
    ctaLabel: "အကောင့်အတည်ပြုရန်",
    securityNote: "ခလုတ်ကိုနှိပ်ခြင်းဖြင့် တိုက်ရိုက်ဝင်ရောက်နိုင်ပါမည်။ ပထမဆုံးအဆင့်အနေဖြင့် သင့်ကိုယ်ပိုင်စကားဝှက်ကို သတ်မှတ်ရန် တောင်းဆိုပါမည်။",
    expiryNote: "ဤလင့်ခ်ကို တစ်ကြိမ်သာ အသုံးပြုနိုင်ပြီး မကြာမီသက်တမ်းကုန်ပါမည် — သက်တမ်းကုန်ပါက ဝင်ရောက်မှုစာမျက်နှာမှ ပြန်လည်စာရင်းသွင်းပါ။",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "သင့် Ocean Flow အသုံးပြုခွင့်ကို ပြန်လည်ဖွင့်ပေးလိုက်ပါပြီ",
    preheader: "ပြန်လည်ဝင်ရောက်ရန် ဝင်ရောက်ပြီး စကားဝှက်သတ်မှတ်ပါ။",
    title: "Ocean Flow သို့ ပြန်လည်ကြိုဆိုပါတယ်",
    greeting: (firstName) => `မင်္ဂလာပါ${firstName ? ` ${firstName}` : ""}၊`,
    intro: "သတင်းကောင်းပါ! သင့် Ocean Flow အကောင့်သည် ပြန်လည်အသက်ဝင်နေပါပြီ။",
    ctaLabel: "Ocean Flow သို့ ဝင်ရောက်ရန်",
    securityNote: "ခလုတ်ကိုနှိပ်ခြင်းဖြင့် တိုက်ရိုက်ဝင်ရောက်နိုင်ပါမည်။ ပထမဆုံးအဆင့်အနေဖြင့် သင့်ကိုယ်ပိုင်စကားဝှက်ကို သတ်မှတ်ရန် တောင်းဆိုပါမည်။",
    expiryNote: "ဤလင့်ခ်ကို တစ်ကြိမ်သာ အသုံးပြုနိုင်ပြီး မကြာမီသက်တမ်းကုန်ပါမည် — သက်တမ်းကုန်ပါက စီမံခန့်ခွဲသူကို ပြန်ပို့ပေးရန် တောင်းဆိုပါ။",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "သင့် Ocean Flow စကားဝှက်ကို ပြန်လည်သတ်မှတ်လိုက်ပါပြီ",
    preheader: "ပြန်လည်ဝင်ရောက်ရန် စကားဝှက်အသစ်သတ်မှတ်ပါ။",
    title: "သင့်စကားဝှက်ကို ပြန်လည်သတ်မှတ်ပါ",
    greeting: (firstName) => `မင်္ဂလာပါ${firstName ? ` ${firstName}` : ""}၊`,
    intro: "Ocean Flow တွင် သင့်စကားဝှက်ကို ကျွန်ုပ်တို့ ပြန်လည်သတ်မှတ်ပေးလိုက်ပါပြီ — အောက်ပါလင့်ခ်ဖြင့် အသစ်တစ်ခု သတ်မှတ်ပါ။",
    ctaLabel: "စကားဝှက်အသစ် သတ်မှတ်ရန်",
    securityNote: "ခလုတ်ကိုနှိပ်ခြင်းဖြင့် တိုက်ရိုက်ဝင်ရောက်နိုင်ပါမည်။ ပထမဆုံးအဆင့်အနေဖြင့် သင့်စကားဝှက်အသစ်ကို သတ်မှတ်ရန် တောင်းဆိုပါမည်။",
    expiryNote: "ဤလင့်ခ်ကို တစ်ကြိမ်သာ အသုံးပြုနိုင်ပြီး မကြာမီသက်တမ်းကုန်ပါမည် — သက်တမ်းကုန်ပါက စီမံခန့်ခွဲသူကို ပြန်ပို့ပေးရန် တောင်းဆိုပါ။",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "သင့် Ocean Flow စကားဝှက်ကို ပြန်လည်သတ်မှတ်ပါ",
    preheader: "ပြန်လည်ဝင်ရောက်ရန် စကားဝှက်အသစ်သတ်မှတ်ပါ။",
    title: "သင့်စကားဝှက်ကို ပြန်လည်သတ်မှတ်ပါ",
    greeting: (firstName) => `မင်္ဂလာပါ${firstName ? ` ${firstName}` : ""}၊`,
    intro: "Ocean Flow တွင် သင့်စကားဝှက်ကို ပြန်လည်သတ်မှတ်ရန် သင်တောင်းဆိုခဲ့ပါသည်။ ဤသည်မှာ သင်မဟုတ်ပါက ဤအီးမေးလ်ကို လျစ်လျူရှုနိုင်ပါသည် — သင့်လက်ရှိစကားဝှက်သည် ဆက်လက်အသုံးပြု၍ ရပါမည်။",
    ctaLabel: "စကားဝှက်အသစ် သတ်မှတ်ရန်",
    securityNote: "ခလုတ်ကိုနှိပ်ခြင်းဖြင့် တိုက်ရိုက်ဝင်ရောက်နိုင်ပါမည်။ ပထမဆုံးအဆင့်အနေဖြင့် သင့်စကားဝှက်အသစ်ကို သတ်မှတ်ရန် တောင်းဆိုပါမည်။",
    expiryNote: "ဤလင့်ခ်ကို တစ်ကြိမ်သာ အသုံးပြုနိုင်ပြီး မကြာမီသက်တမ်းကုန်ပါမည် — သက်တမ်းကုန်ပါက ဝင်ရောက်မှုစာမျက်နှာမှ ပြန်လည်တောင်းဆိုပါ။",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_MS = {
  signup: {
    subject: "Akses Ocean Flow anda sudah sedia",
    preheader: "Log masuk dan cipta kata laluan anda untuk bermula.",
    title: "Selamat datang ke Ocean Flow",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Anda kini mempunyai akaun Ocean Flow, alat yang kami gunakan untuk menjejaki kelas, komisen dan pembayaran.",
    ctaLabel: "Log masuk ke Ocean Flow",
    securityNote: "Dengan mengklik butang ini, anda akan log masuk terus. Sebagai langkah pertama, kami akan meminta anda mencipta kata laluan anda sendiri.",
    expiryNote: "Pautan ini untuk sekali guna sahaja dan akan tamat tempoh tidak lama lagi — jika sudah tamat tempoh, minta pentadbir menghantarnya semula.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Sahkan akaun Ocean Flow anda",
    preheader: "Log masuk dan cipta kata laluan anda untuk bermula.",
    title: "Terima kasih kerana mendaftar di Ocean Flow!",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Hampir selesai — sahkan akaun anda untuk mula menjejaki kelas, komisen dan pembayaran anda.",
    ctaLabel: "Sahkan akaun",
    securityNote: "Dengan mengklik butang ini, anda akan log masuk terus. Sebagai langkah pertama, kami akan meminta anda mencipta kata laluan anda sendiri.",
    expiryNote: "Pautan ini untuk sekali guna sahaja dan akan tamat tempoh tidak lama lagi — jika sudah tamat tempoh, daftar semula dari skrin log masuk.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Akses Ocean Flow anda telah diaktifkan semula",
    preheader: "Log masuk dan cipta kata laluan anda untuk mengakses semula.",
    title: "Selamat kembali ke Ocean Flow",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Berita baik! Akaun Ocean Flow anda kini aktif semula.",
    ctaLabel: "Log masuk ke Ocean Flow",
    securityNote: "Dengan mengklik butang ini, anda akan log masuk terus. Sebagai langkah pertama, kami akan meminta anda mencipta kata laluan anda sendiri.",
    expiryNote: "Pautan ini untuk sekali guna sahaja dan akan tamat tempoh tidak lama lagi — jika sudah tamat tempoh, minta pentadbir menghantarnya semula.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Kata laluan Ocean Flow anda telah ditetapkan semula",
    preheader: "Cipta kata laluan baharu anda untuk mengakses semula.",
    title: "Tetapkan semula kata laluan anda",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Kami telah menetapkan semula kata laluan anda di Ocean Flow — cipta satu yang baharu dengan pautan di bawah.",
    ctaLabel: "Cipta kata laluan baharu",
    securityNote: "Dengan mengklik butang ini, anda akan log masuk terus. Sebagai langkah pertama, kami akan meminta anda mencipta kata laluan baharu anda.",
    expiryNote: "Pautan ini untuk sekali guna sahaja dan akan tamat tempoh tidak lama lagi — jika sudah tamat tempoh, minta pentadbir menghantarnya semula.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Tetapkan semula kata laluan Ocean Flow anda",
    preheader: "Cipta kata laluan baharu untuk mengakses semula.",
    title: "Tetapkan semula kata laluan anda",
    greeting: (firstName) => `Hai${firstName ? ` ${firstName}` : ""},`,
    intro: "Anda telah meminta untuk menetapkan semula kata laluan anda di Ocean Flow. Jika ini bukan anda, anda boleh mengabaikan emel ini — kata laluan semasa anda akan terus berfungsi.",
    ctaLabel: "Cipta kata laluan baharu",
    securityNote: "Dengan mengklik butang ini, anda akan log masuk terus. Sebagai langkah pertama, kami akan meminta anda mencipta kata laluan baharu anda.",
    expiryNote: "Pautan ini untuk sekali guna sahaja dan akan tamat tempoh tidak lama lagi — jika sudah tamat tempoh, minta pemulihan semula dari skrin log masuk.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_RU = {
  signup: {
    subject: "Ваш доступ к Ocean Flow готов",
    preheader: "Войдите и создайте пароль, чтобы начать.",
    title: "Добро пожаловать в Ocean Flow",
    greeting: (firstName) => `Привет${firstName ? `, ${firstName}` : ""}!`,
    intro: "Теперь у вас есть аккаунт Ocean Flow — инструмент, который мы используем для учёта занятий, комиссий и платежей.",
    ctaLabel: "Войти в Ocean Flow",
    securityNote: "Нажав на кнопку, вы сразу войдёте в систему. Первым делом мы попросим вас создать собственный пароль.",
    expiryNote: "Эта ссылка одноразовая и скоро истечёт — если срок действия истёк, попросите администратора отправить её заново.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Подтвердите свой аккаунт Ocean Flow",
    preheader: "Войдите и создайте пароль, чтобы начать.",
    title: "Спасибо за регистрацию в Ocean Flow!",
    greeting: (firstName) => `Привет${firstName ? `, ${firstName}` : ""}!`,
    intro: "Почти готово — подтвердите свой аккаунт, чтобы начать учёт занятий, комиссий и платежей.",
    ctaLabel: "Подтвердить аккаунт",
    securityNote: "Нажав на кнопку, вы сразу войдёте в систему. Первым делом мы попросим вас создать собственный пароль.",
    expiryNote: "Эта ссылка одноразовая и скоро истечёт — если срок действия истёк, зарегистрируйтесь заново с экрана входа.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Ваш доступ к Ocean Flow снова активен",
    preheader: "Войдите и создайте пароль, чтобы снова получить доступ.",
    title: "С возвращением в Ocean Flow",
    greeting: (firstName) => `Привет${firstName ? `, ${firstName}` : ""}!`,
    intro: "Хорошие новости! Ваш аккаунт Ocean Flow снова активен.",
    ctaLabel: "Войти в Ocean Flow",
    securityNote: "Нажав на кнопку, вы сразу войдёте в систему. Первым делом мы попросим вас создать собственный пароль.",
    expiryNote: "Эта ссылка одноразовая и скоро истечёт — если срок действия истёк, попросите администратора отправить её заново.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Ваш пароль Ocean Flow был сброшен",
    preheader: "Создайте новый пароль, чтобы снова получить доступ.",
    title: "Сбросьте пароль",
    greeting: (firstName) => `Привет${firstName ? `, ${firstName}` : ""}!`,
    intro: "Мы сбросили ваш пароль в Ocean Flow — создайте новый по ссылке ниже.",
    ctaLabel: "Создать новый пароль",
    securityNote: "Нажав на кнопку, вы сразу войдёте в систему. Первым делом мы попросим вас создать новый пароль.",
    expiryNote: "Эта ссылка одноразовая и скоро истечёт — если срок действия истёк, попросите администратора отправить её заново.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Сбросьте пароль Ocean Flow",
    preheader: "Создайте новый пароль, чтобы снова получить доступ.",
    title: "Сбросьте пароль",
    greeting: (firstName) => `Привет${firstName ? `, ${firstName}` : ""}!`,
    intro: "Вы запросили сброс пароля в Ocean Flow. Если это были не вы, просто проигнорируйте это письмо — ваш текущий пароль продолжит работать.",
    ctaLabel: "Создать новый пароль",
    securityNote: "Нажав на кнопку, вы сразу войдёте в систему. Первым делом мы попросим вас создать новый пароль.",
    expiryNote: "Эта ссылка одноразовая и скоро истечёт — если срок действия истёк, запросите восстановление снова с экрана входа.",
    footer: "Ocean Flow",
  },
};

export const ACTIVATION_EMAIL_COPY_PT = {
  signup: {
    subject: "Seu acesso ao Ocean Flow já está pronto",
    preheader: "Entre e crie sua senha para começar.",
    title: "Bem-vindo(a) ao Ocean Flow",
    greeting: (firstName) => `Olá${firstName ? ` ${firstName}` : ""},`,
    intro: "Você agora tem uma conta no Ocean Flow, a ferramenta que usamos para controlar aulas, comissões e pagamentos.",
    ctaLabel: "Entrar no Ocean Flow",
    securityNote: "Ao clicar no botão, você entrará diretamente. Como primeiro passo, vamos pedir que você crie sua própria senha.",
    expiryNote: "Este link é de uso único e expira em breve — se expirou, peça a um administrador para reenviá-lo.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Confirme sua conta no Ocean Flow",
    preheader: "Entre e crie sua senha para começar.",
    title: "Obrigado por se cadastrar no Ocean Flow!",
    greeting: (firstName) => `Olá${firstName ? ` ${firstName}` : ""},`,
    intro: "Falta pouco — confirme sua conta para começar a controlar suas aulas, comissões e pagamentos.",
    ctaLabel: "Confirmar conta",
    securityNote: "Ao clicar no botão, você entrará diretamente. Como primeiro passo, vamos pedir que você crie sua própria senha.",
    expiryNote: "Este link é de uso único e expira em breve — se expirou, cadastre-se novamente na tela de login.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Seu acesso ao Ocean Flow foi reativado",
    preheader: "Entre e crie sua senha para acessar novamente.",
    title: "Bem-vindo(a) de volta ao Ocean Flow",
    greeting: (firstName) => `Olá${firstName ? ` ${firstName}` : ""},`,
    intro: "Boas notícias! Sua conta no Ocean Flow está ativa novamente.",
    ctaLabel: "Entrar no Ocean Flow",
    securityNote: "Ao clicar no botão, você entrará diretamente. Como primeiro passo, vamos pedir que você crie sua própria senha.",
    expiryNote: "Este link é de uso único e expira em breve — se expirou, peça a um administrador para reenviá-lo.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Sua senha do Ocean Flow foi redefinida",
    preheader: "Crie sua nova senha para acessar novamente.",
    title: "Redefina sua senha",
    greeting: (firstName) => `Olá${firstName ? ` ${firstName}` : ""},`,
    intro: "Redefinimos sua senha no Ocean Flow — crie uma nova com o link abaixo.",
    ctaLabel: "Criar nova senha",
    securityNote: "Ao clicar no botão, você entrará diretamente. Como primeiro passo, vamos pedir que você crie sua nova senha.",
    expiryNote: "Este link é de uso único e expira em breve — se expirou, peça a um administrador para reenviá-lo.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Redefina sua senha do Ocean Flow",
    preheader: "Crie uma nova senha para acessar novamente.",
    title: "Redefina sua senha",
    greeting: (firstName) => `Olá${firstName ? ` ${firstName}` : ""},`,
    intro: "Você solicitou a redefinição da sua senha no Ocean Flow. Se não foi você, pode ignorar este e-mail — sua senha atual continuará funcionando.",
    ctaLabel: "Criar nova senha",
    securityNote: "Ao clicar no botão, você entrará diretamente. Como primeiro passo, vamos pedir que você crie sua nova senha.",
    expiryNote: "Este link é de uso único e expira em breve — se expirou, solicite a recuperação novamente na tela de login.",
    footer: "Ocean Flow",
  },
};

// Única función que decide qué tabla de copy usar según el idioma elegido
// en las pantallas de entrada (Login/Registro/recuperar contraseña...) —
// los 15 idiomas de la app tienen su propia tabla; cualquier valor no
// reconocido (incluido undefined) cae a español. EmailService.js es el
// único llamador — no repitas esta resolución en otro sitio.
const ACTIVATION_EMAIL_COPY_BY_LANG = {
  es: ACTIVATION_EMAIL_COPY,
  en: ACTIVATION_EMAIL_COPY_EN,
  fr: ACTIVATION_EMAIL_COPY_FR,
  it: ACTIVATION_EMAIL_COPY_IT,
  de: ACTIVATION_EMAIL_COPY_DE,
  ca: ACTIVATION_EMAIL_COPY_CA,
  eu: ACTIVATION_EMAIL_COPY_EU,
  nl: ACTIVATION_EMAIL_COPY_NL,
  th: ACTIVATION_EMAIL_COPY_TH,
  id: ACTIVATION_EMAIL_COPY_ID,
  vi: ACTIVATION_EMAIL_COPY_VI,
  my: ACTIVATION_EMAIL_COPY_MY,
  ms: ACTIVATION_EMAIL_COPY_MS,
  ru: ACTIVATION_EMAIL_COPY_RU,
  pt: ACTIVATION_EMAIL_COPY_PT,
};

export function resolveActivationEmailCopy(reason, language) {
  const table = ACTIVATION_EMAIL_COPY_BY_LANG[language] || ACTIVATION_EMAIL_COPY;
  return table[reason] || table.signup;
}

// HTML con tabla + CSS inline a propósito: los clientes de email (Outlook
// sobre todo) no soportan Flexbox/Grid ni <style> externo, así que este
// template no puede reutilizar las clases Tailwind del resto de la app —
// es su propio sistema reducido, coherente en color/tipografía con el
// resto de la app (mismo BRAND_NAVY, mismo logo real que el resto de la
// app — ver emailLayout.js). Una sola columna, mobile-first.
export function renderActivationEmailHtml({ firstName, actionLink, copy = ACTIVATION_EMAIL_COPY.signup }) {
  const safeName = escapeHtml(firstName);
  const safeLink = escapeHtml(actionLink);
  const bodyRows = `
    <tr>
      <td style="padding:12px 28px 0 28px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;color:${BRAND_NAVY};">${escapeHtml(copy.title)}</h1>
        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">${copy.greeting(safeName)}</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(copy.intro)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px;text-align:center;">
        <a href="${safeLink}" style="display:inline-block;width:100%;max-width:320px;box-sizing:border-box;background-color:${BRAND_NAVY};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:8px;">${escapeHtml(copy.ctaLabel)}</a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 0 28px;">
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:#6B7280;text-align:center;">${escapeHtml(copy.securityNote)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px 32px 28px;">
        <p style="margin:0;font-size:11.5px;line-height:1.5;color:#9CA3AF;text-align:center;">${escapeHtml(copy.expiryNote)}</p>
      </td>
    </tr>`;
  return renderEmailShell({ preheader: copy.preheader, bodyRows, footerText: copy.footer });
}

// Parte de texto plano — mejora la entregabilidad en clientes/filtros que
// la valoran, coste mínimo al reutilizar el mismo copy.
export function renderActivationEmailText({ firstName, actionLink, copy = ACTIVATION_EMAIL_COPY.signup }) {
  return [
    copy.greeting(firstName),
    "",
    copy.intro,
    "",
    `${copy.ctaLabel}: ${actionLink}`,
    "",
    copy.securityNote,
    copy.expiryNote,
    "",
    copy.footer,
  ].join("\n");
}

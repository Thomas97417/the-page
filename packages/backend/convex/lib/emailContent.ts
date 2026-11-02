export const EMAIL_CONTENT = {
  fr: {
    purchase_confirmed: {
      title: "Félicitations, votre mot est en ligne !",
      description: "Votre achat est confirmé. Vous avez désormais votre place sur the page.",
      button: "Voir mon mot",
      notice: "Vous pouvez modifier gratuitement votre mot depuis « Mes mots » jusqu’à son prochain rachat.",
      position: "Emplacement",
    },
    word_replaced: {
      title: "Votre mot a été remplacé",
      description: "Quelqu’un a racheté votre emplacement et remplacé votre mot. Reprenez votre place pour le remettre en ligne.",
      button: "Racheter mon mot",
      notice: "Le prix actuel vous sera présenté avant tout paiement. Le rachat reste soumis à la disponibilité de l’emplacement.",
      position: "Emplacement",
    },
    reset: {
      title: "Votre mot de passe the page",
      description: "Choisissez un nouveau mot de passe pour votre compte.",
      button: "Réinitialiser le mot de passe",
      notice: "Vous n’êtes pas à l’origine de cette demande ? Ignorez cet email.",
    },
    verification: {
      title: "Vérifiez votre email — the page",
      description: "Confirmez votre adresse email pour rejoindre the page.",
      button: "Vérifier mon email",
      notice: "Vous n’avez pas créé ce compte ? Ignorez cet email.",
    },
  },
  en: {
    purchase_confirmed: {
      title: "Congratulations, your word is live!",
      description: "Your purchase is confirmed. You now have your place on the page.",
      button: "View my word",
      notice: "You can edit your word for free in “My words” until someone buys your place.",
      position: "Place",
    },
    word_replaced: {
      title: "Your word has been replaced",
      description: "Someone bought your place and replaced your word. Reclaim your place to put it back on the page.",
      button: "Buy my word back",
      notice: "You will see the current price before paying. Repurchasing is subject to the place’s availability.",
      position: "Place",
    },
    reset: {
      title: "Your the page password",
      description: "Choose a new password for your account.",
      button: "Reset password",
      notice: "Didn’t request this? You can ignore this email.",
    },
    verification: {
      title: "Verify your email — the page",
      description: "Confirm your email address to join the page.",
      button: "Verify my email",
      notice: "Didn’t create this account? You can ignore this email.",
    },
  },
} as const;

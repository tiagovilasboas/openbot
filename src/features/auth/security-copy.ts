import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** Copy for the security section of Settings. Bilingual parity. */
export const securityCopy = {
  pt: {
    title: "Bloqueio local",
    description: "Proteja o OpenBot com uma senha ou PIN neste dispositivo.",
    offlineNote:
      "É um bloqueio de tela neste dispositivo, não autenticação nem criptografia dos seus dados. A senha nunca sai do navegador; só um hash (PBKDF2, 600.000 iterações SHA-256) fica salvo aqui.",
    setupTitle: "Definir senha ou PIN",
    passwordLabel: "Senha ou PIN",
    passwordHelper: "Mínimo de 4 caracteres.",
    confirmLabel: "Confirmar senha ou PIN",
    hintLabel: "Dica de senha (opcional)",
    hintPlaceholder: "Ex.: data especial, frase favorita",
    enable: "Ativar proteção",
    enabling: "Ativando...",
    showSecret: "Mostrar senha",
    hideSecret: "Ocultar senha",
    tooShort:
      "A senha deve ter pelo menos 4 caracteres. Use uma senha mais longa.",
    mismatch: "As senhas não coincidem. Digite a mesma senha nos dois campos.",
    setupFailed: "Não foi possível definir a senha. Tente novamente.",
    setupDone: "Proteção por senha ativada.",
    statusActive: "Proteção ativa",
    hintPrefix: "Dica: {hint}",
    changeTitle: "Alterar senha ou PIN",
    currentLabel: "Senha atual",
    newLabel: "Nova senha",
    confirmNewLabel: "Confirmar nova senha",
    newHintLabel: "Nova dica (opcional)",
    update: "Atualizar senha",
    updating: "Salvando...",
    needCurrent: "Informe a senha atual para continuar.",
    newTooShort:
      "A nova senha deve ter pelo menos 4 caracteres. Use uma senha mais longa.",
    newMismatch:
      "As novas senhas não coincidem. Digite a mesma senha nos dois campos.",
    wrongCurrent: "Senha atual incorreta. Confira e tente de novo.",
    changeDone: "Senha atualizada.",
    removeTitle: "Remover proteção",
    removeHelper:
      "Qualquer pessoa com acesso a este dispositivo poderá abrir o OpenBot.",
    removeStart: "Remover senha",
    removeCurrentLabel: "Senha atual para confirmar",
    removeConfirm: "Remover proteção",
    removing: "Removendo...",
    cancel: "Cancelar",
    removeDone: "Proteção por senha removida.",
  },
  en: {
    title: "Local lock",
    description: "Protect OpenBot with a password or PIN on this device.",
    offlineNote:
      "This is a screen lock on this device, not authentication or encryption of your data. The password never leaves the browser; only a hash (PBKDF2, 600,000 SHA-256 iterations) is stored here.",
    setupTitle: "Set a password or PIN",
    passwordLabel: "Password or PIN",
    passwordHelper: "At least 4 characters.",
    confirmLabel: "Confirm password or PIN",
    hintLabel: "Password hint (optional)",
    hintPlaceholder: "e.g. special date, favorite phrase",
    enable: "Enable protection",
    enabling: "Enabling...",
    showSecret: "Show password",
    hideSecret: "Hide password",
    tooShort: "Password must be at least 4 characters. Use a longer one.",
    mismatch: "Passwords do not match. Type the same password in both fields.",
    setupFailed: "Could not set the password. Try again.",
    setupDone: "Password protection enabled.",
    statusActive: "Protection on",
    hintPrefix: "Hint: {hint}",
    changeTitle: "Change password or PIN",
    currentLabel: "Current password",
    newLabel: "New password",
    confirmNewLabel: "Confirm new password",
    newHintLabel: "New hint (optional)",
    update: "Update password",
    updating: "Saving...",
    needCurrent: "Enter your current password to continue.",
    newTooShort:
      "New password must be at least 4 characters. Use a longer one.",
    newMismatch:
      "New passwords do not match. Type the same password in both fields.",
    wrongCurrent: "Incorrect current password. Check it and try again.",
    changeDone: "Password updated.",
    removeTitle: "Remove protection",
    removeHelper:
      "Anyone with access to this device will be able to open OpenBot.",
    removeStart: "Remove password",
    removeCurrentLabel: "Current password to confirm",
    removeConfirm: "Remove protection",
    removing: "Removing...",
    cancel: "Cancel",
    removeDone: "Password protection removed.",
  },
} as const satisfies Record<ChatLanguage, Record<string, string>>;

export function getSecurityCopy(language: ChatLanguage) {
  return securityCopy[language];
}

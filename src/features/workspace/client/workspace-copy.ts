import type { Language } from "../../language/language.ts";

interface WorkspaceCopy {
  title: string;
  note: string;
  disabled: string;
  empty: string;
  failed: string;
  loading: string;
  refresh: string;
  download: (path: string) => string;
  downloadFailed: string;
}

const COPY: Record<Language, WorkspaceCopy> = {
  pt: {
    title: "Arquivos",
    note: "O que o bot gravou na pasta de trabalho dele. Gravar pede sua permissão.",
    disabled:
      "Defina OPENBOT_WORKSPACE_DIR no servidor para o bot ter uma pasta de trabalho.",
    empty: "Nenhum arquivo ainda.",
    failed: "Não foi possível ler a pasta.",
    loading: "Carregando…",
    refresh: "Atualizar",
    download: (p) => `Baixar ${p}`,
    downloadFailed: "Não foi possível baixar o arquivo.",
  },
  en: {
    title: "Files",
    note: "What the bot wrote to its workspace folder. Writing asks you first.",
    disabled:
      "Set OPENBOT_WORKSPACE_DIR on the server to give the bot a workspace folder.",
    empty: "No files yet.",
    failed: "Could not read the folder.",
    loading: "Loading…",
    refresh: "Refresh",
    download: (p) => `Download ${p}`,
    downloadFailed: "Could not download the file.",
  },
  es: {
    title: "Archivos",
    note: "Lo que el bot escribió en su carpeta de trabajo. Escribir te pide permiso.",
    disabled:
      "Define OPENBOT_WORKSPACE_DIR en el servidor para darle al bot una carpeta de trabajo.",
    empty: "Aún no hay archivos.",
    failed: "No se pudo leer la carpeta.",
    loading: "Cargando…",
    refresh: "Actualizar",
    download: (p) => `Descargar ${p}`,
    downloadFailed: "No se pudo descargar el archivo.",
  },
};

export function getWorkspaceCopy(language: Language): WorkspaceCopy {
  return COPY[language];
}

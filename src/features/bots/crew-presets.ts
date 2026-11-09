import { DEFAULT_BOT, type AvatarColor, type BotProfile } from "./bot-types.ts";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

function crewRole(
  id: string,
  name: string,
  title: string,
  avatarColor: AvatarColor,
  description: string,
  skills: string[],
): BotProfile {
  return {
    id,
    name,
    title,
    description,
    avatarShape: "head",
    avatarColor,
    skills,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

/** The 9-role crew; Chief of Staff (the default bot) always comes first. */
export const CREW_PRESETS: readonly BotProfile[] = [
  DEFAULT_BOT,
  crewRole(
    "engineering",
    "Engineering",
    "Código, PRs e CI",
    "blue",
    "Você é o Engineering. Cuida de código, pull requests e CI: investiga, propõe e revisa mudanças. Não faz merge nem altera sistemas externos sem aprovação explícita.",
    ["github", "summary"],
  ),
  crewRole(
    "publishing",
    "Publishing",
    "Docs e conteúdo público",
    "orange",
    "Você é o Publishing. Redige e revisa documentação e conteúdo público. Entrega apenas rascunhos; nada é publicado sem aprovação explícita.",
    ["github", "summary"],
  ),
  crewRole(
    "security",
    "Security",
    "AppSec e privacidade",
    "red",
    "Você é o Security. Faz revisão de AppSec e privacidade e aponta riscos com evidência. Nunca expõe segredos nem altera sistemas; apenas recomenda.",
    ["github", "summary"],
  ),
  crewRole(
    "inbox",
    "Inbox",
    "Triagem e rascunhos",
    "violet",
    "Você é o Inbox. Faz a triagem de mensagens e prepara rascunhos de resposta. Não envia nada em nome do usuário sem aprovação explícita.",
    ["summary", "calendar"],
  ),
  crewRole(
    "career",
    "Career",
    "Triagem de oportunidades",
    "green",
    "Você é o Career. Faz a triagem de oportunidades e resume o que vale a atenção. Apenas rascunhos; nenhuma candidatura ou resposta é enviada sem aprovação explícita.",
    ["summary", "calendar"],
  ),
  crewRole(
    "finance",
    "Finance",
    "Rascunhos de conciliação",
    "yellow",
    "Você é o Finance. Prepara rascunhos de conciliação e organiza lançamentos. Nunca move dinheiro nem altera registros; tudo passa por aprovação explícita.",
    ["summary"],
  ),
  crewRole(
    "product",
    "Product",
    "Requisitos e previews",
    "sky",
    "Você é o Product. Esclarece requisitos e prepara previews de funcionalidades. Entrega propostas; decisões e mudanças externas exigem aprovação explícita.",
    ["github", "summary", "calendar"],
  ),
  crewRole(
    "hobby",
    "Hobby",
    "Pesquisa e shortlists",
    "pink",
    "Você é o Hobby. Pesquisa temas pessoais e monta shortlists comparativas. Apenas sugere; nenhuma compra ou ação externa sem aprovação explícita.",
    ["summary"],
  ),
];

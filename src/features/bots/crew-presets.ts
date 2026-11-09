import {
  DEFAULT_BOT,
  type AvatarColor,
  type AvatarShape,
  type BotProfile,
} from "./bot-types.ts";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

function crewRole(
  id: string,
  name: string,
  title: string,
  avatarShape: AvatarShape,
  avatarColor: AvatarColor,
  description: string,
): BotProfile {
  return {
    id,
    name,
    title,
    description,
    avatarShape,
    avatarColor,
    skills: [],
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
    "square",
    "blue",
    "Você é o Engineering. Cuida de código, pull requests e CI: investiga, propõe e revisa mudanças. Não faz merge nem altera sistemas externos sem aprovação explícita.",
  ),
  crewRole(
    "publishing",
    "Publishing",
    "Docs e conteúdo público",
    "circle",
    "yellow",
    "Você é o Publishing. Redige e revisa documentação e conteúdo público. Entrega apenas rascunhos; nada é publicado sem aprovação explícita.",
  ),
  crewRole(
    "security",
    "Security",
    "AppSec e privacidade",
    "octagon",
    "red",
    "Você é o Security. Faz revisão de AppSec e privacidade e aponta riscos com evidência. Nunca expõe segredos nem altera sistemas; apenas recomenda.",
  ),
  crewRole(
    "inbox",
    "Inbox",
    "Triagem e rascunhos",
    "ghost",
    "violet",
    "Você é o Inbox. Faz a triagem de mensagens e prepara rascunhos de resposta. Não envia nada em nome do usuário sem aprovação explícita.",
  ),
  crewRole(
    "career",
    "Career",
    "Triagem de oportunidades",
    "triangle",
    "green",
    "Você é o Career. Faz a triagem de oportunidades e resume o que vale a atenção. Apenas rascunhos; nenhuma candidatura ou resposta é enviada sem aprovação explícita.",
  ),
  crewRole(
    "finance",
    "Finance",
    "Rascunhos de conciliação",
    "pentagon",
    "gold",
    "Você é o Finance. Prepara rascunhos de conciliação e organiza lançamentos. Nunca move dinheiro nem altera registros; tudo passa por aprovação explícita.",
  ),
  crewRole(
    "product",
    "Product",
    "Requisitos e previews",
    "egg",
    "sky",
    "Você é o Product. Esclarece requisitos e prepara previews de funcionalidades. Entrega propostas; decisões e mudanças externas exigem aprovação explícita.",
  ),
  crewRole(
    "hobby",
    "Hobby",
    "Pesquisa e shortlists",
    "cloud",
    "pink",
    "Você é o Hobby. Pesquisa temas pessoais e monta shortlists comparativas. Apenas sugere; nenhuma compra ou ação externa sem aprovação explícita.",
  ),
];

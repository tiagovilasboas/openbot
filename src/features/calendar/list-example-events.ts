export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  detail: string;
  date: null;
  fictional: true;
};

const exampleEvents: Record<"pt" | "en", CalendarEvent[]> = {
  pt: [
    {
      id: "openbot-focus",
      title: "Open Bot — foco no MVP",
      time: "10:00",
      detail: "Bloco de trabalho · 45 min",
      date: null,
      fictional: true,
    },
    {
      id: "design-review",
      title: "Revisão do fluxo mobile",
      time: "14:30",
      detail: "Produto · 30 min",
      date: null,
      fictional: true,
    },
  ],
  en: [
    {
      id: "openbot-focus",
      title: "Open Bot — MVP focus",
      time: "10:00",
      detail: "Focus block · 45 min",
      date: null,
      fictional: true,
    },
    {
      id: "design-review",
      title: "Mobile flow review",
      time: "14:30",
      detail: "Product · 30 min",
      date: null,
      fictional: true,
    },
  ],
};

export function listExampleEvents(language: "pt" | "en"): CalendarEvent[] {
  return exampleEvents[language].map((event) => ({ ...event }));
}

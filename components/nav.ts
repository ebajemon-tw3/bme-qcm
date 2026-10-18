export const PAGES = [
  { href: "/", title: "Tableau de bord" },
  { href: "/calendrier", title: "Calendrier" },
  { href: "/qcm", title: "QCM" },
  { href: "/historique", title: "Historique" },
  { href: "/points-faibles", title: "Points faibles" },
  { href: "/essais", title: "Essais Ethics" },
  { href: "/exam", title: "Révision d'exam" },
] as const;

export const TITLES: Record<string, string> = {
  "/": "Tableau de bord",
  "/calendrier": "Calendrier",
  "/qcm": "QCM",
  "/historique": "Historique",
  "/session": "Revue de session",
  "/points-faibles": "Points faibles",
  "/matiere": "Matière",
  "/fiche": "Fiche de révision",
  "/reglages": "Réglages",
  "/essais": "Essais Ethics",
  "/exam": "Révision d'exam",
};

// usePathname renvoie le chemin sans basePath ; trailingSlash ajoute une barre finale.
export function normalizePath(pathname: string | null) {
  if (!pathname) return "/";
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

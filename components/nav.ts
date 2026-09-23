export const PAGES = [
  { href: "/", title: "Tableau de bord" },
  { href: "/qcm", title: "QCM" },
  { href: "/historique", title: "Historique" },
  { href: "/points-faibles", title: "Points faibles" },
] as const;

export const TITLES: Record<string, string> = {
  "/": "Tableau de bord",
  "/qcm": "QCM",
  "/historique": "Historique",
  "/session": "Revue de session",
  "/points-faibles": "Points faibles",
  "/matiere": "Matière",
  "/reglages": "Réglages",
};

// usePathname renvoie le chemin sans basePath ; trailingSlash ajoute une barre finale.
export function normalizePath(pathname: string | null) {
  if (!pathname) return "/";
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

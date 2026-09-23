// Barre d'actions collée en bas de l'écran : les boutons restent sous le pouce sur téléphone.
export function ActionBar({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="sticky bottom-0 z-10 -mx-4 mt-auto -mb-8 border-t bg-background px-4 py-3 md:-mx-6 md:px-6"
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// Chiffres clés. Chaque entrée porte une question précise, formulée dans `hint`.
export function StatGrid({ items }: { items: { label: string; value: string; hint: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden border bg-border lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 bg-background p-4">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="text-xl font-semibold tabular-nums">{item.value}</dd>
          <dd className="text-xs text-muted-foreground">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

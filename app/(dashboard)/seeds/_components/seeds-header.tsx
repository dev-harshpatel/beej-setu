interface SeedsHeaderProps {
  total: number;
}

export function SeedsHeader({ total }: SeedsHeaderProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Seed Products</h2>
      <p className="text-sm text-muted-foreground mt-0.5">
        {total > 0 ? `${total} product${total !== 1 ? "s" : ""}` : "Seed product catalogue"}
      </p>
    </div>
  );
}

import { MdInline } from "@/components/md-inline";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MdTable as MdTableData } from "@/lib/types";
import { cn } from "@/lib/utils";

// Tableau d'une fiche CLAUDE.md, rendu tel quel. `muted` grise une ligne (séance passée).
export function MdTable({
  table,
  caption,
  muted,
}: {
  table: MdTableData;
  caption: string;
  muted?: (row: string[]) => boolean;
}) {
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          {table.headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row, i) => (
          <TableRow key={i} className={cn(muted?.(row) && "text-muted-foreground")}>
            {table.headers.map((_, j) => (
              <TableCell key={j} className="align-top whitespace-normal">
                <MdInline text={row[j] ?? ""} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useData } from "@/components/data-provider";
import { MdInline } from "@/components/md-inline";
import { MdTable } from "@/components/md-table";
import { PageHeader } from "@/components/page-header";
import type { DocBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const HEADING = ["", "text-xl", "mt-6 text-lg font-semibold", "mt-4 text-base font-semibold", "text-sm font-semibold"];

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "heading":
      return <h2 className={HEADING[block.level]}>{block.text}</h2>;
    case "paragraph":
      return (
        <p className="text-sm leading-relaxed">
          <MdInline text={block.text} />
        </p>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={cn("flex flex-col gap-1 pl-5 text-sm leading-relaxed", block.ordered ? "list-decimal" : "list-disc")}>
          {block.items.map((item, i) => (
            <li key={i}>
              <MdInline text={item} />
            </li>
          ))}
        </List>
      );
    }
    case "quote":
      return (
        <blockquote className="flex flex-col gap-3 border-l-2 pl-4 text-sm leading-relaxed">
          {block.paragraphs.map((p, i) => (
            <p key={i}>
              <MdInline text={p} />
            </p>
          ))}
        </blockquote>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <MdTable table={block.table} caption="Tableau de la fiche" />
        </div>
      );
    case "rule":
      return <hr className="my-2" />;
  }
}

export function SheetView() {
  const { bundle } = useData();
  const params = useSearchParams();
  const subject = bundle.subjects.find((s) => s.code === params.get("c"));
  const sheet = subject?.sheets?.find((s) => s.slug === params.get("f"));

  if (!subject || !sheet) {
    return <PageHeader title="Fiche introuvable">Aucune fiche ne correspond à ce lien dans les données publiées.</PageHeader>;
  }

  return (
    <>
      <PageHeader title={sheet.title}>
        <span className="[overflow-wrap:anywhere]">
          <Link href={`/matiere?c=${subject.code}`} className="underline underline-offset-4">
          {subject.sigle ?? subject.code}
        </Link>
          , {subject.dir}/{sheet.file}
        </span>
      </PageHeader>
      <article className="flex max-w-3xl min-w-0 flex-col gap-3 [overflow-wrap:anywhere]">
        {sheet.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </article>
    </>
  );
}

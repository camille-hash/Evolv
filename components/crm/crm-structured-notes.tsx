import type { CrmStructuredNote } from "@/modules/crm";
import { cn } from "@/lib/utils";

const noteDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type CrmStructuredNotesListProps = {
  emptyText: string;
  notes: CrmStructuredNote[];
  variant?: "default" | "compact";
};

export function CrmStructuredNotesList({
  emptyText,
  notes,
  variant = "default",
}: CrmStructuredNotesListProps) {
  if (!notes.length) {
    return (
      <div className="rounded-md border border-dashed bg-background/60 p-4 text-sm leading-6 text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <article
          className={cn(
            "rounded-md border bg-background/70 text-sm",
            variant === "compact" ? "p-3" : "p-4",
          )}
          key={note.id}
        >
          <p
            className={cn(
              "text-foreground",
              variant === "compact" ? "leading-5" : "leading-6",
            )}
          >
            {note.content}
          </p>
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
              variant === "compact" ? "mt-2" : "mt-3",
            )}
          >
            <span>{note.author}</span>
            <span aria-hidden>-</span>
            <time dateTime={note.timestamp}>
              {noteDateFormatter.format(new Date(note.timestamp))}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}

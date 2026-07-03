import Link from "next/link";

type OperationsPageHeaderProps = {
  description?: string;
  eyebrow?: string;
  title?: string;
};

export function OperationsPageHeader({
  description = "Visao derivada de clientes, contratos, administradoras, comissoes, receitas e portfolio.",
  eyebrow = "Operations Workspace",
  title = "Centro operacional EVOLV",
}: OperationsPageHeaderProps) {
  return (
    <header className="rounded-md border bg-card p-6 text-card-foreground shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground">
            Read-only
          </span>
          <Link
            className="rounded-full border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
            href="/"
          >
            Voltar ao EVOLV
          </Link>
        </div>
      </div>
    </header>
  );
}

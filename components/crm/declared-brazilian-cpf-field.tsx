import type { DeclaredBrazilianAndCpfStatus } from "@/modules/crm";
import { cn } from "@/lib/utils";

export function DeclaredBrazilianCpfField({
  name,
  onChange,
  required = false,
  value,
}: {
  name: string;
  onChange: (value: DeclaredBrazilianAndCpfStatus) => void;
  required?: boolean;
  value: DeclaredBrazilianAndCpfStatus | null | undefined;
}) {
  return (
    <fieldset className="grid gap-2 text-sm font-medium text-foreground">
      <legend>Você é brasileiro(a) e possui CPF?</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {([
          ["yes", "Sim"],
          ["no", "Não"],
        ] as const).map(([option, label]) => (
          <label
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-accent",
            )}
            key={option}
          >
            <input
              checked={value === option}
              className="sr-only"
              name={name}
              onChange={() => onChange(option)}
              required={required}
              type="radio"
              value={option}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

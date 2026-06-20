import Link from "next/link";

const products = [
  {
    href: "/simulacao-comercial",
    title: "Simulacao Comercial",
    description: "Preencha os parametros, compare o resultado e gere o PDF comercial.",
  },
  {
    href: "/multi-cotas",
    title: "Multi-Cotas",
    description: "Monte um estudo com varias cartas e exporte o resultado consolidado.",
  },
];

export default function Home() {
  return (
    <section className="space-y-8">
      <div className="hero">
        <p className="eyebrow text-emerald-100">Ferramentas comerciais</p>
        <h1 className="mt-3 text-4xl font-semibold">Patrion Simulator</h1>
        <p className="mt-4 max-w-2xl text-emerald-50">
          Simulacoes locais, sem login e sem dependencia de CRM.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {products.map((product) => (
          <Link className="card block transition hover:border-emerald-700" href={product.href} key={product.href}>
            <h2 className="text-2xl font-semibold">{product.title}</h2>
            <p className="mt-3 text-slate-600">{product.description}</p>
            <span className="mt-6 inline-block font-medium text-emerald-800">Abrir simulador →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  accessContractBidOfferPdf,
  fetchContractBidOffers,
  generateContractBidOfferClient,
  saveContractBidOfferClient,
  transitionContractBidOfferClient,
} from "@/modules/operations/contract-bid-offer-client";
import type {
  ContractBidOffer,
  ContractBidOfferChannel,
} from "@/modules/operations/contract-bid-offer-types";
import type { ContractOperationalTimeline } from "@/modules/operations/contract-timeline-types";

export function ContractBidOffersPanel({
  contractId,
  timeline,
}: {
  contractId: string;
  timeline: ContractOperationalTimeline;
}) {
  const [offers, setOffers] = useState<ContractBidOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<ContractBidOffer | null>(null);
  const draftableBids = useMemo(
    () =>
      timeline.bids.filter(
        (bid) =>
          !offers.some(
            (offer) =>
              offer.bidId === bid.id &&
              !["cancelled", "expired", "rejected"].includes(offer.status),
          ),
      ),
    [offers, timeline.bids],
  );

  useEffect(() => {
    let active = true;
    fetchContractBidOffers(contractId)
      .then((items) => active && setOffers(items))
      .catch((cause) => active && setError(message(cause)));
    return () => {
      active = false;
    };
  }, [contractId]);

  async function run(action: () => Promise<ContractBidOffer>) {
    setBusy(true);
    setError(null);
    try {
      const offer = await action();
      setOffers((items) =>
        [offer, ...items.filter((item) => item.id !== offer.id)].sort(
          (a, b) => b.version - a.version,
        ),
      );
      return offer;
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createDraft(bidId: string) {
    const bid = timeline.bids.find((item) => item.id === bidId);
    if (!bid) return;
    await run(() =>
      saveContractBidOfferClient(contractId, {
        assemblyId: bid.assemblyId,
        bidId: bid.id,
        cashAmount: bid.cashAmount,
        embeddedAmount: bid.embeddedAmount,
        id: crypto.randomUUID(),
        notes: bid.notes,
      }),
    );
  }

  async function openPdf(offer: ContractBidOffer, download: boolean) {
    setBusy(true);
    try {
      const access = await accessContractBidOfferPdf(
        contractId,
        offer.id,
        download,
      );
      window.open(access.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">
            Ofertas de lance
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Versoes comerciais persistidas e vinculadas a estrategia interna.
          </p>
        </div>
        {draftableBids.length ? (
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={busy}
            onChange={(event) => {
              if (event.target.value) void createDraft(event.target.value);
              event.target.value = "";
            }}
            defaultValue=""
          >
            <option value="">Salvar oferta como rascunho...</option>
            {draftableBids.map((bid) => (
              <option key={bid.id} value={bid.id}>
                {`Lance ${bid.totalPercentage?.toFixed(2) ?? "-"}%`}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        {offers.length ? (
          offers.map((offer) => (
            <OfferCard
              busy={busy}
              key={offer.id}
              offer={offer}
              onGenerate={() =>
                run(() => generateContractBidOfferClient(contractId, offer.id))
              }
              onOpen={(download) => openPdf(offer, download)}
              onSave={(cashAmount, embeddedAmount, notes) =>
                run(() =>
                  saveContractBidOfferClient(contractId, {
                    assemblyId: offer.assemblyId,
                    bidId: offer.bidId,
                    cashAmount,
                    embeddedAmount,
                    id: offer.id,
                    notes,
                  }),
                )
              }
              onNewVersion={() =>
                run(() =>
                  saveContractBidOfferClient(contractId, {
                    assemblyId: offer.assemblyId,
                    bidId: offer.bidId,
                    cashAmount: offer.cashAmount,
                    embeddedAmount: offer.embeddedAmount,
                    id: crypto.randomUUID(),
                    notes: offer.notes,
                  }),
                )
              }
              onShare={() => setShare(offer)}
              onTransition={(status) =>
                run(() =>
                  transitionContractBidOfferClient(
                    contractId,
                    offer.id,
                    status,
                  ),
                )
              }
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Nenhuma oferta comercial criada para este contrato.
          </p>
        )}
      </div>
      {share ? (
        <ShareDialog
          busy={busy}
          offer={share}
          onClose={() => setShare(null)}
          onGetLink={() =>
            accessContractBidOfferPdf(contractId, share.id).then(
              (access) => access.url,
            )
          }
          onOpenPdf={() => openPdf(share, false)}
          onSent={(channel) =>
            run(() =>
              transitionContractBidOfferClient(
                contractId,
                share.id,
                "sent",
                channel,
              ),
            ).then((offer) => {
              if (offer) setShare(null);
            })
          }
        />
      ) : null}
    </section>
  );
}

function OfferCard({
  busy,
  offer,
  onGenerate,
  onOpen,
  onNewVersion,
  onSave,
  onShare,
  onTransition,
}: {
  busy: boolean;
  offer: ContractBidOffer;
  onGenerate: () => void;
  onOpen: (download: boolean) => void;
  onNewVersion: () => void;
  onSave: (
    cashAmount: number,
    embeddedAmount: number,
    notes: string,
  ) => void;
  onShare: () => void;
  onTransition: (status: "approved" | "rejected" | "submitted") => void;
}) {
  const [cashAmount, setCashAmount] = useState(String(offer.cashAmount));
  const [embeddedAmount, setEmbeddedAmount] = useState(
    String(offer.embeddedAmount),
  );
  const [notes, setNotes] = useState(offer.notes ?? "");

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-950">
          Oferta v{offer.version} · {money(offer.totalAmount)}
        </p>
        <span className="rounded-full border bg-white px-2 py-1 text-xs font-semibold uppercase text-slate-600">
          {offer.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Dinheiro {money(offer.cashAmount)} · Embutido{" "}
        {money(offer.embeddedAmount)}
      </p>
      {offer.status === "draft" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Valor em dinheiro
            <input
              className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
              min="0"
              onChange={(event) => setCashAmount(event.target.value)}
              type="number"
              value={cashAmount}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Valor embutido
            <input
              className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
              min="0"
              onChange={(event) => setEmbeddedAmount(event.target.value)}
              type="number"
              value={embeddedAmount}
            />
          </label>
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">
            Observacoes
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border bg-white p-2 text-sm"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {offer.status === "draft" ? (
          <>
            <Button
              disabled={busy}
              onClick={() =>
                onSave(Number(cashAmount), Number(embeddedAmount), notes)
              }
            >
              Salvar rascunho
            </Button>
            <Button disabled={busy} onClick={onGenerate}>Gerar oferta</Button>
          </>
        ) : null}
        {offer.generatedAt ? (
          <>
            <Button disabled={busy} onClick={() => onOpen(false)}>Visualizar PDF</Button>
            <Button disabled={busy} onClick={() => onOpen(true)}>Baixar PDF</Button>
            <Button disabled={busy} onClick={onNewVersion}>Criar nova versao</Button>
          </>
        ) : null}
        {offer.status === "generated" ? (
          <Button disabled={busy} onClick={onShare}>Compartilhar</Button>
        ) : null}
        {offer.status === "sent" ? (
          <>
            <Button disabled={busy} onClick={() => onTransition("approved")}>Marcar aprovada</Button>
            <Button disabled={busy} onClick={() => onTransition("rejected")}>Marcar rejeitada</Button>
          </>
        ) : null}
        {offer.status === "approved" ? (
          <Button disabled={busy} onClick={() => onTransition("submitted")}>
            Registrar envio a administradora
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function ShareDialog({
  busy,
  offer,
  onClose,
  onGetLink,
  onOpenPdf,
  onSent,
}: {
  busy: boolean;
  offer: ContractBidOffer;
  onClose: () => void;
  onGetLink: () => Promise<string>;
  onOpenPdf: () => void;
  onSent: (channel: ContractBidOfferChannel) => void;
}) {
  const [channel, setChannel] =
    useState<ContractBidOfferChannel>("whatsapp");
  const [text, setText] = useState(() => shareText(offer));
  const [secureLink, setSecureLink] = useState("");

  useEffect(() => {
    let active = true;
    onGetLink()
      .then((link) => {
        if (active) {
          setSecureLink(link);
          setText((current) =>
            current.includes(link) ? current : `${current}\n\n${link}`,
          );
        }
      })
      .catch(() => {
        if (active) setSecureLink("");
      });
    return () => {
      active = false;
    };
  }, [onGetLink]);
  function openChannel() {
    if (channel === "whatsapp") {
      const phone = (offer.clientPhone ?? "").replace(/\D/g, "");
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else if (channel === "email") {
      window.location.href = `mailto:${encodeURIComponent(offer.clientEmail ?? "")}?subject=${encodeURIComponent("Estrategia de Lance")}&body=${encodeURIComponent(text)}`;
    } else {
      onOpenPdf();
    }
    onSent(channel);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <section className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Compartilhar oferta v{offer.version}</h3>
        <p className="mt-1 text-sm text-slate-500">{offer.clientName}</p>
        <select
          className="mt-4 w-full rounded-lg border p-2"
          onChange={(event) => setChannel(event.target.value as ContractBidOfferChannel)}
          value={channel}
        >
          <option value="whatsapp">WhatsApp assistido</option>
          <option value="email">E-mail preparado</option>
          <option value="download">Download/anexo manual</option>
          <option value="other">Outro canal</option>
        </select>
        <textarea
          className="mt-3 min-h-48 w-full rounded-lg border p-3 text-sm"
          onChange={(event) => setText(event.target.value)}
          value={text}
        />
        <p className="mt-2 text-xs text-slate-500">
          {secureLink
            ? "Link privado temporario incluido. Expira em cinco minutos."
            : "Use o download/anexo manual se o link nao estiver disponivel."}
          {" A acao registra compartilhamento iniciado, nao entrega confirmada."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button disabled={busy} onClick={openChannel}>Preparar compartilhamento</Button>
        </div>
      </section>
    </div>
  );
}

function Button({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado na oferta.";
}
function shareText(offer: ContractBidOffer) {
  return `Ola, ${offer.clientName}.\n\nPreparamos uma estrategia de lance para a proxima assembleia do seu contrato.\n\nO documento apresenta os valores, a composicao do lance e o impacto estimado no credito.\n\nA analise nao representa garantia de contemplacao e deve ser confirmada antes do envio oficial.\n\nO link seguro do documento pode ser aberto pelo Workspace EVOLV.\n\nFico a disposicao para conversarmos.`;
}

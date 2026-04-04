import { useEffect, useRef } from "react";

interface DanfeNfceProps {
  nota: {
    tipo: string;
    numero?: string | null;
    serie?: string | null;
    chave_acesso?: string | null;
    protocolo_autorizacao?: string | null;
    valor_total: number;
    cliente_nome?: string | null;
    cliente_documento?: string | null;
    created_at: string;
    dados_nfe?: Record<string, unknown> | null;
    dados_nfse?: Record<string, unknown> | null;
  };
  empresa: {
    nome_empresa?: string | null;
    razao_social?: string | null;
    cnpj?: string | null;
    endereco_completo?: string;
  };
  onClose?: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatChaveAcesso = (chave: string) =>
  chave.replace(/(\d{4})/g, "$1 ").trim();

const formatCnpj = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
};

export function DanfeNfce({ nota, empresa, onClose }: DanfeNfceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const qrCodeUrl = nota.chave_acesso
    ? `https://www.nfce.fazenda.sp.gov.br/consulta?chave=${nota.chave_acesso}`
    : null;

  // Extract items from dados_nfe
  const itens: { nome: string; qtd: number; vUnit: number; vTotal: number }[] = [];
  if (nota.dados_nfe) {
    const infNFe = nota.dados_nfe.infNFe as Record<string, unknown> | undefined;
    const det = infNFe?.det as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(det)) {
      det.forEach((d) => {
        const prod = d.prod as Record<string, unknown>;
        itens.push({
          nome: (prod?.xProd as string) || "",
          qtd: Number(prod?.qCom) || 1,
          vUnit: Number(prod?.vUnCom) || 0,
          vTotal: Number(prod?.vProd) || 0,
        });
      });
    }
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden; }
          .danfe-nfce-print, .danfe-nfce-print * { visibility: visible; }
          .danfe-nfce-print { position: absolute; left: 0; top: 0; width: 80mm; }
          .no-print { display: none !important; }
        }
        .danfe-nfce-print {
          width: 80mm;
          margin: 0 auto;
          padding: 2mm;
          font-family: "Courier New", monospace;
          font-size: 9px;
          line-height: 1.3;
          color: #000;
          background: #fff;
        }
        .danfe-nfce-print .separator {
          border-top: 1px dashed #000;
          margin: 2mm 0;
        }
        .danfe-nfce-print .center { text-align: center; }
        .danfe-nfce-print .bold { font-weight: bold; }
        .danfe-nfce-print .right { text-align: right; }
        .danfe-nfce-print .item-row {
          display: flex;
          justify-content: space-between;
          gap: 1mm;
        }
        .danfe-nfce-print .item-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .danfe-nfce-print .qr-container {
          display: flex;
          justify-content: center;
          margin: 3mm 0;
        }
        .danfe-nfce-print .qr-container img {
          width: 30mm;
          height: 30mm;
        }
        .danfe-nfce-print .chave {
          font-size: 7px;
          word-break: break-all;
          text-align: center;
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-background/80 flex items-start justify-center overflow-auto no-print">
        <div className="mt-4 mb-4">
          <div className="flex gap-2 mb-2 justify-center no-print">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
            >
              Imprimir
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm"
              >
                Fechar
              </button>
            )}
          </div>

          <div ref={printRef} className="danfe-nfce-print bg-white text-black">
            {/* Cabeçalho */}
            <div className="center bold" style={{ fontSize: "11px" }}>
              {empresa.razao_social || empresa.nome_empresa || "EMPRESA"}
            </div>
            {empresa.cnpj && (
              <div className="center" style={{ fontSize: "8px" }}>
                CNPJ: {formatCnpj(empresa.cnpj.replace(/\D/g, ""))}
              </div>
            )}
            {empresa.endereco_completo && (
              <div className="center" style={{ fontSize: "7px" }}>
                {empresa.endereco_completo}
              </div>
            )}

            <div className="separator" />

            <div className="center bold">
              DANFE NFC-e - Documento Auxiliar
            </div>
            <div className="center" style={{ fontSize: "7px" }}>
              da Nota Fiscal de Consumidor Eletrônica
            </div>

            <div className="separator" />

            {/* Itens */}
            <div className="bold" style={{ fontSize: "8px" }}>
              <div className="item-row">
                <span className="item-name">DESCRIÇÃO</span>
                <span>QTD</span>
                <span style={{ width: "18mm", textAlign: "right" }}>V.UNIT</span>
                <span style={{ width: "18mm", textAlign: "right" }}>V.TOTAL</span>
              </div>
            </div>
            <div className="separator" />

            {itens.map((item, i) => (
              <div key={i} className="item-row" style={{ fontSize: "8px" }}>
                <span className="item-name">{item.nome}</span>
                <span>{item.qtd}</span>
                <span style={{ width: "18mm", textAlign: "right" }}>
                  {item.vUnit.toFixed(2)}
                </span>
                <span style={{ width: "18mm", textAlign: "right" }}>
                  {item.vTotal.toFixed(2)}
                </span>
              </div>
            ))}

            <div className="separator" />

            {/* Totais */}
            <div className="item-row bold" style={{ fontSize: "10px" }}>
              <span>TOTAL</span>
              <span>{formatCurrency(nota.valor_total)}</span>
            </div>

            <div className="separator" />

            {/* Pagamento */}
            <div style={{ fontSize: "8px" }}>
              <div className="item-row">
                <span>Forma de Pagamento:</span>
                <span>Dinheiro</span>
              </div>
              <div className="item-row">
                <span>Valor Pago:</span>
                <span>{formatCurrency(nota.valor_total)}</span>
              </div>
            </div>

            <div className="separator" />

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="qr-container">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrCodeUrl)}`}
                  alt="QR Code NFC-e"
                />
              </div>
            )}

            {/* Chave de acesso */}
            {nota.chave_acesso && (
              <>
                <div className="center bold" style={{ fontSize: "7px" }}>
                  Chave de Acesso
                </div>
                <div className="chave">{formatChaveAcesso(nota.chave_acesso)}</div>
              </>
            )}

            <div className="separator" />

            {/* Informações fiscais */}
            <div className="center" style={{ fontSize: "7px" }}>
              {nota.numero && <div>Nº {nota.numero} | Série {nota.serie || "1"}</div>}
              <div>Emissão: {formatDateTime(nota.created_at)}</div>
              {nota.protocolo_autorizacao && (
                <div>Protocolo: {nota.protocolo_autorizacao}</div>
              )}
              {nota.cliente_nome && nota.cliente_nome !== "CONSUMIDOR FINAL" && (
                <div>
                  Consumidor: {nota.cliente_nome}
                  {nota.cliente_documento && ` - ${nota.cliente_documento}`}
                </div>
              )}
            </div>

            <div className="separator" />
            <div className="center" style={{ fontSize: "7px" }}>
              Consulte pela Chave de Acesso em
            </div>
            <div className="center bold" style={{ fontSize: "7px" }}>
              www.nfce.fazenda.sp.gov.br/consulta
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

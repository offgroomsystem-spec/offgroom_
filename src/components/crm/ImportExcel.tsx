import { useState } from "react";
import { FileSpreadsheet, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCRMLeads } from "@/hooks/useCRMLeads";

interface ParsedLead {
  nome_empresa: string;
  nota_google: number | null;
  qtd_avaliacoes: number | null;
  telefone_empresa: string;
}

const ImportExcel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rawData, setRawData] = useState("");
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const { importLeads } = useCRMLeads();

  const parseExcelData = (data: string): ParsedLead[] => {
    const lines = data.trim().split("\n");
    const leads: ParsedLead[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Separar por TAB (padrão do Excel ao colar)
      const columns = line.split("\t");
      
      // Coluna A (0) = Nome, B (1) = Telefone, C (2) = Nota, D (3) = Avaliações
      if (columns.length >= 2) {
        const nome_empresa = columns[0]?.trim() || "";
        const telefone_empresa = columns[1]?.trim() || "";
        const nota_google = columns[2]?.trim() ? parseFloat(columns[2].replace(",", ".")) : null;
        const qtd_avaliacoes = columns[3]?.trim() ? parseInt(columns[3].replace(/\D/g, "")) : null;

        if (nome_empresa) {
          leads.push({
            nome_empresa,
            nota_google: isNaN(nota_google!) ? null : nota_google,
            qtd_avaliacoes: isNaN(qtd_avaliacoes!) ? null : qtd_avaliacoes,
            telefone_empresa,
          });
        }
      }
    }

    return leads;
  };

  const removeDuplicates = (leads: ParsedLead[]): ParsedLead[] => {
    const seen = new Set<string>();
    return leads.filter(lead => {
      // Se não tem telefone, mantém (não entra na validação de duplicidade)
      if (!lead.telefone_empresa) return true;
      
      // Normalizar telefone (remover espaços, parênteses, traços)
      const normalizedPhone = lead.telefone_empresa.replace(/[\s\(\)\-]/g, "");
      
      if (seen.has(normalizedPhone)) {
        return false; // Já existe, ignorar
      }
      
      seen.add(normalizedPhone);
      return true; // Primeiro registro com esse telefone
    });
  };

  const handleParse = () => {
    const allLeads = parseExcelData(rawData);
    const uniqueLeads = removeDuplicates(allLeads);
    setDuplicatesRemoved(allLeads.length - uniqueLeads.length);
    setParsedLeads(uniqueLeads);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    await importLeads.mutateAsync(parsedLeads);
    setIsOpen(false);
    setRawData("");
    setParsedLeads([]);
    setShowPreview(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setRawData("");
    setParsedLeads([]);
    setShowPreview(false);
    setDuplicatesRemoved(0);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Importar do Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Contatos do Excel</DialogTitle>
            <DialogDescription>
              Cole os dados copiados do Excel. Colunas: Nome (A), Telefone (B), Nota Google (D), Qtd Avaliações (E). Duplicados por telefone serão removidos automaticamente.
            </DialogDescription>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-2">Formato esperado (separado por TAB):</p>
                <code className="text-xs block bg-background p-2 rounded">
                  Pet Shop Feliz{"\t"}(11) 99999-8888{"\t"}{"\t"}4.5{"\t"}89<br />
                  Banho & Tosa XYZ{"\t"}(11) 98888-7777{"\t"}{"\t"}4.8{"\t"}156
                </code>
              </div>

              <Textarea
                placeholder="Cole aqui os dados copiados do Excel (CTRL + V)..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleParse} disabled={!rawData.trim()}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  {parsedLeads.length} contatos prontos para importar
                  {duplicatesRemoved > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({duplicatesRemoved} duplicado{duplicatesRemoved > 1 ? 's' : ''} removido{duplicatesRemoved > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="w-20">Nota</TableHead>
                      <TableHead className="w-24">Avaliações</TableHead>
                      <TableHead className="w-32">Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.map((lead, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-sm">{lead.nome_empresa}</TableCell>
                        <TableCell className="text-sm">{lead.nota_google ?? "-"}</TableCell>
                        <TableCell className="text-sm">{lead.qtd_avaliacoes ?? "-"}</TableCell>
                        <TableCell className="text-sm">{lead.telefone_empresa}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importLeads.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importLeads.isPending ? "Importando..." : "Importar Todos"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportExcel;

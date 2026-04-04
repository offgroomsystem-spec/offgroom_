import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: { key: string; label: string }[];
}

export const ExportButton = ({ data, filename, columns }: ExportButtonProps) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (data.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    // Cabeçalhos
    const headers = columns.map(col => col.label).join(',');
    
    // Linhas
    const rows = data.map(row => 
      columns.map(col => {
        let value = row[col.key];
        
        // Formatar datas
        if (value instanceof Date) {
          value = format(value, 'dd/MM/yyyy');
        }
        
        // Escapar vírgulas e aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!"
    });
  };

  const exportToPDF = () => {
    if (data.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    const headers = columns.map(col => col.label);
    const rows = data.map(row =>
      columns.map(col => {
        let value = row[col.key];
        if (value instanceof Date) value = format(value, 'dd/MM/yyyy');
        return value ?? '';
      })
    );

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
    h1 { font-size: 16px; margin: 0 0 8px 0; }
    p { font-size: 11px; color: #555; margin: 0 0 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f3f4f6; }
    th { padding: 5px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; font-size: 11px; }
    td { padding: 4px 6px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${filename.replace(/_\d{4}-\d{2}-\d{2}$/, '').replace(/-/g, ' ')}</h1>
  <p>Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      toast({
        title: "Erro",
        description: "Bloqueador de pop-ups ativo. Permita pop-ups para exportar o PDF.",
        variant: "destructive"
      });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);

    toast({ title: "Sucesso", description: "PDF gerado com sucesso!" });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToCSV}>
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <FileText className="h-4 w-4 mr-2" />
        Exportar PDF
      </Button>
    </div>
  );
};

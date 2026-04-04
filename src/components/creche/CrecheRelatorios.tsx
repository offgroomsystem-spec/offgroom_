import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, DollarSign, Dog, AlertTriangle, TrendingUp, LayoutDashboard } from "lucide-react";
import RelatorioOcupacao from "./relatorios/RelatorioOcupacao";
import RelatorioFinanceiro from "./relatorios/RelatorioFinanceiro";
import RelatorioFrequencia from "./relatorios/RelatorioFrequencia";
import RelatorioComportamental from "./relatorios/RelatorioComportamental";
import RelatorioCrescimento from "./relatorios/RelatorioCrescimento";
import DashboardExecutivoCreche from "./relatorios/DashboardExecutivoCreche";
import CrecheRelatorioFilters from "./relatorios/CrecheRelatorioFilters";

const CrecheRelatorios = () => {
  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string }>({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    fim: new Date().toISOString().split("T")[0],
  });
  const [tipoFilter, setTipoFilter] = useState("todos");

  return (
    <div className="space-y-3">
      <CrecheRelatorioFilters
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        tipoFilter={tipoFilter}
        onTipoChange={setTipoFilter}
      />

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto">
          <TabsTrigger value="dashboard" className="text-xs gap-1 py-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Executivo
          </TabsTrigger>
          <TabsTrigger value="ocupacao" className="text-xs gap-1 py-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Ocupação
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs gap-1 py-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="text-xs gap-1 py-1.5">
            <Dog className="h-3.5 w-3.5" /> Frequência
          </TabsTrigger>
          <TabsTrigger value="comportamental" className="text-xs gap-1 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Comportamento
          </TabsTrigger>
          <TabsTrigger value="crescimento" className="text-xs gap-1 py-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Crescimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardExecutivoCreche periodo={periodo} tipoFilter={tipoFilter} />
        </TabsContent>
        <TabsContent value="ocupacao">
          <RelatorioOcupacao periodo={periodo} tipoFilter={tipoFilter} />
        </TabsContent>
        <TabsContent value="financeiro">
          <RelatorioFinanceiro periodo={periodo} tipoFilter={tipoFilter} />
        </TabsContent>
        <TabsContent value="frequencia">
          <RelatorioFrequencia periodo={periodo} tipoFilter={tipoFilter} />
        </TabsContent>
        <TabsContent value="comportamental">
          <RelatorioComportamental periodo={periodo} tipoFilter={tipoFilter} />
        </TabsContent>
        <TabsContent value="crescimento">
          <RelatorioCrescimento periodo={periodo} tipoFilter={tipoFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CrecheRelatorios;

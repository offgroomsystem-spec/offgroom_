import { useMemo } from "react";
import { CRMLead } from "@/hooks/useCRMLeads";
import DashboardCard from "./DashboardCard";
import {
  Users,
  MessageCircle,
  Calendar,
  Gift,
  CreditCard,
  Pause,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CRMDashboardProps {
  leads: CRMLead[];
}

const CRMDashboard = ({ leads }: CRMDashboardProps) => {
  const stats = useMemo(() => {
    const total = leads.length;
    const porTentativa = [1, 2, 3, 4, 5].map(
      (t) => leads.filter((l) => l.tentativa === t && l.status !== "Standby").length
    );
    const emStandby = leads.filter((l) => l.status === "Standby").length;
    const comReuniao = leads.filter((l) => l.agendou_reuniao && !l.usando_acesso_gratis && !l.iniciou_acesso_pago).length;
    const acessoGratis = leads.filter((l) => l.usando_acesso_gratis && !l.iniciou_acesso_pago).length;
    const acessoPago = leads.filter((l) => l.iniciou_acesso_pago).length;
    const semInteresse = leads.filter((l) => l.status === "Sem interesse").length;
    
    // Leads com próximo passo atrasado
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const atrasados = leads.filter((l) => {
      if (!l.proximo_passo) return false;
      const proximoPasso = new Date(l.proximo_passo);
      proximoPasso.setHours(0, 0, 0, 0);
      return proximoPasso < hoje && l.status !== "Standby" && l.status !== "Sem interesse";
    }).length;

    // Taxa de conversão
    const taxaConversao = total > 0 ? ((acessoPago / total) * 100).toFixed(1) : "0";

    return {
      total,
      porTentativa,
      emStandby,
      comReuniao,
      acessoGratis,
      acessoPago,
      semInteresse,
      atrasados,
      taxaConversao,
    };
  }, [leads]);

  const funilData = [
    { label: "Total de Leads", value: stats.total, percentage: 100 },
    { label: "Em Contato (T1-T4)", value: stats.porTentativa.slice(0, 4).reduce((a, b) => a + b, 0), percentage: stats.total > 0 ? (stats.porTentativa.slice(0, 4).reduce((a, b) => a + b, 0) / stats.total) * 100 : 0 },
    { label: "Reunião Marcada", value: stats.comReuniao, percentage: stats.total > 0 ? (stats.comReuniao / stats.total) * 100 : 0 },
    { label: "Acesso Grátis", value: stats.acessoGratis, percentage: stats.total > 0 ? (stats.acessoGratis / stats.total) * 100 : 0 },
    { label: "Convertido (Pago)", value: stats.acessoPago, percentage: stats.total > 0 ? (stats.acessoPago / stats.total) * 100 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total de Leads"
          value={stats.total}
          icon={Users}
          variant="default"
        />
        <DashboardCard
          title="Em Standby"
          value={stats.emStandby}
          description="Aguardando retomada"
          icon={Pause}
          variant="warning"
        />
        <DashboardCard
          title="Acesso Pago"
          value={stats.acessoPago}
          description={`${stats.taxaConversao}% de conversão`}
          icon={CreditCard}
          variant="success"
        />
        <DashboardCard
          title="Atrasados"
          value={stats.atrasados}
          description="Próximo passo vencido"
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Reunião Marcada"
          value={stats.comReuniao}
          icon={Calendar}
          variant="info"
        />
        <DashboardCard
          title="Acesso Grátis"
          value={stats.acessoGratis}
          icon={Gift}
          variant="primary"
        />
        <DashboardCard
          title="Sem Interesse"
          value={stats.semInteresse}
          icon={XCircle}
          variant="danger"
        />
        <DashboardCard
          title="Em Contato"
          value={stats.porTentativa.reduce((a, b) => a + b, 0)}
          description="Tentativas ativas"
          icon={MessageCircle}
          variant="info"
        />
      </div>

      {/* Leads por tentativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Leads por Tentativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.porTentativa.map((count, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Tentativa {index + 1}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <Progress 
                  value={stats.total > 0 ? (count / stats.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Funil de conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funilData.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value} ({item.percentage.toFixed(0)}%)</span>
                </div>
                <Progress 
                  value={item.percentage} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMDashboard;

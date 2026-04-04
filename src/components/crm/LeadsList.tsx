import { useMemo, useState } from "react";
import { CRMLead } from "@/hooks/useCRMLeads";
import LeadCard from "./LeadCard";
import LeadModal from "./LeadModal";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadsListProps {
  leads: CRMLead[];
  isLoading: boolean;
  filter: string;
}

const LeadsList = ({ leads, isLoading, filter }: LeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  const filteredLeads = useMemo(() => {
    if (!filter.trim()) return leads;
    
    const searchLower = filter.toLowerCase();
    return leads.filter(lead => 
      lead.nome_empresa.toLowerCase().includes(searchLower) ||
      lead.telefone_empresa.includes(filter) ||
      (lead.nome_dono && lead.nome_dono.toLowerCase().includes(searchLower)) ||
      (lead.telefone_dono && lead.telefone_dono.includes(filter))
    );
  }, [leads, filter]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (filteredLeads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {filter ? "Nenhum lead encontrado com esse filtro." : "Nenhum lead cadastrado ainda."}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredLeads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => setSelectedLead(lead)}
          />
        ))}
      </div>

      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </>
  );
};

export default LeadsList;

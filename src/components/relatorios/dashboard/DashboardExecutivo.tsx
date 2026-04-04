import { DashboardContent } from "@/components/dashboard/DashboardContent";

interface DashboardExecutivoProps {
  filtros: any;
  onNavigateToReport?: (reportId: string) => void;
}

export const DashboardExecutivo = ({ onNavigateToReport }: DashboardExecutivoProps) => {
  return (
    <DashboardContent 
      onNavigateToRelatorio={onNavigateToReport} 
    />
  );
};

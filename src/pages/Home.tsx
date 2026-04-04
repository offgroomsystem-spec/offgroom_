import { DashboardContent } from "@/components/dashboard/DashboardContent";

const Home = () => {
  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <DashboardContent />
    </div>
  );
};

export default Home;

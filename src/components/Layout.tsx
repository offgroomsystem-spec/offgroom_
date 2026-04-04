import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, PawPrint, Scissors, Calendar, ChevronDown, FileText, Building2, DollarSign, TrendingUp, Package, LogOut, User, Home, UserCog, Dog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const { hasPermission, isAdministrador, isTaxiDog, isRecepcionista } = usePermissions();
  const [crecheAtiva, setCrecheAtiva] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadCrecheConfig = async () => {
      const { data } = await supabase
        .from("empresa_config")
        .select("creche_ativa")
        .single();
      if (data) setCrecheAtiva(data.creche_ativa);
    };
    loadCrecheConfig();
  }, [user]);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  
  const cadastroItems = [
    { path: "/clientes", label: "Clientes", icon: Users, permission: "clientes.visualizar" },
    { path: "/servicos", label: "Serviços", icon: Scissors, permission: "servicos.visualizar" },
    { path: "/produtos", label: "Produtos", icon: Package, permission: "produtos.visualizar" },
    { path: "/racas", label: "Raças", icon: PawPrint, permission: "racas.visualizar" },
    { path: "/pacotes", label: "Pacotes", icon: Scissors, permission: "pacotes.visualizar" },
    { path: "/empresa", label: "Empresa", icon: Building2, permission: "empresa.visualizar" },
    { path: "/fornecedores", label: "Fornecedores", icon: Building2, permission: "fornecedores.visualizar" },
    { path: "/compras-realizadas", label: "Compras Realizadas", icon: FileText, permission: "compras.visualizar" },
    { path: "/contas-bancarias", label: "Contas Bancárias", icon: DollarSign, permission: "contas.visualizar" },
    { path: "/logins", label: "Logins", icon: UserCog, permission: "admin_only" },
    ...(crecheAtiva ? [{ path: "/servicos-creche-hotel", label: "Serviços Creche & Hotel", icon: Dog, permission: "servicos.visualizar" }] : []),
  ];
  
  const filteredCadastroItems = cadastroItems.filter(item => {
    if (item.permission === "admin_only") return isAdministrador;
    return isAdministrador || hasPermission(item.permission);
  });

  const isCadastroActive = filteredCadastroItems.some(item => location.pathname === item.path);
  const showHome = isAdministrador || isRecepcionista;
  const showFinanceiro = isAdministrador || isRecepcionista;
  const showRelatorios = isAdministrador || isRecepcionista;
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-12 items-center">
          <div className="flex items-center gap-2 mr-8">
            <img 
              alt="Offgroom" 
              className="h-8 w-auto" 
              style={{ filter: 'brightness(0) saturate(100%) invert(56%) sepia(76%) saturate(461%) hue-rotate(178deg) brightness(92%) contrast(88%)' }} 
              src="/lovable-uploads/ff44d2bd-28db-4fee-a220-eb612adf432c.png" 
            />
          </div>
          
          <nav className="flex gap-1 items-center">
            {showHome && (
              <Link to="/home" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${location.pathname === "/home" || location.pathname === "/" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Home className="h-4 w-4" />
                <span className="font-medium">Home</span>
              </Link>
            )}
            
            <Link to="/agendamentos" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${location.pathname === "/agendamentos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Agendamentos</span>
            </Link>

            {crecheAtiva && (isAdministrador || isRecepcionista) && (
              <Link to="/creche" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${location.pathname === "/creche" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Dog className="h-4 w-4" />
                <span className="font-medium">Creche</span>
              </Link>
            )}

            {filteredCadastroItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`flex items-center gap-2 px-3 py-1.5 h-auto text-sm ${isCadastroActive ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                    <PawPrint className="h-4 w-4" />
                    <span className="font-medium">Cadastros</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background z-[100]">
                  {filteredCadastroItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link to={item.path} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {showFinanceiro && (
              <Link to="/controle-financeiro" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${location.pathname === "/controle-financeiro" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Controle Financeiro</span>
              </Link>
            )}

            {showRelatorios && (
              <Link to="/relatorios" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${location.pathname === "/relatorios" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Relatórios</span>
              </Link>
            )}

            {(isAdministrador || isRecepcionista) && (
              <Link to="/notas-fiscais" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${location.pathname === "/notas-fiscais" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <FileText className="h-4 w-4" />
                <span className="font-medium">Notas Fiscais</span>
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 h-auto text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{profile?.nome_completo?.split(' ')[0] || 'Usuário'}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1800px] mx-auto py-1 px-2">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

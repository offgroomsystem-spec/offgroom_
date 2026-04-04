import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Clientes from "./pages/Clientes";
import Racas from "./pages/Racas";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Pacotes from "./pages/Pacotes";
import Agendamentos from "./pages/Agendamentos";
import Relatorios from "./pages/Relatorios";
import Empresa from "./pages/Empresa";
import NotFound from "./pages/NotFound";
import ContasBancarias from "./pages/ContasBancarias";
import ControleFinanceiro from "./pages/ControleFinanceiro";
import Fornecedores from "./pages/Fornecedores";
import ComprasRealizadas from "./pages/ComprasRealizadas";
import Store from "./pages/Store";
import Pagamento from "./pages/Pagamento";
import Home from "./pages/Home";
import Logins from "./pages/Logins";
import CRMOffgroom from "./pages/CRMOffgroom";
import NotasFiscais from "./pages/NotasFiscais";
import Creche from "./pages/Creche";
import ServicosCrecheHotel from "./pages/ServicosCrecheHotel";
import AdminMaster from "./pages/AdminMaster";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/store" element={<Store />} />
            <Route path="/pagamento" element={<Pagamento />} />
            <Route path="/crmoffgroom" element={<CRMOffgroom />} />
            <Route path="/admin-master" element={<AdminMaster />} />
            <Route path="/" element={<Navigate to="/store" replace />} />
            
            {/* Rotas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/agendamentos" element={<Agendamentos />} />
                <Route path="/creche" element={<Creche />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/racas" element={<Racas />} />
                <Route path="/pacotes" element={<Pacotes />} />
                <Route path="/empresa" element={<Empresa />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="/compras-realizadas" element={<ComprasRealizadas />} />
                <Route path="/contas-bancarias" element={<ContasBancarias />} />
                <Route path="/controle-financeiro" element={<ControleFinanceiro />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/notas-fiscais" element={<NotasFiscais />} />
                <Route path="/logins" element={<Logins />} />
                <Route path="/servicos-creche-hotel" element={<ServicosCrecheHotel />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

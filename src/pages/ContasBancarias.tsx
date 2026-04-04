import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ContaBancaria {
  id: string;
  nome: string;
  saldo: number;
}

const ContasBancarias = () => {
  const { user, ownerId } = useAuth();
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaBancaria | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState<{
    nome: string;
    saldo: number;
  }>({
    nome: "",
    saldo: 0,
  });

  // Fetch contas from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchContas = async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', ownerId);
        
      if (error) {
        console.error('Error fetching contas:', error);
        toast.error('Erro ao carregar contas bancárias');
      } else {
        setContas(data || []);
      }
      setLoading(false);
    };
    
    fetchContas();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    if (!formData.nome.trim()) {
      toast.error("Favor preencher o nome do banco");
      return;
    }
    
    const { data, error } = await supabase
      .from('contas_bancarias')
      .insert({
        user_id: ownerId,
        nome: formData.nome,
        saldo: formData.saldo
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error inserting conta:', error);
      toast.error('Erro ao cadastrar conta bancária');
    } else {
      setContas([...contas, data]);
      toast.success("Conta bancária cadastrada com sucesso!");
      resetForm();
    }
  };

  const handleEditar = async () => {
    if (!contaSelecionada || !user) return;
    
    if (!formData.nome.trim()) {
      toast.error("Favor preencher o nome do banco");
      return;
    }
    
    const { error } = await supabase
      .from('contas_bancarias')
      .update({
        nome: formData.nome,
        saldo: formData.saldo
      })
      .eq('id', contaSelecionada.id)
      .eq('user_id', ownerId);
      
    if (error) {
      console.error('Error updating conta:', error);
      toast.error('Erro ao atualizar conta bancária');
    } else {
      setContas(contas.map(c => 
        c.id === contaSelecionada.id 
          ? { ...c, nome: formData.nome, saldo: formData.saldo }
          : c
      ));
      toast.success("Conta bancária atualizada com sucesso!");
      resetForm();
      setContaSelecionada(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleExcluir = async () => {
    if (!contaSelecionada || !user) return;
    
    const { error } = await supabase
      .from('contas_bancarias')
      .delete()
      .eq('id', contaSelecionada.id)
      .eq('user_id', ownerId);
      
    if (error) {
      console.error('Error deleting conta:', error);
      toast.error('Erro ao excluir conta bancária');
    } else {
      setContas(contas.filter(c => c.id !== contaSelecionada.id));
      toast.success("Conta bancária excluída com sucesso!");
      setContaSelecionada(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSelecionarConta = (conta: ContaBancaria) => {
    setContaSelecionada(conta);
  };

  const resetForm = () => {
    setFormData({ 
      nome: "", 
      saldo: 0 
    });
    setIsDialogOpen(false);
  };

  const abrirEdicao = () => {
    if (!contaSelecionada) return;
    setFormData({
      nome: contaSelecionada.nome,
      saldo: contaSelecionada.saldo,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cadastro de Contas Bancárias</h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Cadastrar Conta Bancária
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados da conta bancária
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="nome" className="text-xs">Nome do Banco *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="saldo" className="text-xs">Saldo Inicial</Label>
                  <Input
                    id="saldo"
                    type="number"
                    step="0.01"
                    value={formData.saldo}
                    onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-8 text-xs">
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {contaSelecionada && (
            <>
              <Button 
                variant="outline" 
                className="gap-2 h-8 text-xs"
                onClick={abrirEdicao}
              >
                <Edit2 className="h-3 w-3" />
                Editar Conta
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2 h-8 text-xs"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                Excluir Conta
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma conta bancária cadastrada
            </CardContent>
          </Card>
        ) : (
          contas.map((conta) => (
            <Card 
              key={conta.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                contaSelecionada?.id === conta.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleSelecionarConta(conta)}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{conta.nome}</CardTitle>
                <CardDescription className="text-xs space-y-1">
                  <div className="text-xs text-muted-foreground">
                    <div className="font-semibold">Saldo: {formatCurrency(conta.saldo)}</div>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que gostaria de excluir a Conta "{contaSelecionada?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Não
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir}>
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conta Bancária</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que gostaria de editar a Conta "{contaSelecionada?.nome}"?
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditar(); }} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="nome-edit" className="text-xs">Nome do Banco *</Label>
              <Input
                id="nome-edit"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="h-8 text-xs"
                placeholder="Ex: Banco do Brasil"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="saldo-edit" className="text-xs">Saldo</Label>
              <Input
                id="saldo-edit"
                type="number"
                step="0.01"
                value={formData.saldo}
                onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
                placeholder="0.00"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)} 
                className="h-8 text-xs"
              >
                Não
              </Button>
              <Button type="submit" className="h-8 text-xs">
                Sim
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasBancarias;

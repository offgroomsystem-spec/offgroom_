import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Servico {
  id: string;
  nome: string;
  valor: number;
  porte: string;
  // Campos fiscais
  codigo_servico_municipal?: string;
  aliquota_iss?: number;
}

const Servicos = () => {
  const { user, ownerId } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroPorte, setFiltroPorte] = useState("");

  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    porte: "",
    // Campos fiscais
    codigo_servico_municipal: "",
    aliquota_iss: "",
  });

  // Fetch servicos from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchServicos = async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', ownerId);
        
      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Erro ao carregar serviços');
      } else {
        setServicos(data || []);
      }
      setLoading(false);
    };
    
    fetchServicos();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Validações
    if (!formData.nome || !formData.valor || !formData.porte) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    if (editingServico) {
      const { error } = await supabase
        .from('servicos')
        .update({
          nome: formData.nome,
          valor: parseFloat(formData.valor),
          porte: formData.porte,
          codigo_servico_municipal: formData.codigo_servico_municipal || null,
          aliquota_iss: formData.aliquota_iss ? parseFloat(formData.aliquota_iss) : 0,
        })
        .eq('id', editingServico.id)
        .eq('user_id', ownerId);
        
      if (error) {
        toast.error("Erro ao atualizar serviço");
        console.error(error);
        return;
      }
      
      setServicos(servicos.map(s => 
        s.id === editingServico.id 
          ? { 
              ...s,
              nome: formData.nome, 
              valor: parseFloat(formData.valor),
              porte: formData.porte,
              codigo_servico_municipal: formData.codigo_servico_municipal || undefined,
              aliquota_iss: formData.aliquota_iss ? parseFloat(formData.aliquota_iss) : undefined,
            }
          : s
      ));
      toast.success("Serviço atualizado com sucesso!");
    } else {
      const { data, error } = await supabase
        .from('servicos')
        .insert([{
          user_id: ownerId,
          nome: formData.nome,
          valor: parseFloat(formData.valor),
          porte: formData.porte,
          codigo_servico_municipal: formData.codigo_servico_municipal || null,
          aliquota_iss: formData.aliquota_iss ? parseFloat(formData.aliquota_iss) : 0,
        }])
        .select()
        .single();
        
      if (error) {
        toast.error("Erro ao cadastrar serviço");
        console.error(error);
        return;
      }
      
      if (data) {
        setServicos([...servicos, data]);
      }
      toast.success("Serviço cadastrado com sucesso!");
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: "", valor: "", porte: "", codigo_servico_municipal: "", aliquota_iss: "" });
    setEditingServico(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({ 
      nome: servico.nome, 
      valor: servico.valor.toString(),
      porte: servico.porte || "",
      codigo_servico_municipal: servico.codigo_servico_municipal || "",
      aliquota_iss: servico.aliquota_iss?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);
      
    if (error) {
      toast.error("Erro ao remover serviço");
      console.error(error);
      return;
    }
    
    setServicos(servicos.filter(s => s.id !== id));
    toast.success("Serviço removido com sucesso!");
  };

  const filteredServicos = servicos.filter(servico => {
    const matchSearch = servico.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPorte = !filtroPorte || filtroPorte === "all" || servico.porte === filtroPorte;
    return matchSearch && matchPorte;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground text-xs">Gerencie os serviços oferecidos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs">
              <Plus className="h-3 w-3" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg">{editingServico ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados do serviço
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nome" className="text-xs">Nome do Serviço</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Banho e Tosa"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="valor" className="text-xs">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0.00"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="porte" className="text-xs">Porte do Pet *</Label>
                <Select
                  value={formData.porte}
                  onValueChange={(value) => setFormData({ ...formData, porte: value })}
                  required
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Para todos os portes</SelectItem>
                    <SelectItem value="Pequeno">Pequeno</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos Fiscais */}
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Informações Fiscais (Opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="codigo_servico_municipal" className="text-xs">Código Serviço Municipal</Label>
                    <Input
                      id="codigo_servico_municipal"
                      value={formData.codigo_servico_municipal}
                      onChange={(e) => setFormData({ ...formData, codigo_servico_municipal: e.target.value })}
                      placeholder="Ex: 06.01"
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Código LC 116/2003</p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="aliquota_iss" className="text-xs">Alíquota ISS (%)</Label>
                    <Input
                      id="aliquota_iss"
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      value={formData.aliquota_iss}
                      onChange={(e) => setFormData({ ...formData, aliquota_iss: e.target.value })}
                      placeholder="Ex: 5.00"
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Geralmente entre 2% e 5%</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingServico ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base">Lista de Serviços</CardTitle>
              <CardDescription className="text-xs">Total: {servicos.length} serviços cadastrados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroPorte} onValueChange={setFiltroPorte}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Filtrar por Porte" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">Todos</SelectItem>
                   <SelectItem value="Todos">Para todos os portes</SelectItem>
                   <SelectItem value="Pequeno">Pequeno</SelectItem>
                   <SelectItem value="Médio">Médio</SelectItem>
                   <SelectItem value="Grande">Grande</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-xs">Serviço</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Porte</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Valor</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredServicos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum serviço cadastrado
                    </td>
                  </tr>
                ) : (
                  filteredServicos.map((servico) => (
                    <tr key={servico.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-xs">{servico.nome}</td>
                      <td className="py-2 px-3 text-xs">
                        <Badge variant="outline" className="text-[10px]">{servico.porte}</Badge>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                          {formatCurrency(servico.valor)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(servico)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(servico.id)} className="h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Servicos;

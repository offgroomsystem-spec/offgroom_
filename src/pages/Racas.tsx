import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Raca {
  id: string;
  nome: string;
  porte: string;
  isPadrao?: boolean;
}

const Racas = () => {
  const { user, ownerId } = useAuth();
  const [racas, setRacas] = useState<Raca[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch racas from Supabase (both standard and custom)
  const fetchRacas = async () => {
    if (!user) {
      console.warn('⚠️ User not authenticated');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🔄 Fetching breeds...', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      // Fetch standard breeds (global)
      const { data: racasPadrao, error: errorPadrao } = await supabase
        .from('racas_padrao')
        .select('*')
        .order('porte', { ascending: true })
        .order('nome', { ascending: true });
      
      // Fetch custom breeds (user-specific)
      const { data: racasCustom, error: errorCustom } = await supabase
        .from('racas')
        .select('*')
        .eq('user_id', ownerId)
        .order('porte', { ascending: true })
        .order('nome', { ascending: true });
        
      if (errorPadrao || errorCustom) {
        console.error('❌ Error fetching breeds:', {
          errorPadrao,
          errorCustom,
          user: user?.id,
          timestamp: new Date().toISOString()
        });
        toast.error('Erro ao carregar raças. Verifique sua conexão.');
      } else {
        console.log('✅ Dados brutos recebidos:', {
          racasPadrao: racasPadrao?.length || 0,
          racasCustom: racasCustom?.length || 0,
          primeirasRacasPadrao: racasPadrao?.slice(0, 3),
          primeirasRacasCustom: racasCustom?.slice(0, 3)
        });
        
        // Map standard breeds with fallbacks
        const mappedPadrao = (racasPadrao || []).map(r => {
          console.log('📋 Raça padrão:', { id: r.id, nome: r.nome, porte: r.porte });
          return {
            id: r.id,
            nome: r.nome || 'Sem nome',
            porte: r.porte || 'pequeno',
            isPadrao: true
          };
        });
        
        // Map custom breeds with fallbacks
        const mappedCustom = (racasCustom || []).map(r => {
          console.log('📝 Raça customizada:', { id: r.id, nome: r.nome, porte: r.porte });
          return {
            id: r.id,
            nome: r.nome || 'Sem nome',
            porte: r.porte || 'pequeno',
            isPadrao: false
          };
        });
        
        console.log(`✅ Raças mapeadas: ${mappedPadrao.length} padrão + ${mappedCustom.length} customizadas`);
        
        // Combine and sort: standard breeds first, then custom
        const allRacas = [...mappedPadrao, ...mappedCustom].sort((a, b) => {
          // Sort by porte first
          const porteOrder = { pequeno: 1, medio: 2, grande: 3 };
          const porteDiff = porteOrder[a.porte as keyof typeof porteOrder] - porteOrder[b.porte as keyof typeof porteOrder];
          if (porteDiff !== 0) return porteDiff;
          
          // Then by isPadrao (standard first)
          if (a.isPadrao !== b.isPadrao) return a.isPadrao ? -1 : 1;
          
          // Finally by name
          return a.nome.localeCompare(b.nome);
        });
        
        console.log('🎯 Total de raças após ordenação:', allRacas.length);
        setRacas(allRacas);
      }
    } catch (error) {
      console.error('💥 Unexpected error:', error);
      toast.error('Erro inesperado ao carregar raças');
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRacas([]);
    fetchRacas();
  };

  useEffect(() => {
    fetchRacas();
  }, [user]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRaca, setEditingRaca] = useState<Raca | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [porteFilter, setPorteFilter] = useState<string>("todos");

  const [formData, setFormData] = useState({
    nome: "",
    porte: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    // Validação obrigatória
    if (!formData.nome.trim()) {
      toast.error("Nome da raça é obrigatório");
      return;
    }
    
    if (!formData.porte) {
      toast.error("Porte é obrigatório");
      return;
    }
    
    if (editingRaca) {
      const { error } = await supabase
        .from('racas')
        .update({
          nome: formData.nome,
          porte: formData.porte
        })
        .eq('id', editingRaca.id)
        .eq('user_id', ownerId);
        
      if (error) {
        toast.error("Erro ao atualizar raça");
        console.error(error);
        return;
      }
      
      setRacas(racas.map(r => 
        r.id === editingRaca.id ? { ...formData, id: editingRaca.id } : r
      ));
      toast.success("Raça atualizada com sucesso!");
    } else {
      const { data, error } = await supabase
        .from('racas')
        .insert([{
          user_id: ownerId,
          nome: formData.nome,
          porte: formData.porte
        }])
        .select()
        .single();
        
      if (error) {
        toast.error("Erro ao cadastrar raça");
        console.error(error);
        return;
      }
      
      if (data) {
        setRacas([...racas, { id: data.id, nome: data.nome, porte: formData.porte }]);
      }
      toast.success("Raça cadastrada com sucesso!");
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: "", porte: "" });
    setEditingRaca(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (raca: Raca) => {
    if (raca.isPadrao) {
      toast.error('Raças padrão não podem ser editadas');
      return;
    }
    setEditingRaca(raca);
    setFormData(raca);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    const racaToDelete = racas.find(r => r.id === id);
    if (racaToDelete?.isPadrao) {
      toast.error('Raças padrão não podem ser removidas');
      return;
    }
    
    const { error } = await supabase
      .from('racas')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);
      
    if (error) {
      toast.error("Erro ao remover raça");
      console.error(error);
      return;
    }
    
    setRacas(racas.filter(r => r.id !== id));
    toast.success("Raça removida com sucesso!");
  };

  const filteredRacas = racas.filter(raca => {
    const matchesSearch = raca.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPorte = porteFilter === "todos" || raca.porte === porteFilter;
    return matchesSearch && matchesPorte;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Raças de Pets</h1>
          <p className="text-muted-foreground text-xs">
            Total: {racas.length} raças 
            ({racas.filter(r => r.isPadrao).length} padrão, {racas.filter(r => !r.isPadrao).length} customizadas)
            {loading && " - Carregando..."}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={forceRefresh} disabled={loading} className="gap-2 h-8 text-xs">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Nova Raça
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg">{editingRaca ? "Editar Raça" : "Nova Raça"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados da raça
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nome" className="text-xs">Nome da Raça</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="porte" className="text-xs">Porte</Label>
                <Select value={formData.porte} onValueChange={(value) => setFormData({ ...formData, porte: value })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno" className="text-xs">Pequeno</SelectItem>
                    <SelectItem value="medio" className="text-xs">Médio</SelectItem>
                    <SelectItem value="grande" className="text-xs">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingRaca ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center gap-2">
            <div>
              <CardTitle className="text-base">Lista de Raças</CardTitle>
              <CardDescription className="text-xs">
                Total: {racas.length} raças ({racas.filter(r => r.isPadrao).length} padrão, {racas.filter(r => !r.isPadrao).length} customizadas)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={porteFilter} onValueChange={setPorteFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Filtrar por porte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todos os portes</SelectItem>
                  <SelectItem value="pequeno" className="text-xs">Pequeno</SelectItem>
                  <SelectItem value="medio" className="text-xs">Médio</SelectItem>
                  <SelectItem value="grande" className="text-xs">Grande</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar raça..."
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
                  <th className="text-left py-2 px-3 font-semibold text-xs">Raça</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Porte</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Tipo</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRacas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhuma raça encontrada
                    </td>
                  </tr>
                ) : (
                  filteredRacas.map((raca) => (
                    <tr key={raca.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-xs">{raca.nome}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                          {raca.porte === 'medio' ? 'Médio' : 
                           raca.porte === 'pequeno' ? 'Pequeno' : 
                           raca.porte === 'grande' ? 'Grande' : 
                           'Não definido'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {raca.isPadrao ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Padrão
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                            Customizada
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEdit(raca)} 
                            className="h-7 w-7 p-0"
                            disabled={raca.isPadrao}
                            title={raca.isPadrao ? "Raças padrão não podem ser editadas" : "Editar raça"}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(raca.id)} 
                            className="h-7 w-7 p-0"
                            disabled={raca.isPadrao}
                            title={raca.isPadrao ? "Raças padrão não podem ser removidas" : "Remover raça"}
                          >
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

export default Racas;

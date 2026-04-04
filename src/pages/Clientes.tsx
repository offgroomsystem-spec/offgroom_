import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Trash2, Edit, PawPrint, X, Check, ChevronsUpDown, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatCPFCNPJ } from "@/utils/fiscalUtils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface Raca {
  id: string;
  nome: string;
  porte: string;
  isPadrao?: boolean;
}

interface Pet {
  id?: string;
  nome_pet: string;
  porte: string;
  raca: string;
  sexo: string;
  observacao: string;
  whatsapp_ativo?: boolean;
}

interface Cliente {
  id: string;
  nome_cliente: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
  pets: Pet[];
  // Campos fiscais
  cpf_cnpj?: string;
  email?: string;
  whatsapp_ativo?: boolean;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [racas, setRacas] = useState<Raca[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, ownerId } = useAuth();

  // Form state
  const [nomeCliente, setNomeCliente] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacaoCliente, setObservacaoCliente] = useState("");
  const [pets, setPets] = useState<Pet[]>([{ nome_pet: "", porte: "", raca: "", sexo: "", observacao: "", whatsapp_ativo: true }]);
  const [racaPopoverOpen, setRacaPopoverOpen] = useState<{ [key: number]: boolean }>({});
  // Campos fiscais
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [whatsappAtivo, setWhatsappAtivo] = useState(true);

  // ✅ Formata nomes automaticamente, respeitando espaços durante a digitação
  const formatarNome = (texto: string) => {
    // Mantém os espaços enquanto digita e formata cada palavra dinamicamente
    return texto
      .split(" ")
      .map((palavra) => {
        if (palavra.length === 0) return "";
        const primeiraLetra = palavra.charAt(0).toUpperCase();
        const resto = palavra.slice(1).toLowerCase();
        return primeiraLetra + resto;
      })
      .join(" ");
  };

  useEffect(() => {
    if (user) {
      fetchClientes();
      fetchRacas();
    }
  }, [user]);

  const fetchRacas = async () => {
    if (!user) return;

    const { data: racasPadrao } = await supabase.from("racas_padrao").select("*").order("nome", { ascending: true });

    const { data: racasCustom } = await supabase
      .from("racas")
      .select("*")
      .eq("user_id", ownerId)
      .order("nome", { ascending: true });

    const racasPadraoFormatted = racasPadrao?.map((r) => ({ ...r, isPadrao: true })) || [];
    const racasCustomFormatted = racasCustom?.map((r) => ({ ...r, isPadrao: false })) || [];

    setRacas([...racasPadraoFormatted, ...racasCustomFormatted]);
  };

  const fetchClientes = async () => {
    if (!user) return;

    // Buscar clientes
    const { data: clientesData, error: clientesError} = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", ownerId)
      .order("nome_cliente");

    if (clientesError) {
      toast.error("Erro ao carregar clientes");
      return;
    }

    // Buscar todos os pets de uma vez
    const { data: petsData, error: petsError } = await supabase
      .from("pets")
      .select("*")
      .eq("user_id", ownerId)
      .order("nome_pet");

    if (petsError) {
      toast.error("Erro ao carregar pets");
      return;
    }

    // Agrupar pets por cliente
    const clientesComPets = clientesData.map((cliente) => ({
      ...cliente,
      pets: petsData.filter((pet) => pet.cliente_id === cliente.id),
    }));

    setClientes(clientesComPets);
  };

  const resetForm = () => {
    setNomeCliente("");
    setWhatsapp("");
    setEndereco("");
    setObservacaoCliente("");
    setPets([{ nome_pet: "", porte: "", raca: "", sexo: "", observacao: "", whatsapp_ativo: true }]);
    setEditingId(null);
    setRacaPopoverOpen({});
    setCpfCnpj("");
    setEmailCliente("");
    setWhatsappAtivo(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setNomeCliente(cliente.nome_cliente);
    setWhatsapp((cliente.whatsapp || "").replace(/\D/g, "").slice(0, 11));
    setEndereco(cliente.endereco || "");
    setObservacaoCliente(cliente.observacao || "");
    setPets(cliente.pets.length > 0 ? cliente.pets.map(p => ({ ...p, sexo: p.sexo || "", whatsapp_ativo: p.whatsapp_ativo !== false })) : [{ nome_pet: "", porte: "", raca: "", sexo: "", observacao: "", whatsapp_ativo: true }]);
    setCpfCnpj(cliente.cpf_cnpj || "");
    setEmailCliente(cliente.email || "");
    setWhatsappAtivo(cliente.whatsapp_ativo !== false);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este cliente? Todos os pets associados também serão deletados."))
      return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao deletar cliente");
    } else {
      toast.success("Cliente deletado com sucesso");
      fetchClientes();
    }
  };

  const sanitizeWhatsapp = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const isWhatsappValid = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validação
    if (!nomeCliente.trim() || !whatsapp.trim()) {
      toast.error("Nome do cliente e WhatsApp são obrigatórios");
      return;
    }

    const whatsappSanitized = sanitizeWhatsapp(whatsapp);
    if (whatsappSanitized.length !== 11) {
      toast.error("O número de WhatsApp deve conter exatamente 11 dígitos numéricos (DDD + 9 + número), sem espaços ou caracteres especiais.");
      return;
    }

    if (pets.length === 0) {
      toast.error("Adicione pelo menos um pet");
      return;
    }

    for (let i = 0; i < pets.length; i++) {
      const pet = pets[i];
      if (!pet.nome_pet.trim() || !pet.porte || !pet.raca || !pet.sexo) {
        toast.error(`Preencha todos os campos obrigatórios do Pet ${i + 1}`);
        return;
      }
    }

    try {
      if (editingId) {
        // UPDATE Cliente
        const { error: clienteError } = await supabase
          .from("clientes")
          .update({
            nome_cliente: nomeCliente,
            whatsapp: whatsappSanitized,
            endereco,
            observacao: observacaoCliente,
            cpf_cnpj: cpfCnpj || null,
            email: emailCliente || null,
            whatsapp_ativo: whatsappAtivo,
          } as any)
          .eq("id", editingId);

        if (clienteError) throw clienteError;

        // === SYNC WhatsApp: atualizar agendamentos futuros e mensagens pendentes ===
        const hoje = new Date().toISOString().split("T")[0];
        
        // Atualizar agendamentos futuros vinculados a esse cliente
        const { error: syncAgError } = await supabase
          .from("agendamentos")
          .update({ whatsapp: whatsappSanitized } as any)
          .eq("cliente_id", editingId)
          .gte("data", hoje);
        if (syncAgError) console.error("Erro ao sincronizar WhatsApp nos agendamentos:", syncAgError);
        
        // Atualizar agendamentos_pacotes vinculados (por nome do cliente + user_id)
        const { data: clienteAtual } = await supabase.from("clientes").select("nome_cliente").eq("id", editingId).single();
        if (clienteAtual) {
          const { error: syncPacoteError } = await supabase
            .from("agendamentos_pacotes")
            .update({ whatsapp: whatsappSanitized } as any)
            .eq("user_id", ownerId)
            .eq("nome_cliente", clienteAtual.nome_cliente);
          if (syncPacoteError) console.error("Erro ao sincronizar WhatsApp nos pacotes:", syncPacoteError);
        }
        
        // Atualizar mensagens WhatsApp pendentes vinculadas a agendamentos desse cliente
        let numeroFormatado = whatsappSanitized.replace(/\D/g, "");
        if (!numeroFormatado.startsWith("55")) numeroFormatado = "55" + numeroFormatado;
        
        // Buscar IDs dos agendamentos do cliente
        const { data: agendamentosCliente } = await supabase
          .from("agendamentos")
          .select("id")
          .eq("cliente_id", editingId)
          .gte("data", hoje);
        
        if (agendamentosCliente && agendamentosCliente.length > 0) {
          const agIds = agendamentosCliente.map(a => a.id);
          const { error: syncMsgError } = await supabase
            .from("whatsapp_mensagens_agendadas" as any)
            .update({ numero_whatsapp: numeroFormatado })
            .in("agendamento_id", agIds)
            .eq("status", "pendente");
          if (syncMsgError) console.error("Erro ao sincronizar WhatsApp nas mensagens:", syncMsgError);
        }
        
        console.log(`[SYNC] WhatsApp sincronizado para cliente ${editingId}: ${whatsappSanitized}`);

        // Buscar pets existentes
        const { data: petsExistentes } = await supabase.from("pets").select("id").eq("cliente_id", editingId);

        const idsExistentes = petsExistentes?.map((p) => p.id) || [];
        const idsNoFormulario = pets.filter((p) => p.id).map((p) => p.id);

        // Deletar pets removidos
        const idsParaDeletar = idsExistentes.filter((id) => !idsNoFormulario.includes(id));
        if (idsParaDeletar.length > 0) {
          await supabase.from("pets").delete().in("id", idsParaDeletar);
        }

        // Atualizar e inserir pets
        for (const pet of pets) {
          if (pet.id) {
            // UPDATE pet existente
            await supabase
              .from("pets")
              .update({
                nome_pet: pet.nome_pet,
                porte: pet.porte,
                raca: pet.raca,
                sexo: pet.sexo || null,
                observacao: pet.observacao || "",
                whatsapp_ativo: pet.whatsapp_ativo !== false,
              } as any)
              .eq("id", pet.id);
          } else {
            // INSERT novo pet
            await supabase.from("pets").insert({
              user_id: ownerId,
              cliente_id: editingId,
              nome_pet: pet.nome_pet,
              porte: pet.porte,
              raca: pet.raca,
              sexo: pet.sexo || null,
              observacao: pet.observacao || "",
              whatsapp_ativo: pet.whatsapp_ativo !== false,
            } as any);
          }
        }

        toast.success("Cliente atualizado com sucesso");
      } else {
        // INSERT Cliente
        const { data: novoCliente, error: clienteError } = await supabase
          .from("clientes")
          .insert({
            user_id: ownerId,
            nome_cliente: nomeCliente,
            whatsapp: whatsappSanitized,
            endereco,
            observacao: observacaoCliente,
            cpf_cnpj: cpfCnpj || null,
            email: emailCliente || null,
            whatsapp_ativo: whatsappAtivo,
          } as any)
          .select()
          .single();

        if (clienteError) throw clienteError;

        // INSERT Pets
        const petsParaInserir = pets.map((pet) => ({
          user_id: ownerId,
          cliente_id: novoCliente.id,
          nome_pet: pet.nome_pet,
          porte: pet.porte,
          raca: pet.raca,
          sexo: pet.sexo || null,
          observacao: pet.observacao || "",
          whatsapp_ativo: pet.whatsapp_ativo !== false,
        }));

        const { error: petsError } = await supabase.from("pets").insert(petsParaInserir);

        if (petsError) throw petsError;

        toast.success("Cliente cadastrado com sucesso");
      }

      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const addPet = () => {
    setPets([...pets, { nome_pet: "", porte: "", raca: "", sexo: "", observacao: "", whatsapp_ativo: whatsappAtivo }]);
  };

  const removePet = (index: number) => {
    if (pets.length === 1) {
      toast.error("É necessário ter pelo menos um pet");
      return;
    }
    setPets(pets.filter((_, i) => i !== index));
  };

  const updatePet = (index: number, field: keyof Pet, value: string | boolean) => {
    const newPets = [...pets];
    newPets[index] = { ...newPets[index], [field]: value };
    setPets(newPets);
  };

  const filteredClientes = clientes.filter(
    (cliente) =>
      cliente.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.whatsapp.includes(searchTerm) ||
      cliente.pets.some((pet) => pet.nome_pet.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const [ordenarCpf, setOrdenarCpf] = useState(false);

  const sortedClientes = ordenarCpf
    ? [...filteredClientes].sort((a, b) => {
        const numA = a.cpf_cnpj ? a.cpf_cnpj.replace(/\D/g, '') : '';
        const numB = b.cpf_cnpj ? b.cpf_cnpj.replace(/\D/g, '') : '';
        if (!numA && !numB) return 0;
        if (!numA) return 1;
        if (!numB) return -1;
        return numA.localeCompare(numB, undefined, { numeric: true });
      })
    : filteredClientes;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Clientes e Pets</CardTitle>
              <CardDescription>Gerencie seus clientes e seus pets</CardDescription>
            </div>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Dados do Cliente */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">📝 Dados do Cliente</h3>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="whatsapp_ativo" className="text-sm font-medium cursor-pointer">
                          WhatsApp Automático
                        </Label>
                        <Switch
                          id="whatsapp_ativo"
                          checked={whatsappAtivo}
                          onCheckedChange={(checked) => {
                            setWhatsappAtivo(checked);
                            if (!checked) {
                              // Desativar todos os pets
                              setPets(prev => prev.map(p => ({ ...p, whatsapp_ativo: false })));
                            } else {
                              // Ativar todos os pets
                              setPets(prev => prev.map(p => ({ ...p, whatsapp_ativo: true })));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome_cliente">Nome do Cliente *</Label>
                        <Input
                          id="nome_cliente"
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(formatarNome(e.target.value))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp *</Label>
                        <Input
                          id="whatsapp"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          placeholder="61981468122"
                          maxLength={11}
                          inputMode="numeric"
                          required
                          className={cn(
                            whatsapp.length > 0 && whatsapp.length !== 11 && "border-destructive focus-visible:ring-destructive",
                            whatsapp.length === 11 && "border-green-500 focus-visible:ring-green-500"
                          )}
                        />
                        {whatsapp.length > 0 && whatsapp.length !== 11 && (
                          <p className="text-xs text-destructive">{whatsapp.length}/11 dígitos</p>
                        )}
                        {whatsapp.length === 11 && (
                          <p className="text-xs text-green-600">✅ Número válido</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="observacao_cliente">Observação</Label>
                      <Textarea
                        id="observacao_cliente"
                        value={observacaoCliente}
                        onChange={(e) => setObservacaoCliente(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Campos Fiscais */}
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Dados Fiscais (Opcional)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                          <Input
                            id="cpf_cnpj"
                            value={cpfCnpj}
                            onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
                            placeholder="Somente números"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email_cliente">Email</Label>
                          <Input
                            id="email_cliente"
                            type="email"
                            value={emailCliente}
                            onChange={(e) => setEmailCliente(e.target.value)}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Pets do Cliente */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">🐾 Pets do Cliente</h3>
                      <Button type="button" onClick={addPet} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Pet
                      </Button>
                    </div>

                    {pets.map((pet, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              <PawPrint className="h-4 w-4" />
                              Pet #{index + 1}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`pet_whatsapp_${index}`} className="text-xs font-medium cursor-pointer">
                                WhatsApp
                              </Label>
                              <Switch
                                id={`pet_whatsapp_${index}`}
                                checked={pet.whatsapp_ativo !== false}
                                onCheckedChange={(checked) => {
                                  const newPets = [...pets];
                                  newPets[index] = { ...newPets[index], whatsapp_ativo: checked };
                                  setPets(newPets);
                                  
                                  if (!checked) {
                                    // Se todos os pets ficarem desativados, desativar cliente
                                    const allDisabled = newPets.every(p => p.whatsapp_ativo === false);
                                    if (allDisabled) {
                                      setWhatsappAtivo(false);
                                    }
                                    // Se tem apenas 1 pet e desativou, desativar cliente
                                    if (newPets.length === 1) {
                                      setWhatsappAtivo(false);
                                    }
                                  } else {
                                    // Se pelo menos 1 pet ativo, ativar cliente
                                    setWhatsappAtivo(true);
                                  }
                                }}
                              />
                              {pets.length > 1 && (
                                <Button type="button" onClick={() => removePet(index)} variant="ghost" size="sm">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Nome do Pet *</Label>
                              <Input
                                value={pet.nome_pet}
                                onChange={(e) => updatePet(index, "nome_pet", formatarNome(e.target.value))}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Porte *</Label>
                              <Select value={pet.porte} onValueChange={(value) => updatePet(index, "porte", value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o porte" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pequeno">Pequeno</SelectItem>
                                  <SelectItem value="medio">Médio</SelectItem>
                                  <SelectItem value="grande">Grande</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Sexo *</Label>
                              <Select value={pet.sexo} onValueChange={(value) => updatePet(index, "sexo", value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o sexo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Macho">Macho</SelectItem>
                                  <SelectItem value="Fêmea">Fêmea</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Raça *</Label>
                            <Popover open={racaPopoverOpen[index]} onOpenChange={(open) => setRacaPopoverOpen({ ...racaPopoverOpen, [index]: open })}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={racaPopoverOpen[index]}
                                  className="w-full justify-between h-8 text-xs"
                                >
                                  {pet.raca || "Selecione a raça"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar raça..." className="h-9" />
                                  <CommandList>
                                    <CommandEmpty>Nenhuma raça encontrada.</CommandEmpty>
                                    <CommandGroup>
                                      {racas
                                        .filter((raca) => !pet.porte || raca.porte === pet.porte)
                                        .map((raca) => (
                                          <CommandItem
                                            key={raca.id}
                                            value={raca.nome}
                                            onSelect={() => {
                                              updatePet(index, "raca", raca.nome);
                                              setRacaPopoverOpen({ ...racaPopoverOpen, [index]: false });
                                            }}
                                          >
                                            {raca.nome} {raca.isPadrao ? "" : "(Personalizada)"}
                                            <Check
                                              className={cn(
                                                "ml-auto h-4 w-4",
                                                pet.raca === raca.nome ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label>Observação</Label>
                            <Textarea
                              value={pet.observacao}
                              onChange={(e) => updatePet(index, "observacao", e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">{editingId ? "Atualizar" : "Cadastrar"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, pet ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Pets</th>
                      <th className="text-left p-3 font-medium">WhatsApp</th>
                      <th className="text-left p-3 font-medium">Endereço</th>
                      <th className="text-left p-3 font-medium">
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => setOrdenarCpf(prev => !prev)}
                        >
                          CPF/CNPJ
                          <ArrowUpDown className={cn("h-3.5 w-3.5", ordenarCpf ? "text-primary" : "text-muted-foreground")} />
                        </button>
                      </th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedClientes.map((cliente) => (
                      <tr key={cliente.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{cliente.nome_cliente}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {cliente.pets.map((pet, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                <PawPrint className="h-3 w-3" />
                                {pet.nome_pet}
                                <span className="text-muted-foreground">
                                  ({pet.porte === "pequeno" ? "P" : pet.porte === "medio" ? "M" : "G"})
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">{cliente.whatsapp}</td>
                        <td className="p-3 text-sm text-muted-foreground">{cliente.endereco || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {cliente.cpf_cnpj ? formatCPFCNPJ(cliente.cpf_cnpj) : "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(cliente)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(cliente.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClientes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

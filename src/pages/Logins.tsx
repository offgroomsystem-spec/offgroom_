import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { StaffAccount, TipoLogin } from "@/types/permissions";
import { format } from "date-fns";

export default function Logins() {
  const { user, isAdministrador } = useAuth();
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    tipo_login: "recepcionista" as TipoLogin,
    ativo: true,
  });

  useEffect(() => {
    if (isAdministrador) {
      loadStaffAccounts();
    }
  }, [isAdministrador]);

  const loadStaffAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_accounts")
        .select("*")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaffAccounts(data || []);
    } catch (error) {
      console.error("Erro ao carregar logins:", error);
      toast.error("Erro ao carregar logins");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (staff?: StaffAccount) => {
    if (staff) {
      setSelectedStaff(staff);
      setFormData({
        nome: staff.nome,
        email: staff.email,
        senha: "",
        tipo_login: staff.tipo_login,
        ativo: staff.ativo,
      });
    } else {
      setSelectedStaff(null);
      setFormData({
        nome: "",
        email: "",
        senha: "",
        tipo_login: "recepcionista",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!formData.nome || !formData.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!selectedStaff && !formData.senha) {
      toast.error("A senha é obrigatória para novos logins");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const action = selectedStaff ? "update" : "create";
      const body = selectedStaff
        ? {
            user_id: selectedStaff.user_id,
            email: formData.email,
            password: formData.senha || null,
            nome: formData.nome,
            tipo_login: formData.tipo_login,
            ativo: formData.ativo,
          }
        : {
            email: formData.email,
            password: formData.senha,
            nome: formData.nome,
            tipo_login: formData.tipo_login,
            ativo: formData.ativo,
            owner_id: user?.id,
          };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff-user?action=${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        // Melhorar mensagem de erro quando email já existe
        if (result.error && result.error.includes("already been registered")) {
          throw new Error("Este email já está cadastrado no sistema. Use outro email.");
        }
        throw new Error(result.error || "Erro ao salvar login");
      }

      toast.success(selectedStaff ? "Login atualizado com sucesso" : "Login criado com sucesso");
      setDialogOpen(false);
      loadStaffAccounts();
    } catch (error: any) {
      console.error("Erro ao salvar login:", error);
      toast.error(error.message || "Erro ao salvar login");
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff-user?action=delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: selectedStaff.user_id }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Erro ao excluir login");
      }

      toast.success("Login excluído com sucesso");
      setDeleteDialogOpen(false);
      setSelectedStaff(null);
      loadStaffAccounts();
    } catch (error: any) {
      console.error("Erro ao excluir login:", error);
      toast.error(error.message || "Erro ao excluir login");
    }
  };

  if (!isAdministrador) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">
          Apenas administradores podem acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Logins.</h1>
            <p className="text-muted-foreground">
              Controle os usuários e suas permissões de acesso
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Login
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Tipo de Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum login cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                staffAccounts.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.nome}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {staff.tipo_login === "administrador" && "Administrador"}
                        {staff.tipo_login === "taxi_dog" && "Taxi Dog"}
                        {staff.tipo_login === "recepcionista" && "Recepcionista"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={staff.ativo ? "default" : "secondary"}>
                        {staff.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {staff.ultimo_acesso
                        ? format(new Date(staff.ultimo_acesso), "dd/MM/yyyy HH:mm")
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(staff)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog para Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedStaff ? "Editar Login" : "Novo Login"}
            </DialogTitle>
            <DialogDescription>
              {selectedStaff
                ? "Atualize as informações do login"
                : "Crie um novo login para sua equipe"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@exemplo.com"
                disabled={!!selectedStaff}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">
                Senha {!selectedStaff && "*"}
                {selectedStaff && " (deixe em branco para manter)"}
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  value={formData.senha}
                  onChange={(e) =>
                    setFormData({ ...formData, senha: e.target.value })
                  }
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_login">Tipo de Login *</Label>
              <Select
                value={formData.tipo_login}
                onValueChange={(value: TipoLogin) =>
                  setFormData({ ...formData, tipo_login: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="taxi_dog">Taxi Dog</SelectItem>
                  <SelectItem value="recepcionista">Recepcionista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Status</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formData.ativo ? "Ativo" : "Inativo"}
                </span>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStaff}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o login de{" "}
              <strong>{selectedStaff?.nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

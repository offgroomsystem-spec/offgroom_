import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, PawPrint, Calendar, TrendingUp, DollarSign, LogOut, Shield, AlertTriangle, Search, RefreshCw, ArrowUpDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const ADMIN_EMAIL = 'offgroom.system@gmail.com';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];

const AdminMaster = () => {
  const { user, loading, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [petFilters, setPetFilters] = useState({ nome: '', sexo: '', porte: '', raca: '' });
  const [petSortAsc, setPetSortAsc] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [bulkAction, setBulkAction] = useState<{ field: string; value: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [grantDaysDialog, setGrantDaysDialog] = useState<{ userId: string; nome: string } | null>(null);
  const [grantDays, setGrantDays] = useState('30');
  const [userSearch, setUserSearch] = useState('');

  const callAdmin = useCallback(async (action: string, params?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase.functions.invoke('admin-master', {
      body: { action, params },
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (error) { toast.error('Erro: ' + error.message); return null; }
    if (data?.error) { toast.error(data.error); return null; }
    return data;
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    const data = await callAdmin('dashboard');
    if (data) setDashboard(data);
    setLoadingData(false);
  }, [callAdmin]);

  const loadUsers = useCallback(async () => {
    const data = await callAdmin('list_users');
    if (data) setUsers(data.users || []);
  }, [callAdmin]);

  const loadPets = useCallback(async () => {
    const filters: any = {};
    if (petFilters.nome) filters.nome = petFilters.nome;
    if (petFilters.sexo) filters.sexo = petFilters.sexo;
    if (petFilters.porte) filters.porte = petFilters.porte;
    if (petFilters.raca) filters.raca = petFilters.raca;
    const data = await callAdmin('list_pets', { filters });
    if (data) setPets(data.pets || []);
  }, [callAdmin, petFilters]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL && !loading) {
      loadDashboard();
      loadUsers();
    }
  }, [user, loading]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/login" replace />;
  }

  const handleBulkUpdate = async () => {
    if (!bulkAction || selectedPets.length === 0) return;
    const data = await callAdmin('bulk_update_pets', {
      petIds: selectedPets,
      updates: { [bulkAction.field]: bulkAction.value }
    });
    if (data?.success) {
      toast.success(`${data.count} pets atualizados com sucesso!`);
      setSelectedPets([]);
      setBulkAction(null);
      setShowConfirm(false);
      loadPets();
    }
  };

  const handleGrantDays = async () => {
    if (!grantDaysDialog) return;
    const data = await callAdmin('grant_extra_days', {
      userId: grantDaysDialog.userId,
      days: parseInt(grantDays)
    });
    if (data?.success) {
      toast.success(`${grantDays} dias liberados para ${grantDaysDialog.nome}`);
      setGrantDaysDialog(null);
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.nome_completo?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email_hotmart?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const pieData = dashboard ? [
    { name: 'Pagos', value: dashboard.paidUsers },
    { name: 'Gratuitos', value: dashboard.freeUsers }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">OFFGROOM CONTROL CENTER</h1>
            <Badge variant="destructive" className="text-xs">MASTER ADMIN</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => { signOut(); }}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="users">👥 Usuários</TabsTrigger>
            <TabsTrigger value="pets">🐶 Pets</TabsTrigger>
            <TabsTrigger value="plans">💰 Planos</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
              <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loadingData}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingData ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </div>

            {dashboard && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Total Usuários</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Ativos (30d)</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.activeUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><PawPrint className="h-4 w-4" /> Total Pets</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalPets}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Calendar className="h-4 w-4" /> Agendamentos</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalAgendamentos}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="h-4 w-4" /> Pagos</div>
                    <p className="text-3xl font-bold mt-1 text-green-600">{dashboard.paidUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Gratuitos</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.freeUsers}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Novos (mês)</div>
                    <p className="text-3xl font-bold mt-1 text-primary">{dashboard.newUsersMonth}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Conversão</div>
                    <p className="text-3xl font-bold mt-1">{dashboard.totalUsers > 0 ? ((dashboard.paidUsers / dashboard.totalUsers) * 100).toFixed(1) : 0}%</p>
                  </CardContent></Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Crescimento de Usuários</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboard.growthData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Pagos vs Gratuitos</CardTitle></CardHeader>
                    <CardContent className="flex justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">🧠 Insights Inteligentes</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.totalUsers - dashboard.activeUsers > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>{dashboard.totalUsers - dashboard.activeUsers} usuários inativos há mais de 30 dias</span>
                      </div>
                    )}
                    {dashboard.freeUsers > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>{dashboard.freeUsers} usuários no plano gratuito — potencial de conversão</span>
                      </div>
                    )}
                    {dashboard.newUsersMonth > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-green-500" />
                        <span>{dashboard.newUsersMonth} novos cadastros este mês</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou e-mail..." className="pl-9" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers}><RefreshCw className="h-4 w-4 mr-1" /> Atualizar</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Logins</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome_completo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email_hotmart}</TableCell>
                        <TableCell>
                          <Badge variant={u.hasActivePlan ? 'default' : 'secondary'}>
                            {u.hasActivePlan ? u.subscription?.plan_name || 'Pago' : u.plano_ativo || 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell className="text-sm">{u.login_count}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => setGrantDaysDialog({ userId: u.id, nome: u.nome_completo })}>
                            Liberar dias
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PETS */}
          <TabsContent value="pets" className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Gestão de Pets</h2>
              <Button variant="outline" size="sm" onClick={loadPets}><Search className="h-4 w-4 mr-1" /> Buscar</Button>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Input placeholder="Nome do pet" value={petFilters.nome} onChange={e => setPetFilters(p => ({ ...p, nome: e.target.value }))} />
                  <Select value={petFilters.sexo} onValueChange={v => setPetFilters(p => ({ ...p, sexo: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                      <SelectItem value="sem_sexo">Sem Sexo Definido</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={petFilters.porte} onValueChange={v => setPetFilters(p => ({ ...p, porte: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Porte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pequeno">Pequeno</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Raça" value={petFilters.raca} onChange={e => setPetFilters(p => ({ ...p, raca: e.target.value }))} />
                  <Button variant="secondary" onClick={() => { setPetFilters({ nome: '', sexo: '', porte: '', raca: '' }); setPets([]); }}>Limpar</Button>
                </div>
              </CardContent>
            </Card>

            {selectedPets.length > 0 && (
              <Card className="border-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Badge>{selectedPets.length} selecionados</Badge>
                    <Select onValueChange={v => setBulkAction({ field: 'sexo', value: v })}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Alterar sexo para..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Fêmea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select onValueChange={v => setBulkAction({ field: 'porte', value: v })}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Alterar porte para..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pequeno">Pequeno</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="grande">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    {bulkAction && (
                      <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
                        Aplicar alteração
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {pets.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedPets.length === pets.length && pets.length > 0}
                            onCheckedChange={c => setSelectedPets(c ? pets.map(p => p.id) : [])}
                          />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            Nome
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPetSortAsc(prev => !prev)}>
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableHead>
                        <TableHead>Raça</TableHead>
                        <TableHead>Porte</TableHead>
                        <TableHead>Sexo</TableHead>
                        <TableHead>Tutor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...pets].sort((a, b) => petSortAsc ? (a.nome_pet || '').localeCompare(b.nome_pet || '') : 0).map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPets.includes(p.id)}
                              onCheckedChange={c => setSelectedPets(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{p.nome_pet}</TableCell>
                          <TableCell>{p.raca}</TableCell>
                          <TableCell><Badge variant="outline">{p.porte}</Badge></TableCell>
                          <TableCell>{p.sexo || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.clientes?.nome_cliente || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PLANS */}
          <TabsContent value="plans" className="space-y-4">
            <h2 className="text-2xl font-bold">Gestão de Planos</h2>

            {dashboard && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Free</p>
                  <p className="text-3xl font-bold">{dashboard.freeUsers}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Pagos</p>
                  <p className="text-3xl font-bold text-green-600">{dashboard.paidUsers}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Conversão</p>
                  <p className="text-3xl font-bold">{dashboard.totalUsers > 0 ? ((dashboard.paidUsers / dashboard.totalUsers) * 100).toFixed(1) : 0}%</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{dashboard.totalUsers}</p>
                </CardContent></Card>
              </div>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm">Usuários com Liberação Manual Ativa</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Dias extras</TableHead>
                      <TableHead>Fim liberação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.liberacao_manual_ativa).map(u => (
                      <TableRow key={u.id}>
                        <TableCell>{u.nome_completo}</TableCell>
                        <TableCell>{u.email_hotmart}</TableCell>
                        <TableCell>{u.dias_liberacao_extra}</TableCell>
                        <TableCell>{u.data_fim_liberacao_extra ? new Date(u.data_fim_liberacao_extra).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {users.filter(u => u.liberacao_manual_ativa).length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirm bulk dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Confirmar alteração em massa</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Você está prestes a alterar <strong>{selectedPets.length}</strong> registros.</p>
          {bulkAction && <p className="text-sm">Campo: <strong>{bulkAction.field}</strong> → Novo valor: <strong>{bulkAction.value}</strong></p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkUpdate}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant days dialog */}
      <Dialog open={!!grantDaysDialog} onOpenChange={() => setGrantDaysDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar dias extras</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Liberar acesso para: <strong>{grantDaysDialog?.nome}</strong></p>
          <Input type="number" value={grantDays} onChange={e => setGrantDays(e.target.value)} placeholder="Dias" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDaysDialog(null)}>Cancelar</Button>
            <Button onClick={handleGrantDays}>Liberar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMaster;

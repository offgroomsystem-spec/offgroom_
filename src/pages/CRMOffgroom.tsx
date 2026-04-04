import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CRMLayout from "@/components/crm/CRMLayout";
import FilterBar from "@/components/crm/FilterBar";
import ImportExcel from "@/components/crm/ImportExcel";
import LeadsList from "@/components/crm/LeadsList";
import CRMDashboard from "@/components/crm/CRMDashboard";
import CRMFilters, { CRMFiltersState } from "@/components/crm/CRMFilters";
import { useCRMLeads, useCRMAccess, getFaseLead, calcularProximoPasso, calcularStatus } from "@/hooks/useCRMLeads";
import { Loader2, ShieldX, LayoutList, LayoutDashboard, Copy, Download, Smartphone, Phone, PhoneOff, CheckSquare, MessageSquare, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
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


const CRMOffgroom = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("leads");
  const [advancedFilters, setAdvancedFilters] = useState<CRMFiltersState>({
    enviouMensagem: "",
    tentativa: "",
    teveResposta: "",
    agendouReuniao: "",
    usandoAcessoGratis: "",
    iniciouAcessoPago: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [phoneTypeFilter, setPhoneTypeFilter] = useState<"todos" | "celular" | "fixo" | "sem_contato">("todos");
  const [maxLeadsLimit, setMaxLeadsLimit] = useState<string>("");
  const [showBulkMessageDialog, setShowBulkMessageDialog] = useState(false);
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDDDs, setSelectedDDDs] = useState<string[]>([]);
  const PAGE_SIZE = 1000; // Leads por página
  
  const { leads, isLoading: leadsLoading } = useCRMLeads();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();

  // Verificar se há filtros ativos
  const hasActiveFilters = Object.values(advancedFilters).some(v => v !== "");

  // Função para classificar tipo de telefone
  const getPhoneType = (phone: string | null | undefined): "celular" | "fixo" | "sem_contato" => {
    // Sem contato
    if (!phone || phone.trim() === "") {
      return "sem_contato";
    }
    
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, "");
    
    // Celular: 11 dígitos, terceiro dígito é 9
    if (cleaned.length === 11 && cleaned.charAt(2) === "9") {
      return "celular";
    }
    
    // Fixo: 10 dígitos ou 11 dígitos sem 9 após DDD
    return "fixo";
  };

  // Mapa de mensagens por combinação de filtros
  // Estrutura da chave: {enviouMensagem}_{tentativa}_{teveResposta}_{agendouReuniao}_{usandoAcessoGratis}_{iniciouAcessoPago}
  const getMessageForFilters = (filters: CRMFiltersState): string => {
    const messages: Record<string, string> = {
      // =====================================================
      // FASE 0: Leads que NUNCA receberam mensagem (primeira prospecção)
      // =====================================================
      
      // Tentativa 0 - Nunca recebeu mensagem (lead novo, primeira abordagem)
      "nao_0_nao_nao_nao_nao": `Você saberia me dizer, agora, *quem são os clientes que vieram nos últimos 15 dias e não voltaram mais?* 🤔

Se você não tem essa resposta, o seu lucro pode estar indo direto para a concorrência.

Ter apenas um "bom serviço" não garante agenda cheia. Você precisa de *organização e inteligência* para garantir a recorrência.

O _Offgroom_ é um sistema de gestão para quem quer deixar de ser apenas um "prestador de serviços" e se tornar uma *empresa lucrativa* .

*Com o Offgroom você vai ter:* 

✅ Controle total da Agenda e dos Pacotes. 

✅ Confirmação de agendamento pelo WhatsApp

✅ Gestão Financeira completa

✅ Foco em Recorrência: saiba exatamente quem precisa voltar.

🎁 _PRESENTE EXCLUSIVO PARA VOCÊ:_

Eu confio tanto que o _Offgroom_ vai *organizar sua empresa e aumentar seu faturamento* , que liberei *30 DIAS DE ACESSO COMPLETO E GRATUITO.*

Sem pegadinhas. É entrar, usar, organizar e ver o resultado no bolso.

🚀 *Toque no link abaixo para ativar seus 30 dias grátis agora:* offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // =====================================================
      // FASE 1: Leads SEM resposta, SEM reunião, SEM acesso grátis, SEM acesso pago
      // (Enviou Mensagem: Sim obrigatório para estas chaves)
      // =====================================================

      // Tentativa 0 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_0_nao_nao_nao_nao": `Você saberia me dizer, agora, *quem são os clientes que vieram nos últimos 15 dias e não voltaram mais?* 🤔

Se você não tem essa resposta, o seu lucro pode estar indo direto para a concorrência.

Ter apenas um "bom serviço" não garante agenda cheia. Você precisa de *organização e inteligência* para garantir a recorrência.

O _Offgroom_ é um sistema de gestão para quem quer deixar de ser apenas um "prestador de serviços" e se tornar uma *empresa lucrativa* .

*Com o Offgroom você vai ter:* 

✅ Controle total da Agenda e dos Pacotes. 

✅ Confirmação de agendamento pelo WhatsApp

✅ Gestão Financeira completa

✅ Foco em Recorrência: saiba exatamente quem precisa voltar.

🎁 _PRESENTE EXCLUSIVO PARA VOCÊ:_

Eu confio tanto que o _Offgroom_ vai *organizar sua empresa e aumentar seu faturamento* , que liberei *30 DIAS DE ACESSO COMPLETO E GRATUITO.*

Sem pegadinhas. É entrar, usar, organizar e ver o resultado no bolso.

🚀 *Toque no link abaixo para ativar seus 30 dias grátis agora:* offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 1 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_1_nao_nao_nao_nao": `Você deve ter assistido ao vídeo e pensado: _"O sistema é ótimo, mas deve ser caro..."_ 💸

*Vou te surpreender* : o _Offgroom_ é muito mais barato do que você imagina.

Na verdade, a minha proposta é que ele saia *de graça* para você. Como assim? 🤔

É matemática simples: se as ferramentas de recorrência do Offgroom trouxerem de volta apenas 2 ou 3 clientes que sumiram da sua agenda, o sistema já se pagou sozinho.

Ou seja: você paga a mensalidade com o próprio resultado que o sistema gera, sem sentir no bolso, e ainda sobra lucro.

Não deixe o medo do custo impedir o crescimento da sua empresa.

🎁 *PROVE VOCÊ MESMO (SEM PAGAR NADA):* Liberei *30 DIAS DE ACESSO GRÁTIS.* Use as ferramentas, recupere clientes e veja o dinheiro entrar antes mesmo de pensar em pagar o sistema.

Toque no link e comece agora: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 2 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_2_nao_nao_nao_nao": `A falta de gestão afeta o dia a dia. Mas eu sei que cada Banho e Tosa tem sua própria rotina.

Por isso, mais do que "falar" sobre o sistema, eu quero te mostrar o Offgroom rodando na prática, dentro da realidade do seu negócio.

📅 Vamos agendar uma demonstração online?

Em uma conversa rápida de até 1 hora, eu vou:

Entender o que você mais precisa hoje (Agenda? Financeiro? Recorrência?).

Te mostrar na tela como o Offgroom resolve esses pontos.

Tirar todas as suas dúvidas sobre a ferramenta.

É sem compromisso. O objetivo é que você veja com seus próprios olhos se o sistema é para você.

*Me confirma qual seria o dia e horário ideal para você?*`,

      // Tentativa 3 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_3_nao_nao_nao_nao": `Seu concorrente já usa tecnologia para fidelizar os clientes dele... e você? 👀

Gerir um Banho e Tosa apenas no "caderno" ou na "memória" é pedir para perder dinheiro. Sem processos definidos, o cliente esquece de voltar.

Dê um basta na desorganização com o Offgroom. É a ferramenta completa para quem quer crescer de verdade: 

✅ Agendamentos rápidos e organizados. 

✅ Confirmação via Whatsapp _(adeus, faltas!)_ . 

✅ Controle financeiro na palma da mão.

🎁 *Liberei 30 DIAS DE ACESSO GRATUITO.*

Organize sua empresa e aumente seu lucro agora: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 4 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_4_nao_nao_nao_nao": `Quantos clientes te deixaram na mão essa semana porque esqueceram o horário? 😡

A falha não é do cliente, é do processo. Confiar na memória ou no caderninho de papel abre margem para erros e prejuízo.

O Offgroom funciona como seu "secretário virtual" para acabar com isso: 

✅ Ele confirma os agendamentos pelo WhatsApp para você. 

✅ Ele organiza a agenda para não encavalar horários. 

✅ Ele te avisa quando o pacote do cliente está acabando.

Chega de perder dinheiro por falha de comunicação.

🎁 *TESTE POR MINHA CONTA:* Quero que você tenha paz de espírito para trabalhar. *Liberei 30 DIAS DE ACESSO GRÁTIS* ao sistema completo.

Toque no link e comece a automatizar seu negócio: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // Tentativa 5 - Sem resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_5_nao_nao_nao_nao": `Você sente que trabalha muito, mas não vê a cor do dinheiro no final do mês? 💸

Como falei no vídeo: o segredo não é só lavar bem, é ter *RECORRÊNCIA* .

Pare de deixar dinheiro na mesa por falta de organização. O Offgroom chegou para centralizar sua gestão: 

📍 Agenda inteligente _(com confirmação no Zap)_ . 

📍 Financeiro que bate centavo por centavo. 

📍 Controle de quem deve voltar _(recupere clientes inativos!)_ .

💡 *OFERTA DE LANÇAMENTO:* Quer ver seu Pet Shop lucrar mais? Estou liberando *30 dias de acesso TOTALMENTE GRÁTIS* para você testar.

Comece a usar agora e sinta a diferença: 🚀 offgroom.com.br

👨🏻‍💻 *Caso precise, podemos agendar uma reunião online para apresentarmos o Offgroom?*`,

      // =====================================================
      // FASE 2: Leads que RESPONDERAM mas NÃO agendaram reunião
      // (Enviou Mensagem: Sim obrigatório para estas chaves)
      // =====================================================

      // Tentativa 0 - Com resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_0_sim_nao_nao_nao": `A falta de gestão afeta o dia a dia. Mas eu sei que cada Banho e Tosa tem sua própria rotina.

Por isso, mais do que "falar" sobre o sistema, eu quero te mostrar o Offgroom rodando na prática, dentro da realidade do seu negócio.

📅 *Vamos agendar uma demonstração online?*

Em uma conversa rápida de até 1 hora, eu vou:

Entender o que você mais precisa hoje (Agenda? Financeiro? Recorrência?).

Te mostrar na tela como o Offgroom resolve esses pontos.

Tirar todas as suas dúvidas sobre a ferramenta.

É sem compromisso. O objetivo é que você veja com seus próprios olhos se o sistema é para você.

*Me confirma qual seria o dia e horário ideal para você?*`,

      // Tentativa 1 - Com resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_1_sim_nao_nao_nao": `Olá! Tudo bem?

Criamos um sistema que centraliza Agenda, Financeiro e o principal: a Recorrência Automática dos seus clientes. É a tecnologia trabalhando para você faturar mais.

📅 Topa uma reunião online de 1 hora? Quero te mostrar na tela do computador como o Offgroom assume a parte chata da gestão para você focar no que importa.

Me diz um horário que fica bom para você?`,

      // Tentativa 2 - Com resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_2_sim_nao_nao_nao": `Você sabe exatamente quantos clientes deixaram de ir ao seu Pet Shop no último mês? 💸

A verdade é dura: *cliente que não volta é dinheiro que você perde.* E sem um sistema inteligente, é impossível controlar isso de cabeça.

O Offgroom não é apenas uma agenda digital. Ele é uma ferramenta de inteligência de vendas. Ele identifica quem sumiu, organiza o retorno e confirma agendamentos pelo WhatsApp.

Quero te apresentar essa "máquina de recorrência" em uma reunião rápida online.

Em uma horinha eu te mostro como blindar sua carteira de clientes e aumentar seu faturamento.

Vamos agendar? Tenho horários disponíveis para essa semana.`,

      // Tentativa 3 - Com resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_3_sim_nao_nao_nao": `Olá! Como estão as coisas por aí na correria do dia a dia?

Estou entrando em contato porque desenvolvemos uma solução chamada Offgroom, pensada especificamente para as dores reais de um Banho e Tosa: faltas de clientes, financeiro misturado e agenda confusa.

Mas eu sei que cada negócio tem sua particularidade. Por isso, não quero só te "mandar um link".

📅 Gostaria de te convidar para um diagnóstico online _(sem custo)_ .

Seria uma conversa de vídeo, de no máximo 1 hora, onde eu vou:

Ouvir seus maiores desafios hoje.

Te mostrar como o sistema resolve cada um deles na prática.

Sem compromisso de compra. É para você conhecer uma nova forma de gerir seu negócio.

O que acha? Podemos marcar?`,

      // Tentativa 4 - Com resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_4_sim_nao_nao_nao": `Chega de caderninho e planilhas que não batem! 🛑

Para crescer, seu Banho e Tosa precisa de processos profissionais. O Offgroom é o sistema completo que traz a organização das grandes franquias para dentro da sua loja.

✅ Confirmação via Whatsapp _(para acabar com os furos)_ . 

✅ Dashboards financeiros _(para ver o lucro real)_ . 

✅ Gestão de pacotes e serviços.

Quero te mostrar que é possível ter uma empresa 100% organizada e no controle.

Você tem 1 hora livre essa semana para eu te apresentar o sistema funcionando ao vivo? Prometo que vai valer cada minuto.

Aguardo seu retorno!`,

      // Tentativa 5 - Com resposta, sem reunião, sem acesso grátis, sem acesso pago
      "sim_5_sim_nao_nao_nao": `Olá! Tudo bem?

Estou te escrevendo porque tenho certeza que posso ajudar a aumentar o faturamento do seu Banho e Tosa através da organização.

Criei o Offgroom, um sistema que une gestão financeira e controle total de agenda com foco em recorrência. É a ferramenta completa que faltava para o seu negócio decolar.

Gostaria de agendar uma apresentação online rápida (max. 1 hora) para te mostrar a ferramenta por dentro.

Se fizer sentido para você, me avise qual o melhor turno (manhã ou tarde) que eu te passo as datas! 🚀`,

      // =====================================================
      // FASE 3: Leads que AGENDARAM REUNIÃO mas NÃO ativaram acesso grátis
      // (Enviou Mensagem: Sim obrigatório, aplica para Teve Resposta: SIM ou NÃO)
      // =====================================================

      // Tentativa 0 - Agendou reunião, sem acesso grátis, sem acesso pago
      "sim_0_sim_sim_nao_nao": `Olá! Tudo bem?

Fiquei pensando na nossa conversa sobre como a organização _(e a recorrência)_ podem mudar o jogo da sua empresa. 🛁

Percebi que você ainda não ativou seu acesso gratuito ao _Offgroom_ .

Lembre-se: a ferramenta só funciona se você der o primeiro passo. O sistema está pronto para começar a confirmar seus agendamentos e organizar seu financeiro.

Não deixe para depois o lucro que você pode começar a construir hoje.

*O link para seus 30 dias grátis continua válido:* 🚀 offgroom.com.br

Qualquer dificuldade no cadastro, me chama aqui que eu ajudo!`,

      "sim_0_nao_sim_nao_nao": `Olá! Tudo bem?

Fiquei pensando na nossa conversa sobre como a organização _(e a recorrência)_ podem mudar o jogo da sua empresa. 🛁

Percebi que você ainda não ativou seu acesso gratuito ao _Offgroom_ .

Lembre-se: a ferramenta só funciona se você der o primeiro passo. O sistema está pronto para começar a confirmar seus agendamentos e organizar seu financeiro.

Não deixe para depois o lucro que você pode começar a construir hoje.

*O link para seus 30 dias grátis continua válido:* 🚀 offgroom.com.br

Qualquer dificuldade no cadastro, me chama aqui que eu ajudo!`,

      // Tentativa 1 - Agendou reunião, sem acesso grátis, sem acesso pago
      "sim_1_sim_sim_nao_nao": `Olá! Tudo bem?

Imagino que a correria aí no Banho e Tosa esteja grande e você acabou não tendo tempo de ver isso, mas notei que seu cadastro no Offgroom ainda está pendente.

Estou passando só para não deixar essa oportunidade esfriar. A organização que conversamos na reunião está a um clique de distância. 🛁

Que tal tirar 5 minutinhos hoje para ativar e já deixar o sistema pronto para a semana?

Segue o link dos seus 30 dias gratuitos: 👉 offgroom.com.br

Se tiver qualquer dúvida na hora de entrar, é só me gritar aqui!`,

      "sim_1_nao_sim_nao_nao": `Olá! Tudo bem?

Imagino que a correria aí no Banho e Tosa esteja grande e você acabou não tendo tempo de ver isso, mas notei que seu cadastro no Offgroom ainda está pendente.

Estou passando só para não deixar essa oportunidade esfriar. A organização que conversamos na reunião está a um clique de distância. 🛁

Que tal tirar 5 minutinhos hoje para ativar e já deixar o sistema pronto para a semana?

Segue o link dos seus 30 dias gratuitos: 👉 offgroom.com.br

Se tiver qualquer dúvida na hora de entrar, é só me gritar aqui!`,

      // Tentativa 2 - Agendou reunião, sem acesso grátis, sem acesso pago
      "sim_2_sim_sim_nao_nao": `Opa! Tudo certo?

Estava revisando aqui e vi que você ainda não iniciou seu teste no Offgroom.

Queria te lembrar de um ponto importante da nossa conversa: todo dia sem gestão é um dia correndo riscos desnecessários (seja de faltas na agenda ou furo no caixa). 💸

A ferramenta para resolver isso já está liberada para você, de graça, por um mês. Não deixe para resolver o problema só quando ele apertar.

Ative agora e comece a organizar a casa: 🚀 offgroom.com.br

Qualquer coisa, estou à disposição!`,

      "sim_2_nao_sim_nao_nao": `Opa! Tudo certo?

Estava revisando aqui e vi que você ainda não iniciou seu teste no Offgroom.

Queria te lembrar de um ponto importante da nossa conversa: todo dia sem gestão é um dia correndo riscos desnecessários (seja de faltas na agenda ou furo no caixa). 💸

A ferramenta para resolver isso já está liberada para você, de graça, por um mês. Não deixe para resolver o problema só quando ele apertar.

Ative agora e comece a organizar a casa: 🚀 offgroom.com.br

Qualquer coisa, estou à disposição!`,

      // Tentativa 3 - Agendou reunião, sem acesso grátis, sem acesso pago
      "sim_3_sim_sim_nao_nao": `Oii! Tudo bem?

Fiquei pensando no potencial que a sua empresa tem para crescer esse ano. Mas, para virar esse jogo, a gente precisa sair do papel e ir para a ação. 🔥

O Offgroom é o motor que vai impulsionar essa mudança, mas eu preciso que você dê a partida.

Seu acesso completo e gratuito já está te esperando. Vamos fazer acontecer?

Clique abaixo e inicie sua transformação agora: 🚀 offgroom.com.br

Conto com você nessa jornada!`,

      "sim_3_nao_sim_nao_nao": `Oii! Tudo bem?

Fiquei pensando no potencial que a sua empresa tem para crescer esse ano. Mas, para virar esse jogo, a gente precisa sair do papel e ir para a ação. 🔥

O Offgroom é o motor que vai impulsionar essa mudança, mas eu preciso que você dê a partida.

Seu acesso completo e gratuito já está te esperando. Vamos fazer acontecer?

Clique abaixo e inicie sua transformação agora: 🚀 offgroom.com.br

Conto com você nessa jornada!`,

      // Tentativa 4 - Agendou reunião, sem acesso grátis, sem acesso pago
      "sim_4_sim_sim_nao_nao": `Olá! Tudo bom?

Notei aqui no sistema que seu período de teste de 30 dias ainda não foi ativado.

Aconteceu alguma coisa? 🤔

Às vezes pode parecer difícil começar um sistema novo, mas eu garanto: o Offgroom é muito intuitivo. Quero muito que você experimente a facilidade de ter a confirmação automática pelo WhatsApp rodando.

O link continua válido, tente acessar: 👉 offgroom.com.br

Se tiver tido qualquer dificuldade técnica, me avisa que eu resolvo agora pra você!`,

      "sim_4_nao_sim_nao_nao": `Olá! Tudo bom?

Notei aqui no sistema que seu período de teste de 30 dias ainda não foi ativado.

Aconteceu alguma coisa? 🤔

Às vezes pode parecer difícil começar um sistema novo, mas eu garanto: o Offgroom é muito intuitivo. Quero muito que você experimente a facilidade de ter a confirmação automática pelo WhatsApp rodando.

O link continua válido, tente acessar: 👉 offgroom.com.br

Se tiver tido qualquer dificuldade técnica, me avisa que eu resolvo agora pra você!`,

      // Tentativa 5 - Agendou reunião, sem acesso grátis, sem acesso pago
      "sim_5_sim_sim_nao_nao": `Olá, tudo bem?

Passando para lembrar que seu acesso gratuito de 30 dias ao Offgroom está aguardando ativação.

Conforme conversamos na reunião, o sistema é essencial para: ✅ Automatizar sua agenda. ✅ Controlar seu financeiro. ✅ Garantir a recorrência dos clientes.

Não perca o prazo do benefício. É só entrar e usar: 🔗 offgroom.com.br

Aguardo seu feedback sobre a ferramenta!`,

      "sim_5_nao_sim_nao_nao": `Olá, tudo bem?

Passando para lembrar que seu acesso gratuito de 30 dias ao Offgroom está aguardando ativação.

Conforme conversamos na reunião, o sistema é essencial para: ✅ Automatizar sua agenda. ✅ Controlar seu financeiro. ✅ Garantir a recorrência dos clientes.

Não perca o prazo do benefício. É só entrar e usar: 🔗 offgroom.com.br

Aguardo seu feedback sobre a ferramenta!`,

      // =====================================================
      // FASE 4: Leads USANDO ACESSO GRÁTIS (ainda não pagaram)
      // IMPORTANTE: Enviou Mensagem pode ser "Sim" OU "Não" (leads orgânicos)
      // =====================================================

      // Mensagem compartilhada para Tentativa 0 - Usando acesso grátis
      // Todas as 8 combinações de enviouMensagem x teveResposta x agendouReuniao
      "sim_0_sim_sim_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "sim_0_sim_nao_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "sim_0_nao_sim_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "sim_0_nao_nao_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "nao_0_sim_sim_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "nao_0_sim_nao_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "nao_0_nao_sim_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      "nao_0_nao_nao_sim_nao": `E aí! Tudo bem?

Vi que você já começou a mexer no Offgroom. 🚀

Passando só para saber se está tudo tranquilo por aí ou se surgiu alguma dúvida nesses primeiros passos? Se precisar de ajuda para configurar algo, é só chamar!`,

      // Tentativa 1 - Usando acesso grátis (8 combinações)
      "sim_1_sim_sim_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "sim_1_sim_nao_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "sim_1_nao_sim_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "sim_1_nao_nao_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "nao_1_sim_sim_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "nao_1_sim_nao_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "nao_1_nao_sim_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      "nao_1_nao_nao_sim_nao": `Olá! Tudo certo?

Como estão sendo os primeiros dias com o Offgroom? 🐾

Já conseguiu fazer os primeiros agendamentos ou lançamentos financeiros? Se tiver qualquer dificuldade ou dúvida em alguma tela, estou à disposição por aqui para te destravar, combinado?`,

      // Tentativa 2 - Usando acesso grátis (8 combinações)
      "sim_2_sim_sim_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "sim_2_sim_nao_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "sim_2_nao_sim_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "sim_2_nao_nao_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "nao_2_sim_sim_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "nao_2_sim_nao_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "nao_2_nao_sim_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      "nao_2_nao_nao_sim_nao": `Olá, tudo bem?

Estou acompanhando seu período de teste no Offgroom e gostaria de me colocar à disposição.

O sistema é bem intuitivo, mas se você tiver qualquer dúvida técnica ou estratégica sobre como usar melhor alguma ferramenta, pode me acionar aqui direto. Conte comigo! 👊`,

      // Tentativa 3 - Usando acesso grátis (8 combinações)
      "sim_3_sim_sim_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "sim_3_sim_nao_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "sim_3_nao_sim_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "sim_3_nao_nao_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "nao_3_sim_sim_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "nao_3_sim_nao_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "nao_3_nao_sim_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      "nao_3_nao_nao_sim_nao": `Oi! Passando rapidinho. ⚡

Alguma dúvida no uso do sistema até agora?

Se precisar de um "help" para entender alguma função do Offgroom, estou por aqui!`,

      // Tentativa 4 - Usando acesso grátis (8 combinações)
      "sim_4_sim_sim_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "sim_4_sim_nao_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "sim_4_nao_sim_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "sim_4_nao_nao_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "nao_4_sim_sim_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "nao_4_sim_nao_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "nao_4_nao_sim_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      "nao_4_nao_nao_sim_nao": `Oii, como você está ?

Você já teve tempo de explorar o Offgroom? O que está achando da ferramenta?

Quero garantir que você tire o máximo proveito desses 30 dias grátis. Se tiver qualquer pergunta, sou todo ouvidos! 👂`,

      // Tentativa 5 - Usando acesso grátis (8 combinações)
      "sim_5_sim_sim_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "sim_5_sim_nao_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "sim_5_nao_sim_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "sim_5_nao_nao_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "nao_5_sim_sim_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "nao_5_sim_nao_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "nao_5_nao_sim_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,

      "nao_5_nao_nao_sim_nao": `Olá! Tudo bem?

Às vezes, começar um sistema novo gera algumas dúvidas no início, né?

Se você travou em alguma parte ou quer uma dica de como configurar o Offgroom mais rápido, me avisa aqui. Estou à disposição para ajudar! 😉`,
    };

    // Tratar valores vazios como "nao" para a geração da chave
    const enviouMensagem = filters.enviouMensagem || "sim";
    const teveResposta = filters.teveResposta || "nao";
    const agendouReuniao = filters.agendouReuniao || "nao";
    const usandoAcessoGratis = filters.usandoAcessoGratis || "nao";
    const iniciouAcessoPago = filters.iniciouAcessoPago || "nao";

    const key = `${enviouMensagem}_${filters.tentativa}_${teveResposta}_${agendouReuniao}_${usandoAcessoGratis}_${iniciouAcessoPago}`;
    
    return messages[key] || "Mensagem ainda não configurada para esta combinação de filtros.";
  };

  // Função para copiar mensagem do WhatsApp
  const handleCopyWhatsappMessage = async () => {
    const message = getMessageForFilters(advancedFilters);
    
    // Verifica se é a mensagem de fallback (não configurada)
    if (message === "Mensagem ainda não configurada para esta combinação de filtros.") {
      toast({
        title: "Mensagem não configurada",
        description: "Mensagem ainda não configurada para esta combinação de filtros.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Mensagem copiada!",
        description: "Cole em sua conversa de Whatsapp com seu cliente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  // Função para formatar telefone para exportação
  const formatPhoneForExport = (phone: string): string => {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, "");
    
    // Se o telefone já tiver 11 dígitos (DDD + número celular)
    if (cleaned.length === 11) {
      const ddd = cleaned.substring(0, 2);
      const firstPart = cleaned.substring(2, 7);
      const secondPart = cleaned.substring(7, 11);
      return `+55 ${ddd} ${firstPart}-${secondPart}`;
    }
    
    // Se o telefone tiver 10 dígitos (DDD + número fixo)
    if (cleaned.length === 10) {
      const ddd = cleaned.substring(0, 2);
      const firstPart = cleaned.substring(2, 6);
      const secondPart = cleaned.substring(6, 10);
      return `+55 ${ddd} ${firstPart}-${secondPart}`;
    }
    
    // Fallback: retorna com +55 na frente
    return `+55 ${cleaned}`;
  };

  // Função para exportar leads - será redefinida após displayedLeads
  const handleExportLeadsBase = (leadsToExport: typeof leads) => {
    // Filtrar leads com telefone válido
    const leadsWithPhone = leadsToExport.filter(lead => lead.telefone_empresa);
    
    if (leadsWithPhone.length === 0) {
      toast({
        title: "Nenhum lead encontrado",
        description: "Não há leads com telefone para exportar com os filtros aplicados.",
        variant: "destructive",
      });
      return;
    }
    
    // Formatar telefones
    const phones = leadsWithPhone.map(lead => formatPhoneForExport(lead.telefone_empresa));
    
    // Criar dados para Excel (cada telefone em uma linha na coluna A)
    const data = phones.map(phone => [phone]);
    
    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    
    // Gerar arquivo e fazer download
    XLSX.writeFile(wb, `leads_telefones_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Leads exportados!",
      description: `${phones.length} telefones exportados com sucesso.`,
    });
  };

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Normalizar telefone para comparação
  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, "");
  };

  // Extrair telefones de um texto (suporta múltiplos separados por espaço, vírgula, quebra de linha)
  const extractPhonesFromText = (text: string): string[] => {
    // Normalizar separadores: quebras de linha, tabs, vírgulas, ponto-e-vírgula → espaço
    const normalized = text
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/[,;|\t]/g, ' ');
    
    // Regex para capturar padrões de telefone brasileiro
    // Aceita: +55 11 98797-4737, (11) 98797-4737, 11987974737, 987974737, etc.
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g;
    const matches = normalized.match(phoneRegex) || [];
    
    // Extrair apenas dígitos de cada match e filtrar válidos
    return matches
      .map(match => match.replace(/\D/g, ''))
      .filter(digits => digits.length >= 8 && digits.length <= 13);
  };

  // Normalizar telefone para comparação (10-11 dígitos: DDD + número)
  const normalizePhoneForComparison = (phone: string): string => {
    let digits = phone.replace(/\D/g, '');
    
    // Se começar com 55 e tiver mais de 11 dígitos, remover código do país
    if (digits.startsWith('55') && digits.length > 11) {
      digits = digits.slice(2);
    }
    
    // Retornar os últimos 10-11 dígitos (DDD + número)
    if (digits.length >= 10) {
      return digits.slice(-11); // Pega até 11 dígitos (DDD + 9 dígitos)
    }
    // Se tiver menos de 10, retorna os últimos 8-9 (só o número sem DDD)
    return digits.slice(-9);
  };

  // Aplicar filtros
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Filtro de texto (busca)
    if (filter) {
      const trimmedFilter = filter.trim();
      
      // Tentar extrair telefones do texto
      const extractedPhones = extractPhonesFromText(trimmedFilter);
      
      if (extractedPhones.length > 0) {
        // Modo telefone: criar Set de telefones normalizados para busca exata
        const searchPhonesSet = new Set(
          extractedPhones.map(p => normalizePhoneForComparison(p))
        );
        
        result = result.filter(lead => {
          const leadPhone = lead.telefone_empresa || '';
          const leadDigits = leadPhone.replace(/\D/g, '');
          
          // Ignorar leads com telefone vazio ou muito curto
          if (leadDigits.length < 8) return false;
          
          const leadNormalized = normalizePhoneForComparison(leadPhone);
          
          // Match exato com qualquer número da busca
          return searchPhonesSet.has(leadNormalized);
        });
      } else {
        // Modo texto: buscar APENAS no nome da empresa
        const lowerFilter = trimmedFilter.toLowerCase();
        result = result.filter(l => 
          l.nome_empresa.toLowerCase().includes(lowerFilter)
        );
      }
    }

    // Filtro: Enviou mensagem?
    if (advancedFilters.enviouMensagem === "sim") {
      result = result.filter(l => (l.tentativa ?? 0) > 0);
    } else if (advancedFilters.enviouMensagem === "nao") {
      result = result.filter(l => (l.tentativa ?? 0) === 0);
    }

    // Filtro: Tentativa
    if (advancedFilters.tentativa !== "") {
      const tentativa = parseInt(advancedFilters.tentativa);
      result = result.filter(l => (l.tentativa ?? 0) === tentativa);
    }

    // Filtro: Teve Resposta?
    if (advancedFilters.teveResposta === "sim") {
      result = result.filter(l => l.teve_resposta === true);
    } else if (advancedFilters.teveResposta === "nao") {
      result = result.filter(l => l.teve_resposta !== true);
    }

    // Filtro: Agendou Reunião?
    if (advancedFilters.agendouReuniao === "sim") {
      result = result.filter(l => l.agendou_reuniao === true);
    } else if (advancedFilters.agendouReuniao === "nao") {
      result = result.filter(l => l.agendou_reuniao !== true);
    }

    // Filtro: Usando Acesso Grátis?
    if (advancedFilters.usandoAcessoGratis === "sim") {
      result = result.filter(l => l.usando_acesso_gratis === true);
    } else if (advancedFilters.usandoAcessoGratis === "nao") {
      result = result.filter(l => l.usando_acesso_gratis !== true);
    }

    // Filtro: Iniciou acesso pago?
    if (advancedFilters.iniciouAcessoPago === "sim") {
      result = result.filter(l => l.iniciou_acesso_pago === true);
    } else if (advancedFilters.iniciouAcessoPago === "nao") {
      result = result.filter(l => l.iniciou_acesso_pago !== true);
    }

    // Filtro: Tipo de Telefone (independente dos demais filtros)
    if (phoneTypeFilter !== "todos") {
      result = result.filter(lead => getPhoneType(lead.telefone_empresa) === phoneTypeFilter);
    }

    // Filtro: DDDs selecionados
    if (selectedDDDs.length > 0) {
      result = result.filter(lead => {
        const phone = lead.telefone_empresa || '';
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) return false;
        const ddd = digits.substring(0, 2);
        return selectedDDDs.includes(ddd);
      });
    }

    return result;
  }, [leads, filter, advancedFilters, phoneTypeFilter, selectedDDDs]);

  // Aplicar limite de leads para exibição e exportação
  const displayedLeads = useMemo(() => {
    const limit = parseInt(maxLeadsLimit);
    if (!isNaN(limit) && limit > 0) {
      return filteredLeads.slice(0, limit);
    }
    return filteredLeads;
  }, [filteredLeads, maxLeadsLimit]);

  // Paginação: calcular leads da página atual
  const totalPages = Math.ceil(displayedLeads.length / PAGE_SIZE);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return displayedLeads.slice(startIndex, endIndex);
  }, [displayedLeads, currentPage, PAGE_SIZE]);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, advancedFilters, phoneTypeFilter, maxLeadsLimit, selectedDDDs]);

  // Calcular DDDs disponíveis
  const availableDDDs = useMemo(() => {
    const dddCount = new Map<string, number>();
    
    leads.forEach(lead => {
      const phone = lead.telefone_empresa || '';
      const digits = phone.replace(/\D/g, '');
      
      if (digits.length >= 10) {
        const ddd = digits.substring(0, 2);
        dddCount.set(ddd, (dddCount.get(ddd) || 0) + 1);
      }
    });
    
    // Ordenar por quantidade de leads (maior primeiro)
    return Array.from(dddCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ddd, count]) => ({ ddd, count }));
  }, [leads]);

  // Handler de exportação usando displayedLeads
  const handleExportLeads = () => handleExportLeadsBase(displayedLeads);

  // Função para registrar mensagem em massa
  const handleBulkRegisterMessage = async () => {
    setIsBulkRegistering(true);
    
    try {
      const leadsToUpdate = displayedLeads.filter(lead => lead.telefone_empresa);
      
      if (leadsToUpdate.length === 0) {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads para registrar mensagem com os filtros aplicados.",
          variant: "destructive",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      let successCount = 0;

      for (const lead of leadsToUpdate) {
        const fase = getFaseLead(lead);
        const novaTentativa = fase === "prospecao" ? (lead.tentativa || 0) + 1 : (lead.tentativa || 0);
        
        // Inserir registro de mensagem
        const { error: msgError } = await supabase
          .from("crm_mensagens")
          .insert({
            lead_id: lead.id,
            tentativa: novaTentativa,
            fase,
            created_by: userData.user?.id,
          });

        if (msgError) continue;

        // Atualizar lead com nova tentativa e recalcular campos
        const updatedLead = {
          ...lead,
          tentativa: novaTentativa,
        };
        
        const proximo_passo = calcularProximoPasso(updatedLead, 0, new Date());
        const status = calcularStatus(updatedLead, 0);

        const { error: leadError } = await supabase
          .from("crm_leads")
          .update({
            tentativa: novaTentativa,
            proximo_passo,
            status,
          })
          .eq("id", lead.id);

        if (!leadError) successCount++;
      }

      toast({
        title: "Mensagens registradas!",
        description: `${successCount} de ${leadsToUpdate.length} leads atualizados com sucesso.`,
      });

      // Recarregar leads
      window.location.reload();
    } catch (error) {
      toast({
        title: "Erro ao registrar mensagens",
        description: "Ocorreu um erro ao processar as mensagens.",
        variant: "destructive",
      });
    } finally {
      setIsBulkRegistering(false);
      setShowBulkMessageDialog(false);
    }
  };

  // Loading inicial
  if (isAuthenticated === null || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Não autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground">Você precisa estar logado para acessar o CRM.</p>
          <Button onClick={() => navigate("/login")}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  // Sem permissão
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar o CRM interno.</p>
          <p className="text-sm text-muted-foreground">
            Esta área é exclusiva para funcionários autorizados da Offgroom.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CRMLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "leads" && <ImportExcel />}
        </div>

        <TabsContent value="leads" className="space-y-4 mt-0">
          {/* Filtros */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <FilterBar value={filter} onChange={setFilter} />
              <div className="flex flex-wrap gap-2 items-center">
                <CRMFilters filters={advancedFilters} onChange={setAdvancedFilters} />
                {hasActiveFilters && (
                  <>
                    <Button 
                      variant="outline" 
                      className="h-9 gap-2"
                      onClick={handleCopyWhatsappMessage}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar msg Whatsapp
                    </Button>
                    <Input
                      type="number"
                      placeholder="Até quantos leads?"
                      value={maxLeadsLimit}
                      onChange={(e) => setMaxLeadsLimit(e.target.value)}
                      className="w-[160px] h-9"
                      min={1}
                    />
                    <Button 
                      variant="outline" 
                      className="h-9 gap-2"
                      onClick={handleExportLeads}
                    >
                      <Download className="h-4 w-4" />
                      Extrair leads
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-9 gap-2"
                      onClick={() => setShowBulkMessageDialog(true)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Registrar Mensagem
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Filtro por Tipo de Número */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground mr-2">Tipo de contato:</span>
              
              <Button
                variant={phoneTypeFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setPhoneTypeFilter("todos")}
                className="h-8"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Todos
              </Button>
              
              <Button
                variant={phoneTypeFilter === "celular" ? "default" : "outline"}
                size="sm"
                onClick={() => setPhoneTypeFilter("celular")}
                className="h-8"
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Celular
              </Button>
              
              <Button
                variant={phoneTypeFilter === "fixo" ? "default" : "outline"}
                size="sm"
                onClick={() => setPhoneTypeFilter("fixo")}
                className="h-8"
              >
                <Phone className="h-4 w-4 mr-1" />
                Fixo
              </Button>
              
              <Button
                variant={phoneTypeFilter === "sem_contato" ? "default" : "outline"}
                size="sm"
                onClick={() => setPhoneTypeFilter("sem_contato")}
                className="h-8"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                Sem Contato
              </Button>

              {/* Filtro por DDD */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <MapPin className="h-4 w-4" />
                    Filtrar DDD
                    {selectedDDDs.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {selectedDDDs.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Selecionar DDDs</span>
                      {selectedDDDs.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDDDs([])}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Limpar
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-[200px] pr-3">
                      <div className="space-y-2">
                        {availableDDDs.map(({ ddd, count }) => (
                          <div key={ddd} className="flex items-center space-x-2">
                            <Checkbox
                              id={`ddd-${ddd}`}
                              checked={selectedDDDs.includes(ddd)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDDDs([...selectedDDDs, ddd]);
                                } else {
                                  setSelectedDDDs(selectedDDDs.filter(d => d !== ddd));
                                }
                              }}
                            />
                            <label
                              htmlFor={`ddd-${ddd}`}
                              className="text-sm flex-1 cursor-pointer"
                            >
                              {ddd} - {count.toLocaleString()} leads
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{leads.length} leads cadastrados</span>
            {(filter || Object.values(advancedFilters).some(v => v !== "") || phoneTypeFilter !== "todos" || maxLeadsLimit) && (
              <span>• {displayedLeads.length} exibidos {maxLeadsLimit && `(limitado a ${maxLeadsLimit})`}</span>
            )}
          </div>

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-b py-3">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, displayedLeads.length)} de {displayedLeads.length} leads
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm font-medium px-3">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Leads */}
          <LeadsList 
            leads={paginatedLeads} 
            isLoading={leadsLoading} 
            filter="" 
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-0">
          <CRMDashboard leads={leads} />
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação para registrar mensagem em massa */}
      <AlertDialog open={showBulkMessageDialog} onOpenChange={setShowBulkMessageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar mensagem em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que gostaria de registrar mensagem enviada para todos os {displayedLeads.length} contatos selecionados?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkRegistering}>Não</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkRegisterMessage}
              disabled={isBulkRegistering}
            >
              {isBulkRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registrando...
                </>
              ) : (
                "Sim"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CRMLayout>
  );
};

export default CRMOffgroom;

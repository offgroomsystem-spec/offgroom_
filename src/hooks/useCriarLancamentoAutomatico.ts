import { supabase } from "@/integrations/supabase/client";

interface DadosAgendamentoAvulso {
  nomeCliente: string;
  nomePet: string;
  nomeServico: string;
  dataAgendamento: string; // formato YYYY-MM-DD
  dataVenda: string; // formato YYYY-MM-DD
  ownerId: string;
}

interface DadosAgendamentoPacote {
  nomeCliente: string;
  nomePet: string;
  nomePacote: string;
  dataVenda: string; // formato YYYY-MM-DD
  primeiraDataServico: string; // formato YYYY-MM-DD (para determinar mês/ano)
  ownerId: string;
  servicosExtras?: Array<{ nome: string; valor: number }>;
}

interface DadosAgendamentoMultiplosServicos {
  agendamentoId: string; // UUID do agendamento criado
  nomeCliente: string;
  nomePet: string;
  servicos: Array<{ nome: string; valor: number }>;
  dataAgendamento: string; // formato YYYY-MM-DD
  dataVenda: string; // formato YYYY-MM-DD
  ownerId: string;
}

interface DadosAgendamentoConsolidado {
  agendamentoIds: string[];
  nomeCliente: string;
  petServicos: Array<{ petName: string; servicos: Array<{ nome: string; valor: number }> }>;
  dataAgendamento: string;
  dataVenda: string;
  ownerId: string;
}

export const criarLancamentoFinanceiroAvulso = async (dados: DadosAgendamentoAvulso) => {
  try {
    const { nomeCliente, nomePet, nomeServico, dataAgendamento, dataVenda, ownerId } = dados;

    // 1. Buscar cliente_id pelo nome
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", ownerId)
      .ilike("nome_cliente", nomeCliente)
      .limit(1);

    const clienteId = clientesData?.[0]?.id || null;

    // 2. Buscar pet_id pelo nome e cliente_id
    let petId: string | null = null;
    if (clienteId) {
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .eq("cliente_id", clienteId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    } else {
      // Se não encontrou cliente, buscar pet apenas pelo nome
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    }

    // 3. Buscar valor do serviço
    const { data: servicosData } = await supabase
      .from("servicos")
      .select("valor")
      .eq("user_id", ownerId)
      .ilike("nome", nomeServico)
      .limit(1);

    const valorServico = servicosData?.[0]?.valor ? Number(servicosData[0].valor) : 0;

    // 4. Buscar primeira conta bancária
    const { data: contasData } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1);

    const contaId = contasData?.[0]?.id || null;

    // 5. Extrair ano e mês da data do agendamento
    const [ano, mes] = dataAgendamento.split("-");

    // 6. Criar lançamento financeiro
    const { data: lancamentoData, error: lancamentoError } = await supabase
      .from("lancamentos_financeiros")
      .insert([
        {
          user_id: ownerId,
          ano: ano,
          mes_competencia: mes,
          tipo: "Receita",
          descricao1: "Receita Operacional",
          cliente_id: clienteId,
          pet_ids: petId ? [petId] : [],
          valor_total: valorServico,
          data_pagamento: dataVenda,
          conta_id: contaId,
          pago: false,
        },
      ])
      .select("id")
      .single();

    if (lancamentoError) {
      console.error("Erro ao criar lançamento financeiro:", lancamentoError);
      return;
    }

    // 7. Criar item do lançamento
    const { error: itemError } = await supabase
      .from("lancamentos_financeiros_itens")
      .insert([
        {
          lancamento_id: lancamentoData.id,
          descricao2: "Serviços",
          produto_servico: nomeServico,
          valor: valorServico,
          quantidade: 1,
        },
      ]);

    if (itemError) {
      console.error("Erro ao criar item do lançamento:", itemError);
    }

    console.log("Lançamento financeiro criado automaticamente para agendamento avulso");
  } catch (error) {
    console.error("Erro na automação de lançamento financeiro (avulso):", error);
  }
};

export const criarLancamentoFinanceiroPacote = async (dados: DadosAgendamentoPacote) => {
  try {
    const { nomeCliente, nomePet, nomePacote, dataVenda, primeiraDataServico, ownerId, servicosExtras } = dados;

    console.log(`Iniciando lançamento financeiro de pacote - Cliente: ${nomeCliente}, Pet: ${nomePet}, Pacote: ${nomePacote}`);

    // 1. Primeiro buscar o pet pelo nome (pode retornar múltiplos)
    const { data: petsData } = await supabase
      .from("pets")
      .select("id, cliente_id")
      .eq("user_id", ownerId)
      .ilike("nome_pet", nomePet);

    // 2. Buscar todos os clientes com o nome fornecido
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", ownerId)
      .ilike("nome_cliente", nomeCliente);

    // 3. Encontrar o pet que pertence a um cliente com o nome correto
    let petId: string | null = null;
    let clienteId: string | null = null;

    if (petsData && clientesData) {
      const clienteIds = clientesData.map((c: any) => c.id);
      const petDoCliente = petsData.find((p: any) => clienteIds.includes(p.cliente_id));
      
      if (petDoCliente) {
        petId = petDoCliente.id;
        clienteId = petDoCliente.cliente_id;
      }
    }

    if (!clienteId && clientesData && clientesData.length > 0) {
      clienteId = clientesData[0].id;
    }
    if (!petId && petsData && petsData.length > 0) {
      petId = petsData[0].id;
    }

    // 3. Buscar valor_final do pacote
    const { data: pacotesData } = await supabase
      .from("pacotes")
      .select("valor_final")
      .eq("user_id", ownerId)
      .ilike("nome", nomePacote)
      .limit(1);

    const valorPacote = pacotesData?.[0]?.valor_final ? Number(pacotesData[0].valor_final) : 0;

    // Calcular valor total dos extras
    const valorExtras = (servicosExtras || []).reduce((acc, s) => acc + s.valor, 0);
    const valorTotal = valorPacote + valorExtras;

    // 4. Buscar primeira conta bancária
    const { data: contasData } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1);

    const contaId = contasData?.[0]?.id || null;

    // 5. Extrair ano e mês da primeira data de serviço
    const [ano, mes] = primeiraDataServico.split("-");

    // 6. Criar lançamento financeiro
    const { data: lancamentoData, error: lancamentoError } = await supabase
      .from("lancamentos_financeiros")
      .insert([
        {
          user_id: ownerId,
          ano: ano,
          mes_competencia: mes,
          tipo: "Receita",
          descricao1: "Receita Operacional",
          cliente_id: clienteId,
          pet_ids: petId ? [petId] : [],
          valor_total: valorTotal,
          data_pagamento: dataVenda,
          conta_id: contaId,
          pago: false,
        },
      ])
      .select("id")
      .single();

    if (lancamentoError) {
      console.error("Erro ao criar lançamento financeiro:", lancamentoError);
      return;
    }

    // 7. Criar itens do lançamento - pacote principal + extras individuais
    const itens: Array<{
      lancamento_id: string;
      descricao2: string;
      produto_servico: string;
      valor: number;
      quantidade: number;
    }> = [
      {
        lancamento_id: lancamentoData.id,
        descricao2: "Serviços",
        produto_servico: nomePacote,
        valor: valorPacote,
        quantidade: 1,
      },
    ];

    // Adicionar cada serviço extra como linha individual
    if (servicosExtras && servicosExtras.length > 0) {
      for (const extra of servicosExtras) {
        itens.push({
          lancamento_id: lancamentoData.id,
          descricao2: "Serviços",
          produto_servico: extra.nome,
          valor: extra.valor,
          quantidade: 1,
        });
      }
    }

    const { error: itemError } = await supabase
      .from("lancamentos_financeiros_itens")
      .insert(itens);

    if (itemError) {
      console.error("Erro ao criar itens do lançamento:", itemError);
    }

    console.log("Lançamento financeiro criado automaticamente para agendamento de pacote");
  } catch (error) {
    console.error("Erro na automação de lançamento financeiro (pacote):", error);
  }
};

export const criarLancamentoFinanceiroMultiplosServicos = async (dados: DadosAgendamentoMultiplosServicos) => {
  try {
    const { agendamentoId, nomeCliente, nomePet, servicos, dataAgendamento, dataVenda, ownerId } = dados;

    if (servicos.length === 0) {
      console.warn("Nenhum serviço para criar lançamento financeiro");
      return;
    }

    // 1. Verificar se já existe lançamento para este agendamento (upsert lógico)
    const { data: lancamentoExistente } = await supabase
      .from("lancamentos_financeiros")
      .select("id")
      .eq("agendamento_id", agendamentoId)
      .maybeSingle();

    // 2. Buscar cliente_id pelo nome
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", ownerId)
      .ilike("nome_cliente", nomeCliente)
      .limit(1);

    const clienteId = clientesData?.[0]?.id || null;

    // 3. Buscar pet_id pelo nome e cliente_id
    let petId: string | null = null;
    if (clienteId) {
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .eq("cliente_id", clienteId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    } else {
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    }

    // 4. Calcular valor total somando todos os serviços
    const valorTotal = servicos.reduce((acc, s) => acc + s.valor, 0);

    // 5. Buscar primeira conta bancária
    const { data: contasData } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1);

    const contaId = contasData?.[0]?.id || null;

    // 6. Extrair ano e mês da data do agendamento
    const [ano, mes] = dataAgendamento.split("-");

    let lancamentoId: string;

    if (lancamentoExistente) {
      // UPDATE: Atualizar lançamento existente
      const { error: updateError } = await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: ano,
          mes_competencia: mes,
          cliente_id: clienteId,
          pet_ids: petId ? [petId] : [],
          valor_total: valorTotal,
          data_pagamento: dataVenda,
          conta_id: contaId,
        })
        .eq("id", lancamentoExistente.id);

      if (updateError) {
        console.error("Erro ao atualizar lançamento financeiro:", updateError);
        return;
      }

      lancamentoId = lancamentoExistente.id;

      // Remover itens antigos antes de inserir os novos
      await supabase
        .from("lancamentos_financeiros_itens")
        .delete()
        .eq("lancamento_id", lancamentoId);

      console.log(`Lançamento financeiro atualizado para agendamento ${agendamentoId}`);
    } else {
      // INSERT: Criar novo lançamento financeiro com agendamento_id
      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .insert([
          {
            user_id: ownerId,
            agendamento_id: agendamentoId,
            ano: ano,
            mes_competencia: mes,
            tipo: "Receita",
            descricao1: "Receita Operacional",
            cliente_id: clienteId,
            pet_ids: petId ? [petId] : [],
            valor_total: valorTotal,
            data_pagamento: dataVenda,
            conta_id: contaId,
            pago: false,
          },
        ])
        .select("id")
        .single();

      if (lancamentoError) {
        console.error("Erro ao criar lançamento financeiro:", lancamentoError);
        return;
      }

      lancamentoId = lancamentoData.id;
      console.log(`Lançamento financeiro criado para agendamento ${agendamentoId}`);
    }

    // 7. Criar MÚLTIPLOS itens do lançamento (um para cada serviço)
    const itensParaInserir = servicos.map((servico) => ({
      lancamento_id: lancamentoId,
      descricao2: "Serviços",
      produto_servico: servico.nome,
      valor: servico.valor,
      quantidade: 1,
    }));

    const { error: itemError } = await supabase
      .from("lancamentos_financeiros_itens")
      .insert(itensParaInserir);

    if (itemError) {
      console.error("Erro ao criar itens do lançamento:", itemError);
    }

    console.log(`Lançamento financeiro com ${servicos.length} serviços, total: R$ ${valorTotal.toFixed(2)}`);
  } catch (error) {
    console.error("Erro na automação de lançamento financeiro (múltiplos serviços):", error);
  }
};

export const criarLancamentoFinanceiroConsolidado = async (dados: DadosAgendamentoConsolidado) => {
  try {
    const { agendamentoIds, nomeCliente, petServicos, dataAgendamento, dataVenda, ownerId } = dados;

    if (petServicos.length === 0) {
      console.warn("Nenhum pet/serviço para criar lançamento financeiro consolidado");
      return;
    }

    // Se só tem 1 pet, usar a função padrão
    if (petServicos.length === 1) {
      await criarLancamentoFinanceiroMultiplosServicos({
        agendamentoId: agendamentoIds[0],
        nomeCliente,
        nomePet: petServicos[0].petName,
        servicos: petServicos[0].servicos,
        dataAgendamento,
        dataVenda,
        ownerId
      });
      return;
    }

    // 1. Buscar cliente_id
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", ownerId)
      .ilike("nome_cliente", nomeCliente)
      .limit(1);

    const clienteId = clientesData?.[0]?.id || null;

    // 2. Coletar todos os pet_ids
    const allPetIds: string[] = [];
    for (const ps of petServicos) {
      if (clienteId) {
        const { data: petsData } = await supabase
          .from("pets")
          .select("id")
          .eq("user_id", ownerId)
          .eq("cliente_id", clienteId)
          .ilike("nome_pet", ps.petName)
          .limit(1);
        if (petsData?.[0]?.id) allPetIds.push(petsData[0].id);
      }
    }

    // 3. Calcular valor total de todos os pets
    const valorTotal = petServicos.reduce((acc, ps) => 
      acc + ps.servicos.reduce((sacc, s) => sacc + s.valor, 0), 0
    );

    // 4. Buscar primeira conta bancária
    const { data: contasData } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1);

    const contaId = contasData?.[0]?.id || null;
    const [ano, mes] = dataAgendamento.split("-");

    // 5. Criar um único lançamento financeiro (vinculado ao primeiro agendamento)
    const { data: lancamentoData, error: lancamentoError } = await supabase
      .from("lancamentos_financeiros")
      .insert([{
        user_id: ownerId,
        agendamento_id: agendamentoIds[0],
        ano,
        mes_competencia: mes,
        tipo: "Receita",
        descricao1: "Receita Operacional",
        cliente_id: clienteId,
        pet_ids: allPetIds,
        valor_total: valorTotal,
        data_pagamento: dataVenda,
        conta_id: contaId,
        pago: false,
      }])
      .select("id")
      .single();

    if (lancamentoError) {
      console.error("Erro ao criar lançamento financeiro consolidado:", lancamentoError);
      return;
    }

    // 6. Criar itens separados por pet
    const itensParaInserir = petServicos.flatMap((ps) =>
      ps.servicos.map((servico) => ({
        lancamento_id: lancamentoData.id,
        descricao2: "Serviços",
        produto_servico: `${ps.petName} - ${servico.nome}`,
        valor: servico.valor,
        quantidade: 1,
      }))
    );

    const { error: itemError } = await supabase
      .from("lancamentos_financeiros_itens")
      .insert(itensParaInserir);

    if (itemError) {
      console.error("Erro ao criar itens do lançamento consolidado:", itemError);
    }

    console.log(`Lançamento financeiro consolidado: ${petServicos.length} pets, ${itensParaInserir.length} itens, total: R$ ${valorTotal.toFixed(2)}`);
  } catch (error) {
    console.error("Erro na automação de lançamento financeiro consolidado:", error);
  }
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cliente: string
          cliente_id: string | null
          created_at: string | null
          data: string
          data_venda: string
          groomer: string
          horario: string
          horario_termino: string
          id: string
          numero_servico_pacote: string | null
          pet: string
          raca: string
          servico: string
          servicos: Json | null
          status: string
          taxi_dog: string
          tempo_servico: string
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          cliente: string
          cliente_id?: string | null
          created_at?: string | null
          data: string
          data_venda: string
          groomer: string
          horario: string
          horario_termino: string
          id?: string
          numero_servico_pacote?: string | null
          pet: string
          raca: string
          servico: string
          servicos?: Json | null
          status: string
          taxi_dog: string
          tempo_servico: string
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          cliente?: string
          cliente_id?: string | null
          created_at?: string | null
          data?: string
          data_venda?: string
          groomer?: string
          horario?: string
          horario_termino?: string
          id?: string
          numero_servico_pacote?: string | null
          pet?: string
          raca?: string
          servico?: string
          servicos?: Json | null
          status?: string
          taxi_dog?: string
          tempo_servico?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos_pacotes: {
        Row: {
          created_at: string | null
          data_venda: string
          id: string
          nome_cliente: string
          nome_pacote: string
          nome_pet: string
          raca: string
          servicos: Json
          taxi_dog: string
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          data_venda: string
          id?: string
          nome_cliente: string
          nome_pacote: string
          nome_pet: string
          raca: string
          servicos: Json
          taxi_dog: string
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          data_venda?: string
          id?: string
          nome_cliente?: string
          nome_pacote?: string
          nome_pet?: string
          raca?: string
          servicos?: Json
          taxi_dog?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo_ibge_cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logradouro: string | null
          nome_cliente: string
          numero_endereco: string | null
          observacao: string | null
          uf: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string
          whatsapp_ativo: boolean
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_ibge_cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logradouro?: string | null
          nome_cliente: string
          numero_endereco?: string | null
          observacao?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp: string
          whatsapp_ativo?: boolean
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_ibge_cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logradouro?: string | null
          nome_cliente?: string
          numero_endereco?: string | null
          observacao?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
          whatsapp_ativo?: boolean
        }
        Relationships: []
      }
      comissoes_config: {
        Row: {
          ativo: boolean
          bonus_meta: number | null
          comissao_atendimento: number | null
          comissao_faturamento: number | null
          comissoes_groomers: Json | null
          created_at: string
          id: string
          modelo: string
          tipo_comissao: string
          tipos_comissao_groomers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          bonus_meta?: number | null
          comissao_atendimento?: number | null
          comissao_faturamento?: number | null
          comissoes_groomers?: Json | null
          created_at?: string
          id?: string
          modelo?: string
          tipo_comissao?: string
          tipos_comissao_groomers?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          bonus_meta?: number | null
          comissao_atendimento?: number | null
          comissao_faturamento?: number | null
          comissoes_groomers?: Json | null
          created_at?: string
          id?: string
          modelo?: string
          tipo_comissao?: string
          tipos_comissao_groomers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compras_nf: {
        Row: {
          chave_nf: string
          created_at: string
          data_compra: string
          fornecedor_id: string | null
          id: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          chave_nf: string
          created_at?: string
          data_compra: string
          fornecedor_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          chave_nf?: string
          created_at?: string
          data_compra?: string
          fornecedor_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_nf_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_nf_itens: {
        Row: {
          created_at: string
          data_validade: string | null
          id: string
          nf_id: string
          observacoes: string | null
          produto_id: string
          quantidade: number
          updated_at: string
          valor_compra: number
        }
        Insert: {
          created_at?: string
          data_validade?: string | null
          id?: string
          nf_id: string
          observacoes?: string | null
          produto_id: string
          quantidade: number
          updated_at?: string
          valor_compra: number
        }
        Update: {
          created_at?: string
          data_validade?: string | null
          id?: string
          nf_id?: string
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          updated_at?: string
          valor_compra?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_nf_itens_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "compras_nf"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_nf_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          saldo: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          saldo?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          saldo?: number | null
          user_id?: string
        }
        Relationships: []
      }
      creche_estadias: {
        Row: {
          checklist_entrada: Json
          cliente_id: string
          created_at: string
          data_entrada: string
          data_saida: string | null
          data_saida_prevista: string | null
          hora_entrada: string
          hora_saida: string | null
          hora_saida_prevista: string | null
          id: string
          modelo_cobranca: string | null
          modelo_preco: string
          observacoes_entrada: string | null
          observacoes_saida: string | null
          pet_id: string
          servicos_extras: Json | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_entrada?: Json
          cliente_id: string
          created_at?: string
          data_entrada: string
          data_saida?: string | null
          data_saida_prevista?: string | null
          hora_entrada: string
          hora_saida?: string | null
          hora_saida_prevista?: string | null
          id?: string
          modelo_cobranca?: string | null
          modelo_preco?: string
          observacoes_entrada?: string | null
          observacoes_saida?: string | null
          pet_id: string
          servicos_extras?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_entrada?: Json
          cliente_id?: string
          created_at?: string
          data_entrada?: string
          data_saida?: string | null
          data_saida_prevista?: string | null
          hora_entrada?: string
          hora_saida?: string | null
          hora_saida_prevista?: string | null
          id?: string
          modelo_cobranca?: string | null
          modelo_preco?: string
          observacoes_entrada?: string | null
          observacoes_saida?: string | null
          pet_id?: string
          servicos_extras?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creche_estadias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creche_estadias_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      creche_registros_diarios: {
        Row: {
          bebeu_agua: boolean | null
          brigas: boolean | null
          brincou: boolean | null
          comeu: boolean | null
          created_at: string
          data_registro: string
          estadia_id: string
          fez_necessidades: boolean | null
          hora_registro: string
          id: string
          interagiu_bem: boolean | null
          observacoes: string | null
          pulgas_carrapatos: boolean | null
          sinais_doenca: boolean | null
          user_id: string
        }
        Insert: {
          bebeu_agua?: boolean | null
          brigas?: boolean | null
          brincou?: boolean | null
          comeu?: boolean | null
          created_at?: string
          data_registro?: string
          estadia_id: string
          fez_necessidades?: boolean | null
          hora_registro?: string
          id?: string
          interagiu_bem?: boolean | null
          observacoes?: string | null
          pulgas_carrapatos?: boolean | null
          sinais_doenca?: boolean | null
          user_id: string
        }
        Update: {
          bebeu_agua?: boolean | null
          brigas?: boolean | null
          brincou?: boolean | null
          comeu?: boolean | null
          created_at?: string
          data_registro?: string
          estadia_id?: string
          fez_necessidades?: boolean | null
          hora_registro?: string
          id?: string
          interagiu_bem?: boolean | null
          observacoes?: string | null
          pulgas_carrapatos?: boolean | null
          sinais_doenca?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creche_registros_diarios_estadia_id_fkey"
            columns: ["estadia_id"]
            isOneToOne: false
            referencedRelation: "creche_estadias"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          agendou_reuniao: boolean | null
          created_at: string
          created_by: string | null
          data_inicio_acesso_gratis: string | null
          data_inicio_acesso_pago: string | null
          data_reuniao: string | null
          dias_acesso_gratis: number | null
          id: string
          iniciou_acesso_pago: boolean | null
          nome_dono: string | null
          nome_empresa: string
          nota_google: number | null
          plano_contratado: string | null
          proximo_passo: string | null
          qtd_avaliacoes: number | null
          status: string | null
          telefone_dono: string | null
          telefone_empresa: string
          tentativa: number | null
          teve_resposta: boolean | null
          updated_at: string
          usando_acesso_gratis: boolean | null
        }
        Insert: {
          agendou_reuniao?: boolean | null
          created_at?: string
          created_by?: string | null
          data_inicio_acesso_gratis?: string | null
          data_inicio_acesso_pago?: string | null
          data_reuniao?: string | null
          dias_acesso_gratis?: number | null
          id?: string
          iniciou_acesso_pago?: boolean | null
          nome_dono?: string | null
          nome_empresa: string
          nota_google?: number | null
          plano_contratado?: string | null
          proximo_passo?: string | null
          qtd_avaliacoes?: number | null
          status?: string | null
          telefone_dono?: string | null
          telefone_empresa: string
          tentativa?: number | null
          teve_resposta?: boolean | null
          updated_at?: string
          usando_acesso_gratis?: boolean | null
        }
        Update: {
          agendou_reuniao?: boolean | null
          created_at?: string
          created_by?: string | null
          data_inicio_acesso_gratis?: string | null
          data_inicio_acesso_pago?: string | null
          data_reuniao?: string | null
          dias_acesso_gratis?: number | null
          id?: string
          iniciou_acesso_pago?: boolean | null
          nome_dono?: string | null
          nome_empresa?: string
          nota_google?: number | null
          plano_contratado?: string | null
          proximo_passo?: string | null
          qtd_avaliacoes?: number | null
          status?: string | null
          telefone_dono?: string | null
          telefone_empresa?: string
          tentativa?: number | null
          teve_resposta?: boolean | null
          updated_at?: string
          usando_acesso_gratis?: boolean | null
        }
        Relationships: []
      }
      crm_mensagens: {
        Row: {
          created_at: string
          created_by: string | null
          data_envio: string
          fase: string | null
          id: string
          lead_id: string
          observacao: string | null
          tentativa: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_envio?: string
          fase?: string | null
          id?: string
          lead_id: string
          observacao?: string | null
          tentativa: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_envio?: string
          fase?: string | null
          id?: string
          lead_id?: string
          observacao?: string | null
          tentativa?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_mensagens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_usuarios_autorizados: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string | null
          conta_id: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          ambiente_fiscal: string | null
          bairro_fiscal: string | null
          bordao: string | null
          cep_fiscal: string | null
          cidade_fiscal: string | null
          cnpj: string | null
          codigo_cnae: string | null
          codigo_ibge_cidade: string | null
          complemento_fiscal: string | null
          confirmacao_15h: boolean
          confirmacao_24h: boolean
          confirmacao_3h: boolean
          confirmacao_periodo_ativo: boolean
          created_at: string | null
          creche_ativa: boolean
          dias_funcionamento: Json | null
          email_fiscal: string | null
          endereco: string | null
          evolution_auto_send: boolean | null
          evolution_instance_name: string | null
          horario_checkin_creche: string | null
          horario_checkout_creche: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logradouro_fiscal: string | null
          meta_faturamento_mensal: number | null
          nome_empresa: string | null
          numero_endereco_fiscal: string | null
          razao_social: string | null
          regime_tributario: string | null
          risco_auto_send: boolean
          telefone: string | null
          uf_fiscal: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ambiente_fiscal?: string | null
          bairro_fiscal?: string | null
          bordao?: string | null
          cep_fiscal?: string | null
          cidade_fiscal?: string | null
          cnpj?: string | null
          codigo_cnae?: string | null
          codigo_ibge_cidade?: string | null
          complemento_fiscal?: string | null
          confirmacao_15h?: boolean
          confirmacao_24h?: boolean
          confirmacao_3h?: boolean
          confirmacao_periodo_ativo?: boolean
          created_at?: string | null
          creche_ativa?: boolean
          dias_funcionamento?: Json | null
          email_fiscal?: string | null
          endereco?: string | null
          evolution_auto_send?: boolean | null
          evolution_instance_name?: string | null
          horario_checkin_creche?: string | null
          horario_checkout_creche?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro_fiscal?: string | null
          meta_faturamento_mensal?: number | null
          nome_empresa?: string | null
          numero_endereco_fiscal?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          risco_auto_send?: boolean
          telefone?: string | null
          uf_fiscal?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ambiente_fiscal?: string | null
          bairro_fiscal?: string | null
          bordao?: string | null
          cep_fiscal?: string | null
          cidade_fiscal?: string | null
          cnpj?: string | null
          codigo_cnae?: string | null
          codigo_ibge_cidade?: string | null
          complemento_fiscal?: string | null
          confirmacao_15h?: boolean
          confirmacao_24h?: boolean
          confirmacao_3h?: boolean
          confirmacao_periodo_ativo?: boolean
          created_at?: string | null
          creche_ativa?: boolean
          dias_funcionamento?: Json | null
          email_fiscal?: string | null
          endereco?: string | null
          evolution_auto_send?: boolean | null
          evolution_instance_name?: string | null
          horario_checkin_creche?: string | null
          horario_checkout_creche?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro_fiscal?: string | null
          meta_faturamento_mensal?: number | null
          nome_empresa?: string | null
          numero_endereco_fiscal?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          risco_auto_send?: boolean
          telefone?: string | null
          uf_fiscal?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      formas_pagamento: {
        Row: {
          created_at: string | null
          dias: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dias: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dias?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          bairro: string | null
          banco: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          cnpj_cpf: string
          complemento: string | null
          condicao_pagamento: string | null
          created_at: string | null
          email: string | null
          estado: string | null
          forma_pagamento: string | null
          id: string
          nome_fantasia: string | null
          nome_fornecedor: string
          nome_titular: string | null
          numero: string | null
          rua: string | null
          site: string | null
          telefone: string | null
          tipo_fornecedor: string
          updated_at: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj_cpf: string
          complemento?: string | null
          condicao_pagamento?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          forma_pagamento?: string | null
          id?: string
          nome_fantasia?: string | null
          nome_fornecedor: string
          nome_titular?: string | null
          numero?: string | null
          rua?: string | null
          site?: string | null
          telefone?: string | null
          tipo_fornecedor: string
          updated_at?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          complemento?: string | null
          condicao_pagamento?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          forma_pagamento?: string | null
          id?: string
          nome_fantasia?: string | null
          nome_fornecedor?: string
          nome_titular?: string | null
          numero?: string | null
          rua?: string | null
          site?: string | null
          telefone?: string | null
          tipo_fornecedor?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      groomers: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamentos_financeiros: {
        Row: {
          agendamento_id: string | null
          ano: string
          cliente_id: string | null
          conta_id: string | null
          created_at: string | null
          data_cadastro: string
          data_pagamento: string
          descricao1: string
          fornecedor_id: string | null
          id: string
          mes_competencia: string
          modo_ajuste: string | null
          observacao: string | null
          pago: boolean
          pet_ids: Json | null
          tipo: string
          tipo_deducao: string | null
          tipo_juros: string | null
          updated_at: string | null
          user_id: string
          valor_deducao: number | null
          valor_juros: number | null
          valor_total: number
        }
        Insert: {
          agendamento_id?: string | null
          ano: string
          cliente_id?: string | null
          conta_id?: string | null
          created_at?: string | null
          data_cadastro?: string
          data_pagamento: string
          descricao1: string
          fornecedor_id?: string | null
          id?: string
          mes_competencia: string
          modo_ajuste?: string | null
          observacao?: string | null
          pago?: boolean
          pet_ids?: Json | null
          tipo: string
          tipo_deducao?: string | null
          tipo_juros?: string | null
          updated_at?: string | null
          user_id: string
          valor_deducao?: number | null
          valor_juros?: number | null
          valor_total?: number
        }
        Update: {
          agendamento_id?: string | null
          ano?: string
          cliente_id?: string | null
          conta_id?: string | null
          created_at?: string | null
          data_cadastro?: string
          data_pagamento?: string
          descricao1?: string
          fornecedor_id?: string | null
          id?: string
          mes_competencia?: string
          modo_ajuste?: string | null
          observacao?: string | null
          pago?: boolean
          pet_ids?: Json | null
          tipo?: string
          tipo_deducao?: string | null
          tipo_juros?: string | null
          updated_at?: string | null
          user_id?: string
          valor_deducao?: number | null
          valor_juros?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros_itens: {
        Row: {
          created_at: string | null
          descricao2: string
          id: string
          lancamento_id: string
          produto_servico: string | null
          quantidade: number | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao2: string
          id?: string
          lancamento_id: string
          produto_servico?: string | null
          quantidade?: number | null
          valor?: number
        }
        Update: {
          created_at?: string | null
          descricao2?: string
          id?: string
          lancamento_id?: string
          produto_servico?: string | null
          quantidade?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_itens_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          agendamento_id: string | null
          chave_acesso: string | null
          cliente_documento: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          dados_nfe: Json | null
          dados_nfse: Json | null
          danfe_pdf_base64: string | null
          danfe_pdf_cached_at: string | null
          email_enviado: boolean | null
          id: string
          lancamento_id: string | null
          mensagem_erro: string | null
          numero: string | null
          nuvem_fiscal_id: string | null
          protocolo_autorizacao: string | null
          serie: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          agendamento_id?: string | null
          chave_acesso?: string | null
          cliente_documento?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          dados_nfe?: Json | null
          dados_nfse?: Json | null
          danfe_pdf_base64?: string | null
          danfe_pdf_cached_at?: string | null
          email_enviado?: boolean | null
          id?: string
          lancamento_id?: string | null
          mensagem_erro?: string | null
          numero?: string | null
          nuvem_fiscal_id?: string | null
          protocolo_autorizacao?: string | null
          serie?: string | null
          status?: string
          tipo: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          agendamento_id?: string | null
          chave_acesso?: string | null
          cliente_documento?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          dados_nfe?: Json | null
          dados_nfse?: Json | null
          danfe_pdf_base64?: string | null
          danfe_pdf_cached_at?: string | null
          email_enviado?: boolean | null
          id?: string
          lancamento_id?: string | null
          mensagem_erro?: string | null
          numero?: string | null
          nuvem_fiscal_id?: string | null
          protocolo_autorizacao?: string | null
          serie?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      pacotes: {
        Row: {
          created_at: string | null
          desconto_percentual: number
          desconto_valor: number
          id: string
          nome: string
          porte: string
          raca: string | null
          servicos: Json
          user_id: string
          validade: string
          valor: number
          valor_final: number
        }
        Insert: {
          created_at?: string | null
          desconto_percentual?: number
          desconto_valor?: number
          id?: string
          nome: string
          porte: string
          raca?: string | null
          servicos?: Json
          user_id: string
          validade?: string
          valor: number
          valor_final?: number
        }
        Update: {
          created_at?: string | null
          desconto_percentual?: number
          desconto_valor?: number
          id?: string
          nome?: string
          porte?: string
          raca?: string | null
          servicos?: Json
          user_id?: string
          validade?: string
          valor?: number
          valor_final?: number
        }
        Relationships: []
      }
      pacotes_creche: {
        Row: {
          created_at: string
          desconto_percentual: number
          desconto_valor: number
          id: string
          nome: string
          servicos_ids: Json
          tipo: string
          updated_at: string
          user_id: string
          valor_final: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          desconto_percentual?: number
          desconto_valor?: number
          id?: string
          nome: string
          servicos_ids?: Json
          tipo?: string
          updated_at?: string
          user_id: string
          valor_final?: number
          valor_total?: number
        }
        Update: {
          created_at?: string
          desconto_percentual?: number
          desconto_valor?: number
          id?: string
          nome?: string
          servicos_ids?: Json
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_final?: number
          valor_total?: number
        }
        Relationships: []
      }
      permissions: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          nome: string
          ordem: number
          parent_codigo: string | null
          tema: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number
          parent_codigo?: string | null
          tema: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          parent_codigo?: string | null
          tema?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          nome_pet: string
          observacao: string | null
          porte: string
          raca: string
          sexo: string | null
          updated_at: string
          user_id: string
          whatsapp_ativo: boolean
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          nome_pet: string
          observacao?: string | null
          porte: string
          raca: string
          sexo?: string | null
          updated_at?: string
          user_id: string
          whatsapp_ativo?: boolean
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          nome_pet?: string
          observacao?: string | null
          porte?: string
          raca?: string
          sexo?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_ativo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          cfop: string | null
          codigo: string
          created_at: string | null
          data_ultima_compra: string | null
          descricao: string | null
          estoque_atual: number | null
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          imposto: number
          lucro_unitario: number
          margem_lucro: number
          ncm: string | null
          nome: string
          origem: string | null
          preco_custo: number
          taxa_cartao: number
          unidade_medida: string | null
          user_id: string
          valor: number
        }
        Insert: {
          cfop?: string | null
          codigo?: string
          created_at?: string | null
          data_ultima_compra?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          imposto?: number
          lucro_unitario?: number
          margem_lucro?: number
          ncm?: string | null
          nome: string
          origem?: string | null
          preco_custo?: number
          taxa_cartao?: number
          unidade_medida?: string | null
          user_id: string
          valor: number
        }
        Update: {
          cfop?: string | null
          codigo?: string
          created_at?: string | null
          data_ultima_compra?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          imposto?: number
          lucro_unitario?: number
          margem_lucro?: number
          ncm?: string | null
          nome?: string
          origem?: string | null
          preco_custo?: number
          taxa_cartao?: number
          unidade_medida?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          data_fim_liberacao_extra: string | null
          data_fim_periodo_gratis: string | null
          data_inicio_periodo_gratis: string | null
          dias_liberacao_extra: number
          email_hotmart: string
          id: string
          liberacao_manual_ativa: boolean
          login_count: number
          nome_completo: string
          pagamento_em_dia: string | null
          periodo_gratis_dias: number
          plano_ativo: string | null
          trial_end_date: string | null
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          data_fim_liberacao_extra?: string | null
          data_fim_periodo_gratis?: string | null
          data_inicio_periodo_gratis?: string | null
          dias_liberacao_extra?: number
          email_hotmart: string
          id: string
          liberacao_manual_ativa?: boolean
          login_count?: number
          nome_completo: string
          pagamento_em_dia?: string | null
          periodo_gratis_dias?: number
          plano_ativo?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          data_fim_liberacao_extra?: string | null
          data_fim_periodo_gratis?: string | null
          data_inicio_periodo_gratis?: string | null
          dias_liberacao_extra?: number
          email_hotmart?: string
          id?: string
          liberacao_manual_ativa?: boolean
          login_count?: number
          nome_completo?: string
          pagamento_em_dia?: string | null
          periodo_gratis_dias?: number
          plano_ativo?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      racas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          porte: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          porte?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          porte?: string
          user_id?: string
        }
        Relationships: []
      }
      racas_padrao: {
        Row: {
          created_at: string
          id: string
          nome: string
          porte: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          porte: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          porte?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string | null
          conta_id: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          aliquota_iss: number | null
          codigo_servico_municipal: string | null
          created_at: string | null
          id: string
          nome: string
          porte: string
          raca: string | null
          user_id: string
          valor: number
        }
        Insert: {
          aliquota_iss?: number | null
          codigo_servico_municipal?: string | null
          created_at?: string | null
          id?: string
          nome: string
          porte: string
          raca?: string | null
          user_id: string
          valor: number
        }
        Update: {
          aliquota_iss?: number | null
          codigo_servico_municipal?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          porte?: string
          raca?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      servicos_creche: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          is_opcional: boolean
          is_padrao: boolean
          modelo_cobranca: string
          modelo_preco: string
          nome: string
          observacoes_internas: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor_grande: number | null
          valor_medio: number | null
          valor_pequeno: number | null
          valor_unico: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          is_opcional?: boolean
          is_padrao?: boolean
          modelo_cobranca?: string
          modelo_preco?: string
          nome: string
          observacoes_internas?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
          valor_grande?: number | null
          valor_medio?: number | null
          valor_pequeno?: number | null
          valor_unico?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          is_opcional?: boolean
          is_padrao?: boolean
          modelo_cobranca?: string
          modelo_preco?: string
          nome?: string
          observacoes_internas?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_grande?: number | null
          valor_medio?: number | null
          valor_pequeno?: number | null
          valor_unico?: number | null
        }
        Relationships: []
      }
      staff_accounts: {
        Row: {
          ativo: boolean
          created_at: string | null
          email: string
          id: string
          nome: string
          owner_id: string
          tipo_login: Database["public"]["Enums"]["app_role"]
          ultimo_acesso: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          email: string
          id?: string
          nome: string
          owner_id: string
          tipo_login?: Database["public"]["Enums"]["app_role"]
          ultimo_acesso?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          owner_id?: string
          tipo_login?: Database["public"]["Enums"]["app_role"]
          ultimo_acesso?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_codigo: string
          staff_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_codigo: string
          staff_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_codigo?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_permission_codigo_fkey"
            columns: ["permission_codigo"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          customer_email: string | null
          end_date: string | null
          hotmart_transaction_id: string | null
          id: string
          is_active: boolean | null
          plan_name: string
          start_date: string
          status: string
          stripe_customer_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          end_date?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          end_date?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          phone_number: string
          session_data: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          phone_number: string
          session_data?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          phone_number?: string
          session_data?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_mensagens_agendadas: {
        Row: {
          agendado_para: string
          agendamento_id: string | null
          agendamento_pacote_id: string | null
          created_at: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          mensagem: string | null
          numero_whatsapp: string
          servico_numero: string | null
          status: string
          tipo_mensagem: string
          user_id: string
        }
        Insert: {
          agendado_para: string
          agendamento_id?: string | null
          agendamento_pacote_id?: string | null
          created_at?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          numero_whatsapp: string
          servico_numero?: string | null
          status?: string
          tipo_mensagem: string
          user_id: string
        }
        Update: {
          agendado_para?: string
          agendamento_id?: string | null
          agendamento_pacote_id?: string | null
          created_at?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          numero_whatsapp?: string
          servico_numero?: string | null
          status?: string
          tipo_mensagem?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_mensagens_risco: {
        Row: {
          agendado_para: string
          cliente_id: string
          created_at: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          mensagem: string | null
          numero_whatsapp: string
          pets_incluidos: Json
          status: string
          tentativa: number
          user_id: string
        }
        Insert: {
          agendado_para?: string
          cliente_id: string
          created_at?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          numero_whatsapp: string
          pets_incluidos?: Json
          status?: string
          tentativa?: number
          user_id: string
        }
        Update: {
          agendado_para?: string
          cliente_id?: string
          created_at?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          numero_whatsapp?: string
          pets_incluidos?: Json
          status?: string
          tentativa?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_risco_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_effective_user_id: {
        Args: { _auth_user_id: string }
        Returns: string
      }
      get_user_tipo_login: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_administrador: { Args: { _user_id: string }; Returns: boolean }
      is_crm_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "taxi_dog" | "recepcionista"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "taxi_dog", "recepcionista"],
    },
  },
} as const

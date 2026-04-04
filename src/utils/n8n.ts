/**
 * Utilitário para integração com N8N
 * Permite disparar workflows do N8N a partir do frontend
 */

interface N8NWebhookConfig {
  baseUrl: string; // URL do seu N8N (ex: https://seu-n8n.com)
  authToken?: string; // Token de autenticação (opcional)
}

// Configure sua instância N8N aqui
const N8N_CONFIG: N8NWebhookConfig = {
  baseUrl: import.meta.env.VITE_N8N_BASE_URL || '',
  authToken: import.meta.env.VITE_N8N_AUTH_TOKEN || '',
};

/**
 * Dispara um webhook do N8N
 * @param workflowId - ID ou path do webhook no N8N
 * @param data - Dados a serem enviados
 */
export const triggerN8NWorkflow = async (
  workflowId: string,
  data: Record<string, any>
) => {
  try {
    const url = `${N8N_CONFIG.baseUrl}/webhook/${workflowId}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (N8N_CONFIG.authToken) {
      headers['Authorization'] = `Bearer ${N8N_CONFIG.authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao disparar workflow N8N:', error);
    throw error;
  }
};

/**
 * Exemplo de uso:
 * 
 * // Após criar um agendamento
 * await triggerN8NWorkflow('novo-agendamento', {
 *   cliente: 'João Silva',
 *   pet: 'Rex',
 *   data: '2025-01-20',
 *   horario: '14:00'
 * });
 */

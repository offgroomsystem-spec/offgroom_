import { useCallback, useRef } from "react";
import { toast } from "sonner";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos

type SendType = "whatsapp" | "pet_pronto";

interface SendRecord {
  timestamp: number;
}

/**
 * Hook para controlar cooldown de 30 minutos em envios manuais.
 * A chave de controle é: clienteNome + petNome + tipo de envio.
 * Persiste no sessionStorage para resistir a re-renders (mas não reloads completos, 
 * o que é desejável - um refresh total implica intenção explícita do usuário).
 */
export function useManualSendCooldown() {
  const sendMapRef = useRef<Map<string, SendRecord>>(new Map());
  
  // Initialize from sessionStorage on first call
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    try {
      const stored = sessionStorage.getItem("manual_send_cooldowns");
      if (stored) {
        const entries = JSON.parse(stored) as [string, SendRecord][];
        const now = Date.now();
        // Only restore entries that are still within cooldown
        for (const [key, record] of entries) {
          if (now - record.timestamp < COOLDOWN_MS) {
            sendMapRef.current.set(key, record);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const persistToStorage = useCallback(() => {
    try {
      const entries = Array.from(sendMapRef.current.entries());
      sessionStorage.setItem("manual_send_cooldowns", JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, []);

  const buildKey = useCallback((clienteNome: string, petNome: string, tipo: SendType): string => {
    return `${clienteNome.trim().toLowerCase()}|${petNome.trim().toLowerCase()}|${tipo}`;
  }, []);

  /**
   * Verifica se o envio é permitido.
   * @returns true se permitido, false se bloqueado (exibe toast automaticamente)
   */
  const canSend = useCallback((clienteNome: string, petNome: string, tipo: SendType): boolean => {
    const key = buildKey(clienteNome, petNome, tipo);
    const record = sendMapRef.current.get(key);
    
    if (!record) return true;
    
    const elapsed = Date.now() - record.timestamp;
    if (elapsed >= COOLDOWN_MS) {
      // Cooldown expirado, limpar
      sendMapRef.current.delete(key);
      persistToStorage();
      return true;
    }
    
    // Ainda em cooldown - mostrar feedback
    const remainingMs = COOLDOWN_MS - elapsed;
    const remainingMin = Math.ceil(remainingMs / 60000);
    const tipoLabel = tipo === "pet_pronto" ? "Pet Pronto" : "WhatsApp";
    
    toast.warning(
      `Você já enviou a mensagem "${tipoLabel}" para ${petNome} recentemente.`,
      {
        description: `Aguarde ${remainingMin} minuto${remainingMin > 1 ? 's' : ''} para enviar novamente.`,
        duration: 5000,
      }
    );
    
    return false;
  }, [buildKey, persistToStorage]);

  /**
   * Registra um envio realizado com sucesso.
   */
  const registerSend = useCallback((clienteNome: string, petNome: string, tipo: SendType) => {
    const key = buildKey(clienteNome, petNome, tipo);
    sendMapRef.current.set(key, { timestamp: Date.now() });
    persistToStorage();
  }, [buildKey, persistToStorage]);

  return { canSend, registerSend };
}

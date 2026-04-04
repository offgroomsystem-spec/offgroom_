export function normalizeBrazilPhone(rawPhone: string | number | null | undefined): string | null {
  if (rawPhone === null || rawPhone === undefined) return null;

  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;

  if (normalized.startsWith("55")) {
    normalized = normalized.slice(2);
  }

  if (normalized.length === 10) {
    normalized = `${normalized.slice(0, 2)}9${normalized.slice(2)}`;
  }

  if (normalized.length !== 11) {
    return null;
  }

  return `55${normalized}`;
}

export function buildWhatsAppUrl(rawPhone: string | number | null | undefined, text: string): string | null {
  const phone = normalizeBrazilPhone(rawPhone);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function getInvalidPhoneMessage(rawPhone: string | number | null | undefined): string {
  const digits = String(rawPhone ?? "").replace(/\D/g, "");
  if (!digits) return "Número de WhatsApp não informado.";
  return "Número de WhatsApp inválido. Use DDD + número com 9 dígitos.";
}
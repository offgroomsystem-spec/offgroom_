/**
 * Utilitário para cálculo de dias úteis (segunda a sexta)
 */

/**
 * Verifica se uma data é um dia útil (segunda a sexta)
 */
export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = domingo, 6 = sábado
};

/**
 * Adiciona X dias úteis a uma data
 * @param date Data inicial
 * @param days Número de dias úteis a adicionar
 * @returns Nova data após adicionar os dias úteis
 */
export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      addedDays++;
    }
  }

  return result;
};

/**
 * Subtrai X dias úteis de uma data
 * @param date Data inicial
 * @param days Número de dias úteis a subtrair
 * @returns Nova data após subtrair os dias úteis
 */
export const subtractBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let subtractedDays = 0;

  while (subtractedDays < days) {
    result.setDate(result.getDate() - 1);
    if (isBusinessDay(result)) {
      subtractedDays++;
    }
  }

  return result;
};

/**
 * Calcula quantos dias úteis existem entre duas datas
 * @param startDate Data inicial
 * @param endDate Data final
 * @returns Número de dias úteis entre as datas
 */
export const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      count++;
    }
  }

  return count;
};

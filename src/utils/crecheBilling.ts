/**
 * Calcula o valor a cobrar para serviços de creche por hora.
 * 
 * Regra de tolerância:
 * - Até 29 minutos excedentes: cobra apenas horas cheias
 * - A partir de 30 minutos: cobra proporcionalmente os minutos
 */
export function calcularValorPorHora(
  horaEntrada: string,
  dataEntrada: string,
  horaSaida: string,
  dataSaida: string,
  valorHora: number
): { horas: number; minutos: number; valorTotal: number; descricao: string } {
  const entrada = new Date(`${dataEntrada}T${horaEntrada}`);
  const saida = new Date(`${dataSaida}T${horaSaida}`);

  const diffMs = saida.getTime() - entrada.getTime();
  const totalMinutos = Math.max(0, Math.floor(diffMs / 60000));

  const horasCompletas = Math.floor(totalMinutos / 60);
  const minutosExcedentes = totalMinutos % 60;

  let valorTotal: number;
  let descricao: string;

  if (minutosExcedentes <= 29) {
    // Tolerância: cobra apenas horas cheias
    valorTotal = horasCompletas * valorHora;
    descricao = `${horasCompletas}h (${minutosExcedentes}min dentro da tolerância)`;
  } else {
    // Cobra horas + minutos proporcionais
    const valorMinuto = valorHora / 60;
    valorTotal = (horasCompletas * valorHora) + (minutosExcedentes * valorMinuto);
    descricao = `${horasCompletas}h${minutosExcedentes}min (minutos cobrados proporcionalmente)`;
  }

  return {
    horas: horasCompletas,
    minutos: minutosExcedentes,
    valorTotal: Math.round(valorTotal * 100) / 100,
    descricao,
  };
}

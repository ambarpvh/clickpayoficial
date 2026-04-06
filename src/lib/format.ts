/**
 * Formata um valor numérico no padrão monetário brasileiro (R$ 1.234,56)
 * @param value - valor numérico
 * @param decimals - casas decimais (padrão: 2)
 */
export function formatBRL(value: number, decimals: number = 2): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Todo valor em reais circula no código como centavos inteiros (2400 = R$ 24,00).
// Somar centavos é exato; somar 0.1 + 0.2 em ponto flutuante dá 0.30000000000000004.
// A divisão por 100 só acontece aqui, na hora de mostrar o texto.

const formatoBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Guarani não tem centavos, então o valor já é inteiro em guaranis.
const formatoPYG = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'PYG' });

export function formatarReais(centavos) {
  return formatoBRL.format(centavos / 100);
}

export function formatarGuaranis(guaranis) {
  return formatoPYG.format(guaranis);
}

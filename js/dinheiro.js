// Todo valor em reais circula no código como centavos inteiros (2400 = R$ 24,00).
// Somar centavos é exato; somar 0.1 + 0.2 em ponto flutuante dá 0.30000000000000004.
// A divisão por 100 só acontece aqui, na hora de mostrar o texto.

const formatoBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Guarani não tem centavos, então o valor já é inteiro em guaranis.
// Não usamos style: 'currency' porque em pt-BR ele escreve "PYG 100.000";
// em CDE o costume é "Gs. 100.000".
const formatoMilhares = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatarReais(centavos) {
  return formatoBRL.format(centavos / 100);
}

export function formatarGuaranis(guaranis) {
  return `Gs. ${formatoMilhares.format(guaranis)}`;
}

// Lê o que a pessoa digitou ("50", "50,5", "R$ 1.000,00", "50.00") e devolve centavos
// inteiros, ou null se não der para entender. Não usa parseFloat: "50,10" vira 50*100 + 10,
// sem passar por número com vírgula.
export function lerReais(texto) {
  const limpo = String(texto).replace(/R\$|\s/g, '');
  if (!limpo || limpo.split(',').length > 2) return null;

  let inteiros;
  let decimais = '';
  if (limpo.includes(',')) {
    // Padrão brasileiro: vírgula separa os centavos, pontos separam milhares.
    [inteiros, decimais] = limpo.split(',');
    inteiros = inteiros.replaceAll('.', '');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    inteiros = limpo.replaceAll('.', ''); // "1.000" = mil
  } else {
    [inteiros, decimais = ''] = limpo.split('.'); // "50.5" digitado com ponto
  }

  if (!/^\d+$/.test(inteiros) || !/^\d{0,2}$/.test(decimais ?? '')) return null;
  return Number(inteiros) * 100 + Number((decimais ?? '').padEnd(2, '0'));
}

// Guarani não tem centavos: "100.000" ou "100000" viram 100000.
export function lerGuaranis(texto) {
  const limpo = String(texto).replace(/Gs\.?|₲|[\s.]/gi, '');
  return /^\d+$/.test(limpo) ? Number(limpo) : null;
}

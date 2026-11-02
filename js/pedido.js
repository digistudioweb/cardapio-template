// O que a pessoa escolheu para um item, o preço disso e se está tudo preenchido.
// Funções puras (não mexem na página): o painel usa agora e o carrinho vai reusar
// para recalcular preços a partir do JSON.
//
// Formato de uma seleção:
// {
//   chave: 'tradicionais/marguerita',
//   escolhas: { 'tam-tradicional': ['g'], 'borda-salgada': [] },
//   adicionais: { 'adic-salgada': { bacon: 2 } },
//   segundoSabor: 'gourmet/file-alho' ou null,   // meia a meia
//   observacao: 'sem cebola',
//   quantidade: 1,
// }

import { precoTamanhoMeia } from './meia-meia.js';

export const QUANTIDADE_MAXIMA = 99;
export const OBSERVACAO_MAXIMA = 140;

export function novaSelecao(item) {
  const escolhas = {};
  for (const grupo of item.escolhas) {
    // Grupo obrigatório com uma opção só (ex.: sabor único) já vem marcado.
    escolhas[grupo.id] = grupo.min >= 1 && grupo.opcoes.length === 1 ? [grupo.opcoes[0].id] : [];
  }
  const adicionais = {};
  for (const grupo of item.adicionais) adicionais[grupo.id] = {};

  return { chave: item.chave, escolhas, adicionais, segundoSabor: null, observacao: '', quantidade: 1 };
}

function buscarOpcao(grupo, opcaoId) {
  return grupo.opcoes.find((o) => o.id === opcaoId) ?? null;
}

// Preço de UMA unidade, em centavos.
export function precoUnitario(selecao, cardapio) {
  const item = cardapio.buscarItem(selecao.chave);
  const segundo = selecao.segundoSabor ? cardapio.buscarItem(selecao.segundoSabor) : null;
  let total = segundo ? Math.max(item.preco, segundo.preco) : item.preco;

  for (const grupo of item.escolhas) {
    for (const opcaoId of selecao.escolhas[grupo.id] ?? []) {
      const opcao = buscarOpcao(grupo, opcaoId);
      if (!opcao) continue;
      total += grupo.tamanho && segundo ? precoTamanhoMeia(item, segundo, opcaoId) : opcao.preco;
    }
  }

  for (const grupo of item.adicionais) {
    for (const [opcaoId, quantidade] of Object.entries(selecao.adicionais[grupo.id] ?? {})) {
      const opcao = buscarOpcao(grupo, opcaoId);
      if (opcao) total += opcao.preco * quantidade;
    }
  }

  return total;
}

// Lista do que falta preencher: [{ grupoId, mensagem }]. Vazia = pode adicionar.
export function validarSelecao(selecao, cardapio, { meia = false } = {}) {
  const item = cardapio.buscarItem(selecao.chave);
  const erros = [];

  for (const grupo of item.escolhas) {
    const marcadas = (selecao.escolhas[grupo.id] ?? []).length;
    const min = grupo.min ?? 0;
    const max = grupo.max ?? grupo.opcoes.length;
    if (marcadas < min) {
      const texto = min === 1 ? 'Escolha uma opção' : `Escolha pelo menos ${min} opções`;
      erros.push({ grupoId: grupo.id, mensagem: `${texto} em “${grupo.nome}”.` });
    } else if (marcadas > max) {
      erros.push({ grupoId: grupo.id, mensagem: `Escolha no máximo ${max} em “${grupo.nome}”.` });
    }
  }

  if (meia && !selecao.segundoSabor) {
    erros.push({ grupoId: 'meia', mensagem: 'Escolha o segundo sabor.' });
  }

  return erros;
}

// Nome e detalhes de uma linha em texto, usados no carrinho e na mensagem do WhatsApp.
// { titulo: '½ Marguerita + ½ Costela com barbecue',
//   detalhes: ['Tamanho: Grande (8 fatias)', 'Borda recheada: Requeijão cremoso', '+ 2x Bacon extra'],
//   observacao: 'sem cebola' }
export function descreverLinha(selecao, cardapio) {
  const item = cardapio.buscarItem(selecao.chave);
  const segundo = selecao.segundoSabor ? cardapio.buscarItem(selecao.segundoSabor) : null;
  const titulo = segundo ? `½ ${item.nome} + ½ ${segundo.nome}` : item.nome;

  const detalhes = [];
  for (const grupo of item.escolhas) {
    const nomes = (selecao.escolhas[grupo.id] ?? [])
      .map((id) => buscarOpcao(grupo, id))
      .filter(Boolean)
      .map((opcao) => (opcao.detalhe ? `${opcao.nome} (${opcao.detalhe})` : opcao.nome));
    if (nomes.length > 0) detalhes.push(`${grupo.nome}: ${nomes.join(', ')}`);
  }
  for (const grupo of item.adicionais) {
    for (const [id, quantidade] of Object.entries(selecao.adicionais[grupo.id] ?? {})) {
      const opcao = buscarOpcao(grupo, id);
      if (opcao) detalhes.push(`+ ${quantidade}x ${opcao.nome}`);
    }
  }

  return { titulo, detalhes, observacao: selecao.observacao };
}

// Subtotal, taxa e total do pedido, conforme entrega ou retirada.
// Com taxa por bairro, a taxa é null ("a confirmar") e o total fica "subtotal + entrega".
export function calcularTotais(subtotal, entrega, modo) {
  if (modo === 'retirada') return { subtotal, taxa: 0, total: subtotal, taxaAConfirmar: false };
  if (entrega?.tipo === 'fixa') {
    return { subtotal, taxa: entrega.taxa, total: subtotal + entrega.taxa, taxaAConfirmar: false };
  }
  return { subtotal, taxa: null, total: subtotal, taxaAConfirmar: true };
}

// Texto curto da regra do grupo, mostrado ao lado do título.
export function regraDoGrupo(grupo) {
  const min = grupo.min ?? 0;
  const max = grupo.max ?? grupo.opcoes.length;
  if (min === 0 && max === 1) return 'Opcional';
  if (min === 1 && max === 1) return 'Obrigatório';
  if (min === 0) return `Opcional · até ${max}`;
  if (min === max) return `Obrigatório · escolha ${min}`;
  return `Obrigatório · de ${min} a ${max}`;
}

// Estado do carrinho: lista de linhas, junção de itens iguais e salvamento no localStorage.
// Não desenha nada na tela; quem desenha é ui-carrinho.js, avisado por ouvir().
//
// Cada linha guarda só o que a pessoa escolheu (ids, quantidade, observação), nunca preços.
// O preço é sempre recalculado do cardápio atual: se o restaurante mudar um valor no JSON,
// quem tinha o carrinho salvo vê o preço novo, e não um preço velho guardado no celular.

import { precoUnitario, validarSelecao, QUANTIDADE_MAXIMA } from './pedido.js';

let cardapio;
let chaveStorage;
let linhas = [];
const ouvintes = new Set();

export function iniciarCarrinho(dadosDoCardapio) {
  cardapio = dadosDoCardapio;
  // No GitHub Pages, vários clientes podem ficar no mesmo domínio (usuario.github.io/cliente-a,
  // /cliente-b) e o localStorage é compartilhado pelo domínio. O número do WhatsApp na chave
  // impede que o carrinho de uma pizzaria apareça na outra.
  chaveStorage = `cardapio:carrinho:v1:${cardapio.restaurante.whatsapp}`;
  linhas = carregar();
}

export function ouvir(funcao) {
  ouvintes.add(funcao);
}

function avisar() {
  salvar();
  ouvintes.forEach((funcao) => funcao());
}

/* ---------------------------------------------------------------------------
   Leitura
   --------------------------------------------------------------------------- */

export function listarLinhas() {
  return linhas.map((linha) => ({ ...linha, unitario: precoUnitario(linha, cardapio) }));
}

export function contarItens() {
  return linhas.reduce((soma, linha) => soma + linha.quantidade, 0);
}

export function calcularSubtotal() {
  return linhas.reduce((soma, linha) => soma + precoUnitario(linha, cardapio) * linha.quantidade, 0);
}

/* ---------------------------------------------------------------------------
   Alterações
   --------------------------------------------------------------------------- */

// Duas linhas só são "o mesmo item" com as mesmas escolhas, adicionais e observação.
// Aí soma a quantidade; senão, vira outra linha.
export function adicionar(selecao) {
  const assinatura = assinaturaDaLinha(selecao);
  const igual = linhas.find((linha) => assinaturaDaLinha(linha) === assinatura);

  if (igual) {
    igual.quantidade = Math.min(QUANTIDADE_MAXIMA, igual.quantidade + selecao.quantidade);
  } else {
    linhas.push({ ...selecao, id: gerarId() });
  }
  avisar();
}

export function alterarQuantidade(id, diferenca) {
  const linha = linhas.find((l) => l.id === id);
  if (!linha) return;
  linha.quantidade = Math.min(QUANTIDADE_MAXIMA, linha.quantidade + diferenca);
  if (linha.quantidade <= 0) remover(id);
  else avisar();
}

export function remover(id) {
  linhas = linhas.filter((linha) => linha.id !== id);
  avisar();
}

export function esvaziar() {
  linhas = [];
  avisar();
}

/* ---------------------------------------------------------------------------
   Comparação de linhas
   --------------------------------------------------------------------------- */

// Transforma a seleção num texto que é igual para pedidos iguais, não importa a ordem
// em que as opções foram marcadas. Na meia a meia, "Calabresa + Marguerita" e
// "Marguerita + Calabresa" também dão o mesmo texto.
export function assinaturaDaLinha(selecao) {
  const sabores = [selecao.chave, selecao.segundoSabor].filter(Boolean).sort();

  // Cada categoria tem seu grupo de tamanho (tam-tradicional, tam-gourmet…). Na meia a meia
  // aberta por sabores diferentes, o "Grande" vem de grupos diferentes mas é o mesmo tamanho.
  const item = cardapio.buscarItem(selecao.chave);
  const nomeDoGrupo = (grupoId) =>
    (item?.escolhas.find((g) => g.id === grupoId)?.tamanho ? 'tamanho' : grupoId);

  const escolhas = Object.entries(selecao.escolhas)
    .map(([grupo, ids]) => [nomeDoGrupo(grupo), [...ids].sort()])
    .filter(([, ids]) => ids.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const adicionais = Object.entries(selecao.adicionais)
    .flatMap(([grupo, porOpcao]) => Object.entries(porOpcao).map(([id, qtd]) => `${grupo}/${id}:${qtd}`))
    .sort();

  // "Sem cebola", "sem  cebola" e "sem cebola " são a mesma observação.
  const observacao = selecao.observacao.trim().replace(/\s+/g, ' ').toLowerCase();

  return JSON.stringify({ sabores, escolhas, adicionais, observacao });
}

// crypto.randomUUID() só existe em HTTPS ou localhost; testando pelo celular na rede local
// (http://192.168…) ele não existe. Para identificar linhas do carrinho, isto basta.
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------------------------------------------------------------------
   localStorage
   --------------------------------------------------------------------------- */

// localStorage pode falhar (navegação anônima no Safari antigo, armazenamento cheio,
// cookies bloqueados). Por isso o try/catch: sem ele, o cardápio inteiro quebraria;
// com ele, o carrinho só deixa de ser lembrado.
function salvar() {
  try {
    localStorage.setItem(chaveStorage, JSON.stringify(linhas));
  } catch (erro) {
    console.warn('Não foi possível salvar o carrinho:', erro);
  }
}

function carregar() {
  let salvas;
  try {
    salvas = JSON.parse(localStorage.getItem(chaveStorage) ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(salvas)) return [];

  // O cardápio pode ter mudado desde que o carrinho foi salvo (item saiu, opção mudou).
  // Fica só o que ainda existe e continua válido.
  return salvas.filter(linhaAindaValida);
}

function linhaAindaValida(linha) {
  try {
    const item = cardapio.buscarItem(linha.chave);
    if (!item) return false;
    if (linha.segundoSabor && !cardapio.buscarItem(linha.segundoSabor)) return false;
    if (!Number.isInteger(linha.quantidade) || linha.quantidade < 1) return false;

    const opcaoExiste = (grupos, grupoId, opcaoId) =>
      grupos.find((g) => g.id === grupoId)?.opcoes.some((o) => o.id === opcaoId);
    const escolhasOk = Object.entries(linha.escolhas)
      .every(([grupoId, ids]) => ids.every((id) => opcaoExiste(item.escolhas, grupoId, id)));
    const adicionaisOk = Object.entries(linha.adicionais)
      .every(([grupoId, porOpcao]) => Object.keys(porOpcao).every((id) => opcaoExiste(item.adicionais, grupoId, id)));

    return escolhasOk && adicionaisOk
      && validarSelecao(linha, cardapio, { meia: Boolean(linha.segundoSabor) }).length === 0;
  } catch {
    return false; // dado salvo com formato estranho: descarta a linha
  }
}

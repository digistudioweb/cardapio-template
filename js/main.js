// Ponto de entrada: carrega os dados e liga as partes da página.

import { carregarCardapio } from './dados.js';
import { calcularStatus } from './horario.js';
import {
  renderizarTopo,
  renderizarStatus,
  renderizarCategorias,
  renderizarSecoes,
  renderizarCreditos,
  acompanharCategoriaAtual,
} from './ui-cardapio.js';
import { iniciarPainelItem, abrirPainelItem } from './ui-item.js';
import { descreverLinha } from './pedido.js';
import * as carrinho from './carrinho.js';
import { iniciarUiCarrinho, avisar } from './ui-carrinho.js';
import { iniciarCheckout, abrirCheckout, atualizarDisponibilidade } from './ui-checkout.js';

async function iniciar() {
  let cardapio;
  try {
    cardapio = await carregarCardapio();
  } catch (erro) {
    console.error(erro);
    document.querySelector('[data-secoes]').innerHTML =
      '<p class="aviso-erro" role="alert">Não foi possível carregar o cardápio. Verifique sua conexão e recarregue a página.</p>';
    return;
  }

  const { restaurante, categorias, creditos } = cardapio;
  renderizarTopo(restaurante);
  renderizarCategorias(categorias);
  renderizarSecoes(categorias);
  renderizarCreditos(creditos);

  // Link direto para uma categoria (ex.: .../#cat-bebidas): quando o navegador tentou
  // pular para lá, as seções ainda não existiam, então pulamos agora.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();

  acompanharCategoriaAtual();

  carrinho.iniciarCarrinho(cardapio);
  iniciarCheckout(cardapio);
  iniciarUiCarrinho(cardapio, { aoFinalizar: () => abrirCheckout(document.querySelector('[data-abrir-carrinho]')) });
  iniciarPainelItem(cardapio, (selecao) => {
    carrinho.adicionar(selecao);
    avisar(`${descreverLinha(selecao, cardapio).titulo} foi para o carrinho`);
  });

  // Um ouvinte só para todos os cards (delegação): funciona para qualquer quantidade de itens.
  document.querySelector('[data-secoes]').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-item]');
    if (botao) abrirPainelItem(botao.dataset.item, botao);
  });

  // O status muda sozinho com o tempo (abre às 17:30, fecha às 01:30),
  // então recalculamos a cada minuto para quem deixa a página aberta.
  const atualizarStatus = () => {
    const status = calcularStatus(restaurante);
    renderizarStatus(status);
    atualizarDisponibilidade(status);
  };
  atualizarStatus();
  setInterval(atualizarStatus, 60 * 1000);
}

iniciar();

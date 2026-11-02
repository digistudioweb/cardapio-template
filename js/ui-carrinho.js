// Barra fixa do carrinho (embaixo da tela) e painel com a lista para editar ou remover.

import { formatarReais } from './dinheiro.js';
import { escapar } from './html.js';
import { prepararDialogo, abrirDialogo } from './dialogo.js';
import { descreverLinha } from './pedido.js';
import { textoEntrega } from './ui-cardapio.js';
import * as carrinho from './carrinho.js';

const $ = (seletor) => document.querySelector(seletor);

let cardapio;
let dialogo;
let aoFinalizar = null;
let temporizadorAviso;

const ICONE_LIXEIRA = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function iniciarUiCarrinho(dadosDoCardapio, opcoes = {}) {
  cardapio = dadosDoCardapio;
  aoFinalizar = opcoes.aoFinalizar ?? null;
  dialogo = $('[data-painel-carrinho]');
  prepararDialogo(dialogo);

  $('[data-abrir-carrinho]').addEventListener('click', (evento) => abrirDialogo(dialogo, evento.currentTarget));
  dialogo.addEventListener('click', aoClicar);
  $('[data-nota-entrega]').textContent = textoEntrega(cardapio.restaurante.entrega);

  carrinho.ouvir(renderizar);
  renderizar();
}

// Feedback ao adicionar: aparece em cima da barra e é lido pelo leitor de tela (role="status").
export function avisar(texto) {
  const aviso = $('[data-aviso]');
  aviso.textContent = texto;
  aviso.classList.add('aviso--visivel');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove('aviso--visivel'), 2500);
}

function aoClicar(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const { acao, id } = botao.dataset;

  if (acao === 'fechar') dialogo.close();
  if (acao === 'menos') carrinho.alterarQuantidade(id, -1);
  if (acao === 'mais') carrinho.alterarQuantidade(id, +1);
  if (acao === 'remover') carrinho.remover(id);
  if (acao === 'continuar' && aoFinalizar) {
    dialogo.close();
    aoFinalizar();
  }
}

/* ---------------------------------------------------------------------------
   Desenho
   --------------------------------------------------------------------------- */

function renderizar() {
  const quantidade = carrinho.contarItens();
  const subtotal = carrinho.calcularSubtotal();

  // Barra fixa
  $('[data-barra-carrinho]').hidden = quantidade === 0;
  $('[data-carrinho-qtd]').textContent = quantidade === 1 ? '1 item' : `${quantidade} itens`;
  $('[data-carrinho-total]').textContent = formatarReais(subtotal);

  // Painel. Redesenhar a lista apaga o botão que estava com foco; guardamos qual era
  // para devolver o foco ao botão equivalente (ou ao título, se a linha sumiu).
  const focado = dialogo.contains(document.activeElement) ? document.activeElement.dataset : null;

  $('[data-linhas]').innerHTML = carrinho.listarLinhas().map(htmlLinha).join('');
  $('[data-vazio]').hidden = quantidade > 0;
  $('[data-resumo]').hidden = quantidade === 0;
  $('[data-subtotal]').textContent = formatarReais(subtotal);
  $('[data-continuar]').hidden = !aoFinalizar;

  if (focado?.id && dialogo.open) {
    const mesmoBotao = dialogo.querySelector(`[data-acao="${focado.acao}"][data-id="${focado.id}"]:not(:disabled)`)
      ?? dialogo.querySelector(`[data-acao="remover"][data-id="${focado.id}"]`);
    (mesmoBotao ?? $('#carrinho-titulo')).focus();
  }
}

function htmlLinha(linha) {
  const { titulo, detalhes, observacao } = descreverLinha(linha, cardapio);
  const nome = escapar(titulo);
  const id = escapar(linha.id);

  // Com 1 unidade, o "−" vira lixeira: tirar a última unidade é remover a linha.
  const botaoMenos = linha.quantidade === 1
    ? `<button type="button" class="contador__botao" data-acao="menos" data-id="${id}" aria-label="Remover ${nome}">${ICONE_LIXEIRA}</button>`
    : `<button type="button" class="contador__botao" data-acao="menos" data-id="${id}" aria-label="Tirar uma unidade de ${nome}">−</button>`;

  return `
    <li class="linha">
      <div class="linha__texto">
        <p class="linha__titulo">${nome}</p>
        ${detalhes.length ? `<ul class="linha__detalhes" role="list">${detalhes.map((d) => `<li>${escapar(d)}</li>`).join('')}</ul>` : ''}
        ${observacao ? `<p class="linha__obs">Obs.: ${escapar(observacao)}</p>` : ''}
        <button type="button" class="linha__remover" data-acao="remover" data-id="${id}">Remover<span class="visualmente-oculto"> ${nome}</span></button>
      </div>
      <div class="linha__acoes">
        <p class="linha__preco">${formatarReais(linha.unitario * linha.quantidade)}</p>
        <div class="contador" role="group" aria-label="Quantidade de ${nome}">
          ${botaoMenos}
          <output class="contador__valor">${linha.quantidade}</output>
          <button type="button" class="contador__botao" data-acao="mais" data-id="${id}" aria-label="Pôr mais uma unidade de ${nome}"
            ${linha.quantidade >= 99 ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </li>`;
}

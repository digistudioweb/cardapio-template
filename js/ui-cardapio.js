// Desenha o que vem do JSON: topo, barra de categorias, seções com os itens e créditos.

import { formatarReais } from './dinheiro.js';
import { resumirHorarios } from './horario.js';
import { escapar } from './html.js';

const $ = (seletor) => document.querySelector(seletor);

export function renderizarTopo(restaurante) {
  document.title = `${restaurante.nome} — Cardápio e pedidos`;
  $('[data-nome]').textContent = restaurante.nome;
  $('[data-slogan]').textContent = restaurante.slogan ?? '';
  $('[data-sigla]').textContent = restaurante.sigla ?? restaurante.nome.slice(0, 1);

  const detalhes = [
    ...resumirHorarios(restaurante.horarios),
    textoEntrega(restaurante.entrega),
    restaurante.tempoEntrega && `Entrega em ${restaurante.tempoEntrega}`,
    restaurante.retirada && 'Retirada no local',
  ].filter(Boolean);

  $('[data-detalhes]').innerHTML = detalhes.map((d) => `<li>${escapar(d)}</li>`).join('');
}

export function textoEntrega(entrega) {
  if (entrega?.tipo === 'fixa') return `Taxa de entrega ${formatarReais(entrega.taxa)}`;
  return 'Taxa de entrega a confirmar (varia por bairro)';
}

export function renderizarStatus(status) {
  const elemento = $('[data-status]');
  elemento.classList.toggle('status--aberto', status.aberto);
  elemento.classList.toggle('status--fechado', !status.aberto);

  let texto = status.aberto ? 'Aberto agora' : 'Fechado agora';
  if (status.aberto && status.fechaAs) texto += ` · fecha às ${status.fechaAs}`;
  if (!status.aberto && status.abreEm) texto += ` · abre ${status.abreEm}`;
  if (status.forcado) texto += ' (modo teste)';
  elemento.textContent = texto;
}

export function renderizarCategorias(categorias) {
  $('[data-categorias]').innerHTML = categorias
    .map((c) => `<li><a href="#cat-${escapar(c.id)}" data-link-categoria="${escapar(c.id)}">${escapar(c.nome)}</a></li>`)
    .join('');
}

export function renderizarSecoes(categorias) {
  $('[data-secoes]').innerHTML = categorias.map(htmlSecao).join('');
}

function htmlSecao(categoria) {
  const foto = categoria.foto
    ? `<img class="secao__foto" src="${escapar(categoria.foto)}" alt="" width="640" height="480" loading="lazy">`
    : '';
  return `
    <section class="secao" id="cat-${escapar(categoria.id)}" aria-labelledby="titulo-${escapar(categoria.id)}">
      <div class="secao__cabecalho">
        ${foto}
        <h2 class="secao__titulo" id="titulo-${escapar(categoria.id)}">${escapar(categoria.nome)}</h2>
      </div>
      <ul class="itens" role="list">
        ${categoria.itens.map(htmlItem).join('')}
      </ul>
    </section>`;
}

function htmlItem(item) {
  const prefixo = item.temVariacao ? '<span class="item__a-partir">a partir de</span> ' : '';
  const foto = item.foto
    ? `<img class="item__foto" src="${escapar(item.foto)}" alt="" width="96" height="96" loading="lazy">`
    : '';
  // O botão fica dentro do título e "estica" por cima do card inteiro (via CSS ::after):
  // o card todo é clicável, mas leitores de tela anunciam só o nome, e não o card inteiro.
  return `
    <li>
      <article class="item">
        <div class="item__texto">
          <h3 class="item__nome">
            <button type="button" class="item__botao" data-item="${escapar(item.chave)}" aria-haspopup="dialog">${escapar(item.nome)}</button>
          </h3>
          <p class="item__descricao">${escapar(item.descricao)}</p>
          <p class="item__preco">${prefixo}${formatarReais(item.precoMinimo)}</p>
        </div>
        ${foto}
      </article>
    </li>`;
}

export function renderizarCreditos(creditos) {
  if (!creditos.length) return;
  const links = creditos
    .map((c) => `<a href="${escapar(c.url)}" target="_blank" rel="noopener">${escapar(c.uso)}: ${escapar(c.autor)}</a>`)
    .join(' · ');
  $('[data-creditos]').innerHTML = `Fotos do Unsplash. ${links}`;
}

// Destaca na barra a categoria que está passando na tela.
// Em vez de IntersectionObserver, olhamos qual foi a última seção cujo topo já
// passou da barra fixa: é mais simples de entender e funciona com seções de qualquer altura.
export function acompanharCategoriaAtual() {
  const barra = $('.categorias');
  const links = [...document.querySelectorAll('[data-link-categoria]')];
  const secoes = links.map((link) => document.getElementById(`cat-${link.dataset.linkCategoria}`));
  let agendado = false;
  let indiceAnterior = -1;

  function atualizar() {
    agendado = false;
    const limite = barra.getBoundingClientRect().bottom + 16;
    let atual = 0;
    secoes.forEach((secao, i) => {
      if (secao.getBoundingClientRect().top <= limite) atual = i;
    });
    if (atual === indiceAnterior) return;
    indiceAnterior = atual;

    links.forEach((link, i) => {
      if (i === atual) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

    // Rola só a barra (na horizontal) para o link ativo ficar visível.
    // scrollIntoView() também mexeria na rolagem da página, brigando com o dedo do usuário.
    const ativo = links[atual];
    const lista = ativo.closest('ul');
    const alvo = ativo.offsetLeft - (lista.clientWidth - ativo.offsetWidth) / 2;
    lista.scrollTo({ left: alvo, behavior: 'smooth' });
  }

  // requestAnimationFrame limita o cálculo a uma vez por quadro, mesmo com muitos eventos de scroll.
  window.addEventListener('scroll', () => {
    if (!agendado) {
      agendado = true;
      requestAnimationFrame(atualizar);
    }
  }, { passive: true });
  atualizar();
}

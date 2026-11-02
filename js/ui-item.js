// Painel que abre ao tocar num item: escolhas, meia a meia, adicionais, observação e quantidade.
// Fechar com Esc, tocar no fundo e devolver o foco ao card ficam em dialogo.js.

import { formatarReais } from './dinheiro.js';
import { prepararDialogo, abrirDialogo } from './dialogo.js';
import { escapar, normalizarBusca } from './html.js';
import {
  novaSelecao,
  precoUnitario,
  validarSelecao,
  regraDoGrupo,
  QUANTIDADE_MAXIMA,
  OBSERVACAO_MAXIMA,
} from './pedido.js';
import { grupoTamanho, permiteMeia, precoDoTamanho, precoTamanhoMeia, saboresParaMeia } from './meia-meia.js';

let dialogo;
let cardapio;
let aoAdicionar;

// Estado do painel aberto.
let item = null;
let selecao = null;
let modoMeia = false;

export function iniciarPainelItem(dadosDoCardapio, callbackAdicionar) {
  cardapio = dadosDoCardapio;
  aoAdicionar = callbackAdicionar;
  dialogo = document.querySelector('[data-painel-item]');
  prepararDialogo(dialogo);

  // Um ouvinte por tipo de evento no painel inteiro (delegação), em vez de um por botão:
  // o conteúdo é redesenhado a cada item aberto e os ouvintes continuam valendo.
  dialogo.addEventListener('click', aoClicar);
  dialogo.addEventListener('change', aoMudar);
  dialogo.addEventListener('input', aoDigitar);
  dialogo.addEventListener('submit', aoEnviar);
  dialogo.addEventListener('keydown', (evento) => {
    // Enter na busca de sabores não deve "enviar" o painel.
    if (evento.key === 'Enter' && evento.target.matches('[data-busca]')) evento.preventDefault();
  });
}

export function abrirPainelItem(chave, elementoOrigem) {
  item = cardapio.buscarItem(chave);
  if (!item) return;
  selecao = novaSelecao(item);
  modoMeia = false;

  dialogo.innerHTML = htmlPainel();
  atualizar();
  abrirDialogo(dialogo, elementoOrigem);
}

/* ---------------------------------------------------------------------------
   HTML
   --------------------------------------------------------------------------- */

function htmlPainel() {
  const foto = item.fotoPainel
    ? `<img class="painel__foto" src="${escapar(item.fotoPainel)}" alt="" width="640" height="480">`
    : '';

  // A meia a meia entra logo depois do tamanho, porque a diferença de preço depende dele.
  const grupos = item.escolhas.map((grupo) =>
    htmlGrupoEscolha(grupo) + (grupo.tamanho && permiteMeia(item) ? htmlMeia() : ''),
  );

  return `
    <form class="painel__form" novalidate>
      <!-- Fora da área que rola, para o "fechar" ficar sempre visível. -->
      <button type="button" class="painel__fechar" data-acao="fechar" aria-label="Fechar">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
      </button>
      <div class="painel__corpo">
        ${foto}
        <div class="painel__intro">
          <!-- autofocus: ao abrir, o foco vai para o nome do item (o leitor de tela anuncia
               o que abriu) em vez de cair no botão de fechar. -->
          <h2 class="painel__titulo" id="painel-item-titulo" tabindex="-1" autofocus>${escapar(item.nome)}</h2>
          <p class="painel__descricao">${escapar(item.descricao)}</p>
        </div>
        ${grupos.join('')}
        ${item.adicionais.map(htmlGrupoAdicional).join('')}
        <div class="grupo">
          <label class="grupo__titulo" for="painel-obs">Alguma observação?</label>
          <textarea class="campo" id="painel-obs" data-obs rows="2" maxlength="${OBSERVACAO_MAXIMA}"
            placeholder="Ex.: sem cebola, bem assada"></textarea>
        </div>
      </div>

      <div class="painel__rodape">
        <div class="contador" role="group" aria-label="Quantidade">
          <button type="button" class="contador__botao" data-acao="menos" aria-label="Diminuir quantidade">−</button>
          <output class="contador__valor" data-quantidade aria-live="polite">1</output>
          <button type="button" class="contador__botao" data-acao="mais" aria-label="Aumentar quantidade">+</button>
        </div>
        <button type="submit" class="botao-primario painel__adicionar">
          Adicionar <span data-total></span>
        </button>
      </div>
    </form>`;
}

function htmlCabecalhoGrupo(id, titulo, regra) {
  return `
    <legend class="grupo__titulo">
      <span>${escapar(titulo)}</span>
      <span class="grupo__regra">${escapar(regra)}</span>
    </legend>
    <p class="grupo__erro" id="erro-${escapar(id)}" data-erro="${escapar(id)}" aria-live="polite"></p>`;
}

function htmlGrupoEscolha(grupo) {
  // Uma opção só → radio. Várias → checkbox (o limite máximo é controlado em atualizar()).
  const unico = (grupo.max ?? grupo.opcoes.length) === 1;
  const tipo = unico ? 'radio' : 'checkbox';

  // Radio não "desmarca" sozinho; num grupo opcional (ex.: borda) damos a opção "Não quero".
  const nenhuma = unico && !grupo.min
    ? htmlOpcao({ tipo, grupo, opcao: { id: '', nome: 'Não quero' }, marcada: true })
    : '';

  return `
    <fieldset class="grupo" data-grupo="${escapar(grupo.id)}" aria-describedby="erro-${escapar(grupo.id)}">
      ${htmlCabecalhoGrupo(grupo.id, grupo.nome, regraDoGrupo(grupo))}
      <div class="opcoes">
        ${nenhuma}
        ${grupo.opcoes.map((opcao) => htmlOpcao({
          tipo, grupo, opcao, marcada: selecao.escolhas[grupo.id].includes(opcao.id),
        })).join('')}
      </div>
    </fieldset>`;
}

function htmlOpcao({ tipo, grupo, opcao, marcada }) {
  // No tamanho mostramos o preço cheio (R$ 41,00); nos outros, o acréscimo (+ R$ 8,00).
  let preco = '';
  if (grupo.tamanho) preco = formatarReais(opcao.preco);
  else if (opcao.preco > 0) preco = `+ ${formatarReais(opcao.preco)}`;

  return `
    <label class="opcao">
      <input type="${tipo}" name="g-${escapar(grupo.id)}" value="${escapar(opcao.id)}"
        data-tipo="escolha" data-grupo="${escapar(grupo.id)}" ${marcada ? 'checked' : ''}>
      <span class="opcao__nome">
        ${escapar(opcao.nome)}
        ${opcao.detalhe ? `<span class="opcao__detalhe">${escapar(opcao.detalhe)}</span>` : ''}
      </span>
      <span class="opcao__preco" ${grupo.tamanho ? `data-preco-tamanho="${escapar(opcao.id)}"` : ''}>${preco}</span>
    </label>`;
}

function htmlMeia() {
  const categorias = saboresParaMeia(item, cardapio);
  const lista = categorias.map((categoria) => `
    <div class="meia__categoria" data-categoria-meia>
      <p class="meia__categoria-nome">${escapar(categoria.nome)}</p>
      ${categoria.itens.map((outro) => `
        <label class="opcao" data-sabor-nome="${escapar(normalizarBusca(outro.nome))}">
          <input type="radio" name="segundo-sabor" value="${escapar(outro.chave)}" data-tipo="segundo">
          <span class="opcao__nome">
            ${escapar(outro.nome)}
            <span class="opcao__detalhe">${escapar(outro.descricao)}</span>
          </span>
          <span class="opcao__preco" data-diferenca="${escapar(outro.chave)}"></span>
        </label>`).join('')}
    </div>`).join('');

  return `
    <fieldset class="grupo" data-grupo="meia" aria-describedby="erro-meia">
      ${htmlCabecalhoGrupo('meia', 'Sabores', 'Opcional')}
      <div class="opcoes">
        <label class="opcao">
          <input type="radio" name="meia" value="inteira" data-tipo="meia" checked>
          <span class="opcao__nome">Inteira <span class="opcao__detalhe">1 sabor</span></span>
        </label>
        <label class="opcao">
          <input type="radio" name="meia" value="meia" data-tipo="meia">
          <span class="opcao__nome">Meia a meia <span class="opcao__detalhe">2 sabores · vale o preço da metade mais cara</span></span>
        </label>
      </div>
      <fieldset class="meia" data-meia hidden>
        <legend class="meia__titulo">Escolha a outra metade</legend>
        <label class="meia__busca">
          <span class="visualmente-oculto">Buscar sabor</span>
          <input class="campo" type="search" data-busca placeholder="Buscar sabor" autocomplete="off">
        </label>
        <div class="opcoes">${lista}</div>
        <p class="meia__vazio" data-busca-vazia hidden>Nenhum sabor encontrado.</p>
      </fieldset>
    </fieldset>`;
}

function htmlGrupoAdicional(grupo) {
  const linhas = grupo.opcoes.map((opcao) => `
    <li class="adicional">
      <span class="opcao__nome">
        ${escapar(opcao.nome)}
        <span class="opcao__detalhe">+ ${formatarReais(opcao.preco)}</span>
      </span>
      <div class="contador contador--pequeno" role="group" aria-label="Quantidade de ${escapar(opcao.nome)}">
        <button type="button" class="contador__botao" data-acao="adicional-menos"
          data-grupo="${escapar(grupo.id)}" data-opcao="${escapar(opcao.id)}"
          aria-label="Tirar um ${escapar(opcao.nome)}">−</button>
        <output class="contador__valor" data-qtd-adicional="${escapar(grupo.id)}/${escapar(opcao.id)}">0</output>
        <button type="button" class="contador__botao" data-acao="adicional-mais"
          data-grupo="${escapar(grupo.id)}" data-opcao="${escapar(opcao.id)}"
          aria-label="Pôr mais um ${escapar(opcao.nome)}">+</button>
      </div>
    </li>`).join('');

  return `
    <fieldset class="grupo" data-grupo="${escapar(grupo.id)}">
      ${htmlCabecalhoGrupo(grupo.id, grupo.nome, 'Opcional')}
      <ul class="adicionais" role="list">${linhas}</ul>
    </fieldset>`;
}

/* ---------------------------------------------------------------------------
   Eventos
   --------------------------------------------------------------------------- */

function aoClicar(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;

  const { acao, grupo, opcao } = botao.dataset;
  if (acao === 'fechar') dialogo.close();
  if (acao === 'menos') selecao.quantidade = Math.max(1, selecao.quantidade - 1);
  if (acao === 'mais') selecao.quantidade = Math.min(QUANTIDADE_MAXIMA, selecao.quantidade + 1);
  if (acao === 'adicional-menos' || acao === 'adicional-mais') {
    const atual = selecao.adicionais[grupo][opcao] ?? 0;
    const limite = item.adicionais.find((g) => g.id === grupo).opcoes.find((o) => o.id === opcao).maxQtd ?? QUANTIDADE_MAXIMA;
    const nova = acao === 'adicional-mais' ? Math.min(limite, atual + 1) : Math.max(0, atual - 1);
    if (nova === 0) delete selecao.adicionais[grupo][opcao];
    else selecao.adicionais[grupo][opcao] = nova;
  }
  atualizar();
}

function aoMudar(evento) {
  const campo = evento.target;
  const { tipo, grupo } = campo.dataset;

  if (tipo === 'escolha') {
    selecao.escolhas[grupo] = [...dialogo.querySelectorAll(`[data-grupo="${grupo}"] input:checked`)]
      .map((input) => input.value)
      .filter(Boolean); // tira o "Não quero" (valor vazio)
  }
  if (tipo === 'meia') {
    modoMeia = campo.value === 'meia';
    if (!modoMeia) {
      selecao.segundoSabor = null;
      dialogo.querySelectorAll('[data-tipo="segundo"]').forEach((input) => { input.checked = false; });
    }
  }
  if (tipo === 'segundo') selecao.segundoSabor = campo.value;
  atualizar();
}

function aoDigitar(evento) {
  if (evento.target.matches('[data-obs]')) selecao.observacao = evento.target.value;
  if (evento.target.matches('[data-busca]')) filtrarSabores(evento.target.value);
}

function aoEnviar(evento) {
  evento.preventDefault();
  const erros = validarSelecao(selecao, cardapio, { meia: modoMeia });

  if (erros.length > 0) {
    for (const { grupoId, mensagem } of erros) {
      dialogo.querySelector(`[data-erro="${grupoId}"]`).textContent = mensagem;
    }
    // Leva a pessoa até o primeiro grupo que falta preencher.
    const primeiro = dialogo.querySelector(`[data-grupo="${erros[0].grupoId}"]`);
    primeiro.scrollIntoView({ block: 'start', behavior: 'smooth' });
    primeiro.querySelector('input:not([type="search"])')?.focus({ preventScroll: true });
    return;
  }

  aoAdicionar({
    ...selecao,
    observacao: selecao.observacao.trim(),
    // Copia os objetos para o carrinho não compartilhar referência com o painel.
    escolhas: structuredClone(selecao.escolhas),
    adicionais: structuredClone(selecao.adicionais),
  });
  dialogo.close();
}

/* ---------------------------------------------------------------------------
   Atualiza a tela a partir do estado (preço, contadores, limites, erros resolvidos)
   --------------------------------------------------------------------------- */

function atualizar() {
  const pendentes = new Set(validarSelecao(selecao, cardapio, { meia: modoMeia }).map((e) => e.grupoId));

  // Enquanto falta escolher algo obrigatório (ex.: tamanho), o total ainda não é o preço
  // final; mostrar "R$ 0,00" confundiria, então o botão fica só com "Adicionar".
  const unitario = precoUnitario(selecao, cardapio);
  dialogo.querySelector('[data-total]').textContent =
    pendentes.size === 0 ? formatarReais(unitario * selecao.quantidade) : '';
  dialogo.querySelector('[data-quantidade]').textContent = selecao.quantidade;
  dialogo.querySelector('[data-acao="menos"]').disabled = selecao.quantidade <= 1;
  dialogo.querySelector('[data-acao="mais"]').disabled = selecao.quantidade >= QUANTIDADE_MAXIMA;

  // Checkbox: ao atingir o máximo, as opções não marcadas ficam desabilitadas.
  for (const grupo of item.escolhas) {
    const max = grupo.max ?? grupo.opcoes.length;
    if (max === 1) continue;
    const cheio = selecao.escolhas[grupo.id].length >= max;
    dialogo.querySelectorAll(`[data-grupo="${grupo.id}"] input`).forEach((input) => {
      input.disabled = cheio && !input.checked;
    });
  }

  for (const grupo of item.adicionais) {
    for (const opcao of grupo.opcoes) {
      const qtd = selecao.adicionais[grupo.id][opcao.id] ?? 0;
      dialogo.querySelector(`[data-qtd-adicional="${grupo.id}/${opcao.id}"]`).textContent = qtd;
      dialogo.querySelector(`[data-acao="adicional-menos"][data-grupo="${grupo.id}"][data-opcao="${opcao.id}"]`).disabled = qtd === 0;
      dialogo.querySelector(`[data-acao="adicional-mais"][data-grupo="${grupo.id}"][data-opcao="${opcao.id}"]`).disabled =
        qtd >= (opcao.maxQtd ?? QUANTIDADE_MAXIMA);
    }
  }

  if (permiteMeia(item)) atualizarMeia();

  // Some com a mensagem de erro dos grupos que já foram resolvidos.
  dialogo.querySelectorAll('[data-erro]').forEach((erro) => {
    if (!pendentes.has(erro.dataset.erro)) erro.textContent = '';
  });
}

function atualizarMeia() {
  dialogo.querySelector('[data-meia]').hidden = !modoMeia;

  const tamanhoId = selecao.escolhas[grupoTamanho(item).id][0];
  const segundo = selecao.segundoSabor ? cardapio.buscarItem(selecao.segundoSabor) : null;

  // Preço de cada tamanho já considerando a outra metade escolhida.
  dialogo.querySelectorAll('[data-preco-tamanho]').forEach((elemento) => {
    const id = elemento.dataset.precoTamanho;
    const preco = segundo ? precoTamanhoMeia(item, segundo, id) : precoDoTamanho(item, id);
    elemento.textContent = formatarReais(preco);
  });

  // Ao lado de cada sabor: quanto a pizza fica mais cara se ele for a outra metade.
  dialogo.querySelectorAll('[data-diferenca]').forEach((elemento) => {
    if (!tamanhoId) {
      elemento.textContent = '';
      return;
    }
    const outro = cardapio.buscarItem(elemento.dataset.diferenca);
    const diferenca = precoTamanhoMeia(item, outro, tamanhoId) - precoDoTamanho(item, tamanhoId);
    elemento.textContent = diferenca > 0 ? `+ ${formatarReais(diferenca)}` : '';
  });
}

function filtrarSabores(texto) {
  const busca = normalizarBusca(texto);
  let algumVisivel = false;
  dialogo.querySelectorAll('[data-categoria-meia]').forEach((categoria) => {
    let visiveisNaCategoria = 0;
    categoria.querySelectorAll('[data-sabor-nome]').forEach((opcao) => {
      const mostra = opcao.dataset.saborNome.includes(busca);
      opcao.hidden = !mostra;
      if (mostra) visiveisNaCategoria += 1;
    });
    categoria.hidden = visiveisNaCategoria === 0;
    if (visiveisNaCategoria > 0) algumVisivel = true;
  });
  dialogo.querySelector('[data-busca-vazia]').hidden = algumVisivel;
}

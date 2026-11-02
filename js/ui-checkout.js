// Finalização: nome, entrega ou retirada, complemento, pagamento, troco e envio pelo WhatsApp.
// O endereço não é digitado: chega pela localização do WhatsApp, enviada logo depois do pedido.

import { formatarReais, lerReais, lerGuaranis } from './dinheiro.js';
import { escapar } from './html.js';
import { prepararDialogo, abrirDialogo } from './dialogo.js';
import { calcularTotais } from './pedido.js';
import { montarMensagem, montarLink } from './whatsapp.js';
import { calcularStatus } from './horario.js';
import * as carrinho from './carrinho.js';

const $ = (seletor) => document.querySelector(seletor);

let cardapio;
let restaurante;
let dialogo;
let form;
let chaveCliente;

export function iniciarCheckout(dadosDoCardapio) {
  cardapio = dadosDoCardapio;
  restaurante = cardapio.restaurante;
  dialogo = $('[data-painel-checkout]');
  form = $('[data-form-checkout]');
  // Mesma lógica do carrinho: chave por restaurante, porque o domínio pode ser compartilhado.
  chaveCliente = `cardapio:cliente:v1:${restaurante.whatsapp}`;

  prepararDialogo(dialogo);
  $('[data-pagamentos]').innerHTML = restaurante.pagamentos.map((p) => `
    <label class="opcao">
      <input type="radio" name="pagamento" value="${escapar(p.id)}" aria-describedby="erro-pagamento">
      <span class="opcao__nome">${escapar(p.nome)}</span>
    </label>`).join('');
  $('[data-texto-taxa]').textContent = restaurante.entrega?.tipo === 'fixa'
    ? `taxa de ${formatarReais(restaurante.entrega.taxa)}`
    : 'taxa a confirmar (varia por bairro)';
  $('[data-opcao-retirada]').hidden = !restaurante.retirada;

  form.addEventListener('change', atualizar);
  form.addEventListener('input', (evento) => limparErro(evento.target.name));
  form.addEventListener('submit', aoEnviar);
  dialogo.addEventListener('click', aoClicar);

  // Se o carrinho esvaziar com a finalização aberta, não há o que enviar.
  carrinho.ouvir(() => {
    if (dialogo.open && carrinho.contarItens() === 0 && !$('[data-etapa-dados]').hidden) dialogo.close();
    if (dialogo.open) atualizar();
  });
}

export function abrirCheckout(origem) {
  if (carrinho.contarItens() === 0) return;
  mostrarEtapa('dados');
  preencherComDadosSalvos();
  atualizar();
  atualizarDisponibilidade();
  abrirDialogo(dialogo, origem);
}

/* ---------------------------------------------------------------------------
   Horário: fora dele, o envio fica bloqueado
   --------------------------------------------------------------------------- */

// Chamado ao abrir, a cada minuto (main.js) e de novo na hora de enviar,
// para o caso de a pessoa deixar a página aberta e o restaurante fechar nesse meio-tempo.
export function atualizarDisponibilidade(status = calcularStatus(restaurante)) {
  const aviso = $('[data-aviso-fechado]');
  const botao = $('[data-enviar]');
  aviso.hidden = status.aberto;
  aviso.textContent = status.abreEm
    ? `Estamos fechados agora. Abrimos ${status.abreEm}; o pedido pode ser enviado a partir desse horário.`
    : 'Estamos fechados agora. O pedido pode ser enviado quando abrirmos.';
  // aria-disabled em vez de disabled: o botão continua focável e o leitor de tela lê o aviso.
  botao.setAttribute('aria-disabled', String(!status.aberto));
  $('[data-texto-enviar]').textContent = status.aberto ? 'Enviar pedido no WhatsApp' : 'Fechado agora';
  return status;
}

/* ---------------------------------------------------------------------------
   Estado do formulário
   --------------------------------------------------------------------------- */

function lerFormulario() {
  const dados = new FormData(form);
  const pagamento = restaurante.pagamentos.find((p) => p.id === dados.get('pagamento')) ?? null;
  return {
    nome: (dados.get('nome') ?? '').trim(),
    modo: dados.get('modo') ?? 'entrega',
    referencia: (dados.get('referencia') ?? '').trim(),
    pagamento,
    precisaTroco: Boolean(pagamento?.troco) && dados.get('precisaTroco') === 'on',
    troco: (dados.get('troco') ?? '').trim(),
  };
}

function atualizar() {
  const dados = lerFormulario();
  const totais = calcularTotais(carrinho.calcularSubtotal(), restaurante.entrega, dados.modo);

  $('[data-endereco]').hidden = dados.modo !== 'entrega';
  $('[data-troco]').hidden = !dados.pagamento?.troco;
  $('[data-campo-troco]').hidden = !dados.precisaTroco;

  const campoTroco = form.elements.troco;
  if (dados.pagamento?.troco === 'PYG') {
    $('[data-rotulo-troco]').textContent = 'Troco para quanto? (em guaranis)';
    campoTroco.inputMode = 'numeric';
    campoTroco.placeholder = 'Ex.: 100.000';
  } else {
    $('[data-rotulo-troco]').textContent = 'Troco para quanto? (em reais)';
    campoTroco.inputMode = 'decimal';
    campoTroco.placeholder = 'Ex.: 100,00';
  }

  $('[data-checkout-subtotal]').textContent = formatarReais(totais.subtotal);
  $('[data-checkout-taxa]').textContent = dados.modo === 'retirada'
    ? 'Retirada (grátis)'
    : totais.taxaAConfirmar ? 'A confirmar' : formatarReais(totais.taxa);
  $('[data-checkout-total]').textContent = totais.taxaAConfirmar
    ? `${formatarReais(totais.total)} + entrega`
    : formatarReais(totais.total);

  return { dados, totais };
}

/* ---------------------------------------------------------------------------
   Validação
   --------------------------------------------------------------------------- */

function validar(dados, totais) {
  const erros = {};
  if (dados.nome.length < 2) erros.nome = 'Digite seu nome.';
  if (!dados.pagamento) erros.pagamento = 'Escolha a forma de pagamento.';

  let trocoPara = null;
  if (dados.precisaTroco) {
    if (dados.pagamento.troco === 'PYG') {
      trocoPara = lerGuaranis(dados.troco);
      if (!trocoPara) erros.troco = 'Digite o valor em guaranis. Ex.: 100.000';
    } else {
      trocoPara = lerReais(dados.troco);
      // Com taxa a confirmar, só dá para comparar com o subtotal.
      const minimo = totais.total;
      if (!trocoPara) {
        erros.troco = 'Digite o valor em reais. Ex.: 100,00';
      } else if (trocoPara <= minimo) {
        erros.troco = `O valor precisa ser maior que ${totais.taxaAConfirmar ? 'o subtotal' : 'o total'} (${formatarReais(minimo)}).`;
      }
    }
  }
  return { erros, trocoPara };
}

function mostrarErros(erros) {
  for (const [campo, mensagem] of Object.entries(erros)) {
    form.querySelector(`[data-erro-campo="${campo}"]`).textContent = mensagem;
    const elemento = form.elements[campo];
    // Radios (pagamento) chegam como lista; marcamos todos como inválidos.
    (elemento instanceof RadioNodeList ? [...elemento] : [elemento])
      .forEach((el) => el?.setAttribute('aria-invalid', 'true'));
  }
  const primeiro = Object.keys(erros)[0];
  const alvo = form.elements[primeiro];
  (alvo instanceof RadioNodeList ? alvo[0] : alvo)?.focus();
}

function limparErro(campo) {
  if (!campo) return;
  const erro = form.querySelector(`[data-erro-campo="${campo}"]`);
  if (erro) erro.textContent = '';
  const elemento = form.elements[campo];
  (elemento instanceof RadioNodeList ? [...elemento] : [elemento])
    .forEach((el) => el?.removeAttribute('aria-invalid'));
}

/* ---------------------------------------------------------------------------
   Envio
   --------------------------------------------------------------------------- */

function aoEnviar(evento) {
  evento.preventDefault();
  const { dados, totais } = atualizar();

  // Fechado: não envia. O aviso já está visível e ligado ao botão por aria-describedby.
  if (!atualizarDisponibilidade().aberto) return;

  ['nome', 'pagamento', 'troco'].forEach(limparErro);
  const { erros, trocoPara } = validar(dados, totais);
  if (Object.keys(erros).length > 0) {
    mostrarErros(erros);
    return;
  }

  const mensagem = montarMensagem(restaurante, cardapio, {
    linhas: carrinho.listarLinhas(),
    totais,
    cliente: dados,
    pagamento: dados.pagamento,
    trocoPara,
  });
  const link = montarLink(restaurante.whatsapp, mensagem);

  salvarDadosDoCliente(dados);
  // Nova aba: no celular abre o app do WhatsApp; no computador, o WhatsApp Web.
  // O carrinho NÃO é limpo aqui: a pessoa ainda pode desistir ou o WhatsApp pode não abrir.
  window.open(link, '_blank', 'noopener');

  $('[data-link-whatsapp]').href = link;
  $('[data-passo-localizacao]').hidden = dados.modo !== 'entrega';
  mostrarEtapa('sucesso');
  $('[data-titulo-sucesso]').focus();
}

function aoClicar(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const { acao } = botao.dataset;
  if (acao === 'fechar') dialogo.close();
  if (acao === 'voltar') {
    mostrarEtapa('dados');
    $('#checkout-titulo').focus();
  }
  if (acao === 'novo-pedido') {
    carrinho.esvaziar();
    dialogo.close();
  }
}

function mostrarEtapa(etapa) {
  dialogo.querySelectorAll('[data-etapa-dados]').forEach((el) => { el.hidden = etapa !== 'dados'; });
  $('[data-etapa-sucesso]').hidden = etapa !== 'sucesso';
}

/* ---------------------------------------------------------------------------
   Lembrar nome e endereço para o próximo pedido (só neste aparelho)
   --------------------------------------------------------------------------- */

function salvarDadosDoCliente(dados) {
  const { nome, modo, referencia } = dados;
  try {
    localStorage.setItem(chaveCliente, JSON.stringify({
      nome, modo, referencia, pagamento: dados.pagamento?.id,
    }));
  } catch {
    // Sem localStorage, só não lembramos os dados; o pedido segue normalmente.
  }
}

function preencherComDadosSalvos() {
  let salvos;
  try {
    salvos = JSON.parse(localStorage.getItem(chaveCliente) ?? 'null');
  } catch {
    return;
  }
  if (!salvos || typeof salvos !== 'object') return;

  for (const campo of ['nome', 'referencia']) {
    const elemento = form.elements[campo];
    if (!elemento.value && typeof salvos[campo] === 'string') elemento.value = salvos[campo];
  }
  const marcar = (nome, valor) => {
    const opcao = [...form.elements[nome]].find((el) => el.value === valor);
    if (opcao) opcao.checked = true;
  };
  if (!form.elements.pagamento.value && salvos.pagamento) marcar('pagamento', salvos.pagamento);
  if (salvos.modo === 'retirada' && restaurante.retirada) marcar('modo', 'retirada');
}

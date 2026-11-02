// Monta a mensagem do pedido e o link do WhatsApp.
// Funções puras: recebem dados, devolvem texto. Fácil de testar sem abrir o WhatsApp.
//
// No WhatsApp, *texto* fica em negrito.

import { formatarReais, formatarGuaranis } from './dinheiro.js';
import { descreverLinha } from './pedido.js';

/**
 * pedido = {
 *   linhas,                     // linhas do carrinho (com .unitario)
 *   totais,                     // de calcularTotais()
 *   cliente: { nome, modo: 'entrega' | 'retirada', referencia },
 *   pagamento: { nome, troco: 'BRL' | 'PYG' | undefined },
 *   trocoPara,                  // centavos (BRL) ou guaranis (PYG), ou null
 * }
 */
export function montarMensagem(restaurante, cardapio, pedido) {
  const { linhas, totais, cliente, pagamento, trocoPara } = pedido;
  const partes = [`*Pedido — ${restaurante.nome}*`, ''];

  for (const linha of linhas) {
    const { titulo, detalhes, observacao } = descreverLinha(linha, cardapio);
    partes.push(`*${linha.quantidade}x ${titulo}* — ${formatarReais(linha.unitario * linha.quantidade)}`);
    for (const detalhe of detalhes) partes.push(`   ${detalhe}`);
    if (observacao) partes.push(`   Obs.: ${observacao}`);
    partes.push('');
  }

  partes.push(`Subtotal: ${formatarReais(totais.subtotal)}`);
  if (cliente.modo === 'retirada') {
    partes.push('Retirada no local (sem taxa)');
    partes.push(`*Total: ${formatarReais(totais.total)}*`);
  } else if (totais.taxaAConfirmar) {
    partes.push('Entrega: taxa a confirmar (varia por bairro)');
    partes.push(`*Total: ${formatarReais(totais.total)} + entrega*`);
  } else {
    partes.push(`Entrega: ${formatarReais(totais.taxa)}`);
    partes.push(`*Total: ${formatarReais(totais.total)}*`);
  }

  partes.push('', `*Nome:* ${cliente.nome}`);
  if (cliente.modo === 'retirada') {
    partes.push('*Vou retirar no local*');
  } else {
    partes.push('*Para entrega*'); // o endereço vem pela localização (última linha da mensagem)
    if (cliente.referencia) partes.push(`*Complemento:* ${cliente.referencia}`);
  }

  let textoPagamento = `*Pagamento:* ${pagamento.nome}`;
  if (trocoPara) {
    const valor = pagamento.troco === 'PYG' ? formatarGuaranis(trocoPara) : formatarReais(trocoPara);
    textoPagamento += ` — troco para ${valor}`;
  } else if (pagamento.troco) {
    textoPagamento += ' — sem troco';
  }
  partes.push(textoPagamento);

  // A localização não vai no link: o motoboy usa a localização enviada pelo próprio WhatsApp.
  if (cliente.modo === 'entrega') {
    partes.push('', 'Vou enviar minha localização do WhatsApp logo em seguida.');
  }

  return partes.join('\n');
}

export function montarLink(numero, mensagem) {
  // wa.me quer só dígitos, com código do país (595 Paraguai, 55 Brasil), sem "+".
  const digitos = String(numero).replace(/\D/g, '');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

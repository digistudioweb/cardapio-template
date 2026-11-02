// Comportamento comum aos painéis (<dialog>): o do item, o do carrinho e o da finalização.
//
// showModal() já dá de graça: fechar com Esc, foco preso dentro do painel e o resto da
// página inerte. Aqui completamos com duas coisas que ele não faz em todos os navegadores:
// fechar ao tocar no fundo escuro e devolver o foco para quem abriu o painel.

const origens = new WeakMap();

export function prepararDialogo(dialogo) {
  dialogo.addEventListener('click', (evento) => {
    // O clique no fundo escuro chega com o próprio <dialog> como alvo
    // (o conteúdo de dentro ocupa toda a área visível do painel).
    if (evento.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener('close', () => {
    const origem = origens.get(dialogo);
    // Só devolve o foco se o elemento ainda estiver na página (pode ter sido removido).
    if (origem?.isConnected) origem.focus();
  });
}

export function abrirDialogo(dialogo, origem = document.activeElement) {
  origens.set(dialogo, origem);
  dialogo.showModal();
}

// Regras de meia a meia (pizza com 2 sabores).
//
// - Só combina sabores do mesmo grupo de meia ("salgadas" com salgadas, "doces" com doces),
//   definido em cada categoria do JSON pelo campo "meiaMeia".
// - O preço do tamanho é o da metade mais cara: Tradicional G (R$ 41) com Gourmet G (R$ 55) = R$ 55.
// - Borda e adicionais seguem o primeiro sabor (são da pizza inteira).

export function grupoTamanho(item) {
  return item.escolhas.find((grupo) => grupo.tamanho) ?? null;
}

export function permiteMeia(item) {
  return Boolean(item.meiaMeia && grupoTamanho(item));
}

export function precoDoTamanho(item, tamanhoId) {
  return grupoTamanho(item)?.opcoes.find((o) => o.id === tamanhoId)?.preco ?? null;
}

export function precoTamanhoMeia(primeiro, segundo, tamanhoId) {
  return Math.max(precoDoTamanho(primeiro, tamanhoId) ?? 0, precoDoTamanho(segundo, tamanhoId) ?? 0);
}

// Sabores que podem ser a outra metade, agrupados por categoria para a lista do painel.
export function saboresParaMeia(item, cardapio) {
  return cardapio.categorias
    .map((categoria) => ({
      nome: categoria.nome,
      itens: categoria.itens.filter(
        (outro) => outro.chave !== item.chave && outro.meiaMeia === item.meiaMeia && grupoTamanho(outro),
      ),
    }))
    .filter((categoria) => categoria.itens.length > 0);
}

// Único lugar que sabe de onde vem o cardápio.
// Na fase 2 (Google Sheets publicado como CSV), só este arquivo muda:
// o resto do site continua recebendo o mesmo objeto de carregarCardapio().

const URL_CARDAPIO = 'data/cardapio.json';

export async function carregarCardapio() {
  const resposta = await fetch(URL_CARDAPIO);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${URL_CARDAPIO} (HTTP ${resposta.status})`);
  }
  const bruto = await resposta.json();
  return prepararCardapio(bruto);
}

// No JSON, os grupos (tamanho, borda, adicionais) são escritos uma vez e
// referenciados pelo id, para não repetir os 4 tamanhos em cada pizza.
// Aqui trocamos cada id pelo grupo de verdade, para a interface não precisar saber disso.
function prepararCardapio(bruto) {
  const { restaurante, grupos = {}, categorias = [], creditos = [] } = bruto;

  const buscarGrupo = (id, onde) => {
    const grupo = grupos[id];
    if (!grupo) throw new Error(`Grupo "${id}" usado em "${onde}" não existe em "grupos"`);
    return { id, ...grupo };
  };

  const categoriasProntas = categorias.map((categoria) => ({
    ...categoria,
    itens: categoria.itens.map((item) => {
      const onde = `${categoria.id}/${item.id}`;
      // Grupos da categoria valem para todos os itens; o item pode acrescentar os seus.
      const escolhas = [...(categoria.escolhas ?? []), ...(item.escolhas ?? [])]
        .map((id) => buscarGrupo(id, onde));
      const adicionais = [...(categoria.adicionais ?? []), ...(item.adicionais ?? [])]
        .map((id) => buscarGrupo(id, onde));

      return {
        ...item,
        // "categoria/item": o mesmo id de item pode existir em categorias diferentes.
        chave: `${categoria.id}/${item.id}`,
        categoriaId: categoria.id,
        // Sem foto própria, o card fica só com texto (a foto da categoria já aparece
        // no topo da seção); o painel do item usa a da categoria como reserva.
        foto: item.foto ?? null,
        fotoPainel: item.foto ?? categoria.foto ?? null,
        meiaMeia: categoria.meiaMeia ?? null,
        escolhas,
        adicionais,
        precoMinimo: calcularPrecoMinimo(item.preco, escolhas),
        temVariacao: escolhas.some(temPrecosDiferentes),
      };
    }),
  }));

  const itensPorChave = new Map(
    categoriasProntas.flatMap((c) => c.itens.map((item) => [item.chave, item])),
  );

  return {
    restaurante,
    categorias: categoriasProntas,
    creditos,
    buscarItem: (chave) => itensPorChave.get(chave) ?? null,
  };
}

// Menor valor possível do item: preço base + as opções mais baratas das escolhas obrigatórias.
// É o que aparece no card como "a partir de".
function calcularPrecoMinimo(precoBase, escolhas) {
  let total = precoBase;
  for (const grupo of escolhas) {
    if (!grupo.min) continue;
    const maisBaratas = grupo.opcoes.map((o) => o.preco).sort((a, b) => a - b).slice(0, grupo.min);
    total += maisBaratas.reduce((soma, preco) => soma + preco, 0);
  }
  return total;
}

function temPrecosDiferentes(grupo) {
  // Escolha opcional com preço (ex.: borda) não muda o "a partir de".
  if (!grupo.min) return false;
  return new Set(grupo.opcoes.map((o) => o.preco)).size > 1;
}

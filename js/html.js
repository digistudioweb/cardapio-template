// Os textos vêm do JSON (e na fase 2, de uma planilha que qualquer pessoa edita).
// Escapar evita que um "<" num nome de pizza quebre o HTML ou injete código.
export function escapar(texto = '') {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// "Calabresa" e "calabresa", "Brócolis" e "brocolis" viram a mesma coisa (usado na busca).
export function normalizarBusca(texto = '') {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

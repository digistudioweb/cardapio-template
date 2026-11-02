# Cardápio Template — Digi Studio

Cardápio digital com pedido pelo WhatsApp, para restaurantes e deliverys.
HTML, CSS e JavaScript puros: sem framework, sem build, sem dependências.

O conteúdo de exemplo é de uma pizzaria **fictícia** (Brasa & Massa Pizzaria).

## Rodar no computador

Os arquivos usam ES modules e `fetch`, que não funcionam abrindo o `index.html` direto
(endereço `file://`). Rode um servidor local na pasta do projeto:

```bash
python3 -m http.server 8080
```

E abra http://localhost:8080.

Para testar no celular, na mesma rede Wi-Fi: descubra o IP do computador
(`ipconfig getifaddr en0` no Mac) e abra `http://SEU-IP:8080` no celular.

### Testar fora do horário de funcionamento

O envio do pedido é bloqueado quando o restaurante está fechado. Para testar a qualquer hora:

- `http://localhost:8080/?teste=aberto` — força "aberto"
- `http://localhost:8080/?teste=fechado` — força "fechado"

O status mostra "(modo teste)" para ninguém esquecer que está forçado.

## Trocar de cliente

Cada cliente é uma cópia deste repositório. O código (`js/`) não muda; mudam estas 5 coisas:

### 1. `data/cardapio.json`

Todo o cardápio e os dados do restaurante. **Preços sempre em centavos** (R$ 24,00 = `2400`).

```jsonc
"restaurante": {
  "nome": "Nome do Restaurante",
  "sigla": "NR",                       // aparece no círculo do topo (sem logo)
  "slogan": "Frase curta",
  "cidade": "Foz do Iguaçu",
  "whatsapp": "5545999999999",         // só dígitos, com código do país: 55 Brasil, 595 Paraguai
  "fusoHorario": "America/Sao_Paulo",  // CDE: "America/Asuncion"
  "horarios": [
    // dias: 0 = domingo … 6 = sábado. Se "fecha" for menor que "abre", fecha no dia seguinte.
    { "dias": [2, 3, 4, 5, 6, 0], "abre": "18:00", "fecha": "23:30" }
  ],
  "tempoEntrega": "40 a 60 min",
  "entrega": { "tipo": "por_bairro" }, // ou { "tipo": "fixa", "taxa": 700 }
  "retirada": true,
  "pagamentos": [
    { "id": "pix", "nome": "Pix" },
    { "id": "real", "nome": "Dinheiro (R$)", "troco": "BRL" },     // "troco" ativa o campo de troco
    { "id": "guarani", "nome": "Dinheiro (Guarani)", "troco": "PYG" }
  ]
}
```

**Grupos** (`"grupos"`) são escritos uma vez e usados por várias categorias ou itens:

- **Escolha** (tamanho, borda, sabor): tem `min` e `max`. `min: 1` = obrigatório.
  `min: 0, max: 1` = opcional (aparece "Não quero").
  O `preco` de cada opção é **somado** ao preço do item.
- **Tamanho**: uma escolha com `"tamanho": true`. É usado na meia a meia
  (vale o preço da metade mais cara). Use os **mesmos ids** de opção (`p`, `m`, `g`, `f`)
  em todas as categorias, para dar para comparar.
- **Adicional** (bacon extra…): opções com `preco` e `maxQtd`; a pessoa escolhe a quantidade.

**Categorias** ligam os grupos aos itens:

```jsonc
{
  "id": "tradicionais",
  "nome": "Tradicionais",
  "foto": "img/tradicionais.jpg",
  "meiaMeia": "salgadas",      // pizzas com o mesmo valor aqui podem ser combinadas
  "escolhas": ["tam-tradicional", "borda-salgada"],
  "adicionais": ["adic-salgada"],
  "itens": [
    { "id": "marguerita", "nome": "Marguerita", "descricao": "…", "preco": 0 }
  ]
}
```

- Pizza com preço pelo tamanho: `"preco": 0` e o valor fica nas opções do tamanho.
- Item de preço fixo (bebida): `"preco": 750` e, se precisar, `"escolhas": ["sabor-lata"]` no próprio item.
- Foto própria no card: `"foto": "img/marguerita.jpg"` no item. Sem foto, o card fica só com texto.
- Categoria sem `meiaMeia` não oferece meia a meia.

### 2. Cores e fontes — `css/estilos.css`, bloco `:root`

Troque as variáveis `--cor-*`. Antes de publicar, confira o contraste
(mínimo 4.5:1 para texto) em https://webaim.org/resources/contrastchecker/.
O verde `--cor-whatsapp` é só do botão de enviar pedido e usa texto escuro.

### 3. Fotos — pasta `img/`

- `capa.jpg` (topo, ~1600×700), `og.jpg` (prévia de link, **1200×630**),
  uma por categoria (~640×480) e `favicon.svg`.
- Fotos de banco de imagens só do **Unsplash ou Pexels**, com crédito em `"creditos"` no JSON.
- Fotos do próprio cliente: não precisam de crédito; apague as entradas de `"creditos"`.

### 4. `<head>` do `index.html`

O Google e a prévia de link do WhatsApp **não executam JavaScript**, então estes dados
ficam escritos no HTML e precisam ser trocados à mão:

- `<title>`, `meta description`, `theme-color`;
- as tags `og:*` (título, descrição, imagem);
- o bloco `application/ld+json` (nome, telefone, cidade, horário).

### 5. `DOMINIO`

Troque `DOMINIO` pelo endereço final (ex.: `pizzariaexemplo.com.br` ou
`usuario.github.io/cliente`) em: `index.html`, `robots.txt` e `sitemap.xml`.

```bash
grep -rl DOMINIO . --include=*.html --include=*.txt --include=*.xml
```

> No GitHub Pages sem domínio próprio, o site fica numa subpasta
> (`usuario.github.io/cliente/`) e o `robots.txt` não vale (ele só funciona na raiz do domínio).
> Com domínio próprio, funciona normalmente.

### Checklist antes de entregar

- [ ] Fazer um pedido completo (item com escolha, adicional e observação) e conferir a mensagem no WhatsApp.
- [ ] Testar `?teste=fechado` (o botão de envio fica bloqueado).
- [ ] Testar no celular (375px) e no computador.
- [ ] Colar o link no WhatsApp e ver se a prévia (foto, título) aparece.
- [ ] Nenhum `DOMINIO` sobrando.

## Publicar no GitHub Pages

1. Suba o repositório para o GitHub.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. Para domínio próprio, preencha **Custom domain** e configure o DNS no registro do domínio.

Todos os caminhos são relativos (`css/…`, `img/…`), então funciona em subpasta ou na raiz.

## Como o código está organizado

| Arquivo | O que faz |
|---|---|
| `js/main.js` | Ponto de entrada: carrega os dados e liga as partes. |
| `js/dados.js` | **Único lugar que sabe de onde vem o cardápio.** Na fase 2 (Google Sheets), só ele muda. |
| `js/dinheiro.js` | Formata e lê valores em centavos (R$) e guaranis, sem ponto flutuante. |
| `js/horario.js` | Aberto/fechado no fuso do restaurante, inclusive turnos que passam da meia-noite. |
| `js/pedido.js` | Preço, validação e descrição de um item escolhido; totais do pedido. |
| `js/meia-meia.js` | Regras da meia a meia. |
| `js/carrinho.js` | Estado do carrinho, junção de itens iguais e `localStorage`. |
| `js/whatsapp.js` | Monta a mensagem e o link `wa.me`. |
| `js/dialogo.js` | Comportamento comum dos painéis (Esc, toque no fundo, foco). |
| `js/ui-*.js` | Desenham a tela: cardápio, painel do item, carrinho e finalização. |
| `js/html.js` | Escapar texto e normalizar buscas. |

## Fase 2 (planejada): cardápio no Google Sheets

O dono do restaurante edita uma planilha publicada como CSV, e o site lê de lá.
A troca acontece só em `js/dados.js`: ele precisa devolver o mesmo objeto que devolve hoje
(`restaurante`, `categorias`, `creditos`, `buscarItem`).

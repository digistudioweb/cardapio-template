# Cardápio Template — Digi Studio

Template de cardápio digital com pedido pelo WhatsApp, para restaurantes e deliverys (CDE e Foz). Cada cliente novo é uma cópia deste repositório com os dados dele. O conteúdo de exemplo é de um restaurante fictício e deve parecer fictício (nada de nome, logo ou foto de negócio real).

## Stack

- HTML, CSS e JavaScript puros. Sem frameworks, sem bibliotecas, sem build.
- ES modules nativos (`<script type="module">`, imports com extensão `.js`). Precisa de servidor local para testar.
- Publicação estática no GitHub Pages, com caminhos relativos.

## Dados

- Todo o cardápio vem de `data/cardapio.json`: dados do restaurante (nome, WhatsApp, horário, taxa de entrega, formas de pagamento), categorias e itens.
- Trocar de cliente = trocar o JSON, as cores em `:root` e as fotos. O código não muda.
- Depois (fase 2), o JSON pode vir de uma planilha do Google Sheets publicada como CSV. Deixar a leitura dos dados num módulo separado para essa troca ser fácil.

## Funcionalidades

1. Topo com nome, horário, status aberto/fechado e taxa de entrega.
2. Categorias fixas no topo (rolagem horizontal), levando à seção certa.
3. Item: foto, nome, descrição curta e preço. Ao tocar, abre um painel com:
   - escolhas obrigatórias (ex.: ponto da carne, tamanho), com mínimo e máximo;
   - adicionais pagos (ex.: bacon +R$ 4), com quantidade;
   - observação livre (ex.: sem cebola);
   - quantidade e botão "Adicionar".
4. Carrinho fixo embaixo (quantidade e total), que abre a lista para editar ou remover.
5. Finalização: nome, entrega ou retirada, complemento/referência opcional (se entrega), forma de pagamento e troco. Não pedir rua nem bairro digitados: o endereço chega pela localização do WhatsApp.
6. Botão "Enviar pedido no WhatsApp": monta a mensagem formatada (itens, escolhas, adicionais, observações, subtotal, taxa, total, dados do cliente) e abre `https://wa.me/<numero>?text=<encodeURIComponent(mensagem)>`.
   - A localização não vai no link. A mensagem termina pedindo para o cliente mandar a localização do WhatsApp em seguida, porque é o que o motoboy usa.
   - Se a taxa varia por bairro, mostrar "taxa a confirmar".
7. O carrinho fica salvo no `localStorage` (com try/catch) para não sumir se a pessoa sair da página.

Dois itens do carrinho só são "o mesmo item" se tiverem as mesmas escolhas, adicionais e observação. Nesse caso, soma a quantidade; senão, viram linhas separadas.

## Convenções

- Mobile first (375px), depois `@media (min-width: …)`. O cardápio é usado quase sempre no celular.
- Texto nunca abaixo de 16px no celular; botões com pelo menos 44px de altura.
- Cores, fontes e espaçamentos em variáveis CSS no `:root`. O botão verde (#25D366) é só do WhatsApp.
- Acessível: HTML semântico, um `h1`, painéis com foco gerenciado e fechamento com Esc, `:focus-visible`, contraste 4.5:1.
- Preços sempre em centavos (inteiros) no código, formatados com `Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})`. Nunca somar valores com casas decimais em ponto flutuante.
- SEO básico: `<title>`, meta description, Open Graph com imagem, favicon, JSON-LD `Restaurant`, `robots.txt`, `sitemap.xml` (domínio como `DOMINIO`).
- "Feito por Digi Studio" pequeno no rodapé, com link para https://instagram.com/digistudio.web.
- Fotos de exemplo só do Unsplash ou Pexels, com crédito. Nunca inventar dados reais de cliente.
- Comentários curtos explicando o "porquê" de decisões não óbvias. O dono do projeto é dev em formação.

## Fluxo de trabalho

- Antes de codar, mostrar o plano (arquivos, módulos, formato do JSON, paleta, fontes) e esperar aprovação.
- Construir por etapas, testando cada uma no navegador (375px e 1280px) antes da próxima.
- Testar a mensagem final do WhatsApp com um pedido completo (item com escolha, adicional e observação).

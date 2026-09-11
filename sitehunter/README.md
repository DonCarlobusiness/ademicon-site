# SiteHunter AI

> Nome provisório do produto.

Aplicativo web SaaS para encontrar empresas com baixa presença digital — sobretudo as
que ainda **não possuem site** —, classificá-las por potencial comercial, gerar uma
abordagem personalizada, criar um site de demonstração e conduzir a venda até o
fechamento.

Interface inteiramente em **português do Brasil**.

---

## Como executar

Não há etapa de build. Basta servir a pasta por HTTP:

```bash
# a partir da raiz do repositório
python3 -m http.server 8000
# abra http://localhost:8000/sitehunter/
```

Também funciona em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel,
cPanel, S3). Abrir o `index.html` diretamente pelo sistema de arquivos igualmente
funciona, porque os scripts são clássicos — sem módulos ES nem bundler.

**Acesso:** na tela de login, clique em **"Entrar com conta de demonstração"**.
A base já vem com 30 empresas fictícias, leads distribuídos pelo funil,
demonstrações e propostas de exemplo.

---

## Fluxo central do produto

```
ENCONTRAR EMPRESA → ANALISAR PRESENÇA DIGITAL → CALCULAR SCORE → CRIAR SITE DEMO
→ GERAR ABORDAGEM → ENVIAR PARA O CLIENTE → PROPOSTA → FECHAR VENDA
```

O fluxo aparece de forma explícita na landing e na Visão Geral, com cada etapa
levando à tela correspondente.

---

## Telas

| Rota | Tela |
|---|---|
| `#/` | Página inicial pública |
| `#/entrar`, `#/criar-conta`, `#/recuperar-senha` | Autenticação |
| `#/app/visao-geral` | Dashboard com 7 KPIs, gráfico de 30 dias e melhores oportunidades do dia |
| `#/app/radar` | Radar de Empresas — filtros, tabela/cards, exportação CSV |
| `#/app/empresa/:id` | Detalhe: diagnóstico digital, justificativa do score, cadastro, histórico |
| `#/app/oportunidades` | Ranking + criação de demos em lote para as 10 melhores |
| `#/app/crm` | Kanban de 9 estágios com arrastar-e-soltar |
| `#/app/demos` | Demonstrações geradas, prévia e envio |
| `#/app/propostas`, `#/app/proposta/:id` | Gerador e documento da proposta (imprimível) |
| `#/app/financeiro` | Funil de conversão, receita e indicadores de eficiência |
| `#/app/importar` | Importação de CSV com detecção de colunas e pré-visualização |
| `#/app/configuracoes` | Perfil, pacotes, integrações, privacidade, dados locais |
| `#/legal/:doc` | Privacidade, Termos, Origem dos dados, Remoção e opt-out |

Busca global no topo (atalho <kbd>/</kbd>) por empresa, CNPJ, cidade ou telefone.

---

## Score de oportunidade

Heurística **transparente**: cada ponto vem de uma regra declarada, e a tela
*"Por que este score?"* lista item a item o que foi somado.

| Pontos | Critério |
|---:|---|
| +25 | Não possui site (+15 se o site existe, mas é fraco) |
| +15 | Telefone encontrado |
| +10 | WhatsApp disponível |
| +10 | E-mail disponível |
| +10 | Instagram encontrado |
| +10 | Empresa ativa |
| +10 | Segmento com forte demanda digital (graduado: 10 / 6 / 3) |
| +10 | Presença digital incompleta (graduado pela fragmentação dos canais) |

**Classificação:** 90–100 excepcional · 75–89 alta · 60–74 boa · 40–59 média · 0–39 baixa.

O **índice de presença digital** (0–100) é a medida inversa: quanto mais
estruturada a presença atual, menor a oportunidade de venda de um site.

Ambos os motores estão em `js/score.js` e podem ser ajustados sem tocar em
nenhuma tela.

---

## Regras de conteúdo gerado

O produto **não inventa fatos sobre as empresas**. Isso é uma restrição de
projeto, não uma preferência de estilo:

- **Site demonstração** (`js/demo.js`) usa apenas dados cadastrados. Onde falta
  informação, a página mostra um campo a preencher em vez de texto fabricado.
  Depoimentos são rotulados como **EXEMPLO** com aviso explícito de que nenhum é
  real. A página traz selo permanente de demonstração e `noindex`.
- **Abordagens** (`js/messages.js`) afirmam apenas o que está nos dados. Cinco
  estilos: consultivo, direto, informal, premium e curto.
- **Nada é enviado automaticamente.** O aplicativo redige e abre o WhatsApp ou o
  cliente de e-mail do usuário; o envio é sempre um ato humano.

---

## Arquitetura

```
sitehunter/
├── index.html            # shell; carrega os scripts em ordem
├── css/app.css           # design system completo (claro + escuro)
├── db/schema.sql         # esquema PostgreSQL/Supabase equivalente ao store
└── js/
    ├── icons.js          # ícones SVG minimalistas
    ├── score.js          # motor de score e de presença digital
    ├── data.js           # 30 empresas fictícias, segmentos, CNAEs, pacotes
    ├── store.js          # persistência (localStorage) + semente
    ├── ui.js             # formatadores, toasts, modais, gráficos
    ├── messages.js       # gerador de abordagem
    ├── demo.js           # gerador do site demonstração
    ├── integrations.js   # adaptadores das integrações futuras
    ├── router.js         # roteador por hash com guarda de autenticação
    ├── app.js            # shell, navegação, busca global, bootstrap
    └── views/            # uma tela por arquivo
```

Sem dependências de runtime. Apenas as fontes vêm do Google Fonts, com fallback
para fontes do sistema.

### Persistência

Tudo é gravado no `localStorage` sob a chave `sitehunter.v1`, nas coleções
`users`, `companies`, `digital_audits`, `leads`, `crm_events`, `demos`,
`proposals`, `messages` e `settings`.

`db/schema.sql` traz o equivalente relacional dessas coleções — com índices,
triggers de `updated_at` e políticas de Row Level Security por consultor. Para
migrar, basta reescrever os métodos de acesso de `js/store.js`: **nenhuma view
precisa mudar**.

> A credencial local existe apenas para separar contas no mesmo navegador e
> **não é segurança real**. A autenticação de produção deve ficar no servidor.

---

## Integrações

Nenhuma está conectada. `js/integrations.js` declara a interface esperada de cada
uma e devolve um resultado simulado, de modo que ligar a integração real exija
alterar somente aquele arquivo.

| Integração | Situação |
|---|---|
| Dados Abertos CNPJ (Receita Federal) | Planejada — fonte oficial pública |
| OpenStreetMap (Nominatim / Overpass) | Planejada — ODbL, atribuição obrigatória |
| Auditoria automatizada de site | Planejada — exige backend (mesma origem) |
| API de busca | Planejada |
| Supabase / PostgreSQL | Planejada — esquema pronto |
| Serviço de e-mail | Planejada (o `mailto:` já funciona) |
| WhatsApp Cloud API | Planejada (o link `wa.me` já funciona) |
| Mercado Pago | Planejada |
| Hospedagem das demonstrações | Planejada |

### Política de coleta de dados

São admitidas fontes públicas e oficiais, bases com licença aberta e APIs de
busca com uso programático autorizado. **Não há — e não haverá — raspagem do
Google Maps nem de qualquer serviço cujos termos de uso a proíbam.**

---

## LGPD

- Política de Privacidade, Termos de Uso, Origem dos dados e Remoção/opt-out,
  todos acessíveis sem login em `#/legal/...`
- Lista de opt-out em Configurações → Privacidade: contatos bloqueados não
  recebem abordagem, e o botão de envio é substituído por um aviso
- Exportação completa em JSON e exclusão total em Configurações → Dados locais
- Banner informativo na primeira visita

> Os documentos legais descrevem o funcionamento real da versão atual. Antes de
> operar comercialmente, submeta-os a revisão jurídica.

---

## Responsividade

- Sidebar vira menu deslizante abaixo de 860px
- Resultados do Radar nascem como cards no celular e como tabela no desktop
- Kanban rola horizontalmente, com setas de avanço/retrocesso em cada card
- Tema claro por padrão, escuro disponível no seletor do topo

---

## Dados de demonstração

30 empresas **inteiramente fictícias** em 18 segmentos (odontologia, clínicas,
oficinas, restaurantes, transportadoras, contabilidade, advocacia, academias,
imobiliárias, comércio, estética, pet shop, hotelaria, agronegócio, educação e
serviços), distribuídas por 26 cidades brasileiras — incluindo cinco em
**Luís Eduardo Magalhães/BA**.

Nenhum CNPJ, telefone ou e-mail corresponde a um registro real.

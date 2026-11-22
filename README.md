# Sem Frescura — app web da lanchonete

Vite + React + Tailwind CSS v4 + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) + Pix via Mercado Pago.

## Rodando em 6 passos

1. **Instalar**
   ```bash
   npm install
   cp .env.example .env   # preencha com a URL e a anon key do seu projeto Supabase
   ```
2. **Banco de dados:** no Supabase, abra *SQL Editor* e rode `supabase/schema.sql` inteiro (tabelas, RLS, funções, bucket de imagens e realtime).
3. **Primeiro admin:** em *Authentication → Users → Add user*, crie e-mail + senha. Depois rode no SQL Editor:
   ```sql
   insert into admin_users (user_id)
   select id from auth.users where email = 'seu@email.com';
   ```
4. **Rodar:** `npm run dev` e acesse `/admin/login`.
5. **Configurar no painel (Configurações):** logo, **telefone/WhatsApp**, endereço e link do mapa. Enquanto o telefone estiver vazio, os botões de WhatsApp avisam que ainda não foi configurado.
6. **Cadastrar o conteúdo:** produtos (Lanches, Porções, Bebidas e **Mousses**, cada um com imagem), destaques, carrossel e avaliações.

## Mousses
A categoria **Mousses** é cadastrada no painel em *Cardápio* (nome, descrição, preço, imagem e disponibilidade). Ela aparece:
- na página inicial, logo abaixo dos lanches em destaque (grade de fotos);
- na aba **Fazer pedido**, como última categoria do cardápio, com o mesmo controle de disponível/indisponível.

## Pix (Mercado Pago)
O token do Mercado Pago **nunca** vai para o front-end. Ele fica em Edge Functions:

```bash
supabase login
supabase link --project-ref SEU-PROJETO
supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxxxxx
# opcional (recomendado): assinatura secreta do webhook (Mercado Pago > Suas integrações > Webhooks)
supabase secrets set MP_WEBHOOK_SECRET=xxxxxxxx

supabase functions deploy create-pix
supabase functions deploy mp-webhook --no-verify-jwt
```

No painel do Mercado Pago, em *Webhooks*, cadastre a URL `https://SEU-PROJETO.supabase.co/functions/v1/mp-webhook` com o evento **Pagamentos**.
(A função já envia essa URL em cada cobrança, então o webhook também funciona sem cadastro manual.)

Como funciona:
- Ao confirmar um pedido com Pix, a tela de acompanhamento chama `create-pix`, que gera o QR Code / Pix Copia e Cola.
- O pagamento **só** vira "Aprovado" quando o webhook consulta o Mercado Pago e o status é `approved` com o valor igual ao do pedido. Gerar ou copiar o código não aprova nada.
- A tela do cliente atualiza sozinha a cada 4 s; o painel recebe a confirmação em tempo real.
- Cancelar um pedido com Pix aprovado **não** faz estorno automático (o painel avisa).

## Publicar
`npm run build` gera a pasta `dist/`. Funciona em Vercel (já há `vercel.json` com o fallback de SPA), Netlify (adicione `/* /index.html 200` em `public/_redirects`) ou qualquer hospedagem estática. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do deploy.

## Estrutura
```
supabase/schema.sql              banco, RLS, RPCs, storage, realtime
supabase/functions/create-pix    gera cobrança Pix
supabase/functions/mp-webhook    confirma pagamento
src/pages/                       Home, MenuPage, Checkout, Track
src/pages/admin/                 Pedidos, Cardápio, Destaques, Carrossel, Avaliações, Relatórios, Configurações
```

## Segurança (resumo)
- Clientes **não** escrevem direto nas tabelas: criam pedidos pela função `create_order`, que recalcula os preços no servidor e recusa produtos indisponíveis.
- O acompanhamento usa o UUID do pedido como chave; a função `get_order_status` expõe só o necessário.
- Todas as escritas administrativas e a leitura de pedidos exigem login + presença na tabela `admin_users` (RLS).
- Dados do cliente (nome, telefone, endereço) ficam salvos apenas no `localStorage` do aparelho dele.

## Observações
- Alertas de novo pedido: som + faixa na tela + notificação do navegador (clique em **Ativar alertas** uma vez por aparelho). O painel precisa estar aberto para alertar.
- O e-mail do pagador exigido pelo Mercado Pago usa `pedidos@semfrescura.app` por padrão; troque com `supabase secrets set PIX_PAYER_EMAIL=...`.

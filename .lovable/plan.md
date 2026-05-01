## Diagnóstico

Investiguei o fluxo de login com Google e identifiquei dois problemas:

### Problema 1 (principal): Credenciais OAuth do Google apontando para projeto Supabase errado

Você relatou que na tela do Google aparece:
> "Prosseguir para **ipsdsjpzyvzawwyqkekk**.supabase.co"

Mas o projeto atual está conectado a **`rreiywlwawholjjrmdxa`**.supabase.co (ver `.env`). Isso significa que existe um **Client ID + Secret do Google customizado** configurado nas Configurações de Autenticação do Lovable Cloud que foi criado para outro projeto Supabase (talvez de outra conta/projeto antigo). Por isso, depois do login no Google, o callback é entregue ao projeto errado e o usuário volta para a mesma página sem sessão válida.

A correção desta parte **não é via código** — precisa ser feita por você no painel:

1. Vá em **Cloud → Users → Authentication Settings → Sign In Methods → Google**.
2. **Desative o "Use your own Google credentials"** (botão para usar credenciais gerenciadas pelo Lovable). Assim o Lovable usa o OAuth gerenciado oficial e o redirect volta corretamente para o domínio certo.
3. Alternativa (caso queira manter credenciais próprias por branding): no Google Cloud Console, edite o OAuth Client e troque a **Authorized redirect URI** para a URL de callback exibida na seção Google do Lovable Cloud (que é a do projeto `rreiywlwawholjjrmdxa`).

### Problema 2 (menor, mas real): Erros não tratados ao retornar do OAuth

O fluxo OAuth, ao voltar para `window.location.origin`, pode retornar com `?error=...` ou `#error=...` na URL e os componentes `Login`/`Register` ignoram isso. Resultado: o usuário "volta para a mesma página" sem nenhuma mensagem de erro. Vou:

- Detectar parâmetros de erro OAuth no `useEffect` de `Login.tsx` e `Register.tsx` e exibir um `toast.error` claro.
- Limpar os parâmetros da URL após exibir o erro.
- Após login OAuth bem-sucedido, redirecionar para `/dashboard` quando uma sessão for detectada (já existe via `AuthContext`, mas garantir o `navigate` na página de Login/Register quando o usuário aterrissar nela já autenticado).

### Problema 3 (preventivo): Preview vs Published

Conforme nota técnica do Lovable, o ambiente de **preview** (`id-preview--*.lovable.app`) usa um proxy de fetch que pode quebrar `POST /auth/v1/token`. Pelos logs reais, o login Google **funciona** quando feito a partir do domínio publicado/customizado (`clickpaybrasil.online` e `clickpayoficial.lovable.app` retornam status 200). Vou adicionar um aviso amigável apenas em ambiente de preview, sugerindo testar no domínio publicado.

## Plano de implementação (após sua aprovação)

### Arquivos a editar

1. **`src/pages/Login.tsx`**
   - Adicionar `useEffect` que lê `window.location.hash` e `window.location.search` em busca de `error`, `error_description` e mostra `toast.error`.
   - Após detectar sessão ativa via `supabase.auth.getSession()`, redirecionar para `/dashboard`.
   - Limpar URL com `window.history.replaceState`.

2. **`src/pages/Register.tsx`**
   - Mesmo tratamento de erro OAuth.
   - Manter `localStorage.setItem("clickpay_ref", refId)` (já existe) para preservar o referral através do redirect OAuth.
   - Garantir que `ensureUserSetup` use o `clickpay_ref` do localStorage como `referrer_id` quando presente (verificar `src/lib/ensureUserSetup.ts`; ajustar se necessário).

3. **(Se necessário) `src/lib/ensureUserSetup.ts`**
   - Confirmar que lê `localStorage.getItem("clickpay_ref")` ao chamar a RPC `ensure_user_setup` para não perder a indicação no fluxo OAuth.

### O que NÃO vou alterar

- `src/integrations/lovable/index.ts` (auto-gerado, não pode ser editado).
- `src/integrations/supabase/client.ts` (auto-gerado).
- Configurações OAuth do Google no Lovable Cloud — **isso só você pode fazer** seguindo o passo a passo acima.

## Resumo das ações

| Quem | Ação |
|------|------|
| Você | Desativar credenciais Google customizadas em Cloud → Auth Settings → Google (ou corrigir redirect URI no Google Console para o projeto `rreiywlwawholjjrmdxa`) |
| Eu (após aprovar) | Tratar erros OAuth nas páginas Login/Register, mostrar toast e redirecionar corretamente quando já houver sessão; preservar referral via localStorage |

Posso seguir com as alterações de código?
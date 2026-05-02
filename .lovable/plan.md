## Objetivo
Deixar os botões "Entrar com Google" (em `/login`) e "Cadastrar com Google" (em `/register`) funcionando corretamente, tanto para login quanto para criação de conta.

## Diagnóstico
O código atual já usa `lovable.auth.signInWithOAuth("google", ...)` (a forma correta no Lovable Cloud), mas tem alguns pontos frágeis:

1. **Tratamento de erro pobre** — `toast.error(String(result.error))` exibe `[object Object]` em vez de uma mensagem útil, então o usuário (e nós) não vemos o motivo real da falha.
2. **Sem navegação após sucesso** — quando o OAuth retorna tokens diretamente (sem redirect), o código não navega para `/dashboard`. Em alguns fluxos o usuário fica preso na tela de login.
3. **Falta de loading visual** — o botão não fica desabilitado durante o processo, permitindo cliques múltiplos.
4. **Cadastro com referral** — no `Register.tsx` o `referred_by` é salvo em `localStorage` antes do redirect, mas o `ensureUserSetup` precisa lê-lo no retorno; vou confirmar que isso já acontece.
5. **Provider Google no Lovable Cloud** — preciso confirmar via Cloud que o provider Google está habilitado (vem habilitado por padrão como managed, mas pode estar desligado).

## Plano de correção

### 1. Verificar provider Google no Cloud
Checar via ferramenta de status/config do Cloud se o provider Google está ativo. Se não estiver, orientar a habilitar (ou habilitar pela configuração de auth).

### 2. Melhorar `handleSocialLogin` em `src/pages/Login.tsx` e `src/pages/Register.tsx`
- Adicionar estado `socialLoading` para desabilitar os botões durante o fluxo.
- Extrair mensagem do erro corretamente: `result.error?.message ?? "Falha ao conectar com Google"`.
- Quando `result.redirected` for `true`, manter o usuário na tela (o navegador vai redirecionar).
- Quando vier sessão direta (sem redirect), chamar `navigate("/dashboard")`.
- Logar o erro no console para debug.

### 3. Garantir leitura do `ref` no retorno do OAuth
Verificar `src/lib/ensureUserSetup.ts` para confirmar que ele lê `localStorage.getItem("clickpay_ref")` e cria o `referral` correspondente após o login social. Se não fizer, ajustar.

### 4. Confirmar que o `redirect_uri` está correto
`window.location.origin` funciona tanto em `id-preview--*.lovable.app`, em `clickpayoficial.lovable.app`, quanto em domínio customizado — isso já está certo, só vou confirmar.

## Arquivos a alterar
- `src/pages/Login.tsx` — melhorar `handleSocialLogin`.
- `src/pages/Register.tsx` — melhorar `handleSocialLogin`.
- `src/lib/ensureUserSetup.ts` — garantir uso do `clickpay_ref` se ainda não fizer.
- (Opcional) Configuração de auth no Cloud caso o provider Google esteja desativado.

## Resultado esperado
- Clicar em "Entrar com Google" abre a tela de seleção de conta Google e, ao escolher, retorna logado para `/dashboard`.
- Clicar em "Cadastrar com Google" cria a conta, executa o `ensureUserSetup` (perfil, plano free, bônus de indicação se houver `ref`) e leva para `/dashboard`.
- Em caso de erro, aparece uma mensagem clara em português via toast.
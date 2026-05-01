
## Diagnóstico

O erro 404 `NOT_FOUND` ao clicar em "Cadastrar com Google" acontece porque:

- A URL gerada é `https://www.clickpaybrasil.online/~oauth/initiate?...`
- O proxy OAuth do Lovable (que intercepta `/~oauth/initiate` e `/~oauth/callback`) **só funciona em domínios reconhecidos pela infraestrutura do Lovable**: `*.lovable.app` e **domínios customizados configurados oficialmente em Lovable → Settings → Custom Domains**.
- Conforme `project_urls`, este projeto **não tem domínio customizado registrado no Lovable**:
  - Preview: `id-preview--bc61a3c8-...lovable.app`
  - Published: `clickpayoficial.lovable.app`
  - Custom Domains: **(none)**

O domínio `www.clickpaybrasil.online` está apontando para o app (provavelmente via DNS/CNAME externo), mas **não está registrado como Custom Domain no Lovable**. Sem esse registro, o worker proxy do Lovable não intercepta `/~oauth/*` nesse host, e a rota retorna 404.

## Solução (ação do usuário — não é código)

A correção **não é no código**. É necessário registrar o domínio customizado oficialmente no Lovable:

1. Abrir **Project Settings → Domains** no Lovable
2. Adicionar `www.clickpaybrasil.online` (e opcionalmente `clickpaybrasil.online`) como Custom Domain
3. Seguir as instruções de DNS apresentadas (verificação A/CNAME)
4. Aguardar o status ficar **Active**
5. Testar novamente o login com Google

Após o domínio ficar ativo:
- O proxy passará a interceptar `/~oauth/initiate` e `/~oauth/callback` em `www.clickpaybrasil.online`
- O `redirect_uri: window.location.origin` continuará funcionando sem alteração de código
- O OAuth gerenciado do Lovable funcionará automaticamente

## Verificação alternativa imediata

Para confirmar que o código está correto enquanto o domínio é configurado, peça ao usuário para testar o login com Google em:
- `https://clickpayoficial.lovable.app/register`

Se funcionar lá, confirma 100% que o problema é exclusivamente o registro do domínio customizado.

## Detalhes técnicos

- O código atual em `src/pages/Login.tsx` e `src/pages/Register.tsx` está correto: usa `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account" } })`.
- O módulo `src/integrations/lovable/index.ts` é gerado e não deve ser editado.
- Não há `vercel.json`, `_redirects` ou config de hosting que possa interferir — Lovable não usa esses arquivos.
- Mudanças de código **não resolveriam** este erro; o 404 vem do edge worker do Lovable que não reconhece o host.

## Plano de implementação

Como a correção é puramente de configuração de hospedagem (registro do Custom Domain no painel do Lovable), **não há mudanças de código a aplicar**. Após aprovação:

1. Confirmar com o usuário que ele realizará o registro do domínio no painel
2. (Opcional) Adicionar uma nota informativa no código ou README sobre a necessidade do registro
3. Testar o fluxo OAuth no domínio `clickpayoficial.lovable.app` para validar que o código está saudável

Nenhum arquivo precisa ser editado.

## Restaurar botão "Entrar/Cadastrar com Google"

Agora que as credenciais OAuth do Google no Lovable Cloud foram corrigidas, vou trazer de volta os botões de login social que tinham sido removidos.

### Arquivos a alterar

**`src/pages/Login.tsx`** — adicionar o botão "Entrar com Google" antes do botão "Entrar com Apple", dentro do bloco `<div className="space-y-3 mb-6">`. Reutiliza o handler `handleSocialLogin("google")` que já existe no arquivo (não foi removido).

**`src/pages/Register.tsx`** — adicionar o botão "Cadastrar com Google" antes do botão "Cadastrar com Apple", no mesmo padrão.

### Sem mudanças em

- Lógica de autenticação (`handleSocialLogin`, `lovable.auth.signInWithOAuth`) — já estava preservada.
- Tratamento de erros OAuth e auto-redirect para `/dashboard` adicionados anteriormente — permanecem.
- Configuração de provedores OAuth no Lovable Cloud — já feita por você.

Aprove para eu reinserir os botões.
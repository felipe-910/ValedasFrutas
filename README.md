# Vale das Frutas — área dos pais (React + TypeScript)

Mesmo app de antes (Firebase Auth + Firestore), agora em **React 18 + TypeScript + Vite**.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # confere os tipos (tsc) e gera a pasta dist/
npm run preview    # testa o build
```

## Estrutura

```
src/
  main.tsx, App.tsx        entrada e rotas (react-router)
  firebase.ts              inicialização do Firebase (SDK npm, não mais CDN)
  types.ts                 tipos: Filho, Meta, Refeicao, Notificacao...
  services/                auth, filhos, refeicoes, metas, notificacoes, termos, modoCrianca
  context/                 Auth, Toast e Senha (janelas de senha dos pais)
  components/              Campo, BarraTopo, PerfilMini, BotoesTipoRefeicao, BuscaAlimento...
  pages/                   uma por tela (Login, Home, Metas, Refeicoes...)
  lib/                     idade, cores, sessão, hooks
  styles/style.css         o mesmo CSS de antes
public/                    logo, sprites, alimentos.json, manifest, sw.js
firestore.rules            + a coleção responsaveis (tutoriais da Alice que cada conta já viu)
firestore.indexes.json     igual ao de antes
```

## Rotas

`/` `/login` `/cadastro` `/recuperar-senha` `/redefinir-senha` `/termos` (públicas) e
`/home` `/perfil` `/notificacoes` `/novo-pequeno` `/escolha-personagem` `/aceitar-termos`
`/crianca` `/desempenho` `/configuracoes` `/lista-refeicoes` `/refeicoes` `/metas`
`/adicionar-meta` `/historias` (exigem login).

## Observações

- Hospedagem: como é app de página única, o servidor precisa devolver `index.html` para qualquer
  rota (no Firebase Hosting: `"rewrites": [{ "source": "**", "destination": "/index.html" }]`).
- O link de e-mail do Firebase para redefinir senha continua funcionando em
  `/redefinir-senha` e também no endereço antigo `/redefinir-senha.html`.
- `public/icons/` (favicon, apple-touch-icon e ícones do PWA) foi gerada a partir do `logo.png`. Se tiver os ícones oficiais, é só substituir os arquivos.
- Os ícones da interface ficam guardados no próprio app (`src/lib/iconesLocais.ts`), então aparecem sem internet. Se você usar um ícone novo (`mdi:...`) que não esteja nessa lista, o `Icone` tenta buscar no Iconify (precisa de internet) até você adicioná-lo ao arquivo.
- O aceite dos Termos de Uso acontece na tela "Antes de começar" (logo após o cadastro/login), não mais na tela de cadastro.
- A antiga `logado.html` ("Minha conta") não foi migrada: nada apontava para ela e o `perfil` a substitui.
- Tutorial da Alice (`src/context/TutorialContext.tsx` + `src/services/tutorial.ts`): conta nova vê o tutorial
  obrigatório no primeiro acesso (na home e na primeira vez em cada aba da criança). Depois disso ele só aparece
  pelo Menu > Tutorial (ou Perfil > "Ver o tutorial novamente"). Contas antigas não veem sozinhas.
  O que cada conta já viu fica no Firestore (`responsaveis/{uid}`): **publique o `firestore.rules`** no Console do
  Firebase (Firestore > Regras). Enquanto não publicar, o app guarda no próprio aparelho e continua funcionando.

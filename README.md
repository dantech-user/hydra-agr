# Hydra Agro

Aplicativo mobile de tecnologia rural para gestão da propriedade, recursos hídricos, rebanho, identificação NFC/RFID, atividades, setores, comunidade e monitoramento inteligente.

O projeto mantém arquitetura modular, persistência multiusuário e Android nativo via Capacitor. Esta versão evolui o código existente por migrations incrementais, sem trocar o projeto Supabase nem recriar a autenticação. A interface é empacotada dentro do APK: não há `server.url`, `HYDRA_APP_URL` nem dependência de uma página hospedada para abrir o aplicativo.

## Estado do projeto

Funcional e conectado ao banco:

- criação de conta rural em quatro etapas;
- login, sessão persistente, logout e recuperação de senha por deep link;
- perfis independentes, foto editável por câmera/galeria, telefone, biografia, e-mail e senha;
- perfil limpo com edição por lápis, capa privada da propriedade e localização rural persistente;
- ficha digital e edição da propriedade;
- gestão de fontes e leituras de água, histórico, gráfico e alertas baseados em dados reais;
- rebanho com cadastro, edição, exclusão, busca, filtros, foto, ficha individual e histórico;
- vinculação e localização por identificação eletrônica;
- leitura NFC real em aparelho Android compatível e entrada manual quando indisponível;
- setores, atividades e histórico de monitoramento com fotos;
- comunidade real com posts, imagens, curtidas, comentários e moderação;
- avisos e links oficiais administráveis;
- notificações internas enviadas pela administração;
- Hydra Agro+ oficial por R$ 6/mês, com ativação manual, dashboard baseado em dados reais, metas, histórico animal, gráficos e relatório imprimível;
- painel administrativo com métricas, busca de usuários, banimento, cargos, assinaturas, avisos, links e moderação;
- confirmações visíveis nos cadastros e confirmação adicional antes de exclusões, bloqueios, troca de cargo e alteração do Premium;
- cache local por usuário, fila de sincronização e retomada após perda de conexão;
- splash, ícone, safe areas, teclado, status bar, botão voltar e feedback tátil no Android;
- workflow de APK debug no GitHub Actions.

Recursos preparados, mas que exigem integração externa antes de operar:

- **Drone Pastor:** o modelo de dados e a central de monitoramento existem, mas nenhuma missão real é iniciada sem hardware/API compatíveis;
- **pagamento automático:** o Hydra Agro+ funciona por conferência manual do Pix via canal oficial; checkout automático só deve ser adicionado com um provedor de pagamentos apropriado;
- **push notifications nativas:** avisos internos funcionam; push em segundo plano depende de FCM/APNs e serviço próprio;
- **NFC/RFID:** a leitura nativa depende de aparelho/tag compatível e deve ser validada no hardware final.

## Identidade visual

- fundo creme/off-white;
- verde escuro institucional, verde natural secundário e laranja de destaque;
- **Manrope** para interface;
- **Sora** para títulos e destaques, substituindo a fonte editorial anterior;
- fontes incluídas no bundle, sem depender do Google Fonts;
- splash e ícones derivados do símbolo original Hydra Agro, sem moldura branca.

## Cobertura regional inicial

O cadastro aceita somente:

- Amargosa;
- Brejões;
- Milagres;
- Nova Itarana;
- Santa Inês;
- Ubaíra.

A regra existe no frontend e como `CHECK` no PostgreSQL. A lista representa Brejões e os municípios que compartilham limite municipal com ele.

## Arquitetura

```text
src/
  components/          componentes visuais e estados do sistema
  features/
    activities/        atividades rurais
    admin/             painel administrativo
    auth/              login e onboarding
    challenges/        desafios baseados em registros reais
    community/         feed social
    herd/              rebanho
    home/              início e indicadores
    monitor/           setores, drone e monitoramentos
    nfc/               leitura e vínculo NFC/RFID
    notifications/     avisos do usuário
    profile/           perfil, foto, segurança e plano
    premium/           Hydra Agro+, análises, metas e relatórios
    property/          ficha digital da propriedade
    water/             gestão hídrica
  hooks/               sessão, cache isolado e sincronização
  lib/                 tipos, cidades e contatos oficiais
  services/            Supabase, mídia e NFC
supabase/migrations/   esquema, RLS, roles, RPCs e Storage
android/               projeto Android nativo versionado
resources/             fontes do ícone e splash
tests/                 testes automatizados
.github/workflows/     geração automática do APK
```

As telas secundárias são carregadas sob demanda para reduzir o carregamento inicial. Autenticação, armazenamento, regras administrativas e UI não ficam misturados em um único arquivo.

## Banco de dados e segurança

Backend: PostgreSQL, Auth e Storage do Supabase.

Tabelas incluídas:

- `profiles`, `roles`, `properties`, `property_sectors`;
- `animals`, `animal_identifications`, `nfc_tags`;
- `water_sources`, `water_records`;
- `activities`, `monitoring_records`;
- `drones`, `drone_missions`;
- `posts`, `comments`, `likes`;
- `subscriptions`, `notifications`;
- `admin_announcements`, `admin_links`, `app_settings`, `audit_logs`.

Todos os dados rurais privados recebem `owner_user_id` e/ou `property_id`. As políticas RLS validam `auth.uid()` e também impedem acesso quando `banned_at` está preenchido. O cache local usa chaves diferentes para cada UUID de usuário. No logout, a sessão local e os estados derivados são removidos.

Nunca coloque a `service_role` no `.env`, no repositório ou no APK. O cliente usa somente a chave pública/publishable; as permissões efetivas ficam no banco.

O status do Hydra Agro+ é lido da tabela `subscriptions` e não pode ser promovido pelo cache, pelo React ou pelo próprio usuário. A função `admin_set_subscription` é `security definer`, valida a role no PostgreSQL, registra auditoria e só aceita administrador ou proprietário. A aplicação também recoloca `role`, plano e datas de assinatura vindos do servidor durante a sincronização offline.

### Conta proprietária

O trigger do banco atribui `owner` exclusivamente a:

```text
danqxy7@gmail.com
```

Essa decisão ocorre no PostgreSQL. Digitar esse e-mail no frontend não libera o painel. Se a conta já existir quando a migração for aplicada, ela também é promovida pelo script. Somente `owner` altera cargos; moderadores e administradores não podem criar outro proprietário.

## Configuração inicial

### 1. Abrir no GitHub Codespaces

Extraia o ZIP, envie todo o conteúdo para a raiz de um repositório e escolha **Code > Codespaces > Create codespace on main**. O devcontainer instala Node 22, Java 21 e executa `npm ci`.

### 2. Preparar o Supabase

No projeto Supabase atual, execute as migrations em ordem:

```text
supabase/migrations/202608150001_hydra_agro.sql
supabase/migrations/202608160001_hydra_agro_plus.sql
```

A segunda migration é incremental: adiciona metas, capa/localização da propriedade, datas Premium, RPC administrativa e realtime da assinatura. Ela não apaga tabelas, usuários ou registros. Pode ser executada pelo SQL Editor do painel ou por `supabase db push` em um ambiente com a CLI configurada.

Em **Authentication > URL Configuration > Redirect URLs**, adicione:

```text
br.com.hydraagro.app://auth/recovery
```

Isso permite que “Esqueci minha senha” volte ao aplicativo e abra a criação de nova senha.

### 3. Variáveis públicas

Copie o exemplo:

```bash
cp .env.example .env.local
```

Preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

O build Android recusa gerar um APK desconectado quando essas variáveis não são válidas.

### 4. Desenvolvimento

```bash
npm ci
npm run dev
```

Comandos úteis:

```bash
npm run lint          # TypeScript estrito
npm test              # testes automatizados
npm run build         # bundle web local
npm run verify        # lint + testes + build
npm run assets        # ícone e splash Android
npm run android:sync  # build conectado + cap sync
```

## Persistência e funcionamento offline

Os arquivos da interface, ícones e fontes ficam no próprio APK. O aplicativo abre sem site externo.

Após uma sessão válida, a conta é armazenada localmente pelo UUID do usuário. Alterações rurais ficam numa fila persistente e são enviadas quando a conexão retorna. Uma conta nunca lê o cache de outra porque as chaves incluem o ID autenticado. Comunidade, primeiro login, upload e sincronização naturalmente dependem do backend.

## Hydra Agro+ e apoio voluntário

O Hydra Agro+ custa **R$ 6 por mês**. Não há checkout falso nem ativação automática. O fluxo atual é:

1. o usuário abre o card Hydra Agro+ no perfil;
2. toca em **Continuar pelo Instagram**;
3. recebe as instruções de Pix pelo canal oficial;
4. a administração confere o pagamento;
5. um administrador ou proprietário usa **Assinaturas > Liberar Hydra Agro+**;
6. a RPC segura atualiza o servidor e a conta conectada recebe a mudança por realtime.

Ao remover o plano, os dados rurais permanecem intactos. “Apoie o Hydra Agro” é uma contribuição voluntária separada: não libera Premium e não restringe recursos gratuitos.

O painel Premium utiliza somente dados da conta: períodos de água, comparação, metas, histórico e evolução de peso, vacinação, lembretes, atividades, monitoramentos, conquistas e relatório da propriedade. Na web, **Gerar relatório em PDF** abre a impressão do navegador, que permite salvar em PDF. No Android, o app informa que essa exportação ainda depende de uma integração nativa; os indicadores continuam disponíveis na tela.

## NFC/RFID

A Central NFC oferece:

- leitura nativa pelo plugin Android;
- detecção de NFC ausente ou desativado;
- atalho para configurações do aparelho;
- timeout e cancelamento de leitura;
- código manual como alternativa;
- localização automática do animal;
- vínculo da tag a uma ficha do rebanho.

Permissões declaradas:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

`required="false"` mantém o aplicativo instalável em aparelhos sem NFC. O app nunca inventa uma leitura.

## Android e Capacitor

- package ID: `br.com.hydraagro.app`;
- nome: `Hydra Agro`;
- `webDir`: `dist`;
- Android mínimo: API 24;
- compile/target SDK: 36;
- status bar e splash nativas;
- câmera opcional;
- NFC opcional;
- tráfego HTTP sem TLS bloqueado;
- backup Android desativado para reduzir exposição do cache.

Não existe `server.url` em `capacitor.config.ts`.

### APK local

Requer Android SDK 36 configurado em `ANDROID_HOME`/`ANDROID_SDK_ROOT`, além de Java 21:

```bash
npm ci
npm run android:apk
```

Saída:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

O fluxo executa validação do backend, build Vite, sincronização Capacitor e `assembleDebug`.

## GitHub Actions

Workflow: `.github/workflows/android-apk.yml`.

Cadastre em **Settings > Secrets and variables > Actions**:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Depois use **Actions > Android APK > Run workflow**. Mudanças relevantes na `main` também iniciam o pipeline.

Etapas:

1. checkout;
2. Node 22;
3. Java 21;
4. `npm ci`;
5. testes;
6. validação do backend;
7. build web empacotado;
8. assets Android;
9. Capacitor sync;
10. Gradle `assembleDebug`;
11. upload do artifact.

Artifact:

```text
hydra-agro-apk/app-debug.apk
```

## Release e Play Store

O projeto aceita propriedades Gradle sem guardar chaves no Git:

```text
HYDRA_VERSION_CODE
HYDRA_VERSION_NAME
HYDRA_KEYSTORE_FILE
HYDRA_KEYSTORE_PASSWORD
HYDRA_KEY_ALIAS
HYDRA_KEY_PASSWORD
```

Exemplo local, usando um arquivo fora do repositório:

```bash
npm run android:sync
cd android
./gradlew bundleRelease \
  -PHYDRA_VERSION_CODE=2 \
  -PHYDRA_VERSION_NAME=1.1.0 \
  -PHYDRA_KEYSTORE_FILE=/caminho/seguro/hydra-release.jks \
  -PHYDRA_KEYSTORE_PASSWORD='...' \
  -PHYDRA_KEY_ALIAS='...' \
  -PHYDRA_KEY_PASSWORD='...'
```

O AAB é gerado em `android/app/build/outputs/bundle/release/`. Arquivos `.jks` e `.keystore` estão ignorados pelo Git. Em CI, use secrets e um keystore codificado/armazenado no cofre do provedor.

## Testes

```bash
npm run verify
```

A suíte automatizada verifica cobertura regional, validação de autenticação, isolamento estrutural de contas, ausência de concessão administrativa no cliente, proteção do Hydra Agro+, contratos dos botões, RLS/owner no banco e empacotamento Capacitor sem URL remota. O build TypeScript/Vite e o `cap sync android` também fazem parte da validação de entrega.

Testes que dependem de ambiente externo devem ser feitos antes de publicação:

- login real e confirmação de e-mail no projeto Supabase final;
- conta A/conta B com conferência de RLS;
- NFC em cada modelo de aparelho/tag suportado;
- câmera, galeria, teclado e botão voltar em dispositivo Android;
- APK instalado e atualização sobre uma versão anterior;
- pipeline GitHub Actions com os secrets do projeto;
- eventual API do Drone Pastor, pagamentos e push nativo.

Use [docs/QA-ANDROID.md](docs/QA-ANDROID.md) como roteiro de homologação.

## Suporte

- E-mail: `rlkdn.dev@hydracity.sbs`
- Instagram: `@daniel.4fe`

## Licença e publicação

Defina a licença do produto antes de tornar o repositório público. Termos, política de privacidade, dados do controlador, retenção e canal de exclusão devem passar por revisão jurídica antes da Play Store.

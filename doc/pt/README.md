![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## Adaptador automatic-pond-aeration para ioBroker

Este adaptador **controla e monitora um sistema de aeração de lago/tanque**. Uma bomba de ar/um
compressor fornece ar através de válvulas (solenoides) para **até 8 pontos de aeração** no lago. O
adaptador comuta essas válvulas por um **horário programado**, um **rodízio cíclico (round-robin)** ou
um **programa de grupos**, e protege a bomba com um **bloqueio de segurança (interlock)**: enquanto a
bomba funciona, pelo menos uma válvula permanece sempre aberta – caso contrário, a **válvula de
emergência** é aberta e (se a bomba estiver disponível como ponto de dados) a bomba é desligada.

Opcionalmente, ele pode monitorar o **oxigênio dissolvido**, a **temperatura do ar e da água** e a
**pressão**, calcular **horários astronômicos** a partir da sua **geolocalização**, controlar o
hardware **diretamente em um ESP32** (sem uma instância adicional do ioBroker) e pausar pontos de
aeração selecionados durante a alimentação quando
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) estiver instalado.

> 🛑 **AVISO — ESTADO DE DESENVOLVIMENTO, BEM-ESTAR ANIMAL (por favor, leia).**
> Este adaptador **ainda está em desenvolvimento ativo e AINDA NÃO foi verificado para uso sem
> supervisão.** Ele controla um **sistema de suporte à vida de animais vivos** – um mau
> funcionamento, uma configuração incorreta ou um bug podem interromper a aeração e **colocar em
> risco a saúde e a vida dos seus peixes e da demais vida do lago** (falta de oxigênio, ausência de
> um buraco livre de gelo no inverno, uma bomba trabalhando contra válvulas fechadas). **Não o use
> sem controle:** antes de qualquer operação sem supervisão, **observe-o de perto e verifique cada
> função** no seu próprio hardware durante um período significativo, e mantenha uma aeração/proteção
> independente e comprovada. **Use por sua conta e risco.** *(Este aviso permanece até ser
> explicitamente revogado.)*

> ⚠️ **Estado do projeto.** Totalmente implementado e configurável a partir do admin: o controle das
> válvulas (horário programado, rodízio cíclico round-robin, grupos), o **bloqueio de segurança**
> contra o dead-heading, o **monitoramento** (oxigênio, temperatura ar/água, pressão com alarmes), os
> **horários astronômicos e a geolocalização**, o **acoplamento com o feeder**, o **modo inverno /
> livre de gelo**, a **malha fechada de oxigênio**, as **notificações via um adaptador de messaging**,
> as **estatísticas de funcionamento**, um **modo de teste dry-run**, os **botões de substituição** por
> ponto e o backend de hardware **ESP32** direto (comunica-se por HTTP com o firmware de referência —
> grave-o no navegador a partir da
> [página de flash do firmware](https://ssbingo.github.io/pond-aeration-flash/)). O backend padrão
> controla suas válvulas e a bomba por meio de estados existentes do ioBroker, então qualquer placa de
> relés funciona.

> 📘 **Manual completo passo a passo (PDF, para iniciantes — com diagramas de ligação, perguntas
> frequentes e resolução de problemas):** English → [../../docs/manual/pond-aeration-manual.en.pdf](../../docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [../../docs/manual/pond-aeration-manual.de.pdf](../../docs/manual/pond-aeration-manual.de.pdf)
> (fonte e compilação em [../../docs/manual/](../../docs/manual/)).

---

## Índice

1. [O que o adaptador faz](#1-o-que-o-adaptador-faz)
2. [Conceito de segurança](#2-conceito-de-segurança)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Instalação](#4-instalação)
5. [Configuração](#5-configuração)
6. [Objetos / pontos de dados](#6-objetos--pontos-de-dados)
7. [Roteiro](#7-roteiro)

---

## 1. O que o adaptador faz

Uma aeração de lago distribui o ar de uma única bomba para vários difusores/pedras porosas. Quais
pontos recebem ar é decidido pelas **válvulas solenoides**. Este adaptador decide **quando** cada
válvula abre:

* **Horário programado** – abrir um ponto/grupo durante as janelas de tempo configuradas por dia da
  semana.
* **Rodízio cíclico (round-robin)** – percorrer os pontos por vez, cada um aberto por um tempo de
  permanência configurável.
* **Grupos** – controlar vários pontos em conjunto; **nunca pode haver mais grupos do que pontos**.

As válvulas e a bomba são controladas **ou** através de **estados existentes do ioBroker** (de
qualquer adaptador que exponha os interruptores) **ou diretamente em um controlador ESP32 dedicado**
que executa o firmware de referência — sem uma instância adicional do ioBroker. Você escolhe isso em
**Backend de hardware** (aba Geral); consulte [Configuração → Geral](#geral).

## 2. Conceito de segurança

Um compressor de ar **nunca deve funcionar contra válvulas totalmente fechadas** (dead-heading) – isso
causa sobrepressão e pode danificar a bomba. Por isso:

* Enquanto a bomba funciona, **pelo menos uma válvula permanece sempre aberta** (mínimo configurável).
* Se isso não puder ser garantido, a **válvula de emergência é aberta** e, se a bomba for controlável,
  a **bomba é desligada**.
* A comutação das válvulas usa o princípio **make-before-break** (a próxima válvula abre antes de a
  anterior fechar), de modo que nunca há um instante com todas as válvulas fechadas.

> 💡 **Recomendação de ligação:** use uma válvula de emergência **normalmente aberta (NO)**, para que
> ela abra em caso de falta de energia (à prova de falhas). Quando o hardware funciona em um ESP32, o
> mesmo bloqueio também é executado localmente no dispositivo, de modo que uma falha de rede ou do
> ioBroker não pode danificar a bomba.

## 3. Pré-requisitos

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Uma ou mais válvulas acessíveis como estados do ioBroker (por ex. um adaptador de relé/tomada inteligente).

## 4. Instalação

Instale o adaptador a partir do admin do ioBroker (ou, durante o desenvolvimento, a partir do
repositório do GitHub) e crie uma instância. Abra as configurações da instância para configurá-lo.

## 5. Configuração

A página de configurações é organizada em abas. Você não precisa preencher tudo — apenas as partes
que usa.

### Geral
- **Habilitação principal** – o interruptor liga/desliga de todo o adaptador. Quando desligado, nada
  é controlado.
- **Dry-run (apenas registro, não comuta o hardware)** – todo o mecanismo de controle é executado e os
  pontos de dados são atualizados, mas os comandos de válvula/bomba são apenas escritos no log
  (`[DRY-RUN] would …`) em vez dos estados reais. Ideal para o comissionamento e para testar uma
  configuração antes de conectá-la ao hardware.
- **Backend de hardware** – `Estados existentes do ioBroker` (padrão) controla suas válvulas/bomba
  por meio de estados de outros adaptadores. `ESP32 (direto)` comunica-se por HTTP com o firmware de
  referência em um Waveshare ESP32-S3-POE-ETH-8DI-8RO. Grave o firmware no navegador a partir da
  [página de flash do firmware](https://ssbingo.github.io/pond-aeration-flash/) (Chrome/Edge, sem
  software adicional), depois defina o **host/IP** e mapeie o **relé da válvula de emergência** e o
  **relé da bomba** (0–7); os pontos de aeração usam o canal de relé definido por ponto. O adaptador
  envia uma configuração de segurança e um heartbeat para que a proteção contra falhas no próprio
  dispositivo do firmware proteja o lago mesmo se o ioBroker estiver fora do ar.
  - **Agendamento autônomo (funciona sem o ioBroker)** *(apenas ESP32, opcional)* – quando ativado,
    o adaptador também envia os seus horários programados ao dispositivo; se a conexão cair, o ESP32
    continua a executá-los sozinho usando o seu relógio NTP (o bloqueio de segurança dead-head
    continua a valer). A sequência cíclica permanece no adaptador.
  - **Compatibilidade de firmware** – o adaptador e o firmware são correspondidos por uma **versão do
    protocolo** (o contrato rígido), não por números de versão exatos. Esta versão do adaptador fala
    o **protocolo 1** e **recomenda o firmware v1.4.0** (mínimo v1.0.0); o admin mostra isso e liga
    para as releases. Ao conectar, a versão do dispositivo e um sinalizador de compatibilidade são
    publicados como `info.deviceFirmware` e `info.firmwareCompatible`, e qualquer incompatibilidade de
    protocolo é escrita no log. Consulte a tabela de compatibilidade no
    [manual](../../docs/manual/pond-aeration-manual.en.pdf) / repositório do firmware.
  - **Licenciamento** *(apenas se o seu firmware incluir a camada de licenciamento opcional)* – o
    dispositivo funciona num nível: **free** (apenas monitoramento), **community** (controle de
    relés) ou **pro** (+ o agendamento autônomo standalone); a segurança (proteção contra falhas,
    válvula de emergência, bloqueio dead-head, botões manuais) está sempre ativa, independentemente
    disso. Um dispositivo novo funciona plenamente (**pro**) durante um período de avaliação e depois
    volta para free até que uma chave de ativação seja introduzida na página `/license` do
    dispositivo. O adaptador mostra o estado em `info.licenseTier` / `info.licenseTrialDaysLeft` /
    `info.deviceCode`; se o dispositivo **não estiver licenciado para controle**, o monitoramento
    continua a funcionar e o controle é ignorado (ver `info.licenseControlBlocked`). O firmware
    público sem a camada não é afetado.
    *Nota sobre a regravação:* a chave de ativação é armazenada no ESP e é **apagada quando você
    regrava pelo instalador do navegador** (começa um novo período de avaliação). O **código do
    dispositivo é derivado do hardware e nunca muda**, portanto a **mesma chave de ativação pode
    simplesmente ser reinserida** — nenhuma chave nova é necessária. Uma **atualização de firmware
    pela página Update do dispositivo** (atualização online com um clique ou upload de arquivo)
    mantém a ativação e todas as configurações; apenas o instalador a redefine.
  - **Espelhamento de sensores** – a cada sondagem o adaptador também envia seus pontos de dados de
    sensor configurados (oxigênio, temperatura da água/ar, pressão) ao dispositivo, de modo que
    apareçam na **própria interface web do ESP** (marcados como *(ioBroker)*) — mesmo para sensores
    que são apenas estados do ioBroker e não estão ligados ao ESP. Um sensor fisicamente ligado ao ESP
    mantém a prioridade; os valores enviados expiram após alguns minutos. Requer firmware ≥ 1.1.7.
- **Intervalo de sondagem (s)** – com que frequência o status do backend é consultado (por ex. `30`).

### Pontos de aeração
O coração da configuração. Adicione **até 8** pontos; cada ponto é uma válvula. Por ponto:
- **Nome** – por ex. `Pier`, `Deep zone`. Com o backend **ESP32**, este nome também é **exibido na
  própria interface web do dispositivo** (no canal de relé do ponto) — um **recurso licenciado** (a
  partir do nível **community**). `Ch 7 = Notventil` (válvula de emergência) e `Ch 8 = Pumpe` (bomba)
  são rótulos fixos. Consulte [Nomes na interface web do ESP32](#nomes-na-interface-web-do-esp32).
- **Habilitado** – incluir este ponto no controle.
- **Backend** – `ioBroker` (um estado externo) ou `ESP32` (um canal de relé no dispositivo). A opção
  `ESP32` só aparece quando o **Backend de hardware** (aba Geral) está em `ESP32 (direto)`.
- **Estado da válvula / canal** – para o backend ioBroker, escolha o estado interruptor que abre a
  válvula (pelo navegador de objetos). Para o backend ESP32, escolha o **canal de relé** em uma lista
  suspensa: os canais que acionam a **bomba** e a **válvula de emergência** são exibidos como
  *reservados* e os canais já ocupados por outro ponto como *em uso*, de modo que você só pode
  escolher um livre. Quando não sobrar nenhum canal, adicione mais pontos como **estados do ioBroker**
  pela coluna Backend.
- **Botão de substituição (override)** *(opcional)* – um botão físico por ponto (por ex. uma entrada
  digital de um ESP32, ou qualquer estado booleano). Funciona como um **comutador (toggle)**: uma
  pressão força o ponto **ligado com prioridade sobre o controle automático**
  (horário/sequência/inverno/oxigênio) e até sobre uma pausa do feeder — *apenas o interruptor
  principal ou um disparo de segurança o anulam*. Pressione novamente para soltá-lo. (Mais modos de
  botão estão planejados; o campo está preparado para eles.) Um botão só está disponível para uma
  **válvula de aeração** — um ponto que fica no canal de relé do ESP32 da **bomba** ou da **válvula de
  emergência** não pode ter um (a opção fica desativada). Com o backend ESP32, um botão premido **no
  dispositivo** é refletido de volta no ioBroker (`aeration.point.<n>.buttonOn`) e recebe a mesma
  prioridade.
- **Nome do botão** *(backend ESP32, opcional)* – um nome amigável para o botão de substituição deste
  ponto, exibido na interface web do dispositivo (ver abaixo). Vazio → o botão mostra o nome do ponto.

#### Nomes na interface web do ESP32

*(Backend ESP32, **recurso licenciado** — disponível a partir do nível **community**.)* Dê aos seus
canais e botões nomes amigáveis que aparecem nas próprias páginas web do dispositivo em vez de
`Ch 1…8` / `DI 1…8`:

- O adaptador **envia o Nome de cada ponto de aeração** ao seu canal de relé (Ch 1–6) e o **Nome do
  botão** opcional de cada ponto à entrada digital correspondente (DI 1–8).
- **Ch 7 = Notventil** (válvula de emergência) e **Ch 8 = Pumpe** (bomba) são **fixos** e não podem
  ser renomeados.
- **Standalone (sem adaptador):** os mesmos nomes podem ser editados **no dispositivo** em
  *Configurações → Namen (Kanäle & Taster)* e são armazenados no ESP (NVS); quando o adaptador está
  conectado, ele os sobrescreve com os nomes configurados aqui.
- No firmware **free** (sem licença) os nomes são ignorados e as páginas mostram os rótulos padrão
  `Ch`/`DI`.

### Grupos
Agrupe pontos para comutá-los juntos (por ex. um botão abre vários difusores). Dê um nome ao grupo e
marque seus pontos membros. **Nunca pode haver mais grupos do que pontos.**

### Controle
- **Rodízio cíclico (round-robin)** – percorrer os pontos por vez, cada um aberto pelo **tempo de
  permanência** (segundos).
  - **Sequência (pontos e grupos)** – defina opcionalmente um **ciclo ordenado de passos**, onde cada
    passo aponta para um único **ponto ou um grupo inteiro** e pode ter seu próprio tempo de
    permanência. Isso permite executar por ex. *grupo 1 → grupo 3 → ponto 1 → …* e **misturar**
    livremente pontos e grupos. Reordene os passos com as setas para cima/baixo no admin. Deixe a
    sequência vazia para voltar ao round-robin simples sobre todos os pontos.
- **Horários** – abrir pontos/grupos selecionados durante uma janela de tempo por dia da semana.
  **De**/**Até** são escolhidos com um **seletor de relógio** (hora/minuto, 24 h; janelas que
  atravessam a noite, como `22:00`–`06:00`, são suportadas). Um horário ativo tem **prioridade sobre o
  round-robin / a sequência**.
- **Modo inverno / livre de gelo** – durante a estação configurada (**Início**/**Fim** escolhidos com
  um **calendário** — contam apenas o **dia e o mês**, recorrentes a cada ano, por ex. 1 nov – 15 mar,
  atravessando a virada do ano) os pontos selecionados são
  forçados a abrir para manter um buraco livre de gelo. Opcionalmente marque **Apenas quando está frio
  (proteção contra congelamento)** e defina um **limite de temperatura do ar** para que o lago só seja
  aerado enquanto realmente estiver congelando (isto requer o monitoramento da temperatura do ar).
  Deixe **Pontos mantidos abertos** vazio para aerar todo o lago. O modo inverno é executado no modo de
  operação `auto` e, como todo programa, ainda cede ao bloqueio de segurança e a uma pausa do feeder.

### Sensores
Monitoramento opcional. Para cada sensor marque **Habilitado** e escolha o **estado de origem**:
- **Oxigênio dissolvido** – com um limite inferior (dispara `sensors.oxygenAlarm`), um valor-alvo e
  uma histerese; a **% de saturação** de oxigênio é calculada a partir da temperatura da água.
  - **Malha fechada de oxigênio** – quando habilitada, o adaptador **força a aeração a ligar** enquanto
    o oxigênio está abaixo do limite inferior e a mantém ligada até que ele se recupere para o alvo (ou
    `low + hysteresis` quando nenhum alvo é definido). Deixe **Pontos reforçados** vazio para reforçar
    todo o lago. Como o modo inverno, a malha é executada no modo `auto` e cede à segurança e às pausas
    do feeder.
- **Temperatura do ar/água**.
- **Pressão** – com mín/máx (fora da faixa dispara `sensors.pressureAlarm`).

### Localização
Necessária para os horários astronômicos (nascer/pôr do sol/noite).
- **Fonte da localização** – `Localização do sistema ioBroker` (usa as coordenadas do seu sistema) ou
  `Localização personalizada`. Para uma localização personalizada, digite um endereço e pressione
  **Buscar** (geocodificado sob demanda via OpenStreetMap/Nominatim) ou clique/arraste o marcador no
  mapa.

### Feeder
Pausar pontos selecionados enquanto
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) está alimentando,
para que a ração não seja espalhada.
- Escolha a **instância do feeder** (detectada automaticamente) e marque os **interruptores do
  feeder** a monitorar.
- **Modo de duração** – `Medir` observa o interruptor (pausa = alimentação + deslocamento, sem
  conhecer a duração da alimentação de antemão); `Pulso` usa uma duração de alimentação fixa.
- **Deslocamento (s)** – pausa adicional após o fim da alimentação. **Deve ser pelo menos o tempo
  médio que os animais precisam para comer** (exemplo: 15 s de alimentação + 60 s de deslocamento ⇒
  75 s de aeração pausada).
- **Pontos afetados** – quais pontos são pausados durante a alimentação.

### Segurança
Cada campo desta aba traz uma **explicação no admin** do que ele faz e do seu efeito — leia-as, pois
esta é a aba em que um valor errado mais importa.
- **Válvulas abertas mín. enquanto a bomba funciona** – a proteção contra o dead-heading (padrão `1`).
- **Intervalo do watchdog (s)** e **sobreposição make-before-break (s)**.
- **Bomba** – se é **controlável**, o **sinal** da bomba e os tempos mínimos de liga/desliga contra o
  chaveamento muito frequente. Quando é controlável, o adaptador **aciona a bomba para seguir a
  demanda de aeração** — ela funciona enquanto pelo menos o mínimo de válvulas está aberto e desliga
  quando o lago está inativo ou em um disparo por dead-head (respeitando os tempos mínimos de
  liga/desliga); quando *não* é controlável, a bomba é apenas observada e a válvula de emergência a
  protege sozinha. *Com o backend **ESP32**, o sinal da bomba é o **canal de relé do ESP32** —
  exatamente o mesmo definido em Geral → Backend de hardware, exibido aqui para que as duas abas nunca
  possam se contradizer; com o backend **ioBroker** é um estado do ioBroker.*
- **Válvula de emergência** – seu **sinal**, se é **normalmente aberta** (à prova de falhas), o
  **tipo** de válvula (solenoide ou válvula de esfera motorizada) e, para uma válvula motorizada, seu
  **tempo de curso**. *Com o backend ESP32, o sinal é igualmente o canal de relé do ESP32 da válvula
  de emergência (o mesmo de Geral).*

### Notificações
Habilite as notificações e escolha uma **instância de messaging** (qualquer adaptador do tipo
`messaging`, por ex. Telegram ou Pushover), depois **marque quais eventos** devem enviar uma mensagem:
- **Bloqueio de segurança** – quando o bloqueio contra o dead-heading dispara ou é liberado;
- **Alarme de oxigênio** – quando o oxigênio dissolvido cai demais ou se recupera;
- **Alarme de pressão** – quando a pressão sai ou volta a entrar na sua faixa.

A cada transição (disparo e liberação) é enviado um texto curto e localizado. Sem nenhum evento
marcado, nada é enviado.

## 6. Objetos / pontos de dados

O adaptador cria seus pontos de dados a partir da sua configuração. Espaços reservados: `<n>` =
índice do ponto de aeração (0–7), `<g>` = índice de grupo. Os objetos marcados com **(w)** são
comandos graváveis; todos os outros são valores de estado somente leitura atualizados pelo adaptador.

**Geral**

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `info.connection` | boolean | `indicator.connected` | Adaptador em execução / configuração válida |
| `info.backend` | string | `text` | Backend de hardware ativo (`iobroker` ou `esp32`) |
| `info.activeMode` | string | `text` | Modo de operação atual |
| `info.dryRun` | boolean | `indicator` | Dry-run ativo (nenhum hardware é comutado) |

**Backend ESP32 (info)** (apenas com o backend de hardware ESP32)

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `info.deviceFirmware` | string | `text` | Versão do firmware reportada pelo ESP32 |
| `info.firmwareCompatible` | boolean | `indicator` | O protocolo do firmware é compatível com este adaptador |
| `info.licenseTier` | string | `text` | Nível de licença ativo: `free` (monitoramento), `community` (controle de relés) ou `pro` (+ agendamento standalone); vazio se o firmware não tiver a camada de licenciamento |
| `info.licenseTrialDaysLeft` | number | `value` | Dias de avaliação restantes da licença (0 = nenhuma avaliação em andamento) |
| `info.deviceCode` | string | `text` | Código do dispositivo — informe-o ao desbloquear para receber uma chave de ativação |
| `info.licenseControlBlocked` | boolean | `indicator` | O dispositivo rejeitou um comando de controle (não licenciado para controle) |

**Controle (comandos graváveis)**

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `control.enabled` | boolean (w) | `switch.enable` | Habilitação principal |
| `control.mode` | string (w) | `text` | Modo de operação: `auto`, `manual` ou `off` |
| `control.allOff` | boolean (w) | `button` | Fechar todas as válvulas |
| `control.point.<n>.open` | boolean (w) | `switch` | Abrir manualmente a válvula do ponto `<n>` |
| `control.group.<g>.active` | boolean (w) | `switch` | Ativar manualmente o grupo `<g>` |

**Pontos de aeração** (um canal por ponto configurado, nomeado conforme o ponto)

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | A válvula está aberta |
| `aeration.point.<n>.active` | boolean | `indicator` | O ponto está aerando no momento |
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Botão de substituição manual ativo (apenas com um botão configurado) |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Tempo de funcionamento hoje (segundos) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Tempo de funcionamento total (horas, para manutenção) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Carimbo de data/hora da última mudança de válvula |
| `aeration.point.<n>.error` | string | `text` | Último erro deste ponto |

**Grupos**

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `groups.<g>.members` | string | `json` | Índices dos pontos membros |
| `groups.<g>.active` | boolean | `indicator` | O grupo está ativo no momento |

**Segurança**

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Bloqueio de segurança atualmente ativo |
| `safety.emergencyValve` | boolean | `indicator` | A válvula de emergência está aberta |
| `safety.pumpRunning` | boolean | `indicator` | A bomba está funcionando |
| `safety.openValveCount` | number | `value` | Número de válvulas abertas |
| `safety.lastTripReason` | string | `text` | Motivo do último acionamento do bloqueio |

**Sensores** (criados apenas quando o respectivo monitoramento está ativado)

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `sensors.oxygen` | number | `value` | Oxigênio dissolvido (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Saturação de oxigênio (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Oxigênio abaixo do limite inferior |
| `sensors.oxygenBoostActive` | boolean | `indicator` | A malha fechada de oxigênio está forçando a aeração a ligar (apenas com a malha habilitada) |
| `sensors.airTemperature` | number | `value.temperature` | Temperatura do ar (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Temperatura da água (°C) |
| `sensors.pressure` | number | `value.pressure` | Pressão do sistema (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Pressão fora da faixa |

**Astronomia e localização**

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Horários solares para a localização |
| `astro.isNight` | boolean | `indicator` | Atualmente é noite |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Coordenadas resolvidas |
| `location.resolvedAddress` | string | `text` | Endereço resolvido |

**Acoplamento com o feeder** (criado apenas quando o acoplamento com o feeder está ativado)

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `feeder.pauseActive` | boolean | `indicator` | Aeração pausada para a alimentação |
| `feeder.pauseUntil` | number | `value.time` | Pausa ativa até |
| `feeder.lastFeedStart` | number | `value.time` | Último início da alimentação |

**Modo inverno / livre de gelo** (criado apenas quando o modo inverno está habilitado)

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `winter.active` | boolean | `indicator` | O modo inverno está forçando a aeração a ligar no momento |
| `winter.frostActive` | boolean | `indicator` | A proteção contra congelamento está engatada (frio o suficiente) |

**Estatísticas**

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Tempo de funcionamento do ponto `<n>` hoje (segundos) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Tempo de funcionamento total do ponto `<n>` (horas) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Tempo de funcionamento do compressor hoje (horas) |
| `statistics.switchCyclesToday` | number | `value` | Ciclos de comutação de válvulas hoje |

Quando um ponto, grupo ou sensor é removido da configuração, seus objetos são limpos
automaticamente.

## 7. Roteiro

Concluído: interface de configuração, controle de válvulas (horário/round-robin/grupos), o bloqueio
de segurança contra o dead-heading, o monitoramento, astro e geolocalização, o acoplamento com o
feeder, o **modo inverno / livre de gelo**, a **malha fechada de oxigênio**, as **notificações**, as
**estatísticas de funcionamento**, o **modo de teste dry-run** e o backend de hardware **ESP32** direto
com o seu firmware de referência (que você grava no navegador a partir da
[página de flash do firmware](https://ssbingo.github.io/pond-aeration-flash/)). **Ainda por vir:**

* um **adaptador de widgets vis-2** subsequente para operação e monitoramento.

Consulte [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para o plano completo, baseado em marcos.

---

📖 [Documentação principal (inglês)](../../README.md)

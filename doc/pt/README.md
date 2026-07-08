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

> ⚠️ **Estado do projeto.** Totalmente implementado e configurável a partir do admin: o controle das
> válvulas (horário programado, rodízio cíclico round-robin, grupos), o **bloqueio de segurança**
> contra o dead-heading, o **monitoramento** (oxigênio, temperatura ar/água, pressão com alarmes), os
> **horários astronômicos e a geolocalização**, o **acoplamento com o feeder**, o **modo inverno /
> livre de gelo**, a **malha fechada de oxigênio**, as **notificações via um adaptador de messaging**,
> as **estatísticas de funcionamento** e um **modo de teste dry-run**. **Ainda planejado:** o backend
> de hardware **ESP32** direto. Até que o backend ESP32 seja lançado, as válvulas e a bomba são
> controladas por meio de estados existentes do ioBroker.

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

As válvulas e a bomba são controladas através de **estados existentes do ioBroker** (de qualquer
adaptador que exponha os interruptores). Um backend de hardware **ESP32** direto (sem uma instância
adicional do ioBroker) está planejado.

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
  por meio de estados de outros adaptadores. `ESP32 (direto)` está *planejado* (M7) e ainda não está
  ativo.
- **Intervalo de sondagem (s)** – com que frequência o status do backend é consultado (por ex. `30`).

### Pontos de aeração
O coração da configuração. Adicione **até 8** pontos; cada ponto é uma válvula. Por ponto:
- **Nome** – por ex. `Pier`, `Deep zone`.
- **Habilitado** – incluir este ponto no controle.
- **Backend** – `ioBroker` (um estado externo) ou `ESP32` (um canal de relé, planejado).
- **Estado da válvula / canal** – para o backend ioBroker, escolha o estado interruptor que abre a
  válvula (pelo navegador de objetos); para ESP32, o número do canal.

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
- **Horários** – abrir pontos/grupos selecionados durante uma janela de tempo por dia da semana
  (`De`/`Até`, por ex. `08:00`–`18:00`; janelas que atravessam a noite, como `22:00`–`06:00`, são
  suportadas). Um horário ativo tem **prioridade sobre o round-robin / a sequência**.
- **Modo inverno / livre de gelo** – durante a estação configurada (**Início**/**Fim** como `MM-DD`
  recorrentes, por ex. `11-01`–`03-15`, atravessando a virada do ano) os pontos selecionados são
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
- **Válvulas abertas mín. enquanto a bomba funciona** – a proteção contra o dead-heading (padrão `1`).
- **Intervalo do watchdog (s)** e **sobreposição make-before-break (s)**.
- **Bomba** – se é controlável (então o bloqueio pode desligá-la), seu estado e os tempos mínimos de
  liga/desliga contra o chaveamento muito frequente.
- **Válvula de emergência** – seu estado, se é **normalmente aberta** (à prova de falhas), o **tipo**
  de válvula (solenoide ou válvula de esfera motorizada) e, para uma válvula motorizada, seu **tempo
  de curso**.

### Notificações
Habilite as notificações e escolha uma **instância de messaging** (qualquer adaptador do tipo
`messaging`, por ex. Telegram ou Pushover). O adaptador então envia uma mensagem curta e localizada
quando o bloqueio de segurança dispara ou é liberado, quando o alarme de oxigênio é acionado ou se
recupera, e quando a pressão sai ou volta a entrar na sua faixa.

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
| `sensors.airTemperature` | number | `value.temperature` | Temperatura do ar (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Temperatura da água (°C) |
| `sensors.pressure` | number | `value.pressure` | Pressão do sistema (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Pressão fora da faixa |
| `sensors.oxygenBoostActive` | boolean | `indicator` | A malha fechada de oxigênio está forçando a aeração a ligar (apenas com a malha habilitada) |

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
**estatísticas de funcionamento** e o **modo de teste dry-run**. **Ainda por vir:**

* o backend de hardware **ESP32** direto + firmware de referência (Waveshare ESP32-S3-POE-ETH-8DI-8RO);
* um **adaptador de widgets vis-2** subsequente para operação e monitoramento.

Consulte [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para o plano completo, baseado em marcos.

---

📖 [Documentação principal (inglês)](../../README.md)

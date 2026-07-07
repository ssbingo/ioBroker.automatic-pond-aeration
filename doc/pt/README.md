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

> ⚠️ **Estado do projeto: estrutura inicial / trabalho em andamento.** Esta versão estabelece o
> esqueleto do adaptador (ciclo de vida, objetos base, modelo de configuração e a base do bloqueio de
> segurança). O motor de controle, os backends de hardware e as funções de monitoramento estão sendo
> adicionados marco a marco. Ainda não se destina ao uso em produção.

---

## Índice

1. [O que o adaptador faz](#1-o-que-o-adaptador-faz)
2. [Conceito de segurança](#2-conceito-de-segurança)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Instalação](#4-instalação)
5. [Visão geral da configuração](#5-visão-geral-da-configuração)
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

As válvulas e a bomba podem ser controladas através de **estados existentes do ioBroker** (de qualquer
adaptador que exponha os interruptores) ou **diretamente em um ESP32** executando o firmware
complementar.

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
* Uma ou mais válvulas acessíveis como estados do ioBroker, ou um ESP32 com o firmware complementar.

## 4. Instalação

Instale o adaptador a partir do admin do ioBroker (ou, durante o desenvolvimento, a partir do
repositório do GitHub) e crie uma instância. Abra as configurações da instância para configurá-lo.

## 5. Visão geral da configuração

A página de configurações cresce com os marcos. Seções planejadas: geral/backend, pontos de aeração,
controle (horário/round-robin/grupos), sensores, astro e localização, acoplamento com o feeder,
segurança e notificações. Consulte [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para o projeto completo.

## 6. Objetos / pontos de dados

| Objeto | Tipo | Função | Descrição |
|--------|------|--------|-----------|
| `info.connection` | boolean | `indicator.connected` | Adaptador em execução / configuração válida |
| `control.enabled` | boolean (gravável) | `switch.enable` | Habilitação principal (comando) |
| `safety.interlockActive` | boolean | `indicator.alarm` | Bloqueio de segurança atualmente ativo |

Mais pontos de dados (por ponto de aeração, grupos, sensores, segurança e estatísticas) serão
adicionados à medida que os respectivos recursos forem implementados; cada novo estado será
documentado aqui.

## 7. Roteiro

Consulte [PROJECT_PLAN.md](../../PROJECT_PLAN.md) para o plano de implementação completo baseado em
marcos (motor de controle, backends HAL, firmware ESP32, monitoramento, acoplamento com o feeder, modo
de inverno e o adaptador de widgets vis-2 subsequente).

---

📖 [Documentação principal (inglês)](../../README.md)


Objetivo: ajustar a visualização Cards da agenda “Hoje” para que cards do mesmo horário/conflito tenham larguras iguais, ocupem melhor o espaço horizontal e nunca se sobreponham.

1. Revisar a lógica de agrupamento horizontal
- Manter a base atual em `src/pages/Agendamentos.tsx`, no bloco `diaViewMode === "cards"`.
- Separar com mais clareza dois conceitos que hoje estão misturados:
  - grupo de conflito por tempo (quem realmente disputa espaço);
  - redistribuição visual entre cards simultâneos.

2. Recalcular colunas por grupo de conflito
- Continuar usando componentes conectados por sobreposição de intervalo.
- Dentro de cada grupo, recalcular as colunas com uma regra estável:
  - cada card recebe uma coluna base sem colisão;
  - cards que se sobrepõem no tempo nunca podem compartilhar a mesma faixa horizontal;
  - cards do mesmo conjunto simultâneo devem usar exatamente a mesma largura.

3. Redistribuir largura de forma “estilo calendário”
- Para cada conjunto de cards ativos ao mesmo tempo:
  - identificar a primeira coluna disponível;
  - identificar o limite máximo à direita sem invadir card de outro conjunto;
  - dividir esse espaço igualmente entre os cards simultâneos.
- Resultado esperado:
  - dois cards no mesmo horário ficam com a mesma largura;
  - eles expandem até quase encostar no próximo bloco lateral;
  - o gap mínimo entre cards continua constante e não aumenta globalmente.

4. Blindar contra sobreposição
- Aplicar uma checagem final de fronteira horizontal:
  - nenhum card pode avançar além da coluna ocupada por outro card com interseção de tempo;
  - nenhum card pode “crescer” sobre um card anterior ou posterior que esteja ativo no mesmo intervalo.
- Preservar também o espaçamento vertical já calculado por `minToY(...)` e `height`, evitando que cards longos invadam visualmente os de baixo.

5. Ajustar o rendering visual dos cards
- Refinar apenas os cálculos de:
  - `left`
  - `width`
  - eventualmente um `gap` mínimo interno constante
- Manter intactos:
  - conteúdo do card;
  - ícone de Taxi Dog;
  - clique para edição;
  - demais visualizações (Relatório, Semana, etc.).

6. Validar os cenários críticos
- Mesmo horário com 2 ou mais cards: todos com mesma largura.
- Horários adjacentes com blocos à direita/esquerda: cards expandem sem encostar indevidamente.
- Card mais longo acima de cards menores: sem sobreposição.
- Casos citados no histórico:
  - 09:30 x 10:00 x 10:30;
  - cards da Angelica às 10:30;
  - card da Clara Di Tano às 10:00.
- Conferir também na viewport atual (~896px) para evitar compressão excessiva.

Detalhes técnicos
- Arquivo principal: `src/pages/Agendamentos.tsx`
- Trecho afetado: bloco da visualização `diaViewMode === "cards"` por volta das linhas 5750–5965.
- Pontos centrais a refatorar:
  - construção do `colMap`;
  - cálculo de `maxRight / totalAvail / equalSpan`;
  - transformação final em `leftPct` e `widthPct`.
- Estratégia recomendada:
```text
1. montar grupos de conflito
2. atribuir colunas-base sem colisão
3. identificar subconjuntos simultâneos
4. calcular faixa horizontal segura para cada subconjunto
5. dividir largura igualmente dentro dessa faixa
6. renderizar com gap mínimo constante
```

Resultado esperado
- Cards simultâneos com mesma largura.
- Melhor aproveitamento horizontal.
- Espaçamento mínimo consistente.
- Nenhuma sobreposição horizontal ou visual.
- Layout mais limpo e próximo de calendários modernos.

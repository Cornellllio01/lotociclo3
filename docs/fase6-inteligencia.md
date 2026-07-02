# Fase 6 — Inteligência de Análise: Especificação e Fórmulas

Este documento especifica a fundamentação matemática, as fórmulas de cálculo e a lógica de negócios para a Fase 6 do LotoCiclo3.

---

## 1. Score de Qualidade do Jogo

O **Score de Qualidade** mede a aderência estatística de uma combinação de 15 dezenas em relação aos padrões históricos consolidados da Lotofácil. Ele varia de **0 a 100 pontos**.

> [!IMPORTANT]
> **Aviso Importante na UI:** O score indica apenas a **proximidade do jogo aos padrões estatísticos mais frequentes do histórico**, e **NÃO aumenta ou garante a probabilidade matemática de vitória** (cada concurso individual é estocasticamente independente e todas as combinações de 15 dezenas possuem exatamente a mesma chance matemática de 1 em 3.268.760).

### Critérios e Pontuações

O score é a soma ponderada de 4 critérios:

$$Score = C_{pares} \times 0.30 + C_{primos} \times 0.25 + C_{soma} \times 0.25 + C_{dispersao} \times 0.20$$

#### Critério 1: Par/Ímpar (Peso: 30%)
A distribuição estatisticamente mais comum na Lotofácil é de 7 ou 8 dezenas pares (aprox. 62% dos sorteios).
- **8 ou 7 pares**: 100 pontos
- **9 ou 6 pares**: 60 pontos
- **10 ou 5 pares**: 20 pontos
- **Qualquer outro caso**: 0 pontos

#### Critério 2: Números Primos (Peso: 25%)
Os números primos entre 01 e 25 são: **[2, 3, 5, 7, 11, 13, 17, 19, 23]** (total de 9).
A maior frequência histórica é de 5 ou 6 primos.
- **5 ou 6 primos**: 100 pontos
- **4 ou 7 primos**: 60 pontos
- **3 ou 8 primos**: 20 pontos
- **Qualquer outro caso**: 0 pontos

#### Critério 3: Soma das Dezenas (Peso: 25%)
A soma esperada das 15 dezenas é de $15 \times 13 = 195$. Cerca de 70% dos concursos têm soma entre 180 e 210.
- **Soma entre 180 e 210 (inclusive)**: 100 pontos
- **Soma entre [166-179] ou [211-224]**: 60 pontos
- **Soma entre [150-165] ou [225-240]**: 20 pontos
- **Qualquer outro caso**: 0 pontos

#### Critério 4: Dispersão / Desvio Padrão (Peso: 20%)
Mede a distribuição espacial das dezenas para evitar jogos excessivamente agrupados (ex: 01 a 15) ou excessivamente espaçados.
Calcula-se o desvio padrão ($\sigma$) das 15 dezenas:
$$\sigma = \sqrt{\frac{\sum_{i=1}^{15}(x_i - \bar{x})^2}{15}}$$
- **$6.5 \le \sigma \le 7.8$** (espaçamento natural): 100 pontos
- **$5.5 \le \sigma < 6.5$** ou **$7.8 < \sigma \le 8.5$**: 50 pontos
- **Qualquer outro caso**: 0 pontos

---

## 2. Relatório Financeiro e ROI Histórico

Mede o desempenho de investimento real nos jogos cadastrados e que já passaram por conferência de resultados.

### Fórmulas

1. **Total Gasto (Histórico Real):**
   Multiplica o custo unitário de cada jogo cadastrado no banco pelos concursos aos quais ele foi efetivamente associado e que já foram realizados.
   $$GastoTotal = \sum (CustoDoJogo \times QuantidadeDeConcursosEfetivados)$$
   *(Nota: O Custo do Jogo é calculado dinamicamente de acordo com a quantidade de dezenas jogadas).*

2. **Total Ganho (Histórico Real):**
   Soma das premiações estimadas de acordo com as faixas de acertos obtidas (11, 12, 13, 14 ou 15 pontos) nas conferências dos jogos.
   - **11 acertos**: R$ 6,00
   - **12 acertos**: R$ 12,00
   - **13 acertos**: R$ 30,00
   - **14 e 15 acertos**: Valor extraído da premiação real do concurso (disponível no banco de dados sincronizado da Caixa). Se não disponível, assume valor padrão conservador (ex: R$ 1.500,00 para 14 pts e R$ 1.000.000,00 para 15 pts).

3. **Retorno sobre Investimento (ROI) Histórico Real:**
   $$ROI = \frac{TotalGanho - TotalGasto}{TotalGasto}$$
   Exibido em porcentagem (ex: -40%, +15%). Se $TotalGasto = 0$, o ROI é zero.

4. **Projeções de Custo (Sem promessa de ganho):**
   Projeta apenas o custo de manutenção futura com base nos jogos ativos atuais multiplicados pelo número de concursos futuros estimados (ex: próximos 10, 20 ou 50 concursos). A UI proibirá categoricamente projeções de retorno financeiro futuro.

---

## 3. Simulações do Sistema 6+9

Permite que o usuário teste estratégias sem salvar dados permanentes no banco.

- **Fluxo:** O usuário escolhe as dezenas fixas (ou o app escolhe para ele) e simula o sorteio de $N$ jogos com o esquema 6+9.
- **Retrospectiva:** Esses jogos são cruzados contra os últimos $X$ concursos cadastrados localmente (ex: últimos 10, 20 ou 50 concursos).
- **Métricas Exibidas:**
  - Total investido (gasto simulado).
  - Total ganho simulado (prêmios que teriam sido conquistados).
  - ROI simulado retrospectivo.
  - Taxa de acerto por faixa de pontuação.

---

## 4. Comparador de Jogos

Permite analisar 2 ou mais jogos selecionados da lista de jogos salvos:
- **Sobreposição (Overlap):** Dezenas idênticas compartilhadas entre os jogos.
- **Desempenho Comparado:** Média de acertos, pontuação máxima e total acumulado de premiação histórica.

# FASE 4 — FÓRMULAS E MTRICAS ESTATÍSTICAS

Este documento descreve as fórmulas exatas usadas para computar as análises estatísticas gerais dos concursos e o desempenho pessoal do usuário.

## 1. Estatísticas Gerais dos Concursos

### 1.1 Frequência Absoluta e Relativa de Dezenas
A Frequência Absoluta ($FA$) de uma dezena $d \in [1, 25]$ em um conjunto de $N$ concursos selecionados é a soma total de vezes em que essa dezena foi sorteada:
$$FA(d) = \sum_{i=1}^{N} X_i(d) \quad \text{onde } X_i(d) = \begin{cases} 1 & \text{se } d \text{ sorteada no concurso } i \\ 0 & \text{caso contrário} \end{cases}$$

A Frequência Relativa ($FR$) é o percentual de sorteios da dezena sobre o período:
$$FR(d) = \left( \frac{FA(d)}{N} \right) \times 100\%$$

### 1.2 Dezenas Quentes e Frias
- **Dezenas Quentes:** As 5 dezenas com os maiores valores de $FA(d)$ no período analisado.
- **Dezenas Frias:** As 5 dezenas com os menores valores de $FA(d)$ no período analisado.

### 1.3 Médias Estatísticas dos Concursos
Para cada concurso, calculamos:
- **Pares ($P$):** Quantidade de dezenas divisíveis por 2.
- **Ímpares ($I$):** $15 - P$.
- **Primos ($Pr$):** Quantidade de dezenas pertencentes ao conjunto $\{2, 3, 5, 7, 11, 13, 17, 19, 23\}$.
- **Soma ($S$):** A soma das 15 dezenas do concurso:
  $$S = \sum_{k=1}^{15} d_k$$

A distribuição agregada sobre os $N$ concursos do período é calculada encontrando a média aritmética simples para cada métrica.

---

## 2. Estatísticas de Desempenho Pessoal

### 2.1 Taxa de Acerto Histórica
A taxa de acerto histórica mede a eficácia de todos os jogos cadastrados pelo usuário. É dividida em duas métricas principais:

1. **Aproveitamento Global ($AG$):**
   $$AG = \left( \frac{\sum \text{acertos}}{\sum \text{total dezenas jogadas}} \right) \times 100\%$$
   
2. **Taxa de Premiação ($TP$):** Percentual de jogos que obtiveram pontuação premiável ($\ge 11$ pontos):
   $$TP = \left( \frac{\text{Jogos com } \ge 11 \text{ acertos}}{\text{Total de jogos conferidos}} \right) \times 100\%$$

### 2.2 Evolução das Pontuações
Calculamos a pontuação média obtida pelos jogos do usuário concurso a concurso para plotar a curva de evolução temporal:
$$\text{Pontuação Média}(c) = \frac{\sum_{j \in J_c} \text{acertos}(j, c)}{|J_c|}$$
Onde $J_c$ é o conjunto de jogos do usuário vinculados ao concurso $c$.

### 2.3 Comparação: Jogos Fixos vs Surpresinhas
Separamos os jogos do usuário em dois grupos baseados nas propriedades do jogo:
- **Grupo Manuais/Fixos:** Jogos salvos com dezenas inseridas manualmente ou focados em fixas selecionadas.
- **Grupo Surpresinhas:** Jogos gerados usando o algoritmo automático 6+9.

Calculamos o desempenho médio ($DM$) de cada grupo:
$$DM(\text{Grupo}) = \frac{\sum_{j \in \text{Grupo}} \text{acertos}(j)}{\text{Total de jogos do Grupo}}$$

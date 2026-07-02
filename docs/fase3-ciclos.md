# FASE 3 — CICLOS DA LOTOFÁCIL

## Regra Exata de Fechamento de Ciclo

Um **Ciclo de Loterias (Lotofácil)** é definido como a sequência consecutiva de concursos necessários para que todos os 25 números possíveis (de 01 a 25) apareçam nos resultados pelo menos uma vez.

### Algoritmo e Fluxo de Estado

1. **Início do Ciclo**:
   - Um ciclo é criado marcando o concurso inicial (`inicio`).
   - Um mapa/objeto contendo o contador de sorteios para cada uma das 25 dezenas (`contagem`) é zerado:
     $$\text{contagem} = \{ 1: 0, 2: 0, \dots, 25: 0 \}$$

2. **Acumulação de Concursos**:
   - Para cada concurso cadastrado que pertença a este ciclo:
     - Incrementamos o contador das 15 dezenas que foram sorteadas:
       $$\text{contagem}[d] = \text{contagem}[d] + 1 \quad \forall d \in \text{dezenas sorteados}$$

3. **Verificação de Fechamento (Regra Fundamental)**:
   - Contamos quantas dezenas já foram sorteadas pelo menos uma vez durante o ciclo ativo:
     $$\text{totalSorteadas} = | \{ d \in [1, 25] \mid \text{contagem}[d] \ge 1 \} |$$
   - Se $\text{totalSorteadas} = 25$, o ciclo é considerado **FECHADO**.
   - O concurso atual se torna o concurso final (`fim`) do ciclo.
   - O ciclo é persistido no banco de dados com `fim = numeroConcurso`.

4. **Reset Automático**:
   - Assim que o ciclo é fechado, o sistema cria automaticamente um novo ciclo ativo:
     $$\text{novoCiclo} = \{ \text{inicio}: \text{numeroConcurso} + 1, \text{fim}: \text{null}, \text{contagem}: \{ 1:0, \dots, 25:0 \} \}$$

### Progresso do Ciclo
- O progresso do ciclo é medido por:
  - **Dezenas Sorteadas:** $\text{totalSorteadas} \text{ de } 25$.
  - **Dezenas Faltantes (Não Sorteadas):** O conjunto de dezenas com ocorrência igual a zero:
    $$\text{faltantes} = \{ d \in [1, 25] \mid \text{contagem}[d] = 0 \}$$
  - **Concursos Decorridos:** A quantidade de sorteios ocorridos no ciclo atual:
    $$\text{concursosNoCiclo} = \text{concursoAtual} - \text{concursoInicio} + 1$$

---
*Esta regra garante que a geração de jogos usando o Esquema 6+9 sempre use dados estatisticamente corretos sobre quais dezenas ainda não saíram no ciclo ativo.*

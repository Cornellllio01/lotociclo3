# FASE 2 — FUNCIONALIDADES PRINCIPAIS

## Objetivos
Criar as funcionalidades principais de jogos e resultados, com navegação fluída por abas (Tabs).

## Tópicos e Implementação

### 1. Sistema de Abas (Tabs)
- O aplicativo adotará uma navegação baseada em Tabs (`app/(tabs)`) para "Resultado", "Meus Jogos", "Novo Jogo" e "Ciclo".

### 2. Aba Resultado ($)
- Exibe o último concurso (com 15 bolas roxas).
- Permite navegar para trás/frente entre os concursos (▼▲).
- Busca automática do resultado mais recente na API Caixa ao iniciar.
- Informações estatísticas: Barra Par/Ímpar/Primo/Soma.
- Abaixo, renderiza a lista de "Meus Jogos" associados àquele concurso, devidamente conferidos e coloridos:
  - 🟢 Verde: acertou dezena do grupo dos 10 (naoSairam).
  - 🔵 Azul: acertou dezena do grupo dos 15 (saíram).
  - 🟠 Laranja: acertou fixa.
  - ⚪ Branco: erro.
- O placar mostra os pontos segregados: "4🟢 + 6🔵 = 10 pts".

### 3. Aba Meus Jogos (★)
- Lista todos os jogos já gerados, agrupados pelo concurso a que pertencem.
- Seletor de concursos para navegação (▼▲).
- As dezenas aparecem coloridas conforme as regras do sistema, e o total de pontos à direita.
- Um menu oferece ações como exportar, excluir ou filtrar.

### 4. Aba Novo Jogo (+)
- Renderiza o grid de 25 dezenas com coloração visual dos grupos.
- As "Fixas" definidas no ciclo atual vêm pré-marcadas e travadas visualmente em laranja.
- Atualização em tempo real das propriedades: Par/Ímpar/Primo/Soma.
- O botão de "Surpresinha" implementa especificamente a "Surpresinha 6+9".
- Modal para confirmação, que permite definir a "Teimosinha" e salvar os jogos atrelando aos próximos X concursos.

### 5. Sistema 6+9 & Conferência
- Algoritmo de geração que atende à regra restrita: fixas obrigatórias, complemento de sorteadas até completar o grupo de 9, e complemento do grupo de 6 das não-sorteadas.
- O preço é calculado com base no número de dezenas (ex: 15 dezenas = R$ 3,00).
- A cada novo resultado baixado ou salvo manualmente, a conferência dispara varrendo todos os jogos do respectivo concurso para inserir os acertos na tabela `jogo_concurso`.

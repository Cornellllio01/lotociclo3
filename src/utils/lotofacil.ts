/**
 * Utilitários de lógica para Lotofácil — Sistema 6+9
 */

/** Primos de 1 a 25 */
const PRIMOS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

/** Calcula grupos saíram/naoSairam do último resultado */
export function calcularGrupos(ultimasDezenas: number[]): { sairam: number[]; naoSairam: number[] } {
  const set = new Set(ultimasDezenas);
  const naoSairam: number[] = [];
  for (let d = 1; d <= 25; d++) {
    if (!set.has(d)) naoSairam.push(d);
  }
  return { sairam: [...ultimasDezenas].sort((a, b) => a - b), naoSairam };
}

/** Alias para compatibilidade retroativa */
export function calcularGruposLegacy(ultimasDezenas: number[]) {
  const g = calcularGrupos(ultimasDezenas);
  return { saíram: g.sairam, naoSairam: g.naoSairam };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Monta um único jogo seguindo o esquema 6+9:
 * - grupo9 = fixas + completar com sorteadas aleatórias
 * - grupo6 = 6 das não-sorteadas (aleatórias)
 */
export function montarJogo(
  sairam: number[],
  naoSairam: number[],
  fixas: number[]
): { dezenas: number[]; grupo6: number[]; grupo9: number[] } {
  // Fixas que apareceram no resultado anterior (sorteadas)
  const fixasValidas = fixas.filter(d => sairam.includes(d));
  // Sorteadas disponíveis para completar o grupo de 9
  const sairamSemFixas = sairam.filter(d => !fixasValidas.includes(d));
  // Precisamos de 9 dezenas no total (fixas + aleatorias)
  const qtdAleatorias = Math.max(0, 9 - fixasValidas.length);
  const aleatorias = shuffle(sairamSemFixas).slice(0, qtdAleatorias);
  const grupo9 = [...fixasValidas, ...aleatorias];
  // Grupo6 = 6 das não-sorteadas
  const grupo6 = shuffle(naoSairam).slice(0, 6);
  const dezenas = [...new Set([...grupo9, ...grupo6])].sort((a, b) => a - b);
  if (dezenas.length !== 15) throw new Error(`Jogo inválido: ${dezenas.length} dezenas`);
  return { dezenas, grupo6, grupo9 };
}

/** Gera três jogos diferentes usando o esquema 6+9 */
export function gerarTresJogos(
  sairam: number[],
  naoSairam: number[],
  fixas: number[]
): Array<{ dezenas: number[]; grupo6: number[]; grupo9: number[] }> {
  const jogos = [];
  for (let i = 0; i < 3; i++) {
    jogos.push(montarJogo(sairam, naoSairam, fixas));
  }
  return jogos;
}

/** Tabela de preços da Lotofácil por número de dezenas */
const PRECOS: Record<number, number> = {
  15: 3.0,
  16: 48.0,
  17: 408.0,
  18: 2448.0,
  19: 11628.0,
  20: 46512.0,
};

/** Retorna o preço de um jogo com N dezenas */
export function calcularPreco(qtdDezenas: number): number {
  return PRECOS[qtdDezenas] ?? 0;
}

/** Estatísticas Par/Ímpar/Primo/Soma de um conjunto de dezenas */
export function calcularEstatisticas(dezenas: number[]): {
  pares: number;
  impares: number;
  primos: number;
  soma: number;
} {
  const pares = dezenas.filter(d => d % 2 === 0).length;
  const impares = dezenas.length - pares;
  const primos = dezenas.filter(d => PRIMOS.has(d)).length;
  const soma = dezenas.reduce((acc, d) => acc + d, 0);
  return { pares, impares, primos, soma };
}

/** Conta acertos exatos entre jogo e resultado */
export function contarAcertos(jogo: number[], resultado: number[]): number {
  const r = new Set(resultado);
  return jogo.filter(d => r.has(d)).length;
}

/**
 * Classifica cada dezena do jogo em relação ao resultado conferido:
 * - 'fixa'  → acertou e era fixa
 * - 'azul'  → acertou e estava no grupo dos sorteados (15)
 * - 'verde' → acertou e estava no grupo dos não-sorteados (10)
 * - 'erro'  → errou
 */
export type CorDezena = 'fixa' | 'azul' | 'verde' | 'erro';

export function classificarDezenas(
  dezenas: number[],
  resultado: number[],
  grupo6: number[],
  grupo9: number[],
  fixas: number[]
): CorDezena[] {
  const resSet = new Set(resultado);
  return dezenas.map(d => {
    if (!resSet.has(d)) return 'erro';
    if (fixas.includes(d)) return 'fixa';
    if (grupo9.includes(d)) return 'azul';  // sorteadas
    if (grupo6.includes(d)) return 'verde'; // não sorteadas
    return 'azul'; // fallback
  });
}

/** Gera placar resumido: "4🟢 + 6🔵 = 10 pts" */
export function calcularPlacar(
  dezenas: number[],
  resultado: number[],
  grupo6: number[],
  grupo9: number[],
  fixas: number[]
): { verdes: number; azuis: number; fixasAcertadas: number; total: number; texto: string } {
  const cores = classificarDezenas(dezenas, resultado, grupo6, grupo9, fixas);
  const verdes = cores.filter(c => c === 'verde').length;
  const azuis = cores.filter(c => c === 'azul').length;
  const fixasAcertadas = cores.filter(c => c === 'fixa').length;
  const total = verdes + azuis + fixasAcertadas;
  const texto = `${fixasAcertadas}🟠 + ${azuis}🔵 + ${verdes}🟢 = ${total} pts`;
  return { verdes, azuis, fixasAcertadas, total, texto };
}

/** Compatibilidade retroativa */
export function lideresCiclo(contagem: Record<number, number>, top: number = 4): number[] {
  return Object.entries(contagem)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, top)
    .map(([d]) => Number(d));
}

/** Calcula o progresso do ciclo (sorteadas vs faltantes) */
export function calcularProgressoCiclo(contagem: Record<number, number>): {
  sorteadas: number;
  faltantes: number[];
  porcentagem: number;
} {
  const faltantes: number[] = [];
  let sorteadas = 0;
  for (let d = 1; d <= 25; d++) {
    if ((contagem[d] ?? 0) > 0) {
      sorteadas++;
    } else {
      faltantes.push(d);
    }
  }
  const porcentagem = (sorteadas / 25) * 100;
  return { sorteadas, faltantes, porcentagem };
}
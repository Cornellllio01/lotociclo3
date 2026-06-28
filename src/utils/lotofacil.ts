export function calcularGrupos(ultimasDezenas: number[]) {
    const saíram = new Set(ultimasDezenas);
    const naoSairam: number[] = [];
    for (let d = 1; d <= 25; d++) {
        if (!saíram.has(d)) naoSairam.push(d);
    }
    return { saíram: ultimasDezenas.sort((a, b) => a - b), naoSairam };
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function montarJogo(saíram: number[], naoSairam: number[], fixas: number[]) {
  const fixasValidas = fixas.filter(d => saíram.includes(d));
  const sairamSemFixas = saíram.filter(d => !fixasValidas.includes(d));
  const qtdAleatorias = 15 - 6 - fixasValidas.length;
  const aleatorias = shuffle(sairamSemFixas).slice(0, qtdAleatorias);
  const grupo9 = [...fixasValidas, ...aleatorias];
  const grupo6 = shuffle(naoSairam.filter(d => !grupo9.includes(d))).slice(0, 6);
  const dezenas = [...new Set([...grupo9, ...grupo6])].sort((a, b) => a - b);
  if (dezenas.length !== 15) throw new Error(`Jogo inválido: ${dezenas.length} dezenas`);
  return { dezenas, grupo6, grupo9 };
}

export function contarAcertos(jogo: number[], resultado: number[]): number {
    const r = new Set(resultado);
    return jogo.filter(d => r.has(d)).length;
}

export function lideresCiclo(contagem: Record<number, number>, top: number = 4): number[] {
    return Object.entries(contagem)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, top)
        .map(([d]) => Number(d));
}
import { SQLiteDatabase } from 'expo-sqlite';
import { Concurso, Ciclo, Jogo, JogoConcurso } from '../models';
import { contarAcertos } from '../utils/lotofacil';

export async function salvarConcurso(db: SQLiteDatabase, concurso: Concurso) {
  const dezenasJson = JSON.stringify(concurso.dezenas);
  const premiacaoJson = concurso.premiacao ? JSON.stringify(concurso.premiacao) : null;
  const criado_em = concurso.criado_em || new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO concursos (numero, data, dezenas, premiacao, criado_em) VALUES (?, ?, ?, ?, ?);`,
    [concurso.numero, concurso.data, dezenasJson, premiacaoJson, criado_em]
  );
}

export async function listarConcursos(db: SQLiteDatabase): Promise<Concurso[]> {
  const rows = await db.getAllAsync<{ numero: number; data: string; dezenas: string; premiacao: string | null; criado_em: string }>(
    `SELECT * FROM concursos ORDER BY numero ASC;`
  );
  return rows.map(r => ({
    ...r,
    dezenas: JSON.parse(r.dezenas),
    premiacao: r.premiacao ? JSON.parse(r.premiacao) : undefined,
  }));
}

export async function buscarConcursoLocal(db: SQLiteDatabase, numero: number): Promise<Concurso | null> {
  const row = await db.getFirstAsync<{ numero: number; data: string; dezenas: string; premiacao: string | null; criado_em: string }>(
    `SELECT * FROM concursos WHERE numero = ?;`,
    [numero]
  );
  if (!row) return null;
  return {
    ...row,
    dezenas: JSON.parse(row.dezenas),
    premiacao: row.premiacao ? JSON.parse(row.premiacao) : undefined,
  };
}

export async function ultimoConcurso(db: SQLiteDatabase): Promise<Concurso | null> {
  const row = await db.getFirstAsync<{ numero: number; data: string; dezenas: string; premiacao: string | null; criado_em: string }>(
    `SELECT * FROM concursos ORDER BY numero DESC LIMIT 1;`
  );
  if (!row) return null;
  return {
    ...row,
    dezenas: JSON.parse(row.dezenas),
    premiacao: row.premiacao ? JSON.parse(row.premiacao) : undefined,
  };
}

// ─── JOGOS ──────────────────────────────────────────────────────────────────

export async function salvarJogo(db: SQLiteDatabase, jogo: Jogo): Promise<void> {
  const dezenasJson = JSON.stringify(jogo.dezenas);
  const grupo6Json = JSON.stringify(jogo.grupo6 ?? []);
  const grupo9Json = JSON.stringify(jogo.grupo9 ?? []);
  const fixasJson = JSON.stringify(jogo.fixas ?? []);
  const criado_em = jogo.criado_em || new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO jogos (id, bolao, nome, dezenas, grupo6, grupo9, fixas, teimosinha, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [jogo.id, jogo.bolao ?? null, jogo.nome ?? null, dezenasJson, grupo6Json, grupo9Json, fixasJson, jogo.teimosinha ?? 0, criado_em]
  );
}

export async function listarJogos(db: SQLiteDatabase): Promise<Jogo[]> {
  const rows = await db.getAllAsync<{
    id: string; bolao: string | null; nome: string | null; dezenas: string;
    grupo6: string; grupo9: string; fixas: string; teimosinha: number; criado_em: string;
  }>(`SELECT * FROM jogos ORDER BY criado_em DESC;`);

  return rows.map(r => ({
    ...r,
    bolao: r.bolao ?? undefined,
    nome: r.nome ?? undefined,
    dezenas: JSON.parse(r.dezenas),
    grupo6: JSON.parse(r.grupo6),
    grupo9: JSON.parse(r.grupo9),
    fixas: JSON.parse(r.fixas),
  }));
}

export async function excluirJogo(db: SQLiteDatabase, jogoId: string): Promise<void> {
  await db.runAsync(`DELETE FROM jogos WHERE id = ?;`, [jogoId]);
  await db.runAsync(`DELETE FROM jogo_concurso WHERE jogo_id = ?;`, [jogoId]);
}

// ─── ASSOCIAÇÃO / CONFERÊNCIA ────────────────────────────────────────────────

/**
 * Vincula um jogo a um ou mais concursos futuros.
 * Se teimosinha = 0, vincula apenas ao concurso informado.
 */
export async function vincularJogoConcurso(
  db: SQLiteDatabase,
  jogoId: string,
  concursoNumero: number,
  teimosinha: number = 0
): Promise<void> {
  // Vincula ao concurso atual + próximos (teimosinha)
  for (let i = 0; i <= teimosinha; i++) {
    const targetConcurso = concursoNumero + i;

    // Se o concurso já existir no banco, calcula a conferência de acertos imediatamente
    const concursoRow = await db.getFirstAsync<{ dezenas: string }>(
      `SELECT dezenas FROM concursos WHERE numero = ?;`,
      [targetConcurso]
    );

    let acertos = 0;
    let premiacao = 0;

    if (concursoRow) {
      const jogoRow = await db.getFirstAsync<{ dezenas: string }>(
        `SELECT dezenas FROM jogos WHERE id = ?;`,
        [jogoId]
      );
      if (jogoRow) {
        const dezenasJogo: number[] = JSON.parse(jogoRow.dezenas);
        const dezenasResultado: number[] = JSON.parse(concursoRow.dezenas);
        acertos = contarAcertos(dezenasJogo, dezenasResultado);

        if (acertos === 15) premiacao = 1;
        else if (acertos === 14) premiacao = 2;
        else if (acertos === 13) premiacao = 3;
        else if (acertos === 12) premiacao = 4;
        else if (acertos === 11) premiacao = 5;
      }
    }

    await db.runAsync(
      `INSERT OR IGNORE INTO jogo_concurso (jogo_id, concurso_numero, acertos, premiacao)
       VALUES (?, ?, ?, ?);`,
      [jogoId, targetConcurso, acertos, premiacao]
    );
  }
}

/** Retorna os vínculos de um jogo com todos os seus concursos */
export async function listarVinculosDoConcurso(
  db: SQLiteDatabase,
  concursoNumero: number
): Promise<JogoConcurso[]> {
  const rows = await db.getAllAsync<{ jogo_id: string; concurso_numero: number; acertos: number; premiacao: number }>(
    `SELECT * FROM jogo_concurso WHERE concurso_numero = ?;`,
    [concursoNumero]
  );
  return rows;
}

/**
 * Conferência automática: ao salvar um resultado, confere todos os jogos
 * vinculados àquele concurso e atualiza acertos na tabela jogo_concurso.
 */
export async function conferenciaAutomatica(
  db: SQLiteDatabase,
  concursoNumero: number,
  resultado: number[]
): Promise<void> {
  // Busca todos os vínculos do concurso
  const vinculos = await db.getAllAsync<{ jogo_id: string }>(
    `SELECT jogo_id FROM jogo_concurso WHERE concurso_numero = ?;`,
    [concursoNumero]
  );

  for (const vinculo of vinculos) {
    // Busca o jogo
    const jogoRow = await db.getFirstAsync<{ dezenas: string }>(
      `SELECT dezenas FROM jogos WHERE id = ?;`,
      [vinculo.jogo_id]
    );
    if (!jogoRow) continue;

    const dezenas: number[] = JSON.parse(jogoRow.dezenas);
    const acertos = contarAcertos(dezenas, resultado);

    // Determina premiação baseado em acertos
    let premiacao = 0;
    if (acertos === 15) premiacao = 1; // ganhador (valor real vem da API)
    else if (acertos === 14) premiacao = 2;
    else if (acertos === 13) premiacao = 3;
    else if (acertos === 12) premiacao = 4;
    else if (acertos === 11) premiacao = 5;

    await db.runAsync(
      `UPDATE jogo_concurso SET acertos = ?, premiacao = ? WHERE jogo_id = ? AND concurso_numero = ?;`,
      [acertos, premiacao, vinculo.jogo_id, concursoNumero]
    );
  }
}

/** Retorna jogos de um concurso com dados completos e acertos */
export async function listarJogosDoConcurso(
  db: SQLiteDatabase,
  concursoNumero: number
): Promise<Array<Jogo & { acertos: number; premiacao: number }>> {
  const rows = await db.getAllAsync<{
    id: string; bolao: string | null; nome: string | null; dezenas: string;
    grupo6: string; grupo9: string; fixas: string; teimosinha: number; criado_em: string;
    acertos: number; premiacao: number;
  }>(
    `SELECT j.*, jc.acertos, jc.premiacao
     FROM jogos j
     INNER JOIN jogo_concurso jc ON jc.jogo_id = j.id
     WHERE jc.concurso_numero = ?
     ORDER BY jc.acertos DESC;`,
    [concursoNumero]
  );

  return rows.map(r => ({
    ...r,
    bolao: r.bolao ?? undefined,
    nome: r.nome ?? undefined,
    dezenas: JSON.parse(r.dezenas),
    grupo6: JSON.parse(r.grupo6),
    grupo9: JSON.parse(r.grupo9),
    fixas: JSON.parse(r.fixas),
  }));
}

// ─── CICLOS ──────────────────────────────────────────────────────────────────

export async function salvarCiclo(db: SQLiteDatabase, ciclo: Ciclo) {
  const contagemJson = JSON.stringify(ciclo.contagem);
  const fixasJson = ciclo.fixas ? JSON.stringify(ciclo.fixas) : null;
  const criado_em = ciclo.criado_em || new Date().toISOString();

  if (ciclo.id) {
    await db.runAsync(
      `UPDATE ciclos SET inicio = ?, fim = ?, contagem = ?, fixas = ?, criado_em = ? WHERE id = ?;`,
      [ciclo.inicio, ciclo.fim, contagemJson, fixasJson, criado_em, ciclo.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO ciclos (inicio, fim, contagem, fixas, criado_em) VALUES (?, ?, ?, ?, ?);`,
      [ciclo.inicio, ciclo.fim, contagemJson, fixasJson, criado_em]
    );
  }
}

export async function getCicloAtivo(db: SQLiteDatabase): Promise<Ciclo | null> {
  const row = await db.getFirstAsync<{ id: number; inicio: number; fim: number | null; contagem: string; fixas: string | null; criado_em: string }>(
    `SELECT * FROM ciclos WHERE fim IS NULL ORDER BY id DESC LIMIT 1;`
  );
  if (!row) return null;
  return {
    ...row,
    contagem: JSON.parse(row.contagem),
    fixas: row.fixas ? JSON.parse(row.fixas) : undefined,
  };
}

export async function salvarFixas(db: SQLiteDatabase, fixas: number[]) {
  await db.runAsync(
    `INSERT OR REPLACE INTO configuracoes (key, value) VALUES ('fixas', ?);`,
    [JSON.stringify(fixas)]
  );
}

export async function getFixas(db: SQLiteDatabase): Promise<number[]> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM configuracoes WHERE key = 'fixas';`
  );
  return row ? JSON.parse(row.value) : [];
}

export async function atualizarCiclo(db: SQLiteDatabase, dezenas: number[], numeroConcurso: number): Promise<Ciclo> {
  let ciclo = await getCicloAtivo(db);
  if (!ciclo) {
    ciclo = { id: 0, inicio: numeroConcurso, fim: null, contagem: {} };
  }
  for (let d = 1; d <= 25; d++) {
    if (!ciclo.contagem[d]) ciclo.contagem[d] = 0;
  }
  dezenas.forEach(d => { ciclo!.contagem[d]++; });

  // Verifica fechamento (todas as 25 sorteadas no ciclo pelo menos uma vez)
  const todasSorteadas = Object.values(ciclo.contagem).filter(v => v > 0).length === 25;
  if (todasSorteadas) {
    ciclo.fim = numeroConcurso;
    await salvarCiclo(db, ciclo);
    // Cria novo ciclo para o próximo concurso
    const novoCiclo = await resetarCiclo(db, numeroConcurso + 1);
    return novoCiclo;
  } else {
    await salvarCiclo(db, ciclo);
    return ciclo;
  }
}

export async function resetarCiclo(db: SQLiteDatabase, numeroConcurso: number): Promise<Ciclo> {
  const atual = await getCicloAtivo(db);
  if (atual) {
    atual.fim = numeroConcurso - 1;
    await salvarCiclo(db, atual);
  }
  const contagem: Record<number, number> = {};
  for (let d = 1; d <= 25; d++) contagem[d] = 0;
  const novoCiclo: Ciclo = { id: 0, inicio: numeroConcurso, fim: null, contagem };
  await salvarCiclo(db, novoCiclo);
  return novoCiclo;
}

export async function listarCiclosHistorico(db: SQLiteDatabase): Promise<Ciclo[]> {
  const rows = await db.getAllAsync<{ id: number; inicio: number; fim: number | null; contagem: string; fixas: string | null; criado_em: string }>(
    `SELECT * FROM ciclos WHERE fim IS NOT NULL ORDER BY id DESC;`
  );
  return rows.map(r => ({
    ...r,
    contagem: JSON.parse(r.contagem),
    fixas: r.fixas ? JSON.parse(r.fixas) : undefined,
  }));
}

export async function obterEstatisticasDoCiclo(
  db: SQLiteDatabase,
  inicio: number,
  fim: number | null
): Promise<{ mediaAcertos: number; melhorPontuacao: number; melhorJogoNome: string }> {
  let concursoFim = fim;
  if (!concursoFim) {
    const ult = await ultimoConcurso(db);
    concursoFim = ult ? ult.numero : inicio;
  }

  const rows = await db.getAllAsync<{ acertos: number; nome: string }>(
    `SELECT jc.acertos, j.nome
     FROM jogo_concurso jc
     INNER JOIN jogos j ON j.id = jc.jogo_id
     WHERE jc.concurso_numero >= ? AND jc.concurso_numero <= ?;`,
    [inicio, concursoFim]
  );

  if (rows.length === 0) {
    return { mediaAcertos: 0, melhorPontuacao: 0, melhorJogoNome: 'Nenhum' };
  }

  let totalAcertos = 0;
  let melhorPontuacao = 0;
  let melhorJogoNome = 'Nenhum';

  rows.forEach(r => {
    totalAcertos += r.acertos;
    if (r.acertos > melhorPontuacao) {
      melhorPontuacao = r.acertos;
      melhorJogoNome = r.nome || 'Sem Nome';
    }
  });

  return {
    mediaAcertos: totalAcertos / rows.length,
    melhorPontuacao,
    melhorJogoNome
  };
}

// ─── ESTATÍSTICAS FASE 4 ─────────────────────────────────────────────────────

export interface FrequenciaDezena {
  dezena: number;
  frequencia: number;
  porcentagem: number;
}

export interface EstatisticasGerais {
  frequencias: FrequenciaDezena[];
  quentes: number[];  // top 5 mais sorteadas
  frias: number[];    // top 5 menos sorteadas
  mediaPares: number;
  mediaImpares: number;
  mediaPrimos: number;
  mediaSoma: number;
  totalConcursos: number;
  concursoInicial?: number;
  concursoFinal?: number;
}

export interface PontoEvolucao {
  concursoNumero: number;
  acertos: number;
  jogoNome: string;
}

export interface DesempenhoPessoal {
  totalJogadas: number;
  mediaAcertos: number;
  melhorAcerto: number;
  distribuicaoAcertos: Record<number, number>; // acertos -> quantidade
  evolucao: PontoEvolucao[];
  jogoFixas: { total: number; mediaAcertos: number };
  jogoSurpresinha: { total: number; mediaAcertos: number };
}

/**
 * Calcula frequência de cada dezena e distribuição estatística
 * nos últimos N concursos (0 = histórico completo)
 */
export async function obterEstatisticasGerais(
  db: SQLiteDatabase,
  ultimosN: number = 0
): Promise<EstatisticasGerais> {
  let concursos: { numero: number, dezenas: string }[];

  if (ultimosN > 0) {
    concursos = await db.getAllAsync<{ numero: number, dezenas: string }>(
      `SELECT numero, dezenas FROM concursos ORDER BY numero DESC LIMIT ?;`,
      [ultimosN]
    );
  } else {
    concursos = await db.getAllAsync<{ numero: number, dezenas: string }>(
      `SELECT numero, dezenas FROM concursos ORDER BY numero DESC;`
    );
  }

  const totalConcursos = concursos.length;
  if (totalConcursos === 0) {
    return {
      frequencias: Array.from({ length: 25 }, (_, i) => ({ dezena: i + 1, frequencia: 0, porcentagem: 0 })),
      quentes: [],
      frias: [],
      mediaPares: 0,
      mediaImpares: 0,
      mediaPrimos: 0,
      mediaSoma: 0,
      totalConcursos: 0,
    };
  }

  const contagem: Record<number, number> = {};
  for (let d = 1; d <= 25; d++) contagem[d] = 0;

  let totalPares = 0;
  let totalPrimos = 0;
  let totalSoma = 0;
  const PRIMOS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

  for (const c of concursos) {
    const dezenas: number[] = JSON.parse(c.dezenas);
    dezenas.forEach(d => { contagem[d]++; });
    totalPares += dezenas.filter(d => d % 2 === 0).length;
    totalPrimos += dezenas.filter(d => PRIMOS.has(d)).length;
    totalSoma += dezenas.reduce((a, b) => a + b, 0);
  }

  const frequencias: FrequenciaDezena[] = Array.from({ length: 25 }, (_, i) => {
    const dezena = i + 1;
    const frequencia = contagem[dezena];
    return { dezena, frequencia, porcentagem: (frequencia / totalConcursos) * 100 };
  });

  const ordenadas = [...frequencias].sort((a, b) => b.frequencia - a.frequencia);
  const quentes = ordenadas.slice(0, 5).map(f => f.dezena);
  const frias = ordenadas.slice(-5).map(f => f.dezena);

  return {
    frequencias,
    quentes,
    frias,
    mediaPares: totalPares / totalConcursos,
    mediaImpares: (totalConcursos * 15 - totalPares) / totalConcursos,
    mediaPrimos: totalPrimos / totalConcursos,
    mediaSoma: totalSoma / totalConcursos,
    totalConcursos,
    concursoFinal: concursos[0].numero,
    concursoInicial: concursos[concursos.length - 1].numero,
  };
}

/**
 * Obtém desempenho pessoal reutilizando dados de jogo_concurso
 */
export async function obterDesempenhoPessoal(
  db: SQLiteDatabase
): Promise<DesempenhoPessoal> {
  const rows = await db.getAllAsync<{
    concurso_numero: number;
    acertos: number;
    nome: string | null;
    fixas: string;
  }>(
    `SELECT jc.concurso_numero, jc.acertos, j.nome, j.fixas
     FROM jogo_concurso jc
     INNER JOIN jogos j ON j.id = jc.jogo_id
     ORDER BY jc.concurso_numero ASC;`
  );

  if (rows.length === 0) {
    return {
      totalJogadas: 0,
      mediaAcertos: 0,
      melhorAcerto: 0,
      distribuicaoAcertos: {},
      evolucao: [],
      jogoFixas: { total: 0, mediaAcertos: 0 },
      jogoSurpresinha: { total: 0, mediaAcertos: 0 },
    };
  }

  let totalAcertos = 0;
  let melhorAcerto = 0;
  const distribuicaoAcertos: Record<number, number> = {};
  const evolucao: PontoEvolucao[] = [];
  let fixasTotal = 0;
  let fixasAcertos = 0;
  let surprTotal = 0;
  let surprAcertos = 0;

  rows.forEach(r => {
    totalAcertos += r.acertos;
    if (r.acertos > melhorAcerto) melhorAcerto = r.acertos;
    distribuicaoAcertos[r.acertos] = (distribuicaoAcertos[r.acertos] ?? 0) + 1;

    evolucao.push({
      concursoNumero: r.concurso_numero,
      acertos: r.acertos,
      jogoNome: r.nome ?? 'Sem nome',
    });

    // Distingue jogo com fixas (tem array não-vazio) de surpresinha
    let fixas: number[] = [];
    try { fixas = JSON.parse(r.fixas); } catch { fixas = []; }
    if (fixas.length > 0) {
      fixasTotal++;
      fixasAcertos += r.acertos;
    } else {
      surprTotal++;
      surprAcertos += r.acertos;
    }
  });

  return {
    totalJogadas: rows.length,
    mediaAcertos: totalAcertos / rows.length,
    melhorAcerto,
    distribuicaoAcertos,
    evolucao,
    jogoFixas: { total: fixasTotal, mediaAcertos: fixasTotal > 0 ? fixasAcertos / fixasTotal : 0 },
    jogoSurpresinha: { total: surprTotal, mediaAcertos: surprTotal > 0 ? surprAcertos / surprTotal : 0 },
  };
}

export async function reprocessarCiclos(db: SQLiteDatabase) {
  const concursos = await db.getAllAsync<{ numero: number; dezenas: string }>(
    `SELECT numero, dezenas FROM concursos ORDER BY numero ASC;`
  );
  if (concursos.length === 0) return;

  await db.runAsync(`DELETE FROM ciclos;`);
  
  let cicloAtivo: Ciclo | null = null;

  for (const c of concursos) {
    const dezenas: number[] = JSON.parse(c.dezenas);

    if (!cicloAtivo) {
      const contagem: Record<number, number> = {};
      for (let d = 1; d <= 25; d++) contagem[d] = 0;
      dezenas.forEach(d => { contagem[d] = 1; });

      cicloAtivo = {
        id: 0,
        inicio: c.numero,
        fim: null,
        contagem
      };
    } else {
      dezenas.forEach(d => {
        cicloAtivo!.contagem[d] = (cicloAtivo!.contagem[d] ?? 0) + 1;
      });
    }

    const todasSorteadas = Object.values(cicloAtivo.contagem).filter(v => v > 0).length === 25;
    if (todasSorteadas) {
      cicloAtivo.fim = c.numero;
      await salvarCiclo(db, cicloAtivo);
      cicloAtivo = null;
    }
  }

  if (cicloAtivo) {
    await salvarCiclo(db, cicloAtivo);
  }
}


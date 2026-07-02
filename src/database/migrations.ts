import { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2;
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  let result = await db.getFirstAsync<{ version: number }>(
    `SELECT version FROM _migrations ORDER BY version DESC LIMIT 1;`
  );

  let currentDbVersion = result?.version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS concursos (
        numero INTEGER PRIMARY KEY,
        data TEXT,
        dezenas TEXT,
        premiacao TEXT,
        criado_em TEXT
      );

      CREATE TABLE IF NOT EXISTS jogos (
        id TEXT PRIMARY KEY,
        bolao TEXT,
        nome TEXT,
        dezenas TEXT,
        grupo6 TEXT,
        grupo9 TEXT,
        fixas TEXT,
        teimosinha INTEGER,
        criado_em TEXT
      );

      CREATE TABLE IF NOT EXISTS jogo_concurso (
        jogo_id TEXT,
        concurso_numero INTEGER,
        acertos INTEGER,
        premiacao REAL,
        PRIMARY KEY (jogo_id, concurso_numero)
      );

      CREATE TABLE IF NOT EXISTS ciclos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inicio INTEGER,
        fim INTEGER,
        contagem TEXT,
        fixas TEXT,
        criado_em TEXT
      );

      CREATE TABLE IF NOT EXISTS configuracoes (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      
      INSERT INTO _migrations (version) VALUES (1);
    `);
    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_ciclos_inicio ON ciclos(inicio);
      CREATE INDEX IF NOT EXISTS idx_ciclos_fim ON ciclos(fim);
      INSERT INTO _migrations (version) VALUES (2);
    `);
    currentDbVersion = 2;
  }
}

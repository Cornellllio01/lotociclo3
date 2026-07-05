import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import {
  listarConcursos, ultimoConcurso, salvarConcurso, atualizarCiclo,
  getCicloAtivo, resetarCiclo, listarJogosDoConcurso, conferenciaAutomatica, getFixas,
  listarJogos,
} from '../../src/database/db';
import { buscarUltimo, buscarConcurso as buscarConcursoCaixa, sincronizarResultados } from '../../src/api/caixa';
import { calcularEstatisticas, classificarDezenas, calcularPlacar, CorDezena } from '../../src/utils/lotofacil';
import type { Concurso, Jogo } from '../../src/models';

// Cores por classificação de dezena
const COR_MAP: Record<CorDezena, string> = {
  fixa:  '#f97316', // laranja
  azul:  '#3b82f6', // azul
  verde: '#22c55e', // verde
  erro:  '#374151', // cinza escuro
};

type JogoConferido = Jogo & { acertos: number; premiacao: number };

export default function Resultado() {
  const db = useSQLiteContext();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [idx, setIdx] = useState(0); // índice do concurso atual (do final para o começo)
  const [jogos, setJogos] = useState<JogoConferido[]>([]);
  const [fixas, setFixas] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function carregar() {
    setLoading(true);
    try {
      const lista = await listarConcursos(db);
      const f = await getFixas(db);
      setConcursos(lista);
      setFixas(f);
      if (lista.length > 0) {
        const novoIdx = lista.length - 1;
        setIdx(novoIdx);
        await carregarJogos(lista[novoIdx].numero, lista);
      }

      // Sincronização automática em background
      try {
        await sincronizarResultados(db);
        const listaAtualizada = await listarConcursos(db);
        if (listaAtualizada.length !== lista.length) {
          setConcursos(listaAtualizada);
          const novoIdx = listaAtualizada.length - 1;
          setIdx(novoIdx);
          await carregarJogos(listaAtualizada[novoIdx].numero, listaAtualizada);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar em background:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function carregarJogos(numero: number, listaReferencia?: Concurso[]) {
    const j = await listarJogos(db);
    const listaRef = listaReferencia || concursos;
    const conc = listaRef.find(c => c.numero === numero);
    const dezenasSorteio = conc ? conc.dezenas : [];

    const jConferido: JogoConferido[] = j.map(jogo => {
      const acertos = dezenasSorteio.length > 0
        ? jogo.dezenas.filter(d => dezenasSorteio.includes(d)).length
        : 0;
      return {
        ...jogo,
        acertos,
        premiacao: 0,
      };
    });

    // Ordena por acertos decrescente
    jConferido.sort((a, b) => b.acertos - a.acertos);

    setJogos(jConferido);
  }

  async function navegar(delta: number) {
    const novoIdx = idx + delta;
    if (novoIdx < 0 || novoIdx >= concursos.length) return;
    setIdx(novoIdx);
    await carregarJogos(concursos[novoIdx].numero);
  }

  async function sincronizar() {
    setSincronizando(true);
    try {
      const ult = await buscarUltimo();
      const existente = concursos.find(c => c.numero === ult.numero);
      if (existente) {
        Alert.alert('Atualizado!', `Concurso ${ult.numero} já está na base.`);
        return;
      }
      await salvarConcurso(db, ult);
      const ciclo = await getCicloAtivo(db);
      if (!ciclo) await resetarCiclo(db, ult.numero);
      await atualizarCiclo(db, ult.dezenas, ult.numero);
      // Conferência automática
      await conferenciaAutomatica(db, ult.numero, ult.dezenas);
      Alert.alert('✅ Sincronizado!', `Concurso ${ult.numero} de ${ult.data} importado!`);
      await carregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar da Caixa. Verifique sua conexão.');
    } finally {
      setSincronizando(false);
    }
  }

  const concursoAtual = concursos[idx] ?? null;
  const stats = concursoAtual ? calcularEstatisticas(concursoAtual.dezenas) : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header de navegação */}
      <View style={s.navBar}>
        <TouchableOpacity style={s.navBtn} onPress={() => navegar(-1)} disabled={idx <= 0}>
          <Text style={[s.navBtnText, idx <= 0 && s.navBtnDisabled]}>◀</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>
          {concursoAtual ? `Concurso ${concursoAtual.numero}` : 'Sem resultados'}
        </Text>
        <TouchableOpacity style={s.navBtn} onPress={() => navegar(1)} disabled={idx >= concursos.length - 1}>
          <Text style={[s.navBtnText, idx >= concursos.length - 1 && s.navBtnDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#c4b5fd" style={{ marginTop: 40 }} />}

      {!loading && concursoAtual && (
        <>
          <Text style={s.dataText}>{concursoAtual.data}</Text>

          {/* Bolas do resultado */}
          <View style={s.bolasRow}>
            {concursoAtual.dezenas.map(d => (
              <View key={d} style={s.bolaResultado}>
                <Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text>
              </View>
            ))}
          </View>

          {/* Barra de estatísticas */}
          {stats && (
            <View style={s.statsBar}>
              <View style={s.statItem}>
                <Text style={s.statNum}>{stats.pares}</Text>
                <Text style={s.statLabel}>Pares</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{stats.impares}</Text>
                <Text style={s.statLabel}>Ímpares</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{stats.primos}</Text>
                <Text style={s.statLabel}>Primos</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{stats.soma}</Text>
                <Text style={s.statLabel}>Soma</Text>
              </View>
            </View>
          )}

          {/* Botão sincronizar */}
          <TouchableOpacity style={s.btnSync} onPress={sincronizar} disabled={sincronizando}>
            {sincronizando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnSyncText}>🌐 Sincronizar Caixa</Text>}
          </TouchableOpacity>

          {/* Jogos conferidos */}
          {jogos.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🎯 Meus Jogos ({jogos.length})</Text>
              {jogos.map(jogo => {
                const cores = classificarDezenas(
                  jogo.dezenas,
                  concursoAtual.dezenas,
                  jogo.grupo6 ?? [],
                  jogo.grupo9 ?? [],
                  fixas
                );
                const placar = calcularPlacar(
                  jogo.dezenas,
                  concursoAtual.dezenas,
                  jogo.grupo6 ?? [],
                  jogo.grupo9 ?? [],
                  fixas
                );
                return (
                  <View key={jogo.id} style={s.jogoCard}>
                    <View style={s.jogoHeader}>
                      <Text style={s.jogoNome}>{jogo.nome || jogo.id.slice(0, 8)}</Text>
                      <Text style={[s.jogoPlacar, placar.total >= 11 && s.jogoPlacarPremio]}>
                        {placar.total} pts
                      </Text>
                    </View>
                    <Text style={s.jogoPlacarTexto}>{placar.texto}</Text>
                    <View style={s.bolasRow}>
                      {jogo.dezenas.map((d, i) => (
                        <View key={d} style={[s.bolaJogo, { backgroundColor: COR_MAP[cores[i]] }]}>
                          <Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {jogos.length === 0 && (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>Nenhum jogo associado a este concurso.</Text>
              <Text style={s.emptySubText}>Crie jogos na aba Novo Jogo ➕</Text>
            </View>
          )}
        </>
      )}

      {!loading && concursos.length === 0 && (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Nenhum resultado cadastrado ainda.</Text>
          <TouchableOpacity style={s.btnSync} onPress={sincronizar} disabled={sincronizando}>
            {sincronizando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnSyncText}>🌐 Buscar da Caixa</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, paddingBottom: 40 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, backgroundColor: '#12102a', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#2a2060',
  },
  navBtn: { padding: 8 },
  navBtnText: { color: '#c4b5fd', fontSize: 20, fontWeight: 'bold' },
  navBtnDisabled: { opacity: 0.3 },
  navTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dataText: { color: '#6b6a8a', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  bolaResultado: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#4c1d95',
    alignItems: 'center', justifyContent: 'center',
  },
  bolaJogo: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  bolaText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  statsBar: {
    flexDirection: 'row', backgroundColor: '#12102a', borderRadius: 12,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2a2060',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNum: { color: '#c4b5fd', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#6b6a8a', fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#2a2060', height: '100%' },
  btnSync: {
    backgroundColor: '#0f766e', borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 16,
  },
  btnSyncText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { marginTop: 4 },
  sectionTitle: { color: '#c4b5fd', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  jogoCard: {
    backgroundColor: '#12102a', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2060',
  },
  jogoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  jogoNome: { color: '#fff', fontSize: 13, fontWeight: '600' },
  jogoPlacar: { color: '#6b6a8a', fontSize: 13, fontWeight: 'bold' },
  jogoPlacarPremio: { color: '#4ade80' },
  jogoPlacarTexto: { color: '#9ca3af', fontSize: 11, marginBottom: 8 },
  emptyCard: {
    backgroundColor: '#12102a', borderRadius: 14, padding: 24, alignItems: 'center',
    marginTop: 20, borderWidth: 1, borderColor: '#2a2060',
  },
  emptyText: { color: '#6b6a8a', fontSize: 14, marginBottom: 6 },
  emptySubText: { color: '#4a4a6a', fontSize: 11 },
});

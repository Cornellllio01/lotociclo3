import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getCicloAtivo, getFixas, salvarFixas, ultimoConcurso, listarCiclosHistorico, obterEstatisticasDoCiclo } from '../../src/database/db';
import { lideresCiclo, calcularProgressoCiclo } from '../../src/utils/lotofacil';
import type { Ciclo as CicloModel } from '../../src/models';

export default function Ciclo() {
  const db = useSQLiteContext();
  const [cicloAtivo, setCicloAtivo] = useState<CicloModel | null>(null);
  const [ciclosHistorico, setCiclosHistorico] = useState<CicloModel[]>([]);
  const [idxCiclo, setIdxCiclo] = useState<number>(-1); // -1 = Ciclo Ativo, 0+ = Ciclo no Histórico
  const [fixasAtuais, setFixasAtuais] = useState<number[]>([]);
  const [ultimo, setUltimo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statsCiclo, setStatsCiclo] = useState<{ mediaAcertos: number; melhorPontuacao: number; melhorJogoNome: string } | null>(null);

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function carregar() {
    setLoading(true);
    try {
      const ativo = await getCicloAtivo(db);
      const historico = await listarCiclosHistorico(db);
      const f = await getFixas(db);
      const ult = await ultimoConcurso(db);
      
      setCicloAtivo(ativo);
      setCiclosHistorico(historico);
      setFixasAtuais(f);
      setUltimo(ult);

      // Carrega estatísticas do ciclo ativo por padrão
      if (ativo) {
        setIdxCiclo(-1);
        const stats = await obterEstatisticasDoCiclo(db, ativo.inicio, ativo.fim);
        setStatsCiclo(stats);
      } else if (historico.length > 0) {
        setIdxCiclo(0);
        const stats = await obterEstatisticasDoCiclo(db, historico[0].inicio, historico[0].fim);
        setStatsCiclo(stats);
      }
    } finally {
      setLoading(false);
    }
  }

  async function mudarCiclo(novoIdx: number) {
    if (novoIdx < -1 || novoIdx >= ciclosHistorico.length) return;
    setIdxCiclo(novoIdx);
    
    const ciclo = novoIdx === -1 ? cicloAtivo : ciclosHistorico[novoIdx];
    if (ciclo) {
      const stats = await obterEstatisticasDoCiclo(db, ciclo.inicio, ciclo.fim);
      setStatsCiclo(stats);
    }
  }

  async function definirFixas() {
    const ciclo = idxCiclo === -1 ? cicloAtivo : ciclosHistorico[idxCiclo];
    if (!ciclo || !ultimo) return;
    const lideresGeral = lideresCiclo(ciclo.contagem, 25);
    const candidatas = lideresGeral.filter((d: number) => ultimo.dezenas.includes(d));
    if (candidatas.length === 0) {
      Alert.alert('Atenção', 'Nenhuma dezena válida encontrada no último concurso!');
      return;
    }
    const contagem = ciclo.contagem as Record<number, number>;
    const maxFreq = contagem[candidatas[0]];
    const topFreq = candidatas.filter((d: number) => contagem[d] === maxFreq);
    let lideres: number[];
    if (topFreq.length >= 3 && topFreq.length <= 5) {
      lideres = topFreq;
    } else if (topFreq.length > 5) {
      lideres = topFreq.slice(0, 5);
    } else {
      lideres = candidatas.slice(0, 4);
    }
    await salvarFixas(db, lideres);
    setFixasAtuais(lideres);
    Alert.alert('✅ Fixas definidas!', `${lideres.length} fixas: ${lideres.map((d: number) => String(d).padStart(2, '0')).join(', ')}`);
  }

  const cicloSelecionado = idxCiclo === -1 ? cicloAtivo : ciclosHistorico[idxCiclo];
  const progresso = cicloSelecionado ? calcularProgressoCiclo(cicloSelecionado.contagem) : null;
  const concursosCiclo = cicloSelecionado && ultimo
    ? (cicloSelecionado.fim ? cicloSelecionado.fim - cicloSelecionado.inicio + 1 : ultimo.numero - cicloSelecionado.inicio + 1)
    : 0;

  function corBola(c: number) {
    if (c >= 4) return '#f97316';
    if (c >= 3) return '#d97706';
    if (c >= 2) return '#374151';
    return '#1e1b40';
  }

  const dezenas = cicloSelecionado
    ? Object.entries(cicloSelecionado.contagem as Record<string, number>)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([d, c]) => ({ d: Number(d), c: c as number }))
    : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Seletor de Ciclo */}
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => mudarCiclo(idxCiclo + 1)} disabled={idxCiclo >= ciclosHistorico.length - 1} style={s.navBtn}>
          <Text style={[s.navArrow, idxCiclo >= ciclosHistorico.length - 1 && s.navArrowDisabled]}>◀</Text>
        </TouchableOpacity>
        <View style={s.navCenter}>
          <Text style={s.navTitle}>
            {idxCiclo === -1 ? 'Ciclo Ativo 🔥' : `Ciclo Histórico #${ciclosHistorico.length - idxCiclo}`}
          </Text>
          {cicloSelecionado && (
            <Text style={s.navSub}>
              Concursos {cicloSelecionado.inicio} a {cicloSelecionado.fim ?? 'Atual'}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => mudarCiclo(idxCiclo - 1)} disabled={idxCiclo <= -1} style={s.navBtn}>
          <Text style={[s.navArrow, idxCiclo <= -1 && s.navArrowDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#c4b5fd" style={{ marginTop: 40 }} />}

      {!loading && cicloSelecionado && (
        <>
          {/* Card de Progresso */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.label}>Progresso do Ciclo</Text>
              <Text style={s.headerBadge}>
                {concursosCiclo} {concursosCiclo === 1 ? 'concurso' : 'concursos'}
              </Text>
            </View>
            
            {progresso && (
              <>
                <View style={s.progressContainer}>
                  <View style={s.progressBarBackground}>
                    <View style={[s.progressBarFill, { width: `${progresso.porcentagem}%` }]} />
                  </View>
                  <Text style={s.progressText}>
                    {progresso.sorteadas}/25 Sorteadas ({progresso.porcentagem.toFixed(0)}%)
                  </Text>
                </View>

                {progresso.faltantes.length > 0 ? (
                  <>
                    <Text style={s.subLabel}>Dezenas Restantes para fechar o Ciclo ({progresso.faltantes.length}):</Text>
                    <View style={s.bolasRow}>
                      {progresso.faltantes.map(d => (
                        <View key={d} style={[s.bola, { backgroundColor: '#374151', borderColor: '#4a4a6a', borderWidth: 1 }]}>
                          <Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={s.fechadoBadge}>
                    <Text style={s.fechadoBadgeText}>✨ CICLO FECHADO NO CONCURSO {cicloSelecionado.fim} ✨</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Estatísticas financeiras/conferência do Ciclo */}
          {statsCiclo && (
            <View style={s.statsCard}>
              <Text style={s.label}>Estatísticas do Ciclo</Text>
              <View style={s.statsGrid}>
                <View style={s.statItem}>
                  <Text style={s.statNum}>{statsCiclo.mediaAcertos.toFixed(1)}</Text>
                  <Text style={s.statLabel}>Média Acertos</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statNum}>{statsCiclo.melhorPontuacao} pts</Text>
                  <Text style={s.statLabel}>Melhor Jogo</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statName} numberOfLines={1}>{statsCiclo.melhorJogoNome}</Text>
                  <Text style={s.statLabel}>Nome do Jogo</Text>
                </View>
              </View>
            </View>
          )}

          {/* Fixas definidas para o ciclo */}
          {(idxCiclo === -1 ? fixasAtuais : cicloSelecionado.fixas ?? []).length > 0 && (
            <View style={[s.card, { borderColor: '#4ade80' }]}>
              <Text style={s.label}>🔒 FIXAS DEFINIDAS</Text>
              <View style={s.bolasRow}>
                {(idxCiclo === -1 ? fixasAtuais : cicloSelecionado.fixas ?? []).map(d => (
                  <View key={d} style={[s.bola, { backgroundColor: '#f97316' }]}>
                    <Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {idxCiclo === -1 && (
            <TouchableOpacity style={s.btnFixas} onPress={definirFixas}>
              <Text style={s.btnFixasText}>🔒 Definir Fixas para o Ciclo</Text>
            </TouchableOpacity>
          )}

          {/* Frequência das dezenas no ciclo */}
          <View style={s.card}>
            <Text style={s.label}>OCORRÊNCIAS DAS DEZENAS NESTE CICLO</Text>
            <View style={s.grid}>
              {dezenas.map(({ d, c }) => (
                <View key={d} style={s.gridItem}>
                  <View style={[s.bola, { backgroundColor: corBola(c) }]}>
                    <Text style={[s.bolaText, { color: c >= 2 ? '#fff' : '#6b6a8a' }]}>
                      {String(d).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={[s.countText, { color: corBola(c) }]}>{c}x</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Legenda de cores */}
          <View style={s.legenda}>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: '#f97316' }]} /><Text style={s.legText}>4x ou +</Text></View>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: '#d97706' }]} /><Text style={s.legText}>3x</Text></View>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: '#374151' }]} /><Text style={s.legText}>2x</Text></View>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: '#1e1b40', borderWidth: 1, borderColor: '#2a2a4a' }]} /><Text style={s.legText}>0-1x</Text></View>
          </View>
        </>
      )}

      {!loading && !cicloSelecionado && (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Nenhum ciclo cadastrado ainda.</Text>
          <Text style={s.emptySubText}>Cadastre resultados na aba Resultado para iniciar um ciclo.</Text>
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
    padding: 12, backgroundColor: '#12102a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2060',
    marginBottom: 14,
  },
  navBtn: { padding: 8 },
  navArrow: { color: '#c4b5fd', fontSize: 20, fontWeight: 'bold' },
  navArrowDisabled: { opacity: 0.3 },
  navCenter: { alignItems: 'center' },
  navTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  navSub: { color: '#6b6a8a', fontSize: 10, marginTop: 2 },
  card: { backgroundColor: '#12102a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2a2060' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 10, letterSpacing: 2, color: '#6b6a8a', textTransform: 'uppercase', fontWeight: '600' },
  subLabel: { fontSize: 10, color: '#6b6a8a', marginBottom: 10, marginTop: 12 },
  headerBadge: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold', backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  progressContainer: { marginTop: 6, marginBottom: 6 },
  progressBarBackground: { height: 10, backgroundColor: '#1e1b40', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#c4b5fd', borderRadius: 5 },
  progressText: { color: '#c4b5fd', fontSize: 11, marginTop: 6, fontWeight: '600', textAlign: 'right' },
  fechadoBadge: { backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: 10, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#4ade80', alignItems: 'center' },
  fechadoBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: 'bold' },
  statsCard: { backgroundColor: '#12102a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2a2060' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 12 },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { color: '#c4b5fd', fontSize: 20, fontWeight: 'bold' },
  statName: { color: '#c4b5fd', fontSize: 14, fontWeight: 'bold', maxWidth: 80 },
  statLabel: { color: '#6b6a8a', fontSize: 9, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#2a2060', height: 35 },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  bola: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bolaText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  btnFixas: { backgroundColor: '#92400e', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 14 },
  btnFixasText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  gridItem: { alignItems: 'center', gap: 3 },
  countText: { fontSize: 9, fontWeight: 'bold' },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 10, height: 10, borderRadius: 5 },
  legText: { color: '#6b6a8a', fontSize: 9 },
  emptyCard: { backgroundColor: '#12102a', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2a2060' },
  emptyText: { color: '#6b6a8a', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  emptySubText: { color: '#4a4a6a', fontSize: 11, textAlign: 'center' },
});

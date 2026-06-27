import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { listarConcursos } from '../src/storage/db';
import { calcularGrupos } from '../src/utils/lotofacil';

export default function Analise() {
  const [concursos, setConcursos] = useState<any[]>([]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const todos = await listarConcursos();
    setConcursos([...todos].reverse());
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.titulo}>Histórico de Resultados</Text>
      <Text style={s.sub}>{concursos.length} concursos registrados</Text>
      {concursos.map((c, idx) => {
        const prev = concursos[idx + 1];
        const grupos = prev ? calcularGrupos(prev.dezenas) : null;
        return (
          <View key={c.numero} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardNum}>Concurso {c.numero}</Text>
              <Text style={s.cardData}>{c.data}</Text>
            </View>
            <View style={s.bolasRow}>
              {c.dezenas.map((d: number) => (
                <View key={d} style={[s.bola, grupos?.naoSairam.includes(d) ? s.bolaVerde : s.bolaAzul]}>
                  <Text style={s.bolaText}>{String(d).padStart(2,'0')}</Text>
                </View>
              ))}
            </View>
            {grupos && (
              <View style={s.statsRow}>
                <Text style={s.statVerde}>🟢 {grupos.naoSairam.filter(d => c.dezenas.includes(d)).length}/10</Text>
                <Text style={s.statAzul}>🔵 {grupos.saíram.filter(d => c.dezenas.includes(d)).length}/15</Text>
              </View>
            )}
          </View>
        );
      })}
      {concursos.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyText}>Nenhum concurso registrado ainda.</Text>
          <Text style={s.emptyText}>Cadastre resultados na tela principal!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 4 },
  sub: { fontSize: 11, color: '#6b6a8a', marginBottom: 16 },
  card: { backgroundColor: '#12102a', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2a2060' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardNum: { fontSize: 13, fontWeight: 'bold', color: '#c4b5fd' },
  cardData: { fontSize: 11, color: '#6b6a8a' },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 10 },
  bola: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bolaVerde: { backgroundColor: '#15803d' },
  bolaAzul: { backgroundColor: '#1d4ed8' },
  bolaText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statVerde: { color: '#4ade80', fontSize: 11 },
  statAzul: { color: '#60a5fa', fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#4a4a6a', fontSize: 13, marginBottom: 8 },
});

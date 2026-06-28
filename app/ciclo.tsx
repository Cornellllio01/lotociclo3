import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { getCiclo, getFixas, salvarFixas, ultimoConcurso } from '../src/storage/db';
import { lideresCiclo } from '../src/utils/lotofacil';

export default function Ciclo() {
  const [ciclo, setCiclo] = useState<any>(null);
  const [fixas, setFixas] = useState<number[]>([]);
  const [ultimo, setUltimo] = useState<any>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCiclo(await getCiclo());
    setFixas(await getFixas());
    setUltimo(await ultimoConcurso());
  }

  async function definirFixas() {
    if (!ciclo || !ultimo) return;
    const lideresGeral = lideresCiclo(ciclo.contagem, 25);
    const candidatas = lideresGeral.filter(d => ultimo.dezenas.includes(d));
    if (candidatas.length === 0) {
      Alert.alert('Atenção', 'Nenhuma dezena válida encontrada!');
      return;
    }
    const contagem = ciclo.contagem as Record<number, number>;
    const maxFreq = contagem[candidatas[0]];
    const topFreq = candidatas.filter(d => contagem[d] === maxFreq);
    let lideres: number[];
    if (topFreq.length >= 3 && topFreq.length <= 5) {
      lideres = topFreq;
    } else if (topFreq.length > 5) {
      lideres = topFreq.slice(0, 5);
    } else {
      lideres = candidatas.slice(0, 4);
    }
    await salvarFixas(lideres);
    setFixas(lideres);
    Alert.alert('✅ Fixas definidas!', `${lideres.length} fixas: ${lideres.map(d => String(d).padStart(2,'0')).join(', ')}`);
  }

  const concursosCiclo = ciclo && ultimo ? ultimo.numero - ciclo.inicio + 1 : 0;

  function corBola(c: number) {
    if (c >= 4) return '#f97316';
    if (c >= 3) return '#d97706';
    if (c >= 2) return '#374151';
    return '#1e1b40';
  }

  const dezenas = ciclo
    ? Object.entries(ciclo.contagem as Record<string,number>).sort(([,a],[,b]) => (b as number)-(a as number)).map(([d,c]) => ({ d: Number(d), c: c as number }))
    : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.label}>CICLO ATUAL</Text>
        {ciclo ? (
          <>
            <Text style={s.cicloInfo}>Início: Concurso {ciclo.inicio} — {concursosCiclo}/6</Text>
            <View style={s.dots}>
              {[1,2,3,4,5,6].map(i => <View key={i} style={[s.dot, i <= concursosCiclo && s.dotAtivo]} />)}
            </View>
          </>
        ) : <Text style={s.empty}>Nenhum ciclo iniciado</Text>}
      </View>
      {fixas.length > 0 && (
        <View style={[s.card, {borderColor:'#4ade80'}]}>
          <Text style={s.label}>🔒 FIXAS DEFINIDAS</Text>
          <View style={s.bolasRow}>
            {fixas.map(d => <View key={d} style={[s.bola, {backgroundColor:'#15803d'}]}><Text style={s.bolaText}>{String(d).padStart(2,'0')}</Text></View>)}
          </View>
        </View>
      )}
      <TouchableOpacity style={s.btnFixas} onPress={definirFixas}>
        <Text style={s.btnFixasText}>🔒 Definir Fixas do Ciclo</Text>
      </TouchableOpacity>
      {ciclo && (
        <View style={s.card}>
          <Text style={s.label}>TODAS AS DEZENAS — OCORRÊNCIAS</Text>
          <View style={s.grid}>
            {dezenas.map(({d, c}) => (
              <View key={d} style={s.gridItem}>
                <View style={[s.bola, {backgroundColor: corBola(c)}]}>
                  <Text style={[s.bolaText, {color: c >= 2 ? '#fff' : '#4a4a6a'}]}>{String(d).padStart(2,'0')}</Text>
                </View>
                <Text style={[s.countText, {color: corBola(c)}]}>{c}x</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={s.legenda}>
        <View style={s.legItem}><View style={[s.legDot, {backgroundColor:'#f97316'}]}/><Text style={s.legText}>4x</Text></View>
        <View style={s.legItem}><View style={[s.legDot, {backgroundColor:'#d97706'}]}/><Text style={s.legText}>3x</Text></View>
        <View style={s.legItem}><View style={[s.legDot, {backgroundColor:'#374151'}]}/><Text style={s.legText}>2x</Text></View>
        <View style={s.legItem}><View style={[s.legDot, {backgroundColor:'#1e1b40', borderWidth:1, borderColor:'#2a2a4a'}]}/><Text style={s.legText}>0-1x</Text></View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#12102a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2a2060' },
  label: { fontSize: 10, letterSpacing: 2, color: '#6b6a8a', marginBottom: 10, textTransform: 'uppercase' },
  cicloInfo: { color: '#fbbf24', fontSize: 13, marginBottom: 10 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2a2060', borderWidth: 1, borderColor: '#3a3060' },
  dotAtivo: { backgroundColor: '#fbbf24' },
  empty: { color: '#4a4a6a', fontSize: 12, textAlign: 'center' },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  bola: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
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
});

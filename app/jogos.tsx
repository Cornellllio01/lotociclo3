import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { ultimoConcurso, getFixas } from '../src/storage/db';
import { calcularGrupos, montarJogo } from '../src/utils/lotofacil';

interface Jogo { dezenas: number[]; grupo6: number[]; grupo9: number[]; }

export default function Jogos() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [fixas, setFixas] = useState<number[]>([]);
  const [grupos, setGrupos] = useState<{saíram: number[], naoSairam: number[]} | null>(null);
  const [ultimo, setUltimo] = useState<any>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const u = await ultimoConcurso();
    const f = await getFixas();
    setUltimo(u); setFixas(f);
    if (u) setGrupos(calcularGrupos(u.dezenas));
  }

  function gerarJogos() {
    if (!grupos || fixas.length === 0) {
      Alert.alert('Atenção', 'Cadastre um resultado e defina as fixas primeiro!');
      return;
    }
    setJogos([1,2,3].map(() => montarJogo(grupos.saíram, grupos.naoSairam, fixas)));
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {ultimo && (
        <View style={s.card}>
          <Text style={s.label}>BASE: Concurso {ultimo.numero}</Text>
          <Text style={s.subLabel}>10 que NÃO saíram:</Text>
          <View style={s.bolasRow}>
            {grupos?.naoSairam.map(d => <View key={d} style={s.bolaVerde}><Text style={s.bolaText}>{String(d).padStart(2,'0')}</Text></View>)}
          </View>
          <Text style={[s.subLabel, {marginTop:10}]}>Fixas do ciclo:</Text>
          <View style={s.bolasRow}>
            {fixas.map(d => <View key={d} style={s.bolaFixa}><Text style={s.bolaText}>{String(d).padStart(2,'00')}</Text></View>)}
          </View>
        </View>
      )}
      <TouchableOpacity style={s.btnGerar} onPress={gerarJogos}>
        <Text style={s.btnGerarText}>🎲 Gerar 3 Jogos</Text>
      </TouchableOpacity>
      {jogos.length > 0 && (
        <TouchableOpacity
          style={s.btnCopiarTodos}
          onPress={() => {
            const texto = jogos.map((j, i) =>
              `Jogo ${i + 1}: ${j.dezenas.map(d => String(d).padStart(2, '0')).join(' ')}`
            ).join('\n');
            Clipboard.setString(texto);
            Alert.alert('📋 Copiado!', 'Os 3 jogos foram copiados para a área de transferência!');
          }}
        >
          <Text style={s.btnCopiarTodosText}>📋 Copiar os 3 Jogos</Text>
        </TouchableOpacity>
      )}
      {jogos.map((jogo, idx) => (
        <View key={idx} style={s.jogoCard}>
          <View style={s.jogoHeader}>
            <Text style={s.jogoNome}>JOGO {idx + 1}</Text>
            <Text style={s.jogoPts}>15 dezenas</Text>
          </View>
          <Text style={s.grupoLabel}>6 DOS 10 (verde)</Text>
          <View style={s.bolasRow}>
            {jogo.grupo6.sort((a,b)=>a-b).map(d => <View key={d} style={s.bolaVerde}><Text style={s.bolaText}>{String(d).padStart(2,'00')}</Text></View>)}
          </View>
          <View style={s.divLinha} />
          <Text style={s.grupoLabel}>4 FIXAS + 5 DOS 15 (azul)</Text>
          <View style={s.bolasRow}>
            {jogo.grupo9.sort((a,b)=>a-b).map(d => (
              <View key={d} style={[s.bolaAzul, fixas.includes(d) && s.bolaFixaJogo]}>
                <Text style={s.bolaText}>{String(d).padStart(2,'00')}</Text>
              </View>
            ))}
          </View>
          <View style={s.divLinha} />
          <Text style={s.dezenasCompletas}>{jogo.dezenas.map(d => String(d).padStart(2,'0')).join(' ')}</Text>
          <TouchableOpacity style={s.btnCopiar} onPress={() => Alert.alert('Jogo ' + (idx+1), jogo.dezenas.map(d => String(d).padStart(2,'0')).join(' '))}>
            <Text style={s.btnCopiarText}>📋 Ver completo</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#12102a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2a2060' },
  label: { fontSize: 10, letterSpacing: 2, color: '#6b6a8a', marginBottom: 10, textTransform: 'uppercase' },
  subLabel: { fontSize: 10, color: '#4a4a6a', marginBottom: 6 },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  bolaVerde: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  bolaAzul: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  bolaFixa: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#b45309', alignItems: 'center', justifyContent: 'center' },
  bolaFixaJogo: { backgroundColor: '#b45309', borderWidth: 2, borderColor: '#fbbf24' },
  bolaText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  btnGerar: { backgroundColor: '#4c1d95', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnGerarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnCopiarTodos: { backgroundColor: '#065f46', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  btnCopiarTodosText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  jogoCard: { backgroundColor: '#12102a', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2a2060' },
  jogoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  jogoNome: { fontSize: 12, color: '#c4b5fd', fontWeight: 'bold' },
  jogoPts: { fontSize: 12, color: '#6b6a8a' },
  grupoLabel: { fontSize: 9, color: '#4a4a7a', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  divLinha: { height: 1, backgroundColor: '#2a2060', marginVertical: 10 },
  dezenasCompletas: { color: '#a78bfa', fontSize: 12, textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
  btnCopiar: { backgroundColor: '#1f2937', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnCopiarText: { color: '#9ca3af', fontSize: 12 },
});

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { salvarConcurso, atualizarCiclo, getCiclo, resetarCiclo } from '../src/storage/db';

export default function Resultado() {
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [iniciaCiclo, setIniciaCiclo] = useState(false);

  function toggleDezena(d: number) {
    setSelecionadas(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : prev.length < 15 ? [...prev, d] : prev
    );
  }

  async function salvar() {
    if (!numero || selecionadas.length !== 15) {
      Alert.alert('Atenção', 'Preencha o número do concurso e selecione 15 dezenas!');
      return;
    }
    const n = parseInt(numero);
    await salvarConcurso({ numero: n, data, dezenas: selecionadas.sort((a,b)=>a-b) });
    if (iniciaCiclo) {
      await resetarCiclo(n);
      await atualizarCiclo(selecionadas, n);
      Alert.alert('✅ Salvo!', `Concurso ${n} salvo e novo ciclo iniciado!`);
    } else {
      const ciclo = await getCiclo();
      if (ciclo) await atualizarCiclo(selecionadas, n);
      Alert.alert('✅ Salvo!', `Concurso ${n} registrado!`);
    }
    router.back();
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.label}>Número do Concurso</Text>
      <TextInput style={s.input} value={numero} onChangeText={setNumero} keyboardType="numeric" placeholder="Ex: 3721" placeholderTextColor="#4a4a6a" />
      <Text style={s.label}>Data</Text>
      <TextInput style={s.input} value={data} onChangeText={setData} placeholder="Ex: 27/06/2026" placeholderTextColor="#4a4a6a" />
      <Text style={s.label}>Dezenas sorteadas ({selecionadas.length}/15)</Text>
      <View style={s.grid}>
        {Array.from({length: 25}, (_, i) => i + 1).map(d => (
          <TouchableOpacity key={d} style={[s.bola, selecionadas.includes(d) && s.bolaSelecionada]} onPress={() => toggleDezena(d)}>
            <Text style={[s.bolaText, selecionadas.includes(d) && s.bolaTextSel]}>{String(d).padStart(2,'0')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selecionadas.length > 0 && (
        <View style={s.preview}>
          <Text style={s.previewLabel}>Selecionadas:</Text>
          <Text style={s.previewText}>{selecionadas.sort((a,b)=>a-b).map(d => String(d).padStart(2,'0')).join(' — ')}</Text>
        </View>
      )}
      <TouchableOpacity style={[s.toggleBtn, iniciaCiclo && s.toggleBtnAtivo]} onPress={() => setIniciaCiclo(!iniciaCiclo)}>
        <Text style={s.toggleText}>{iniciaCiclo ? '🔄 Iniciando novo ciclo' : '➕ Continuar ciclo atual'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.btnSalvar, selecionadas.length === 15 && s.btnSalvarAtivo]} onPress={salvar}>
        <Text style={s.btnSalvarText}>💾 Salvar Resultado</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 11, letterSpacing: 2, color: '#6b6a8a', marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
  input: { backgroundColor: '#12102a', borderRadius: 10, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#2a2060', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  bola: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e1b40', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a2060' },
  bolaSelecionada: { backgroundColor: '#4c1d95', borderColor: '#7c3aed' },
  bolaText: { color: '#6b6a8a', fontSize: 12, fontWeight: 'bold' },
  bolaTextSel: { color: '#fff' },
  preview: { backgroundColor: '#12102a', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#2a2060' },
  previewLabel: { fontSize: 10, color: '#6b6a8a', marginBottom: 6 },
  previewText: { color: '#c4b5fd', fontSize: 13, fontWeight: 'bold' },
  toggleBtn: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#1f2937', alignItems: 'center' },
  toggleBtnAtivo: { backgroundColor: '#92400e' },
  toggleText: { color: '#fff', fontSize: 13 },
  btnSalvar: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: '#374151', alignItems: 'center' },
  btnSalvarAtivo: { backgroundColor: '#15803d' },
  btnSalvarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

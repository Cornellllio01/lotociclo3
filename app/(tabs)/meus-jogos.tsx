import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Modal,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import {
  listarConcursos, listarJogos, excluirJogo, vincularJogoConcurso,
} from '../../src/database/db';
import { classificarDezenas, type CorDezena } from '../../src/utils/lotofacil';
import {
  exportarVolantePDF, compartilharArquivo, compartilharWhatsApp, jogoParaTexto,
} from '../../src/utils/pdf';
import { OcrGuard } from '../../src/features/ocr/OcrGuard';
import { OcrScreen } from '../../src/features/ocr/OcrScreen';
import { VoiceGuard } from '../../src/features/voice/VoiceGuard';
import { VoiceInputScreen } from '../../src/features/voice/VoiceInputScreen';
import type { Concurso, Jogo } from '../../src/models';

const COR_MAP: Record<CorDezena, string> = {
  fixa:  '#f97316',
  azul:  '#3b82f6',
  verde: '#22c55e',
  erro:  '#374151',
};

export default function MeusJogos() {
  const db = useSQLiteContext();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [idxConc, setIdxConc] = useState<number>(-1); // -1 = "todos"

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function carregar() {
    const lista = await listarConcursos(db);
    const todosJogos = await listarJogos(db);
    setConcursos(lista);
    setJogos(todosJogos);
    setIdxConc(-1);
  }

  async function excluir(jogo: Jogo) {
    Alert.alert('Excluir jogo?', `"${jogo.nome || jogo.id.slice(0, 8)}" será removido permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await excluirJogo(db, jogo.id);
          setJogos(prev => prev.filter(j => j.id !== jogo.id));
        },
      },
    ]);
  }

  async function exportarPDF(jogo: Jogo) {
    try {
      const uri = await exportarVolantePDF(jogo);
      Alert.alert('PDF Gerado', 'O volante foi gerado com sucesso.', [
        { text: 'OK' },
        { text: 'Compartilhar', onPress: () => compartilharArquivo(uri, `Volante - ${jogo.nome || 'Jogo'}`) }
      ]);
    } catch (err: any) {
      Alert.alert('Erro ao exportar PDF', err.message || String(err));
    }
  }

  async function compartilhar(jogo: Jogo) {
    try {
      const uri = await exportarVolantePDF(jogo);
      await compartilharArquivo(uri, `Volante - ${jogo.nome || 'Jogo'}`);
    } catch (err: any) {
      Alert.alert('Erro ao compartilhar', err.message || String(err));
    }
  }

  async function shareWhatsApp(jogo: Jogo) {
    try {
      const texto = jogoParaTexto(jogo);
      await compartilharWhatsApp(texto);
    } catch (err: any) {
      Alert.alert('Erro no WhatsApp', err.message || String(err));
    }
  }

  const concursoSelecionado = idxConc >= 0 ? concursos[idxConc] : null;

  function renderJogo({ item: jogo }: { item: Jogo }) {
    // Colorir dezenas sem resultado conhecido — apenas pelas cores de grupo
    const cores: CorDezena[] = jogo.dezenas.map(d => {
      if ((jogo.fixas ?? []).includes(d)) return 'fixa';
      if ((jogo.grupo9 ?? []).includes(d)) return 'azul';
      if ((jogo.grupo6 ?? []).includes(d)) return 'verde';
      return 'erro';
    });

    return (
      <View style={s.jogoCard}>
        <View style={s.jogoHeader}>
          <Text style={s.jogoNome}>{jogo.nome || `Jogo ${jogo.id.slice(0, 6)}`}</Text>
          <Text style={s.jogoData}>{jogo.criado_em?.split('T')[0] ?? ''}</Text>
        </View>
        {jogo.teimosinha ? (
          <Text style={s.teimoText}>🔁 Teimosinha: {jogo.teimosinha}x</Text>
        ) : null}
        <View style={s.bolasRow}>
          {jogo.dezenas.map((d, i) => (
            <View key={d} style={[s.bola, { backgroundColor: COR_MAP[cores[i]] }]}>
              <Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text>
            </View>
          ))}
        </View>
        <View style={s.jogoFooter}>
          <Text style={s.jogoGrupos}>
            🔵 {(jogo.grupo9 ?? []).length} sort. + 🟢 {(jogo.grupo6 ?? []).length} não-sort.
          </Text>
          <TouchableOpacity onPress={() => excluir(jogo)}>
            <Text style={s.excluirText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        <View style={s.acoesCardRow}>
          <TouchableOpacity style={s.acaoBtn} onPress={() => exportarPDF(jogo)}>
            <Text style={s.acaoBtnTxt}>📄 PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acaoBtn} onPress={() => compartilhar(jogo)}>
            <Text style={s.acaoBtnTxt}>📤 Compartilhar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acaoBtn} onPress={() => shareWhatsApp(jogo)}>
            <Text style={s.acaoBtnTxt}>💬 WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Seletor de concurso */}
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => setIdxConc(prev => Math.max(-1, prev - 1))} style={s.navBtn}>
          <Text style={s.navArrow}>◀</Text>
        </TouchableOpacity>
        <View style={s.navCenter}>
          <Text style={s.navTitle}>
            {concursoSelecionado ? `Concurso ${concursoSelecionado.numero}` : 'Todos os Jogos'}
          </Text>
          <Text style={s.navSub}>{jogos.length} jogo(s)</Text>
        </View>
        <TouchableOpacity onPress={() => setIdxConc(prev => Math.min(concursos.length - 1, prev + 1))} style={s.navBtn}>
          <Text style={s.navArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Legenda */}
      <View style={s.legenda}>
        <View style={s.legendaItem}><View style={[s.dot, { backgroundColor: '#f97316' }]} /><Text style={s.legendaText}>Fixa</Text></View>
        <View style={s.legendaItem}><View style={[s.dot, { backgroundColor: '#3b82f6' }]} /><Text style={s.legendaText}>Sorteadas</Text></View>
        <View style={s.legendaItem}><View style={[s.dot, { backgroundColor: '#22c55e' }]} /><Text style={s.legendaText}>Não-sort.</Text></View>
      </View>

      {jogos.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Nenhum jogo salvo ainda.</Text>
          <Text style={s.emptySubText}>Crie jogos na aba Novo Jogo ➕</Text>
        </View>
      ) : (
        <FlatList
          data={jogos}
          keyExtractor={j => j.id}
          renderItem={renderJogo}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, backgroundColor: '#12102a', borderBottomWidth: 1, borderBottomColor: '#2a2060',
  },
  navBtn: { padding: 8 },
  navArrow: { color: '#c4b5fd', fontSize: 20, fontWeight: 'bold' },
  navCenter: { alignItems: 'center' },
  navTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  navSub: { color: '#6b6a8a', fontSize: 10 },
  legenda: {
    flexDirection: 'row', gap: 12, padding: 8, justifyContent: 'center',
    backgroundColor: '#12102a', borderBottomWidth: 1, borderBottomColor: '#2a2060',
  },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendaText: { color: '#6b6a8a', fontSize: 10 },
  jogoCard: {
    backgroundColor: '#12102a', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2060',
  },
  jogoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  jogoNome: { color: '#fff', fontSize: 13, fontWeight: '700' },
  jogoData: { color: '#6b6a8a', fontSize: 11 },
  teimoText: { color: '#fbbf24', fontSize: 11, marginBottom: 6 },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  bola: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  bolaText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  jogoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jogoGrupos: { color: '#6b6a8a', fontSize: 10 },
  excluirText: { fontSize: 18, padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#6b6a8a', fontSize: 16, marginBottom: 8 },
  emptySubText: { color: '#4a4a6a', fontSize: 12 },
  acoesCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2060',
    gap: 6,
  },
  acaoBtn: {
    flex: 1,
    backgroundColor: '#1c1842',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b2f80',
  },
  acaoBtnTxt: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

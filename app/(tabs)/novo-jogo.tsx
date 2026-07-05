import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import {
  ultimoConcurso, getFixas, salvarJogo, vincularJogoConcurso, listarConcursos,
} from '../../src/database/db';
import {
  calcularGrupos, gerarTresJogos, calcularEstatisticas, calcularPreco,
  type CorDezena,
} from '../../src/utils/lotofacil';
import { OcrGuard } from '../../src/features/ocr/OcrGuard';
import { OcrScreen } from '../../src/features/ocr/OcrScreen';
import { VoiceGuard } from '../../src/features/voice/VoiceGuard';
import { VoiceInputScreen } from '../../src/features/voice/VoiceInputScreen';
import type { Concurso, Jogo } from '../../src/models';

/** Gera um ID único simples sem dependência externa */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Cores visuais das dezenas no grid
const GRUPOS_CORES = {
  fixa:    '#f97316', // laranja
  sairam: '#3b82f6', // azul
  naoSairam: '#22c55e', // verde
  livre:  '#1e1b40', // neutro
};

/** Retorna a cor de fundo de cada dezena com base nos grupos */
function corDezena(
  d: number,
  fixas: number[],
  sairam: number[],
  naoSairam: number[]
): string {
  if (fixas.includes(d)) return GRUPOS_CORES.fixa;
  if (sairam.includes(d)) return GRUPOS_CORES.sairam;
  if (naoSairam.includes(d)) return GRUPOS_CORES.naoSairam;
  return GRUPOS_CORES.livre;
}

type JogoGerado = { dezenas: number[]; grupo6: number[]; grupo9: number[] };

export default function NovoJogo() {
  const db = useSQLiteContext();
  const [ultimo, setUltimo] = useState<Concurso | null>(null);
  const [fixas, setFixas] = useState<number[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [grupos, setGrupos] = useState<{ sairam: number[]; naoSairam: number[] } | null>(null);
  const [jogosGerados, setJogosGerados] = useState<JogoGerado[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [ocrVisible, setOcrVisible] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [jogoSelecionado, setJogoSelecionado] = useState<JogoGerado | null>(null);
  const [nomeJogo, setNomeJogo] = useState('');
  const [teimosinha, setTeimosinha] = useState('0');
  const [concursos, setConcursos] = useState<Concurso[]>([]);

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function carregar() {
    const u = await ultimoConcurso(db);
    const f = await getFixas(db);
    const lista = await listarConcursos(db);
    setUltimo(u);
    setFixas(f);
    setConcursos(lista);
    if (u) {
      const g = calcularGrupos(u.dezenas);
      setGrupos(g);
      // Pré-marcar fixas automaticamente
      setSelecionadas(f.filter(d => g.sairam.includes(d)));
    }
  }

  function toggleDezena(d: number) {
    if (fixas.includes(d)) return; // fixas estão travadas
    setSelecionadas(prev => {
      if (prev.includes(d)) return prev.filter(x => x !== d);
      if (prev.length >= 20) return prev; // máx 20 dezenas
      return [...prev, d];
    });
  }

  async function surpresinha() {
    if (!grupos || fixas.length === 0 || !ultimo) {
      Alert.alert('Atenção', 'Defina as fixas primeiro na aba Ciclo 🔥');
      return;
    }
    try {
      const tres = gerarTresJogos(grupos.sairam, grupos.naoSairam, fixas);
      const concursoAtual = ultimo.numero;

      for (let i = 0; i < tres.length; i++) {
        const t = tres[i];
        const novoJogo: Jogo = {
          id: uid(),
          nome: `Surpresinha ${i + 1}`,
          dezenas: t.dezenas,
          grupo6: t.grupo6,
          grupo9: t.grupo9,
          fixas,
          teimosinha: 0,
          criado_em: new Date().toISOString(),
        };
        await salvarJogo(db, novoJogo);
        await vincularJogoConcurso(db, novoJogo.id, concursoAtual, 0);
      }

      router.push('/resultado');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  function abrirModal(jogo: JogoGerado) {
    setJogoSelecionado(jogo);
    setNomeJogo('');
    setTeimosinha('0');
    setModalVisivel(true);
  }

  async function salvar() {
    if (!jogoSelecionado || !ultimo) return;
    const concursoAtual = ultimo.numero;
    const teim = parseInt(teimosinha) || 0;

    const novoJogo: Jogo = {
      id: uid(),
      nome: nomeJogo || `Jogo ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      dezenas: jogoSelecionado.dezenas,
      grupo6: jogoSelecionado.grupo6,
      grupo9: jogoSelecionado.grupo9,
      fixas,
      teimosinha: teim,
      criado_em: new Date().toISOString(),
    };
    await salvarJogo(db, novoJogo);
    // Vincula ao próximo concurso (o atual+1 geralmente ainda não saiu)
    await vincularJogoConcurso(db, novoJogo.id, concursoAtual + 1, teim);
    setModalVisivel(false);
    Alert.alert('✅ Jogo Salvo!', `"${novoJogo.nome}" vinculado ao concurso ${concursoAtual + 1}${teim > 0 ? ` + ${teim} próximos` : ''}`);
    setJogosGerados([]);
  }

  function salvarManual() {
    if (selecionadas.length < 15) {
      Alert.alert('Atenção', 'Selecione no mínimo 15 dezenas');
      return;
    }
    const dezenas = [...selecionadas].sort((a, b) => a - b);
    const g6 = grupos ? dezenas.filter(d => grupos.naoSairam.includes(d)) : [];
    const g9 = grupos ? dezenas.filter(d => grupos.sairam.includes(d)) : [];
    abrirModal({ dezenas, grupo6: g6, grupo9: g9 });
  }

  const stats = calcularEstatisticas(selecionadas);
  const preco = calcularPreco(selecionadas.length);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Info do último resultado */}
      {ultimo ? (
        <View style={s.infoCard}>
          <Text style={s.infoLabel}>BASE: Concurso {ultimo.numero}</Text>
          <Text style={s.infoSub}>
            Grupo Azul (sorteadas): {grupos?.sairam.length ?? 0} dezenas |
            Grupo Verde (não-sorteadas): {grupos?.naoSairam.length ?? 0}
          </Text>
        </View>
      ) : (
        <View style={s.alertCard}>
          <Text style={s.alertText}>⚠️ Nenhum resultado cadastrado. Vá à aba Resultado primeiro.</Text>
        </View>
      )}

      {/* Grid 5x5 */}
      <Text style={s.gridTitle}>Selecione as dezenas ({selecionadas.length})</Text>
      <View style={s.grid}>
        {Array.from({ length: 25 }, (_, i) => i + 1).map(d => {
          const isFixa = fixas.includes(d);
          const isSel = selecionadas.includes(d);
          const bg = isFixa
            ? GRUPOS_CORES.fixa
            : isSel
              ? (grupos?.sairam.includes(d) ? GRUPOS_CORES.sairam : GRUPOS_CORES.naoSairam)
              : '#1e1b40';
          return (
            <TouchableOpacity
              key={d}
              style={[s.gridBola, { backgroundColor: bg }, isFixa && s.gridBolaFixa]}
              onPress={() => toggleDezena(d)}
              disabled={isFixa}
            >
              <Text style={[s.gridBolaText, isSel && s.gridBolaTextSel]}>
                {String(d).padStart(2, '0')}
              </Text>
              {isFixa && <Text style={s.fixaTag}>🔒</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legenda */}
      <View style={s.legenda}>
        <View style={s.legendaItem}><View style={[s.legendaDot, { backgroundColor: GRUPOS_CORES.fixa }]} /><Text style={s.legendaText}>Fixa 🔒</Text></View>
        <View style={s.legendaItem}><View style={[s.legendaDot, { backgroundColor: GRUPOS_CORES.sairam }]} /><Text style={s.legendaText}>Sorteadas (azul)</Text></View>
        <View style={s.legendaItem}><View style={[s.legendaDot, { backgroundColor: GRUPOS_CORES.naoSairam }]} /><Text style={s.legendaText}>Não-sorteadas (verde)</Text></View>
      </View>

      {/* Barra de estatísticas em tempo real */}
      {selecionadas.length > 0 && (
        <View style={s.statsBar}>
          <View style={s.statItem}><Text style={s.statNum}>{stats.pares}</Text><Text style={s.statLabel}>Pares</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statNum}>{stats.impares}</Text><Text style={s.statLabel}>Ímpares</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statNum}>{stats.primos}</Text><Text style={s.statLabel}>Primos</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statNum}>{stats.soma}</Text><Text style={s.statLabel}>Soma</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statNum}>R${preco.toFixed(0)}</Text><Text style={s.statLabel}>Preço</Text></View>
        </View>
      )}

      {/* Botões de ação */}
      <View style={s.acoes}>
        <TouchableOpacity style={s.btnSurpresinha} onPress={surpresinha}>
          <Text style={s.btnText}>⚡ Surpresinha 6+9</Text>
        </TouchableOpacity>
        {selecionadas.length >= 15 && (
          <TouchableOpacity style={s.btnSalvar} onPress={salvarManual}>
            <Text style={s.btnText}>💾 Salvar Jogo Manual</Text>
          </TouchableOpacity>
        )}
        <View style={s.rowAcoesExtra}>
          <TouchableOpacity style={s.btnExtra} onPress={() => setOcrVisible(true)}>
            <Text style={s.btnExtraText}>📷 Importar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnExtra} onPress={() => setVoiceVisible(true)}>
            <Text style={s.btnExtraText}>🎤 Ditar Jogo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal OCR */}
      <Modal visible={ocrVisible} animationType="slide" onRequestClose={() => setOcrVisible(false)}>
        <OcrGuard>
          <OcrScreen onJogoSalvo={() => { setOcrVisible(false); carregar(); }} />
        </OcrGuard>
      </Modal>

      {/* Modal Voz */}
      <Modal visible={voiceVisible} animationType="slide" onRequestClose={() => setVoiceVisible(false)}>
        <VoiceGuard>
          <VoiceInputScreen onJogoSalvo={() => { setVoiceVisible(false); carregar(); }} />
        </VoiceGuard>
      </Modal>

      {/* Jogos gerados */}
      {jogosGerados.length > 0 && (
        <View style={s.geradosSection}>
          <Text style={s.geradosTitulo}>🎲 Jogos Gerados — Sistema 6+9</Text>
          {jogosGerados.map((jogo, i) => {
            const st = calcularEstatisticas(jogo.dezenas);
            return (
              <View key={i} style={s.jogoCard}>
                <View style={s.jogoHeader}>
                  <Text style={s.jogoTitulo}>Jogo {i + 1}</Text>
                  <Text style={s.jogoPreco}>R$ {calcularPreco(jogo.dezenas.length).toFixed(2)}</Text>
                </View>
                <View style={s.bolasRow}>
                  {jogo.dezenas.map(d => {
                    const bg = fixas.includes(d)
                      ? GRUPOS_CORES.fixa
                      : jogo.grupo9.includes(d)
                        ? GRUPOS_CORES.sairam
                        : GRUPOS_CORES.naoSairam;
                    return (
                      <View key={d} style={[s.bolaJogo, { backgroundColor: bg }]}>
                        <Text style={s.bolaText}>{String(d).padStart(2, '00')}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={s.jogoStats}>Par:{st.pares} | Ímpar:{st.impares} | Primo:{st.primos} | Soma:{st.soma}</Text>
                <TouchableOpacity style={s.btnUsarJogo} onPress={() => abrirModal(jogo)}>
                  <Text style={s.btnUsarJogoText}>💾 Usar este jogo</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Modal Salvar */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>💾 Salvar Jogo</Text>
            <Text style={s.modalLabel}>Nome do jogo (opcional)</Text>
            <TextInput
              style={s.modalInput}
              value={nomeJogo}
              onChangeText={setNomeJogo}
              placeholder="Ex: Bolão da família"
              placeholderTextColor="#4a4a6a"
            />
            <Text style={s.modalLabel}>Teimosinha (repetir por N concursos)</Text>
            <TextInput
              style={s.modalInput}
              value={teimosinha}
              onChangeText={setTeimosinha}
              keyboardType="numeric"
              placeholder="0 = apenas próximo concurso"
              placeholderTextColor="#4a4a6a"
            />
            <Text style={s.modalInfo}>
              Vinculado ao concurso {(ultimo?.numero ?? 0) + 1}
              {parseInt(teimosinha) > 0 ? ` até ${(ultimo?.numero ?? 0) + 1 + parseInt(teimosinha)}` : ''}
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalBtnCancel} onPress={() => setModalVisivel(false)}>
                <Text style={s.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnSalvar} onPress={salvar}>
                <Text style={s.modalBtnText}>✅ Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    backgroundColor: '#12102a', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2060',
  },
  infoLabel: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' },
  infoSub: { color: '#6b6a8a', fontSize: 10, marginTop: 4 },
  alertCard: {
    backgroundColor: '#1c1008', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#78350f',
  },
  alertText: { color: '#fbbf24', fontSize: 12 },
  gridTitle: { color: '#6b6a8a', fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  gridBola: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2060',
  },
  gridBolaFixa: { borderColor: '#f97316', borderWidth: 2 },
  gridBolaText: { color: '#6b6a8a', fontSize: 12, fontWeight: 'bold' },
  gridBolaTextSel: { color: '#fff' },
  fixaTag: { position: 'absolute', top: -4, right: -4, fontSize: 9 },
  legenda: { flexDirection: 'row', gap: 12, marginBottom: 12, justifyContent: 'center', flexWrap: 'wrap' },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendaDot: { width: 10, height: 10, borderRadius: 5 },
  legendaText: { color: '#6b6a8a', fontSize: 10 },
  statsBar: {
    flexDirection: 'row', backgroundColor: '#12102a', borderRadius: 12,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2a2060',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNum: { color: '#c4b5fd', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#6b6a8a', fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#2a2060' },
  acoes: { gap: 10, marginBottom: 16 },
  btnSurpresinha: {
    backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  btnSalvar: {
    backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  geradosSection: { marginTop: 4 },
  geradosTitulo: { color: '#c4b5fd', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  jogoCard: {
    backgroundColor: '#12102a', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2060',
  },
  jogoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jogoTitulo: { color: '#fff', fontSize: 13, fontWeight: '600' },
  jogoPreco: { color: '#4ade80', fontSize: 13, fontWeight: '600' },
  bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  bolaJogo: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  bolaText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  jogoStats: { color: '#6b6a8a', fontSize: 10, marginBottom: 8 },
  btnUsarJogo: {
    backgroundColor: '#1e3a8a', borderRadius: 8, padding: 10, alignItems: 'center',
  },
  btnUsarJogoText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#12102a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderWidth: 1, borderColor: '#2a2060',
  },
  modalTitulo: { color: '#c4b5fd', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalLabel: { color: '#6b6a8a', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: '#0d0d1a', borderRadius: 10, padding: 12, color: '#fff',
    borderWidth: 1, borderColor: '#2a2060', fontSize: 14,
  },
  modalInfo: { color: '#fbbf24', fontSize: 11, marginTop: 10, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnCancel: {
    flex: 1, backgroundColor: '#374151', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  modalBtnSalvar: {
    flex: 1, backgroundColor: '#15803d', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowAcoesExtra: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnExtra: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  btnExtraText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '700',
  },
});

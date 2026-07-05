import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import Svg, { Rect, Text as SvgText, Line, Circle, Polyline } from 'react-native-svg';
import {
  obterEstatisticasGerais,
  obterDesempenhoPessoal,
  EstatisticasGerais,
  DesempenhoPessoal,
} from '../../src/database/db';
import { exportarRelatorioPDF, compartilharArquivo } from '../../src/utils/pdf';

// ─── Paleta ──────────────────────────────────────────────────────────────────
const CORES = {
  bg: '#0D1117',
  surface: '#161B22',
  card: '#1C2128',
  border: '#30363D',
  accent: '#7C3AED',
  accentLight: '#A78BFA',
  verde: '#22C55E',
  vermelho: '#EF4444',
  laranja: '#F97316',
  amarelo: '#EAB308',
  azul: '#3B82F6',
  texto: '#E6EDF3',
  textoSec: '#8B949E',
  fria: '#60A5FA',
  quente: '#F97316',
};

const PERIODOS = [
  { label: 'Últ. 5', value: 5 },
  { label: 'Últ. 20', value: 20 },
  { label: 'Últ. 50', value: 50 },
  { label: 'Todos', value: 0 },
];

// ─── Heatmap das 25 dezenas ──────────────────────────────────────────────────
function Heatmap({
  frequencias,
  quentes,
  frias,
}: {
  frequencias: EstatisticasGerais['frequencias'];
  quentes: number[];
  frias: number[];
}) {
  const COLS = 5;
  const ROWS = 5;
  const CELL = 54;
  const GAP = 4;
  const W = COLS * (CELL + GAP) - GAP;
  const H = ROWS * (CELL + GAP) - GAP;

  const maxFreq = Math.max(...frequencias.map(f => f.frequencia), 1);
  const minFreq = Math.min(...frequencias.map(f => f.frequencia), 0);

  function corCelula(dezena: number, freq: number) {
    if (quentes.includes(dezena)) return CORES.quente;
    if (frias.includes(dezena)) return CORES.fria;
    // Gradiente neutro conforme frequência
    const t = maxFreq === minFreq ? 0.5 : (freq - minFreq) / (maxFreq - minFreq);
    const r = Math.round(100 + t * 50);
    const g = Math.round(100 + t * 80);
    const b = Math.round(150 + t * 60);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <View style={styles.heatmapWrap}>
      <Svg width={W} height={H}>
        {frequencias.map((f, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x = col * (CELL + GAP);
          const y = row * (CELL + GAP);
          const cor = corCelula(f.dezena, f.frequencia);
          return (
            <React.Fragment key={f.dezena}>
              <Rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={8}
                fill={cor}
                fillOpacity={0.85}
              />
              <SvgText
                x={x + CELL / 2}
                y={y + CELL / 2 - 6}
                textAnchor="middle"
                fill="#fff"
                fontSize={16}
                fontWeight="bold"
              >
                {String(f.dezena).padStart(2, '0')}
              </SvgText>
              <SvgText
                x={x + CELL / 2}
                y={y + CELL / 2 + 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.75)"
                fontSize={11}
              >
                {f.frequencia}×
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.heatmapLegenda}>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaDot, { backgroundColor: CORES.quente }]} />
          <Text style={styles.legendaTxt}>Quentes (top 5)</Text>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaDot, { backgroundColor: CORES.fria }]} />
          <Text style={styles.legendaTxt}>Frias (bot 5)</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Barra horizontal simples ────────────────────────────────────────────────
function BarraHorizontal({
  label,
  valor,
  total,
  cor,
}: {
  label: string;
  valor: number;
  total: number;
  cor: string;
}) {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  return (
    <View style={styles.barraRow}>
      <Text style={styles.barraLabel}>{label}</Text>
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${pct}%` as any, backgroundColor: cor }]} />
      </View>
      <Text style={styles.barraValor}>{valor.toFixed(1)}</Text>
    </View>
  );
}

// ─── Gráfico de linha para evolução de acertos ───────────────────────────────
function GraficoEvolucao({ evolucao }: { evolucao: DesempenhoPessoal['evolucao'] }) {
  if (evolucao.length === 0) {
    return <Text style={styles.empty}>Nenhum dado de evolução ainda.</Text>;
  }

  // Limitar últimos 30 pontos para legibilidade
  const dados = evolucao.slice(-30);
  const W = 300;
  const H = 100;
  const PAD = 8;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const minAcertos = 11; // Jogos com menos não são relevantes
  const maxAcertos = 15;

  function xPos(i: number) {
    return PAD + (i / Math.max(dados.length - 1, 1)) * innerW;
  }
  function yPos(acertos: number) {
    const t = (acertos - minAcertos) / (maxAcertos - minAcertos);
    return PAD + innerH - t * innerH;
  }

  const points = dados.map((p, i) => `${xPos(i)},${yPos(p.acertos)}`).join(' ');

  return (
    <View style={styles.graficoWrap}>
      <Svg width={W} height={H}>
        {/* Linhas guia */}
        {[11, 12, 13, 14, 15].map(v => (
          <Line
            key={v}
            x1={PAD}
            y1={yPos(v)}
            x2={W - PAD}
            y2={yPos(v)}
            stroke={CORES.border}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        ))}
        {/* Linha de acertos */}
        <Polyline
          points={points}
          fill="none"
          stroke={CORES.accentLight}
          strokeWidth={2}
        />
        {/* Pontos */}
        {dados.map((p, i) => (
          <Circle
            key={i}
            cx={xPos(i)}
            cy={yPos(p.acertos)}
            r={3}
            fill={p.acertos >= 14 ? CORES.verde : p.acertos >= 12 ? CORES.accentLight : CORES.textoSec}
          />
        ))}
      </Svg>
      <View style={styles.graficoEixoX}>
        <Text style={styles.eixoTxt}>{dados[0]?.concursoNumero}</Text>
        <Text style={styles.eixoTxt}>{dados[dados.length - 1]?.concursoNumero}</Text>
      </View>
    </View>
  );
}

// ─── Distribuição de acertos ──────────────────────────────────────────────────
function DistribuicaoAcertos({ distribuicao }: { distribuicao: Record<number, number> }) {
  const acertosOrdenados = Object.keys(distribuicao)
    .map(Number)
    .sort((a, b) => a - b);
  const maxQtd = Math.max(...Object.values(distribuicao), 1);

  if (acertosOrdenados.length === 0) {
    return <Text style={styles.empty}>Nenhuma jogada conferida ainda.</Text>;
  }

  const CORES_ACERTOS: Record<number, string> = {
    11: CORES.textoSec,
    12: CORES.azul,
    13: CORES.verde,
    14: CORES.amarelo,
    15: CORES.laranja,
  };

  return (
    <View>
      {acertosOrdenados.map(acertos => {
        const qtd = distribuicao[acertos];
        const pct = (qtd / maxQtd) * 100;
        const cor = CORES_ACERTOS[acertos] ?? CORES.textoSec;
        return (
          <View key={acertos} style={styles.distRow}>
            <Text style={[styles.distLabel, { color: cor }]}>{acertos} pts</Text>
            <View style={styles.distTrack}>
              <View style={[styles.distFill, { width: `${pct}%` as any, backgroundColor: cor }]} />
            </View>
            <Text style={styles.distQtd}>{qtd}×</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────
export default function AnaliseScreen() {
  const db = useSQLiteContext();
  const [periodo, setPeriodo] = useState(0);
  const [estatGerais, setEstatGerais] = useState<EstatisticasGerais | null>(null);
  const [desempenho, setDesempenho] = useState<DesempenhoPessoal | null>(null);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        setCarregando(true);
        try {
          const [gerais, pessoal] = await Promise.all([
            obterEstatisticasGerais(db, periodo),
            obterDesempenhoPessoal(db),
          ]);
          if (ativo) {
            setEstatGerais(gerais);
            setDesempenho(pessoal);
          }
        } catch (e) {
          console.error('Erro ao carregar estatísticas', e);
        } finally {
          if (ativo) setCarregando(false);
        }
      }
      carregar();
      return () => { ativo = false; };
    }, [db, periodo])
  );

  async function exportarRelatorio() {
    if (!estatGerais || !desempenho) {
      Alert.alert('Aviso', 'Aguarde o carregamento das estatísticas.');
      return;
    }
    try {
      const uri = await exportarRelatorioPDF({
        totalConcursos: estatGerais.totalConcursos,
        mediaPares: estatGerais.mediaPares,
        mediaImpares: estatGerais.mediaImpares,
        mediaPrimos: estatGerais.mediaPrimos,
        mediaSoma: estatGerais.mediaSoma,
        quentes: estatGerais.quentes,
        frias: estatGerais.frias,
        totalJogadas: desempenho.totalJogadas,
        mediaAcertos: desempenho.mediaAcertos,
        melhorAcerto: desempenho.melhorAcerto,
      });
      Alert.alert('Relatório Gerado', 'O PDF do relatório foi gerado com sucesso.', [
        { text: 'OK' },
        { text: 'Compartilhar', onPress: () => compartilharArquivo(uri, 'Relatório LotoCiclo3') }
      ]);
    } catch (err: any) {
      Alert.alert('Erro ao gerar relatório', err.message || String(err));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.titulo}>📊 Análise</Text>
        <TouchableOpacity style={styles.exportarBtn} onPress={exportarRelatorio}>
          <Text style={styles.exportarBtnTxt}>📊 Exportar PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Seletor de período */}
      <View style={styles.seletorRow}>
        {PERIODOS.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[styles.seletorBtn, periodo === p.value && styles.seletorBtnAtivo]}
            onPress={() => setPeriodo(p.value)}
          >
            <Text style={[styles.seletorTxt, periodo === p.value && styles.seletorTxtAtivo]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color={CORES.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* ── Heatmap das Dezenas ── */}
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>🔥 Frequência das Dezenas</Text>
            <Text style={styles.secaoSub}>
              {estatGerais?.totalConcursos ?? 0} concursos analisados
              {estatGerais?.concursoInicial && estatGerais?.concursoFinal 
                ? ` (do ${estatGerais.concursoInicial} ao ${estatGerais.concursoFinal})` 
                : ''}
            </Text>
            {estatGerais && (
              <Heatmap
                frequencias={estatGerais.frequencias}
                quentes={estatGerais.quentes}
                frias={estatGerais.frias}
              />
            )}
          </View>

          {/* ── Dezenas Quentes e Frias ── */}
          {estatGerais && (
            <View style={styles.row2Col}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitulo}>🔥 Quentes</Text>
                <View style={styles.dezenasChips}>
                  {estatGerais.quentes.map(d => (
                    <View key={d} style={[styles.chip, { backgroundColor: CORES.quente + '33' }]}>
                      <Text style={[styles.chipTxt, { color: CORES.quente }]}>
                        {String(d).padStart(2, '0')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitulo}>🧊 Frias</Text>
                <View style={styles.dezenasChips}>
                  {estatGerais.frias.map(d => (
                    <View key={d} style={[styles.chip, { backgroundColor: CORES.fria + '33' }]}>
                      <Text style={[styles.chipTxt, { color: CORES.fria }]}>
                        {String(d).padStart(2, '0')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── Distribuição Par/Ímpar/Primo/Soma ── */}
          {estatGerais && (
            <View style={styles.secao}>
              <Text style={styles.secaoTitulo}>📐 Distribuição (média por sorteio)</Text>
              <BarraHorizontal
                label="Pares"
                valor={estatGerais.mediaPares}
                total={15}
                cor={CORES.azul}
              />
              <BarraHorizontal
                label="Ímpares"
                valor={estatGerais.mediaImpares}
                total={15}
                cor={CORES.accentLight}
              />
              <BarraHorizontal
                label="Primos"
                valor={estatGerais.mediaPrimos}
                total={15}
                cor={CORES.verde}
              />
              <View style={styles.somaRow}>
                <Text style={styles.barraLabel}>Soma média</Text>
                <Text style={styles.somaValor}>{estatGerais.mediaSoma.toFixed(1)}</Text>
                <Text style={styles.somaRef}>(ideal: ~195)</Text>
              </View>
            </View>
          )}

          {/* ── Desempenho Pessoal ── */}
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>🏆 Meu Desempenho</Text>
            {desempenho && desempenho.totalJogadas > 0 ? (
              <>
                {/* Cards resumo */}
                <View style={styles.row3Col}>
                  <View style={styles.miniCard}>
                    <Text style={styles.miniValor}>{desempenho.totalJogadas}</Text>
                    <Text style={styles.miniLabel}>Jogadas</Text>
                  </View>
                  <View style={styles.miniCard}>
                    <Text style={[styles.miniValor, { color: CORES.accentLight }]}>
                      {desempenho.mediaAcertos.toFixed(1)}
                    </Text>
                    <Text style={styles.miniLabel}>Média</Text>
                  </View>
                  <View style={styles.miniCard}>
                    <Text style={[styles.miniValor, { color: CORES.verde }]}>
                      {desempenho.melhorAcerto}
                    </Text>
                    <Text style={styles.miniLabel}>Melhor</Text>
                  </View>
                </View>

                {/* Fixas vs Surpresinha */}
                <View style={styles.row2Col}>
                  <View style={[styles.card, { flex: 1 }]}>
                    <Text style={styles.cardTitulo}>📌 Com Fixas</Text>
                    <Text style={styles.cardValor}>{desempenho.jogoFixas.total} jogos</Text>
                    <Text style={styles.cardSub}>
                      Média: {desempenho.jogoFixas.mediaAcertos.toFixed(1)} pts
                    </Text>
                  </View>
                  <View style={[styles.card, { flex: 1 }]}>
                    <Text style={styles.cardTitulo}>🎲 Surpresinha</Text>
                    <Text style={styles.cardValor}>{desempenho.jogoSurpresinha.total} jogos</Text>
                    <Text style={styles.cardSub}>
                      Média: {desempenho.jogoSurpresinha.mediaAcertos.toFixed(1)} pts
                    </Text>
                  </View>
                </View>

                {/* Distribuição de acertos */}
                <View style={styles.card}>
                  <Text style={styles.cardTitulo}>📊 Distribuição de Pontos</Text>
                  <DistribuicaoAcertos distribuicao={desempenho.distribuicaoAcertos} />
                </View>

                {/* Gráfico de evolução */}
                <View style={styles.card}>
                  <Text style={styles.cardTitulo}>📈 Evolução de Acertos</Text>
                  <Text style={styles.cardSubTxt}>Últimos 30 jogos conferidos</Text>
                  <GraficoEvolucao evolucao={desempenho.evolucao} />
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyTitulo}>Nenhum jogo conferido ainda</Text>
                <Text style={styles.emptyTxt}>
                  Cadastre seus jogos e sincronize os resultados para ver suas estatísticas.
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORES.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CORES.texto,
    marginBottom: 16,
  },
  // Seletor de período
  seletorRow: {
    flexDirection: 'row',
    backgroundColor: CORES.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  seletorBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  seletorBtnAtivo: {
    backgroundColor: CORES.accent,
  },
  seletorTxt: {
    fontSize: 13,
    color: CORES.textoSec,
    fontWeight: '600',
  },
  seletorTxtAtivo: {
    color: '#fff',
  },
  // Seções
  secao: {
    marginBottom: 20,
  },
  secaoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: CORES.texto,
    marginBottom: 4,
  },
  secaoSub: {
    fontSize: 12,
    color: CORES.textoSec,
    marginBottom: 12,
  },
  // Heatmap
  heatmapWrap: {
    alignItems: 'center',
    gap: 12,
  },
  heatmapLegenda: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    marginTop: 4,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendaTxt: {
    fontSize: 12,
    color: CORES.textoSec,
  },
  // Cards
  card: {
    backgroundColor: CORES.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CORES.border,
  },
  cardTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: CORES.texto,
    marginBottom: 8,
  },
  cardValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CORES.accentLight,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: CORES.textoSec,
  },
  cardSubTxt: {
    fontSize: 12,
    color: CORES.textoSec,
    marginBottom: 8,
  },
  // Layout
  row2Col: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  row3Col: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  miniCard: {
    flex: 1,
    backgroundColor: CORES.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CORES.border,
  },
  miniValor: {
    fontSize: 22,
    fontWeight: 'bold',
    color: CORES.texto,
  },
  miniLabel: {
    fontSize: 11,
    color: CORES.textoSec,
    marginTop: 2,
  },
  // Chips de dezenas
  dezenasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipTxt: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Barras de distribuição
  barraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  barraLabel: {
    width: 60,
    fontSize: 12,
    color: CORES.textoSec,
  },
  barraTrack: {
    flex: 1,
    height: 10,
    backgroundColor: CORES.surface,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 5,
  },
  barraValor: {
    width: 36,
    fontSize: 12,
    color: CORES.texto,
    textAlign: 'right',
  },
  somaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  somaValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CORES.amarelo,
  },
  somaRef: {
    fontSize: 12,
    color: CORES.textoSec,
  },
  // Distribuição acertos
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  distLabel: {
    width: 44,
    fontSize: 13,
    fontWeight: '700',
  },
  distTrack: {
    flex: 1,
    height: 12,
    backgroundColor: CORES.surface,
    borderRadius: 6,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 6,
  },
  distQtd: {
    width: 32,
    fontSize: 12,
    color: CORES.textoSec,
    textAlign: 'right',
  },
  // Gráfico
  graficoWrap: {
    alignItems: 'center',
  },
  graficoEixoX: {
    width: 300,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  eixoTxt: {
    fontSize: 10,
    color: CORES.textoSec,
  },
  // Empty state
  empty: {
    color: CORES.textoSec,
    textAlign: 'center',
    fontSize: 13,
    marginVertical: 8,
  },
  emptyCard: {
    backgroundColor: CORES.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CORES.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: CORES.texto,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyTxt: {
    fontSize: 13,
    color: CORES.textoSec,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exportarBtn: {
    backgroundColor: CORES.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CORES.accentLight,
  },
  exportarBtnTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

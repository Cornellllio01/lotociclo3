import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { salvarJogo } from '../../database/db';
import { v4 as uuidv4 } from 'uuid';

// ─── Hook stub de voz (substitua pela lib real no dev build) ──────────────────
/**
 * Este hook é um stub completo, pronto para substituição futura.
 * Quando a lib de voz for confirmada compatível com RN 0.81:
 *   1. Instale: npx expo install @react-native-voice/voice
 *   2. Substitua useVoiceStub por useVoiceReal abaixo
 *   3. Apague o stub
 */

interface VoiceHook {
  listening: boolean;
  results: string[];
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

function useVoiceStub(): VoiceHook {
  const [listening, setListening] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setListening(true);
    setError(null);
    // Simula reconhecimento após 2 segundos (stub)
    setTimeout(() => {
      setResults(prev => [...prev, 'stub: use dev build para voz real']);
      setListening(false);
    }, 2000);
  };

  const stop = async () => {
    setListening(false);
  };

  return { listening, results, error, start, stop };
}

// Para ativar voz real, implemente esta função com @react-native-voice/voice:
// function useVoiceReal(): VoiceHook { ... }

// ─── Tela principal de entrada por voz ───────────────────────────────────────

interface VoiceInputScreenProps {
  onJogoSalvo?: () => void;
}

export function VoiceInputScreen({ onJogoSalvo }: VoiceInputScreenProps) {
  const db = useSQLiteContext();
  const voice = useVoiceStub(); // ← troque por useVoiceReal() quando disponível
  const [numerosOuvidos, setNumerosOuvidos] = useState<number[]>([]);
  const [numerosConfirmados, setNumerosConfirmados] = useState<Set<number>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animação de pulso do microfone
  React.useEffect(() => {
    if (voice.listening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voice.listening]);

  const toggleOuvir = useCallback(async () => {
    if (voice.listening) {
      await voice.stop();
    } else {
      await voice.start();
    }
  }, [voice]);

  const adicionarNumero = useCallback((n: number) => {
    if (n < 1 || n > 25) return;
    setNumerosOuvidos(prev => prev.includes(n) ? prev : [...prev, n]);
    setNumerosConfirmados(prev => {
      const next = new Set(prev);
      next.add(n);
      return next;
    });
  }, []);

  const removerNumero = useCallback((n: number) => {
    setNumerosOuvidos(prev => prev.filter(x => x !== n));
    setNumerosConfirmados(prev => { const next = new Set(prev); next.delete(n); return next; });
  }, []);

  const salvar = useCallback(async () => {
    const dezenas = Array.from(numerosConfirmados).sort((a, b) => a - b);
    if (dezenas.length !== 15) {
      Alert.alert('Seleção inválida', `Selecione exatamente 15 dezenas. Atualmente: ${dezenas.length}`);
      return;
    }
    try {
      await salvarJogo(db, {
        id: uuidv4(),
        dezenas,
        grupo6: [],
        grupo9: dezenas,
        fixas: [],
        nome: `Voz ${new Date().toLocaleDateString('pt-BR')}`,
        criado_em: new Date().toISOString(),
      });
      Alert.alert('✅ Jogo salvo!', 'Jogo ditado por voz salvo com sucesso.');
      onJogoSalvo?.();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o jogo.');
    }
  }, [db, numerosConfirmados, onJogoSalvo]);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.titulo}>🎤 Ditar Números</Text>

      {/* Microfone animado */}
      <Animated.View style={[s.micCircle, voice.listening && s.micAtivo, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity onPress={toggleOuvir} style={s.micBtn}>
          <Text style={s.micIcon}>{voice.listening ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={s.micStatus}>
        {voice.listening ? 'Ouvindo... fale os números' : 'Toque para começar a ditar'}
      </Text>

      {/* Entrada manual de números (fallback) */}
      <View style={s.card}>
        <Text style={s.cardTitulo}>🔢 Adicionar Número Manualmente</Text>
        <View style={s.gridManual}>
          {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
            <TouchableOpacity
              key={n}
              style={[s.celulaManual, numerosConfirmados.has(n) && s.celulaSelecionada]}
              onPress={() => numerosConfirmados.has(n) ? removerNumero(n) : adicionarNumero(n)}
            >
              <Text style={[s.celulaNum, numerosConfirmados.has(n) && s.celulaNumAtivo]}>
                {String(n).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Números selecionados */}
      <View style={s.card}>
        <Text style={s.cardTitulo}>
          Dezenas selecionadas: {numerosConfirmados.size}/15
        </Text>
        <View style={s.chips}>
          {Array.from(numerosConfirmados).sort((a, b) => a - b).map(n => (
            <TouchableOpacity key={n} style={s.chip} onPress={() => removerNumero(n)}>
              <Text style={s.chipTxt}>{String(n).padStart(2, '0')} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
        {numerosConfirmados.size === 0 && (
          <Text style={s.empty}>Nenhum número selecionado ainda.</Text>
        )}
      </View>

      {/* Aviso stub */}
      <View style={s.avisoCard}>
        <Text style={s.avisoTxt}>
          ℹ️ Reconhecimento de voz real disponível após gerar o Development Build.
          Use a grade acima para inserir manualmente por enquanto.
        </Text>
      </View>

      <TouchableOpacity
        style={[s.btnSalvar, numerosConfirmados.size !== 15 && s.btnDisabled]}
        onPress={salvar}
        disabled={numerosConfirmados.size !== 15}
      >
        <Text style={s.btnSalvarTxt}>💾 Salvar Jogo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#E6EDF3', marginBottom: 24 },
  micCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#161B22',
    borderWidth: 2, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  micAtivo: { borderColor: '#EF4444', backgroundColor: '#1C0A0A' },
  micBtn: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 40 },
  micStatus: { fontSize: 13, color: '#8B949E', marginBottom: 24 },
  card: {
    width: '100%', backgroundColor: '#161B22', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#30363D',
  },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: '#E6EDF3', marginBottom: 10 },
  gridManual: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  celulaManual: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#30363D',
  },
  celulaSelecionada: { backgroundColor: '#7C3AED', borderColor: '#A78BFA' },
  celulaNum: { color: '#8B949E', fontSize: 12, fontWeight: '600' },
  celulaNumAtivo: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#7C3AED33', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipTxt: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },
  empty: { color: '#8B949E', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  avisoCard: {
    width: '100%', backgroundColor: '#1C1A00', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#EAB30840',
  },
  avisoTxt: { color: '#EAB308', fontSize: 12, lineHeight: 18 },
  btnSalvar: {
    backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14,
    width: '100%', alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#30363D' },
  btnSalvarTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

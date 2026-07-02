import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSQLiteContext } from 'expo-sqlite';
import { salvarJogo } from '../../database/db';
import { v4 as uuidv4 } from 'uuid';

// ─── Tela de OCR (só renderizada no development build via OcrGuard) ───────────

interface OcrScreenProps {
  onJogoSalvo?: () => void;
}

type Estado = 'camera' | 'processando' | 'confirmacao' | 'erro';

export function OcrScreen({ onJogoSalvo }: OcrScreenProps) {
  const db = useSQLiteContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [estado, setEstado] = useState<Estado>('camera');
  const [numerosReconhecidos, setNumerosReconhecidos] = useState<number[]>([]);
  const [numerosConfirmados, setNumerosConfirmados] = useState<Set<number>>(new Set());
  const [erroMensagem, setErroMensagem] = useState('');
  const cameraRef = useRef<any>(null);

  // ─── Captura e OCR ──────────────────────────────────────────────────────────

  const capturar = useCallback(async () => {
    if (!cameraRef.current) return;
    setEstado('processando');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 });

      // Lazy import do ML Kit — só executado no development build
      let numerosExtraidos: number[] = [];
      try {
        // @ts-ignore
        const { TextRecognizer } = await import('@infinitered/react-native-mlkit-text-recognition');
        const recognizer = await TextRecognizer.initialize();
        const result = await recognizer.recognize(photo.uri);
        numerosExtraidos = extrairNumerosDeTexto(result.text ?? '');
      } catch (mlkitErr) {
        // ML Kit não disponível — modo fallback (não deve ocorrer em dev build)
        console.warn('ML Kit não disponível:', mlkitErr);
        setErroMensagem('Biblioteca de OCR não disponível. Verifique a instalação do development build.');
        setEstado('erro');
        return;
      }

      if (numerosExtraidos.length === 0) {
        setErroMensagem('Nenhum número entre 01-25 encontrado na imagem. Tente enquadrar melhor a cartela.');
        setEstado('erro');
        return;
      }

      setNumerosReconhecidos(numerosExtraidos);
      setNumerosConfirmados(new Set(numerosExtraidos.slice(0, 15)));
      setEstado('confirmacao');
    } catch (err) {
      console.error('Erro na captura:', err);
      setErroMensagem('Erro ao capturar foto. Tente novamente.');
      setEstado('erro');
    }
  }, []);

  // ─── Salvar jogo confirmado ──────────────────────────────────────────────────

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
        nome: `OCR ${new Date().toLocaleDateString('pt-BR')}`,
        criado_em: new Date().toISOString(),
      });
      Alert.alert('✅ Jogo salvo!', 'Jogo importado via OCR salvo com sucesso.');
      onJogoSalvo?.();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o jogo.');
    }
  }, [db, numerosConfirmados, onJogoSalvo]);

  const toggleNumero = useCallback((n: number) => {
    setNumerosConfirmados(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  // ─── Permissão de câmera ────────────────────────────────────────────────────

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color="#7C3AED" />;
  if (!permission.granted) {
    return (
      <View style={s.permissaoContainer}>
        <Text style={s.permissaoTxt}>📷 Precisamos de acesso à câmera para ler a cartela.</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnTxt}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Tela de erro ────────────────────────────────────────────────────────────

  if (estado === 'erro') {
    return (
      <View style={s.centrado}>
        <Text style={s.erroIcon}>❌</Text>
        <Text style={s.erroTxt}>{erroMensagem}</Text>
        <TouchableOpacity style={s.btn} onPress={() => setEstado('camera')}>
          <Text style={s.btnTxt}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Processando ─────────────────────────────────────────────────────────────

  if (estado === 'processando') {
    return (
      <View style={s.centrado}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={s.processandoTxt}>Reconhecendo números...</Text>
      </View>
    );
  }

  // ─── Confirmação manual ───────────────────────────────────────────────────────

  if (estado === 'confirmacao') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.confirmacaoContent}>
        <Text style={s.tituloConf}>✅ Confirme os números</Text>
        <Text style={s.subConf}>
          OCR detectou {numerosReconhecidos.length} números. Selecione exatamente 15.
          Selecionados: {numerosConfirmados.size}/15
        </Text>
        <View style={s.grid}>
          {Array.from({ length: 25 }, (_, i) => i + 1).map(n => {
            const detectado = numerosReconhecidos.includes(n);
            const confirmado = numerosConfirmados.has(n);
            return (
              <TouchableOpacity
                key={n}
                style={[s.celula, confirmado && s.celulaAtiva, !detectado && s.celulaFraca]}
                onPress={() => toggleNumero(n)}
              >
                <Text style={[s.celulaNum, confirmado && s.celulaNumAtivo]}>
                  {String(n).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={s.acoesRow}>
          <TouchableOpacity style={s.btnSecundario} onPress={() => setEstado('camera')}>
            <Text style={s.btnSecTxt}>↩ Refazer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, numerosConfirmados.size !== 15 && s.btnDisabled]}
            onPress={salvar}
            disabled={numerosConfirmados.size !== 15}
          >
            <Text style={s.btnTxt}>💾 Salvar Jogo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── Câmera ───────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} facing="back">
        <View style={s.cameraOverlay}>
          <View style={s.frame} />
          <Text style={s.frameTxt}>Enquadre a cartela da Lotofácil</Text>
        </View>
      </CameraView>
      <View style={s.cameraFooter}>
        <TouchableOpacity style={s.capturaBtn} onPress={capturar}>
          <Text style={s.capturaBtnTxt}>📷 Capturar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Utilitário: extrai números 01-25 do texto OCR ───────────────────────────

function extrairNumerosDeTexto(texto: string): number[] {
  const matches = texto.match(/\b([0-9]{1,2})\b/g) ?? [];
  const numeros = new Set<number>();
  for (const m of matches) {
    const n = parseInt(m, 10);
    if (n >= 1 && n <= 25) numeros.add(n);
  }
  return Array.from(numeros).sort((a, b) => a - b);
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: {
    width: 280, height: 200, borderWidth: 2, borderColor: '#A78BFA',
    borderRadius: 12, backgroundColor: 'transparent',
  },
  frameTxt: { color: '#fff', marginTop: 12, fontSize: 13, textShadowColor: '#000', textShadowRadius: 4 },
  cameraFooter: { padding: 24, backgroundColor: '#0D1117', alignItems: 'center' },
  capturaBtn: {
    backgroundColor: '#7C3AED', borderRadius: 30, paddingHorizontal: 40, paddingVertical: 14,
  },
  capturaBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  centrado: { flex: 1, backgroundColor: '#0D1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  erroIcon: { fontSize: 48, marginBottom: 16 },
  erroTxt: { color: '#EF4444', textAlign: 'center', fontSize: 14, marginBottom: 20, lineHeight: 22 },
  processandoTxt: { color: '#8B949E', marginTop: 16, fontSize: 14 },
  permissaoContainer: { flex: 1, backgroundColor: '#0D1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissaoTxt: { color: '#E6EDF3', textAlign: 'center', fontSize: 14, marginBottom: 20 },
  confirmacaoContent: { padding: 20, paddingBottom: 40 },
  tituloConf: { fontSize: 18, fontWeight: 'bold', color: '#E6EDF3', marginBottom: 6, textAlign: 'center' },
  subConf: { fontSize: 12, color: '#8B949E', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
  celula: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#161B22', borderWidth: 1, borderColor: '#30363D',
  },
  celulaAtiva: { backgroundColor: '#7C3AED', borderColor: '#A78BFA' },
  celulaFraca: { opacity: 0.4 },
  celulaNum: { color: '#8B949E', fontSize: 14, fontWeight: '600' },
  celulaNumAtivo: { color: '#fff' },
  acoesRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  btn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnDisabled: { backgroundColor: '#30363D' },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnSecundario: {
    backgroundColor: '#161B22', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: '#30363D',
  },
  btnSecTxt: { color: '#8B949E', fontWeight: '600', fontSize: 14 },
});

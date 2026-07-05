import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  solicitarPermissao,
  agendarLembrete,
  cancelarLembrete,
  verificarNovoResultado,
  getLembreteAgendado,
  isExpoGo,
} from '../../src/notifications';
import { ultimoConcurso } from '../../src/database/db';

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D1117', surface: '#161B22', card: '#1C2128', border: '#30363D',
  accent: '#7C3AED', accentLight: '#A78BFA', verde: '#22C55E',
  texto: '#E6EDF3', textoSec: '#8B949E', amarelo: '#EAB308',
};

// ─── Seletor simples de hora ──────────────────────────────────────────────────
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = [0, 15, 30, 45];

function SeletorHora({ hora, minuto, onChange }: {
  hora: number; minuto: number; onChange: (h: number, m: number) => void
}) {
  return (
    <View style={s.seletorRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.seletorScroll}>
        {HORAS.map(h => (
          <TouchableOpacity
            key={h}
            style={[s.seletorChip, hora === h && s.seletorChipAtivo]}
            onPress={() => onChange(h, minuto)}
          >
            <Text style={[s.seletorChipTxt, hora === h && s.seletorChipTxtAtivo]}>
              {String(h).padStart(2, '0')}h
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={s.minutosRow}>
        {MINUTOS.map(m => (
          <TouchableOpacity
            key={m}
            style={[s.minutChip, minuto === m && s.minutChipAtivo]}
            onPress={() => onChange(hora, m)}
          >
            <Text style={[s.minutChipTxt, minuto === m && s.minutChipTxtAtivo]}>
              :{String(m).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────
export default function ConfiguracoesScreen() {
  const db = useSQLiteContext();
  const [notifAtiva, setNotifAtiva] = useState(false);
  const [hora, setHora] = useState(17);
  const [minuto, setMinuto] = useState(0);
  const [verificando, setVerificando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [ultimoConcursoNum, setUltimoConcursoNum] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    async function carregar() {
      const lembrete = await getLembreteAgendado();
      const ultimo = await ultimoConcurso(db);
      if (!ativo) return;
      if (lembrete) {
        setNotifAtiva(true);
        setHora(lembrete.hora);
        setMinuto(lembrete.minuto);
      }
      setUltimoConcursoNum(ultimo?.numero ?? null);
    }
    carregar();
    return () => { ativo = false; };
  }, [db]));

  async function toggleNotificacao(valor: boolean) {
    if (valor) {
      const ok = await solicitarPermissao();
      if (!ok) {
        Alert.alert(
          'Permissão necessária',
          'Habilite as notificações nas configurações do dispositivo.'
        );
        return;
      }
      await agendarLembrete(hora, minuto);
      setNotifAtiva(true);
      Alert.alert('✅ Lembrete ativado', `Você será lembrado diariamente às ${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}.`);
    } else {
      await cancelarLembrete();
      setNotifAtiva(false);
    }
  }

  async function alterarHorario(h: number, m: number) {
    setHora(h);
    setMinuto(m);
    if (notifAtiva) {
      await agendarLembrete(h, m);
    }
  }

  async function checarNovoResultado() {
    setVerificando(true);
    try {
      const novo = await verificarNovoResultado(db);
      if (novo) {
        Alert.alert('🏆 Novo resultado!', 'Um novo concurso foi detectado. Verifique a aba Resultados.');
      } else {
        Alert.alert('✅ Tudo atualizado', 'Você já tem o resultado mais recente.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar. Cheque a conexão com a internet.');
    } finally {
      setVerificando(false);
    }
  }

  async function baixarHistorico() {
    setBaixando(true);
    try {
      const { baixarHistorico: baixar } = await import('../../src/api/caixa');
      await baixar(db, 50);
      Alert.alert('✅ Histórico baixado!', '50 concursos importados com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível baixar o histórico.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.titulo}>⚙️ Configurações</Text>

      {/* ── Notificações ── */}
      <View style={s.secao}>
        <Text style={s.secaoTitulo}>🔔 Notificações</Text>

        {isExpoGo && (
          <View style={[s.card, { borderColor: C.amarelo, borderWidth: 1 }]}>
            <Text style={{ color: C.amarelo, fontSize: 13, fontWeight: '600' }}>
              ⚠️ Notificações indisponíveis no Expo Go
            </Text>
            <Text style={{ color: C.textoSec, fontSize: 12, marginTop: 4 }}>
              O agendamento de lembretes e notificações locais/remotas requer a execução de um Development Build nativo.
            </Text>
          </View>
        )}

        <View style={s.card}>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Lembrete de Apostas</Text>
              <Text style={s.switchSub}>Notificação diária no horário configurado</Text>
            </View>
            <Switch
              value={notifAtiva}
              onValueChange={toggleNotificacao}
              disabled={isExpoGo}
              trackColor={{ false: C.border, true: C.accent }}
              thumbColor={notifAtiva ? C.accentLight : C.textoSec}
            />
          </View>
        </View>

        {/* Seletor de horário */}
        <View style={s.card}>
          <Text style={s.cardTitulo}>
            🕐 Horário: {String(hora).padStart(2, '0')}:{String(minuto).padStart(2, '0')}
          </Text>
          <SeletorHora hora={hora} minuto={minuto} onChange={alterarHorario} />
          {!notifAtiva && (
            <Text style={s.avisoTxt}>⚠️ Ative o lembrete para que este horário tenha efeito.</Text>
          )}
        </View>
      </View>

      {/* ── Verificar Resultado ── */}
      <View style={s.secao}>
        <Text style={s.secaoTitulo}>🔄 Sincronização</Text>

        <View style={s.card}>
          {ultimoConcursoNum && (
            <Text style={s.infoTxt}>
              Último resultado local: Concurso <Text style={s.destaque}>{ultimoConcursoNum}</Text>
            </Text>
          )}
          <TouchableOpacity
            style={[s.btn, verificando && s.btnDisabled]}
            onPress={checarNovoResultado}
            disabled={verificando}
          >
            {verificando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.btnTxt}>🔍 Verificar Novo Resultado</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#0f766e', marginTop: 4 }, baixando && s.btnDisabled]}
            onPress={baixarHistorico}
            disabled={baixando}
          >
            {baixando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.btnTxt}>📥 Baixar Histórico (50 concursos)</Text>
            )}
          </TouchableOpacity>
          <Text style={s.subTxt}>
            Consulta a API da Caixa e notifica se houver concurso novo.
          </Text>
        </View>
      </View>

      {/* ── Sobre o App ── */}
      <View style={s.secao}>
        <Text style={s.secaoTitulo}>ℹ️ Sobre</Text>
        <View style={s.card}>
          <Text style={s.sobreItem}>📱 LotoCiclo3</Text>
          <Text style={s.sobreItem}>🎲 Sistema de apostas 6+9 — Lotofácil</Text>
          <Text style={s.sobreItem}>🔢 Fases 1–5 implementadas</Text>
          <View style={s.separador} />
          <Text style={s.fasesLabel}>Recursos ativos neste build:</Text>
          <Text style={s.faseItem}>✅ Resultados e Conferência automática</Text>
          <Text style={s.faseItem}>✅ Ciclos e Histórico</Text>
          <Text style={s.faseItem}>✅ Estatísticas e Análise</Text>
          <Text style={s.faseItem}>✅ Exportar PDF e Compartilhar</Text>
          <Text style={s.faseItem}>✅ Notificações locais</Text>
          <Text style={[s.faseItem, { color: C.amarelo }]}>⚠️ OCR e Voz: requerem development build</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: C.texto, marginBottom: 20 },
  secao: { marginBottom: 24 },
  secaoTitulo: { fontSize: 16, fontWeight: '700', color: C.texto, marginBottom: 10 },
  card: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: C.texto, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: C.texto },
  switchSub: { fontSize: 12, color: C.textoSec, marginTop: 2 },
  seletorRow: { gap: 10 },
  seletorScroll: { flexGrow: 0 },
  seletorChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.surface, marginRight: 6, borderWidth: 1, borderColor: C.border,
  },
  seletorChipAtivo: { backgroundColor: C.accent, borderColor: C.accentLight },
  seletorChipTxt: { color: C.textoSec, fontSize: 13, fontWeight: '600' },
  seletorChipTxtAtivo: { color: '#fff' },
  minutosRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  minutChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  minutChipAtivo: { backgroundColor: C.accent, borderColor: C.accentLight },
  minutChipTxt: { color: C.textoSec, fontSize: 13, fontWeight: '600' },
  minutChipTxtAtivo: { color: '#fff' },
  avisoTxt: { fontSize: 11, color: C.amarelo, marginTop: 10 },
  infoTxt: { fontSize: 13, color: C.textoSec, marginBottom: 12 },
  destaque: { color: C.accentLight, fontWeight: 'bold' },
  btn: {
    backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginBottom: 8,
  },
  btnDisabled: { backgroundColor: C.border },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  subTxt: { fontSize: 11, color: C.textoSec, textAlign: 'center' },
  sobreItem: { fontSize: 13, color: C.textoSec, marginBottom: 4 },
  separador: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  fasesLabel: { fontSize: 12, fontWeight: '700', color: C.textoSec, marginBottom: 6 },
  faseItem: { fontSize: 12, color: C.verde, marginBottom: 3 },
});

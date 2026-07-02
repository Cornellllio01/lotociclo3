import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { ultimoConcurso } from '../database/db';
import { buscarUltimo } from '../api/caixa';

// ─── Configuração padrão do handler de notificações ─────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── IDs fixos para identificação das notificações ───────────────────────────

const ID_LEMBRETE = 'lotociclo-lembrete-apostas';
const ID_NOVO_RESULTADO = 'lotociclo-novo-resultado';

// ─── Solicitar permissão ──────────────────────────────────────────────────────

export async function solicitarPermissao(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Agendar lembrete diário de fechamento de apostas ────────────────────────

/**
 * Agenda uma notificação diária repetida no horário configurado.
 * Cancela qualquer lembrete anterior antes de agendar o novo.
 * @param hora  0–23
 * @param minuto 0–59
 */
export async function agendarLembrete(hora: number, minuto: number): Promise<string> {
  // Cancela lembrete anterior
  await cancelarLembrete();

  const id = await Notifications.scheduleNotificationAsync({
    identifier: ID_LEMBRETE,
    content: {
      title: '🎯 LotoCiclo3 — Não esqueça!',
      body: 'Fechamento das apostas da Lotofácil se aproxima. Confira seus jogos!',
      data: { tipo: 'lembrete' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hora,
      minute: minuto,
    },
  });
  return id;
}

export async function cancelarLembrete(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_LEMBRETE).catch(() => {});
}

// ─── Verificar novo resultado e notificar ────────────────────────────────────

/**
 * Consulta a API da Caixa, compara com o banco local.
 * Se houver concurso novo, dispara notificação local imediata.
 * @returns true se havia novo resultado
 */
export async function verificarNovoResultado(db: SQLiteDatabase): Promise<boolean> {
  try {
    const local = await ultimoConcurso(db);
    const caixa = await buscarUltimo();

    const numeroLocal = local?.numero ?? 0;
    if (caixa.numero > numeroLocal) {
      await Notifications.scheduleNotificationAsync({
        identifier: ID_NOVO_RESULTADO,
        content: {
          title: '🏆 Novo resultado disponível!',
          body: `Concurso ${caixa.numero} sorteado em ${caixa.data}. Toque para conferir seus jogos.`,
          data: { tipo: 'novo_resultado', numero: caixa.numero },
        },
        trigger: null, // imediato
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Erro ao verificar novo resultado:', err);
    return false;
  }
}

// ─── Listar lembretes agendados ───────────────────────────────────────────────

export async function getLembreteAgendado(): Promise<{ hora: number; minuto: number } | null> {
  const agendados = await Notifications.getAllScheduledNotificationsAsync();
  const lembrete = agendados.find(n => n.identifier === ID_LEMBRETE);
  if (!lembrete) return null;

  const trigger = lembrete.trigger as any;
  if (trigger?.hour !== undefined && trigger?.minute !== undefined) {
    return { hora: trigger.hour, minuto: trigger.minute };
  }
  return null;
}

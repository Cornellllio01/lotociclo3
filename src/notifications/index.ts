import { Platform } from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { ultimoConcurso } from '../database/db';
import { buscarUltimo } from '../api/caixa';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// ─── IDs fixos para identificação das notificações ───────────────────────────
const ID_LEMBRETE = 'lotociclo-lembrete-apostas';
const ID_NOVO_RESULTADO = 'lotociclo-novo-resultado';

// ─── Inicialização Tardia do Handler de Notificações ─────────────────────────
let initialized = false;

function getNotificationsLib() {
  const Notifications = require('expo-notifications');
  if (!initialized) {
    initialized = true;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (err) {
      console.warn('Erro ao configurar notification handler:', err);
    }
  }
  return Notifications;
}

// ─── Solicitar permissão ──────────────────────────────────────────────────────
export async function solicitarPermissao(): Promise<boolean> {
  try {
    const Notifications = getNotificationsLib();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Erro ao solicitar permissões de notificação:', err);
    return false;
  }
}

// ─── Agendar lembrete diário de fechamento de apostas ────────────────────────
export async function agendarLembrete(hora: number, minuto: number): Promise<string> {
  await cancelarLembrete();

  try {
    const Notifications = getNotificationsLib();
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
  } catch (err) {
    console.warn('Erro ao agendar lembrete:', err);
    return '';
  }
}

export async function cancelarLembrete(): Promise<void> {
  try {
    const Notifications = getNotificationsLib();
    await Notifications.cancelScheduledNotificationAsync(ID_LEMBRETE).catch(() => {});
  } catch (err) {
    console.warn('Erro ao cancelar lembrete:', err);
  }
}

// ─── Verificar novo resultado e notificar ────────────────────────────────────
export async function verificarNovoResultado(db: SQLiteDatabase): Promise<boolean> {
  try {
    const local = await ultimoConcurso(db);
    const caixa = await buscarUltimo();

    const numeroLocal = local?.numero ?? 0;
    if (caixa.numero > numeroLocal) {
      const Notifications = getNotificationsLib();
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
  try {
    const Notifications = getNotificationsLib();
    const agendados = await Notifications.getAllScheduledNotificationsAsync();
    const lembrete = agendados.find((n: any) => n.identifier === ID_LEMBRETE);
    if (!lembrete) return null;

    const trigger = lembrete.trigger as any;
    if (trigger?.hour !== undefined && trigger?.minute !== undefined) {
      return { hora: trigger.hour, minuto: trigger.minute };
    }
  } catch (err) {
    console.warn('Erro ao listar lembretes agendados:', err);
  }
  return null;
}

// ─── Registro de Push Token Remoto (Guarded para Expo Go) ────────────────────
export async function registrarPushToken(): Promise<string | null> {
  if (isExpoGo) {
    console.log('[Push Notifications] Registro de push token ignorado no Expo Go.');
    return null;
  }

  try {
    const Notifications = getNotificationsLib();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push Notifications] Permissão para notificações não concedida.');
      return null;
    }

    const extra = require('expo-constants').default;
    const projectId = extra.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.warn('[Push Notifications] Project ID do EAS não encontrado em app.json.');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('[Push Notifications] Token obtido:', token);
    return token;
  } catch (err) {
    console.warn('[Push Notifications] Erro ao registrar push token:', err);
    return null;
  }
}

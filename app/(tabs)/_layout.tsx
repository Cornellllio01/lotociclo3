import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { registrarPushToken, isExpoGo } from '../../src/notifications';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.6 }}>
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let subscription: any = null;

    // Registra token se for dev build
    registrarPushToken();

    async function setupListener() {
      try {
        const Notifications = await import('expo-notifications');
        if (!active) return;
        subscription = Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification.request.content.data;
          if (data?.tipo === 'novo_resultado') {
            router.push('/resultado');
          }
        });
      } catch (err) {
        console.warn('Erro ao configurar listener de notificações:', err);
      }
    }

    if (!isExpoGo) {
      setupListener();
    }

    return () => {
      active = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#12102a' },
        headerTintColor: '#c4b5fd',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 16 },
        tabBarStyle: {
          backgroundColor: '#0d0d1a',
          borderTopColor: '#2a2060',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#c4b5fd',
        tabBarInactiveTintColor: '#4a4a6a',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="resultado"
        options={{
          title: 'Resultado',
          tabBarLabel: 'Resultado',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="novo-jogo"
        options={{
          title: 'Novo Jogo',
          tabBarLabel: 'Novo Jogo',
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="meus-jogos"
        options={{
          title: 'Meus Jogos',
          tabBarLabel: 'Meus Jogos',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ciclo"
        options={{
          title: 'Ciclo 🔥',
          tabBarLabel: 'Ciclo',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analise"
        options={{
          title: 'Análise 📊',
          tabBarLabel: 'Análise',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Configurações ⚙️',
          tabBarLabel: 'Configurações',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

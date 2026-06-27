import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0d0d1a" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#12102a' },
          headerTintColor: '#c4b5fd',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0d0d1a' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'LotoCiclo 🎯' }} />
        <Stack.Screen name="resultado" options={{ title: 'Novo Resultado' }} />
        <Stack.Screen name="jogos" options={{ title: 'Montar Jogos' }} />
        <Stack.Screen name="analise" options={{ title: 'Análise' }} />
        <Stack.Screen name="ciclo" options={{ title: 'Ciclo Atual' }} />
      </Stack>
    </>
  );
}
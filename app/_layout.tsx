import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../src/database/migrations';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="lotociclo.db" onInit={migrateDbIfNeeded}>
      <StatusBar style="light" backgroundColor="#0d0d1a" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SQLiteProvider>
  );
}
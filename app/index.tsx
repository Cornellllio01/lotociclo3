import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

export default function Home() {
  const db = useSQLiteContext();

  useEffect(() => {
    // Redireciona imediatamente para as tabs
    router.replace('/(tabs)/resultado');
  }, []);

  return (
    <View style={s.container}>
      <ActivityIndicator color="#c4b5fd" size="large" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' },
});
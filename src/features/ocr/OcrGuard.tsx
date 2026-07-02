import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';

/**
 * Guard que detecta Expo Go e bloqueia features que requerem development build.
 * No Expo Go: exibe tela explicativa com instruções de build.
 * No development build: renderiza o filho normalmente.
 */
interface OcrGuardProps {
  children: React.ReactNode;
}

export function OcrGuard({ children }: OcrGuardProps) {
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo) {
    return <DevBuildRequired feature="Importação por Foto (OCR)" icon="📷" />;
  }

  return <>{children}</>;
}

// ─── Tela de "requer development build" ──────────────────────────────────────

export function DevBuildRequired({ feature, icon }: { feature: string; icon: string }) {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.icon}>{icon}</Text>
      <Text style={s.titulo}>{feature}</Text>
      <Text style={s.sub}>Requer Development Build</Text>

      <View style={s.card}>
        <Text style={s.cardTitulo}>⚠️ Por que esse aviso?</Text>
        <Text style={s.cardTxt}>
          Este recurso usa código nativo (ML Kit) que não está incluído no Expo Go.
          Para usá-lo, você precisa gerar um Development Build do app.
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitulo}>🚀 Como gerar o Development Build</Text>
        <Text style={s.codeTxt}>
          {'# 1. Instalar a lib nativa\nnpx expo install @infinitered/react-native-mlkit-text-recognition\n\n# 2. Gerar projeto nativo\nnpx expo prebuild\n\n# 3. Build via EAS (requer conta)\neas build --profile development\n\n# 4. Iniciar com dev client\nnpx expo start --dev-client'}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitulo}>📖 Documentação</Text>
        <Text style={s.cardTxt}>
          Veja <Text style={s.link}>docs/fase5-recursos.md</Text> no projeto para instruções detalhadas.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 24, alignItems: 'center', paddingTop: 60 },
  icon: { fontSize: 64, marginBottom: 16 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#E6EDF3', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 13, color: '#F97316', fontWeight: '600', marginBottom: 24 },
  card: {
    width: '100%', backgroundColor: '#161B22', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#30363D',
  },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: '#E6EDF3', marginBottom: 8 },
  cardTxt: { fontSize: 13, color: '#8B949E', lineHeight: 20 },
  codeTxt: {
    fontSize: 11, color: '#A78BFA', lineHeight: 18,
    fontFamily: 'monospace', backgroundColor: '#0D1117', padding: 10, borderRadius: 8,
  },
  link: { color: '#7C3AED', fontWeight: '600' },
});

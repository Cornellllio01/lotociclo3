# Fase 5 — Recursos Avançados: Dependências e Compatibilidade

## Visão Geral

Esta fase adiciona exportação PDF, compartilhamento, notificações locais, importação por foto (OCR) e entrada por voz ao LotoCiclo3.

---

## Mapa de Compatibilidade

| Feature | Módulo(s) | Expo Go | Dev Build | Observações |
|---------|-----------|---------|-----------|-------------|
| **5.1 Exportar PDF** | `expo-print` | ✅ | ✅ | `printToFileAsync` → URI temporário |
| **5.2 Compartilhar** | `expo-sharing` | ✅ | ✅ | `Sharing.shareAsync(uri)` |
| **5.2 WhatsApp** | `react-native/Linking` | ✅ | ✅ | Só texto via `whatsapp://` scheme |
| **5.3 Notificações** | `expo-notifications` | ✅ | ✅ | Apenas locais (sem push EAS) |
| **5.4 OCR** | `expo-camera` + `@infinitered/react-native-mlkit-text-recognition` | ❌ | ✅ | Requer `expo prebuild` |
| **5.5 Voz** | stub interno (sem lib nativa) | ✅ UI | ✅ UI | Lib real instável em RN 0.81 |

---

## Dependências Instaladas via `npx expo install`

```
expo-print          # Geração e impressão de PDF
expo-sharing        # Compartilhamento de arquivos
expo-notifications  # Notificações locais agendadas
expo-camera         # Câmera para captura de foto (OCR)
```

## Dependências NÃO instaladas (requerem build manual futuro)

```
@infinitered/react-native-mlkit-text-recognition@^5.0.0
  # Compatível com SDK 54, mas requer native build
  # Instalar APENAS após gerar development build:
  #   npx expo install @infinitered/react-native-mlkit-text-recognition
  #   npx expo prebuild
  #   eas build --profile development

@react-native-voice/voice
  # NÃO recomendado: instável em React Native 0.81 (usado pelo SDK 54)
  # Alternativas futuras: expo-speech-recognition (quando disponível para SDK 54)
  #   ou gravação + Whisper API
```

---

## Instruções de Development Build (5.4 OCR)

Quando estiver pronto para ativar o OCR:

```bash
# 1. Instalar lib nativa
npx expo install @infinitered/react-native-mlkit-text-recognition

# 2. Gerar projeto nativo
npx expo prebuild

# 3. Build de desenvolvimento (requer conta EAS)
eas build --profile development --platform android
# ou
eas build --profile development --platform ios

# 4. Instalar o development build no dispositivo e escanear o QR do Expo
npx expo start --dev-client
```

---

## Arquitetura de Guards

Para garantir que o app **nunca crasha no Expo Go** por causa de módulos nativos ausentes:

```
src/features/
  ocr/
    OcrGuard.tsx      ← Detecta Expo Go via Constants.appOwnership
    OcrScreen.tsx     ← Lazy import do ML Kit (try/catch)
  voice/
    VoiceGuard.tsx    ← Mesmo padrão
    VoiceInputScreen.tsx ← UI completa + hook stub
```

O Guard verifica:
```typescript
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';
```

Se `isExpoGo === true`, renderiza uma tela explicativa. Se `false`, renderiza o componente real.

---

## Notas de Permissões Necessárias

### Android (`app.json` → `android.permissions`)
- `CAMERA` — para OCR
- `RECEIVE_BOOT_COMPLETED` — para notificações persistirem após reboot
- `VIBRATE` — para notificações com vibração

### iOS (`app.json` → `ios.infoPlist`)
- `NSCameraUsageDescription` — para OCR
- `NSMicrophoneUsageDescription` — para voz (quando ativado)

> As permissões de notificação são solicitadas em runtime via `expo-notifications`.
> As permissões de câmera são solicitadas em runtime via `expo-camera`.
> Nenhuma configuração manual de `app.json` é necessária para as features que funcionam no Expo Go.

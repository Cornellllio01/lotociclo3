import React from 'react';
import Constants from 'expo-constants';
import { DevBuildRequired } from '../ocr/OcrGuard';

/**
 * Guard para Comandos de Voz — mesmo padrão do OcrGuard.
 * No Expo Go: exibe tela explicativa.
 * No development build: renderiza o filho.
 */
interface VoiceGuardProps {
  children: React.ReactNode;
}

export function VoiceGuard({ children }: VoiceGuardProps) {
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo) {
    return (
      <DevBuildRequired
        feature="Comandos de Voz"
        icon="🎤"
      />
    );
  }

  return <>{children}</>;
}

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import type { Jogo } from '../models';

// ─── Paleta de cores compartilhada ───────────────────────────────────────────
const COR = {
  bg: '#0D1117',
  surface: '#161B22',
  accent: '#7C3AED',
  verde: '#22C55E',
  azul: '#3B82F6',
  laranja: '#F97316',
  amarelo: '#EAB308',
  texto: '#E6EDF3',
  textoSec: '#8B949E',
};

// ─── HTML do volante de um jogo ───────────────────────────────────────────────

export function gerarHTMLVolante(jogo: Jogo): string {
  const linhasHTML = gerarGridDezenas(jogo);

  const grupos = [
    jogo.fixas?.length ? `📌 Fixas: ${jogo.fixas.map(d => String(d).padStart(2, '0')).join(' ')}` : null,
    `🔵 Sorteadas (grupo9): ${(jogo.grupo9 ?? []).map(d => String(d).padStart(2, '0')).join(' ')}`,
    `🟢 Não-sorteadas (grupo6): ${(jogo.grupo6 ?? []).map(d => String(d).padStart(2, '0')).join(' ')}`,
    jogo.teimosinha ? `🔁 Teimosinha: ${jogo.teimosinha}x` : null,
  ].filter(Boolean).join('<br/>');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .cartela { 
    background: white; border-radius: 12px; padding: 20px; max-width: 400px; margin: 0 auto;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .header { text-align: center; margin-bottom: 16px; }
  .header h1 { color: #7C3AED; font-size: 22px; margin: 0 0 4px; }
  .header p { color: #666; font-size: 12px; margin: 0; }
  .nome-jogo { font-size: 14px; font-weight: bold; color: #333; text-align: center; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 16px 0; }
  .dezena {
    width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: bold; color: white; margin: auto;
  }
  .dezena.fixa { background: #F97316; }
  .dezena.sorteada { background: #3B82F6; }
  .dezena.nao-sorteada { background: #22C55E; }
  .dezena.normal { background: #9CA3AF; }
  .grupos { font-size: 11px; color: #666; line-height: 1.8; border-top: 1px solid #eee; padding-top: 12px; margin-top: 4px; }
  .legenda { display: flex; gap: 12px; justify-content: center; margin: 8px 0; flex-wrap: wrap; }
  .leg-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #555; }
  .leg-dot { width: 12px; height: 12px; border-radius: 50%; }
  .rodape { text-align: center; color: #aaa; font-size: 9px; margin-top: 16px; }
</style>
</head>
<body>
<div class="cartela">
  <div class="header">
    <h1>🎯 LotoCiclo3</h1>
    <p>Sistema 6+9 — Lotofácil</p>
  </div>
  <div class="nome-jogo">${jogo.nome || `Jogo ${jogo.id.slice(0, 8)}`}</div>
  <div class="grid">${linhasHTML}</div>
  <div class="legenda">
    <div class="leg-item"><div class="leg-dot" style="background:#F97316"></div>Fixa</div>
    <div class="leg-item"><div class="leg-dot" style="background:#3B82F6"></div>Sorteada</div>
    <div class="leg-item"><div class="leg-dot" style="background:#22C55E"></div>Não-sorteada</div>
  </div>
  <div class="grupos">${grupos}</div>
  <div class="rodape">Gerado em ${new Date().toLocaleDateString('pt-BR')} — LotoCiclo3</div>
</div>
</body>
</html>`;
}

function gerarGridDezenas(jogo: Jogo): string {
  let html = '';
  for (let d = 1; d <= 25; d++) {
    const marcado = jogo.dezenas.includes(d);
    let classe = 'normal';
    if (marcado) {
      if ((jogo.fixas ?? []).includes(d)) classe = 'fixa';
      else if ((jogo.grupo9 ?? []).includes(d)) classe = 'sorteada';
      else if ((jogo.grupo6 ?? []).includes(d)) classe = 'nao-sorteada';
      else classe = 'sorteada';
    }
    const opacity = marcado ? '1' : '0.15';
    html += `<div class="dezena ${classe}" style="opacity:${opacity}">${String(d).padStart(2, '0')}</div>`;
  }
  return html;
}

// ─── HTML do relatório de estatísticas ───────────────────────────────────────

export function gerarHTMLRelatorio(dados: {
  totalConcursos: number;
  mediaPares: number;
  mediaImpares: number;
  mediaPrimos: number;
  mediaSoma: number;
  quentes: number[];
  frias: number[];
  totalJogadas: number;
  mediaAcertos: number;
  melhorAcerto: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .relatorio { background: white; border-radius: 12px; padding: 20px; max-width: 480px; margin: 0 auto; }
  h1 { color: #7C3AED; text-align: center; margin: 0 0 20px; }
  .secao { margin-bottom: 20px; }
  .secao h2 { color: #444; font-size: 14px; border-bottom: 2px solid #7C3AED33; padding-bottom: 4px; }
  .stat-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .stat-label { color: #666; font-size: 12px; }
  .stat-valor { font-weight: bold; color: #333; font-size: 12px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .chip { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
  .quente { background: #FEF3C7; color: #B45309; }
  .fria { background: #DBEAFE; color: #1D4ED8; }
  .rodape { text-align: center; color: #aaa; font-size: 9px; margin-top: 16px; }
</style>
</head>
<body>
<div class="relatorio">
  <h1>📊 Relatório LotoCiclo3</h1>
  
  <div class="secao">
    <h2>📈 Estatísticas Gerais</h2>
    <div class="stat-row"><span class="stat-label">Concursos analisados</span><span class="stat-valor">${dados.totalConcursos}</span></div>
    <div class="stat-row"><span class="stat-label">Média de pares por sorteio</span><span class="stat-valor">${dados.mediaPares.toFixed(1)}</span></div>
    <div class="stat-row"><span class="stat-label">Média de ímpares por sorteio</span><span class="stat-valor">${dados.mediaImpares.toFixed(1)}</span></div>
    <div class="stat-row"><span class="stat-label">Média de primos por sorteio</span><span class="stat-valor">${dados.mediaPrimos.toFixed(1)}</span></div>
    <div class="stat-row"><span class="stat-label">Soma média por sorteio</span><span class="stat-valor">${dados.mediaSoma.toFixed(1)}</span></div>
  </div>

  <div class="secao">
    <h2>🔥 Dezenas Quentes (top 5)</h2>
    <div class="chips">
      ${dados.quentes.map(d => `<span class="chip quente">${String(d).padStart(2, '0')}</span>`).join('')}
    </div>
  </div>

  <div class="secao">
    <h2>🧊 Dezenas Frias (bottom 5)</h2>
    <div class="chips">
      ${dados.frias.map(d => `<span class="chip fria">${String(d).padStart(2, '0')}</span>`).join('')}
    </div>
  </div>

  <div class="secao">
    <h2>🏆 Meu Desempenho</h2>
    <div class="stat-row"><span class="stat-label">Total de jogadas</span><span class="stat-valor">${dados.totalJogadas}</span></div>
    <div class="stat-row"><span class="stat-label">Média de acertos</span><span class="stat-valor">${dados.mediaAcertos.toFixed(1)}</span></div>
    <div class="stat-row"><span class="stat-label">Melhor resultado</span><span class="stat-valor">${dados.melhorAcerto} pontos</span></div>
  </div>

  <div class="rodape">Gerado em ${new Date().toLocaleDateString('pt-BR')} — LotoCiclo3</div>
</div>
</body>
</html>`;
}

// ─── Exportar PDF de um jogo ──────────────────────────────────────────────────

export async function exportarVolantePDF(jogo: Jogo): Promise<string> {
  const html = gerarHTMLVolante(jogo);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export async function exportarRelatorioPDF(dados: Parameters<typeof gerarHTMLRelatorio>[0]): Promise<string> {
  const html = gerarHTMLRelatorio(dados);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

// ─── Compartilhar arquivo ─────────────────────────────────────────────────────

export async function compartilharArquivo(uri: string, titulo: string = 'Compartilhar'): Promise<void> {
  const disponivel = await Sharing.isAvailableAsync();
  if (!disponivel) {
    throw new Error('Compartilhamento não disponível neste dispositivo');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: titulo,
    UTI: 'com.adobe.pdf',
  });
}

// ─── Compartilhar texto no WhatsApp ──────────────────────────────────────────

export async function compartilharWhatsApp(texto: string): Promise<void> {
  const encoded = encodeURIComponent(texto);
  const url = `whatsapp://send?text=${encoded}`;
  const suporte = await Linking.canOpenURL(url);
  if (!suporte) {
    throw new Error('WhatsApp não está instalado neste dispositivo');
  }
  await Linking.openURL(url);
}

export function jogoParaTexto(jogo: Jogo): string {
  const dezenas = jogo.dezenas.map(d => String(d).padStart(2, '0')).join(' ');
  const nome = jogo.nome || `Jogo ${jogo.id.slice(0, 8)}`;
  const data = jogo.criado_em?.split('T')[0] ?? '';
  return `🎯 *LotoCiclo3 — ${nome}*\n📅 ${data}\n\nDezenas: ${dezenas}\n\n🔵 ${(jogo.grupo9 ?? []).length} sorteadas | 🟢 ${(jogo.grupo6 ?? []).length} não-sorteadas${jogo.fixas?.length ? ` | 📌 ${jogo.fixas.length} fixas` : ''}`;
}

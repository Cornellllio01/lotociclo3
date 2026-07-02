import { Concurso } from '../models';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  ultimoConcurso, salvarConcurso, getCicloAtivo, resetarCiclo, atualizarCiclo, conferenciaAutomatica
} from '../database/db';

const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';

interface CaixaResponse {
  numero: number;
  dataApuracao: string;
  listaDezenas: string[];
  listaRateioPremio: Array<{
    faixa: number;
    numeroDeGanhadores: number;
    valorPremio: number;
  }>;
}

function mapCaixaToConcurso(data: CaixaResponse): Concurso {
  const premiacao: any = {};
  data.listaRateioPremio.forEach(rateio => {
    if (rateio.faixa === 1) premiacao.quinze = rateio.valorPremio;
    else if (rateio.faixa === 2) premiacao.catorze = rateio.valorPremio;
    else if (rateio.faixa === 3) premiacao.treze = rateio.valorPremio;
    else if (rateio.faixa === 4) premiacao.doze = rateio.valorPremio;
    else if (rateio.faixa === 5) premiacao.onze = rateio.valorPremio;
  });

  return {
    numero: data.numero,
    data: data.dataApuracao,
    dezenas: data.listaDezenas.map(d => parseInt(d, 10)).sort((a, b) => a - b),
    premiacao,
    criado_em: new Date().toISOString(),
  };
}

export async function buscarUltimo(): Promise<Concurso> {
  const response = await fetch(BASE);
  if (!response.ok) throw new Error('Falha ao buscar último concurso da Caixa');
  const data: CaixaResponse = await response.json();
  return mapCaixaToConcurso(data);
}

export async function buscarConcurso(numero: number): Promise<Concurso> {
  const response = await fetch(`${BASE}/${numero}`);
  if (!response.ok) throw new Error(`Falha ao buscar concurso ${numero} da Caixa`);
  const data: CaixaResponse = await response.json();
  return mapCaixaToConcurso(data);
}

export async function sincronizarResultados(db: SQLiteDatabase): Promise<void> {
  try {
    const ultimoLocal = await ultimoConcurso(db);
    const ultimoCaixa = await buscarUltimo();

    if (!ultimoLocal) {
      // Se não tem nenhum local, salva o último pelo menos. (No futuro pode ser otimizado para baixar vários)
      await salvarConcurso(db, ultimoCaixa);
      const ciclo = await getCicloAtivo(db);
      if (!ciclo) await resetarCiclo(db, ultimoCaixa.numero);
      await atualizarCiclo(db, ultimoCaixa.dezenas, ultimoCaixa.numero);
      await conferenciaAutomatica(db, ultimoCaixa.numero, ultimoCaixa.dezenas);
      return;
    }

    // Se houver concursos faltando entre o local e o da caixa
    let atual = ultimoLocal.numero + 1;
    while (atual <= ultimoCaixa.numero) {
      try {
        const conc = await buscarConcurso(atual);
        await salvarConcurso(db, conc);
        
        const ciclo = await getCicloAtivo(db);
        if (!ciclo) await resetarCiclo(db, conc.numero);
        await atualizarCiclo(db, conc.dezenas, conc.numero);
        await conferenciaAutomatica(db, conc.numero, conc.dezenas);
        
        atual++;
      } catch (err) {
        console.warn(`Erro ao sincronizar concurso ${atual}:`, err);
        break; // Interrompe em caso de erro para tentar novamente depois
      }
    }
  } catch (error) {
    console.error('Erro na sincronização de resultados:', error);
  }
}

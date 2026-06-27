export interface ResultadoCaixa {
  numero: number;
  data: string;
  dezenas: number[];
}

export async function buscarUltimoConcurso(): Promise<ResultadoCaixa> {
  const res = await fetch(
    'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/'
  );
  if (!res.ok) throw new Error('Erro ao buscar resultado da Caixa');
  const json = await res.json();
  return {
    numero: Number(json.numero),
    data: json.dataApuracao,
    dezenas: json.listaDezenas.map((d: string) => Number(d)),
  };
}

export async function buscarConcursoPorNumero(numero: number): Promise<ResultadoCaixa> {
  const res = await fetch(
    `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${numero}`
  );
  if (!res.ok) throw new Error(`Erro ao buscar concurso ${numero}`);
  const json = await res.json();
  return {
    numero: Number(json.numero),
    data: json.dataApuracao,
    dezenas: json.listaDezenas.map((d: string) => Number(d)),
  };
}

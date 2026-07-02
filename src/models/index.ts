export interface Premiacao {
  quinze?: number;
  catorze?: number;
  treze?: number;
  doze?: number;
  onze?: number;
}

export interface Concurso {
  numero: number;
  data: string;
  dezenas: number[];
  premiacao?: Premiacao;
  criado_em?: string;
}

export interface Jogo {
  id: string;
  bolao?: string;
  nome?: string;
  dezenas: number[];
  grupo6?: number[];
  grupo9?: number[];
  fixas?: number[];
  teimosinha?: number;
  criado_em?: string;
}

export interface JogoConcurso {
  jogo_id: string;
  concurso_numero: number;
  acertos: number;
  premiacao?: number;
}

export interface Ciclo {
  id: number;
  inicio: number;
  fim: number | null;
  contagem: Record<number, number>;
  fixas?: number[];
  criado_em?: string;
}

export interface Bolao {
  id: string;
  nome: string;
  criado_em?: string;
}

export interface Configuracoes {
  nome_usuario?: string;
  bolao_padrao?: string;
  notificacoes: boolean;
  sincronizacao_automatica: boolean;
  tema: 'escuro' | 'claro' | 'sistema';
}

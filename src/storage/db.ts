import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Concurso { numero: number; data: string; dezenas: number[]; }
export interface Ciclo { inicio: number; contagem: Record<number, number>; }

const KEYS = { CONCURSOS: '@lotociclo:concursos', CICLO: '@lotociclo:ciclo', FIXAS: '@lotociclo:fixas' };

export async function salvarConcurso(c: Concurso) {
    const todos = await listarConcursos();
    const idx = todos.findIndex(x => x.numero === c.numero);
    if (idx >= 0) todos[idx] = c; else todos.push(c);
    todos.sort((a, b) => a.numero - b.numero);
    await AsyncStorage.setItem(KEYS.CONCURSOS, JSON.stringify(todos));
}
export async function listarConcursos(): Promise<Concurso[]> {
    const raw = await AsyncStorage.getItem(KEYS.CONCURSOS);
    return raw ? JSON.parse(raw) : [];
}
export async function ultimoConcurso(): Promise<Concurso | null> {
    const todos = await listarConcursos();
    return todos.length > 0 ? todos[todos.length - 1] : null;
}
export async function salvarCiclo(ciclo: Ciclo) {
    await AsyncStorage.setItem(KEYS.CICLO, JSON.stringify(ciclo));
}
export async function getCiclo(): Promise<Ciclo | null> {
    const raw = await AsyncStorage.getItem(KEYS.CICLO);
    return raw ? JSON.parse(raw) : null;
}
export async function atualizarCiclo(dezenas: number[], numeroConcurso: number) {
    let ciclo = await getCiclo();
    if (!ciclo) ciclo = { inicio: numeroConcurso, contagem: {} };
    for (let d = 1; d <= 25; d++) if (!ciclo.contagem[d]) ciclo.contagem[d] = 0;
    dezenas.forEach(d => { ciclo!.contagem[d]++; });
    await salvarCiclo(ciclo);
    return ciclo;
}
export async function resetarCiclo(numeroConcurso: number) {
    const ciclo: Ciclo = { inicio: numeroConcurso, contagem: {} };
    for (let d = 1; d <= 25; d++) ciclo.contagem[d] = 0;
    await salvarCiclo(ciclo);
    return ciclo;
}
export async function salvarFixas(fixas: number[]) {
    await AsyncStorage.setItem(KEYS.FIXAS, JSON.stringify(fixas));
}
export async function getFixas(): Promise<number[]> {
    const raw = await AsyncStorage.getItem(KEYS.FIXAS);
    return raw ? JSON.parse(raw) : [];
}
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { listarConcursos, getCiclo, getFixas, ultimoConcurso, salvarConcurso, atualizarCiclo, resetarCiclo } from '../src/storage/db';
import { lideresCiclo } from '../src/utils/lotofacil';
import { buscarUltimoConcurso, buscarConcursoPorNumero } from '../src/utils/caixa';

export default function Home() {
    const [ultimo, setUltimo] = useState<any>(null);
    const [ciclo, setCiclo] = useState<any>(null);
    const [fixas, setFixas] = useState<number[]>([]);
    const [totalConcursos, setTotalConcursos] = useState(0);

    useEffect(() => { carregar(); }, []);

    async function carregar() {
        const u = await ultimoConcurso();
        const c = await getCiclo();
        const f = await getFixas();
        const todos = await listarConcursos();
        setUltimo(u); setCiclo(c); setFixas(f); setTotalConcursos(todos.length);
    }

    async function buscarDaCaixa() {
        try {
            const r = await buscarUltimoConcurso();
            const todos = await listarConcursos();
            const jaExiste = todos.find(c => c.numero === r.numero);
            if (jaExiste) {
                Alert.alert('Já cadastrado', `Concurso ${r.numero} já está na base!`);
                return;
            }
            await salvarConcurso({ numero: r.numero, data: r.data, dezenas: r.dezenas });
            const ciclo = await getCiclo();
            if (ciclo) await atualizarCiclo(r.dezenas, r.numero);
            Alert.alert('✅ Importado!', `Concurso ${r.numero} de ${r.data} salvo!`);
            carregar();
        } catch {
            Alert.alert('Erro', 'Não foi possível buscar da Caixa. Verifique sua conexão.');
        }
    }

    async function importarDe(de: number, ate: number) {
        let importados = 0;
        const todos = await listarConcursos();
        for (let n = de; n <= ate; n++) {
            if (todos.find(c => c.numero === n)) continue;
            try {
                const r = await buscarConcursoPorNumero(n);
                await salvarConcurso({ numero: r.numero, data: r.data, dezenas: r.dezenas });
                const ciclo = await getCiclo();
                if (n === de) {
                    await resetarCiclo(n);
                }
                await atualizarCiclo(r.dezenas, r.numero);
                importados++;
            } catch {}
        }
        Alert.alert('✅ Ciclo importado!', `${importados} concursos importados (${de}–${ate})`);
        carregar();
    }

    const lideres = ciclo ? lideresCiclo(ciclo.contagem, 4) : [];
    const concursosCiclo = ciclo && ultimo ? ultimo.numero - ciclo.inicio + 1 : 0;

    return (
        <ScrollView style={s.container} contentContainerStyle={s.content}>
            <View style={s.header}>
                <Text style={s.titulo}>🎯 LotoCiclo</Text>
                <Text style={s.sub}>Esquema 4 fixas + 5 dos 15 + 6 dos 10</Text>
            </View>

            <View style={s.card}>
                <Text style={s.cardLabel}>ÚLTIMO RESULTADO</Text>
                {ultimo ? (
                    <>
                        <Text style={s.concursoNum}>Concurso {ultimo.numero}</Text>
                        <Text style={s.dataText}>{ultimo.data}</Text>
                        <View style={s.bolasRow}>
                            {ultimo.dezenas.map((d: number) => (
                                <View key={d} style={s.bolaResultado}>
                                    <Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                ) : <Text style={s.emptyText}>Nenhum resultado cadastrado</Text>}
            </View>

            <View style={[s.card, s.cardCiclo]}>
                <Text style={s.cardLabel}>CICLO ATUAL</Text>
                {ciclo ? (
                    <>
                        <Text style={s.cicloProgress}>Concurso {concursosCiclo}/6 desde o {ciclo.inicio}</Text>
                        <View style={s.dots}>
                            {[1, 2, 3, 4, 5, 6].map(i => <View key={i} style={[s.dot, i <= concursosCiclo && s.dotAtivo]} />)}
                        </View>
                        <Text style={s.cicloLabel}>Líderes do ciclo:</Text>
                        <View style={s.bolasRow}>
                            {lideres.map(d => <View key={d} style={s.bolaLider}><Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text></View>)}
                        </View>
                    </>
                ) : <Text style={s.emptyText}>Nenhum ciclo iniciado</Text>}
            </View>

            {fixas.length > 0 && (
                <View style={[s.card, s.cardFixas]}>
                    <Text style={s.cardLabel}>🔒 FIXAS DEFINIDAS</Text>
                    <View style={s.bolasRow}>
                        {fixas.map(d => <View key={d} style={s.bolaFixa}><Text style={s.bolaText}>{String(d).padStart(2, '0')}</Text></View>)}
                    </View>
                </View>
            )}

            <View style={s.menu}>
                <TouchableOpacity style={s.btn} onPress={() => router.push('/resultado')}>
                    <Text style={s.btnIcon}>📥</Text><Text style={s.btnText}>Novo Resultado</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: '#0f766e' }]} onPress={buscarDaCaixa}>
                    <Text style={s.btnIcon}>🌐</Text>
                    <Text style={s.btnText}>Buscar da Caixa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: '#1e3a5f' }]} onPress={() => importarDe(3717, 3720)}>
                    <Text style={s.btnIcon}>📦</Text>
                    <Text style={s.btnText}>Importar Ciclo Atual</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnBlue]} onPress={() => router.push('/jogos')}>
                    <Text style={s.btnIcon}>🎲</Text><Text style={s.btnText}>Montar Jogos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnGold]} onPress={() => router.push('/ciclo')}>
                    <Text style={s.btnIcon}>🔥</Text><Text style={s.btnText}>Ver Ciclo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnGray]} onPress={() => router.push('/analise')}>
                    <Text style={s.btnIcon}>📊</Text><Text style={s.btnText}>Análise</Text>
                </TouchableOpacity>
            </View>
            <Text style={s.footer}>{totalConcursos} concursos registrados</Text>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d0d1a' },
    content: { padding: 16, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 20, paddingTop: 10 },
    titulo: { fontSize: 28, fontWeight: 'bold', color: '#c4b5fd', letterSpacing: 1 },
    sub: { fontSize: 11, color: '#6b6a8a', marginTop: 4 },
    card: { backgroundColor: '#12102a', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2a2060' },
    cardCiclo: { borderColor: '#fbbf24' },
    cardFixas: { borderColor: '#4ade80' },
    cardLabel: { fontSize: 10, letterSpacing: 2, color: '#6b6a8a', marginBottom: 10, textTransform: 'uppercase' },
    concursoNum: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
    dataText: { fontSize: 11, color: '#6b6a8a', marginBottom: 10 },
    emptyText: { color: '#4a4a6a', fontSize: 12, textAlign: 'center', padding: 10 },
    bolasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
    bolaResultado: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    bolaLider: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#b45309', alignItems: 'center', justifyContent: 'center' },
    bolaFixa: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
    bolaText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    cicloProgress: { fontSize: 12, color: '#fbbf24', marginBottom: 8 },
    dots: { flexDirection: 'row', gap: 6, marginBottom: 12, justifyContent: 'center' },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2a2060', borderWidth: 1, borderColor: '#3a3060' },
    dotAtivo: { backgroundColor: '#fbbf24' },
    cicloLabel: { fontSize: 10, color: '#6b6a8a', marginBottom: 8 },
    menu: { gap: 10, marginTop: 4 },
    btn: { backgroundColor: '#4c1d95', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    btnBlue: { backgroundColor: '#1e3a8a' },
    btnGold: { backgroundColor: '#92400e' },
    btnGray: { backgroundColor: '#1f2937' },
    btnIcon: { fontSize: 20 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    footer: { textAlign: 'center', color: '#374151', fontSize: 10, marginTop: 20 },
});
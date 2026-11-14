import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { cancelarSolicitacao, listarPorCliente, listarPorTecnico } from '../database';
import { sincronizar } from '../sync';

const STATUS_COLORS = {
    Pendente: { bg: '#fef3c7', text: '#92400e' },
    Aceita: { bg: '#dbeafe', text: '#1e40af' },
    'Concluída': { bg: '#dcfce7', text: '#166534' },
    Cancelada: { bg: '#fee2e2', text: '#991b1b' }
};

const FILTROS = [
    { chave: 'todos', rotulo: 'Todos', status: null },
    { chave: 'pendente', rotulo: 'Pendentes', status: 'Pendente' },
    { chave: 'aceita', rotulo: 'Aceitos', status: 'Aceita' },
    { chave: 'concluida', rotulo: 'Concluídos', status: 'Concluída' },
    { chave: 'cancelada', rotulo: 'Cancelados', status: 'Cancelada' }
];

const normalizar = (t) =>
    (t || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Historico({ navigation, user }) {
    const tecnico = user.modo === 'tecnico';
    const [lista, setLista] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');

    const load = useCallback(async () => {
        setLista(tecnico ? await listarPorTecnico(user.id) : await listarPorCliente(user.id));
    }, [tecnico, user.id]);

    useFocusEffect(useCallback(() => {
        load();
        sincronizar().then((ok) => ok && load());
    }, [load]));

    const filtrosVisiveis = tecnico ? FILTROS.filter((f) => f.chave !== 'pendente') : FILTROS;

    const visiveis = useMemo(() => {
        const status = FILTROS.find((f) => f.chave === filtro)?.status;
        const termo = normalizar(busca.trim());
        return lista.filter((s) => {
            if (status && s.status !== status) return false;
            if (!termo) return true;
            return [s.descricao, s.endereco, s.clienteNome, s.tecnicoNome]
                .some((campo) => normalizar(campo).includes(termo));
        });
    }, [lista, filtro, busca]);

    function cancelar(item) {
        Alert.alert(
            'Cancelar solicitação',
            item.status === 'Aceita'
                ? 'Um técnico já aceitou este serviço. Deseja cancelar mesmo assim?'
                : 'Deseja cancelar esta solicitação?',
            [
                { text: 'Voltar' },
                {
                    text: 'Cancelar solicitação',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelarSolicitacao(item.id);
                        await load();
                        sincronizar().then((ok) => ok && load());
                    }
                }
            ]
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{tecnico ? 'Serviços realizados' : 'Meu histórico'}</Text>
                <Text style={styles.sub}>
                    {visiveis.length === lista.length
                        ? `${lista.length} no total`
                        : `${visiveis.length} de ${lista.length}`}
                </Text>

                <TextInput
                    style={styles.busca}
                    placeholder="Buscar por descrição, endereço ou nome"
                    placeholderTextColor="#94a3b8"
                    value={busca}
                    onChangeText={setBusca}
                    returnKeyType="search"
                />

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.chips}
                >
                    {filtrosVisiveis.map((f) => {
                        const ativo = filtro === f.chave;
                        return (
                            <TouchableOpacity
                                key={f.chave}
                                style={[styles.chip, ativo && styles.chipAtivo]}
                                onPress={() => setFiltro(f.chave)}
                            >
                                <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{f.rotulo}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <FlatList
                data={visiveis}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            setRefreshing(true);
                            await sincronizar();
                            await load();
                            setRefreshing(false);
                        }}
                    />
                }
                ListEmptyComponent={
                    <Text style={styles.empty}>
                        {lista.length > 0
                            ? 'Nenhum resultado para essa busca ou filtro.'
                            : tecnico
                                ? 'Você ainda não atendeu nenhum serviço.'
                                : 'Você ainda não fez nenhuma solicitação.'}
                    </Text>
                }
                renderItem={({ item }) => {
                    const cor = STATUS_COLORS[item.status] || STATUS_COLORS.Pendente;
                    const Card = tecnico ? TouchableOpacity : View;
                    const podeCancelar = !tecnico && (item.status === 'Pendente' || item.status === 'Aceita');
                    return (
                        <Card
                            style={styles.card}
                            {...(tecnico ? {
                                onPress: () => navigation.navigate('DetalheSolicitacao', { solicitacaoId: item.id })
                            } : {})}
                        >
                            <View style={styles.cardTop}>
                                <Text numberOfLines={1} style={styles.cardTitle}>
                                    {tecnico ? item.clienteNome : item.descricao}
                                </Text>
                                <Text style={[styles.badge, { backgroundColor: cor.bg, color: cor.text }]}>
                                    {item.status}
                                </Text>
                            </View>
                            {tecnico && <Text numberOfLines={2} style={styles.cardInfo}>{item.descricao}</Text>}
                            {!!item.endereco && (
                                <Text numberOfLines={1} style={styles.cardInfo}>📍 {item.endereco}</Text>
                            )}
                            {!tecnico && !!item.tecnicoNome && (
                                <Text style={styles.cardInfo}>🔧 Técnico: {item.tecnicoNome}</Text>
                            )}
                            <Text style={styles.cardMeta}>
                                {new Date(item.createdAt).toLocaleString('pt-BR')}
                            </Text>
                            {!tecnico && item.status === 'Concluída' && item.fotoConclusao && (
                                <Image source={{ uri: item.fotoConclusao.uri }} style={styles.cardPhoto} />
                            )}
                            {podeCancelar && (
                                <TouchableOpacity style={styles.cancelar} onPress={() => cancelar(item)}>
                                    <Text style={styles.cancelarTexto}>Cancelar solicitação</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, paddingTop: 45, paddingBottom: 10 },
    title: { fontSize: 25, fontWeight: '800', color: '#0f172a' },
    sub: { color: '#64748b', marginTop: 3 },
    busca: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        height: 46,
        paddingHorizontal: 14,
        marginTop: 14,
        color: '#0f172a'
    },
    chips: { gap: 8, paddingTop: 12, paddingRight: 20 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 99,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef'
    },
    chipAtivo: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipTexto: { color: '#475569', fontWeight: '700', fontSize: 13 },
    chipTextoAtivo: { color: '#fff' },
    list: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 6 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, fontSize: 12, fontWeight: '700' },
    cardInfo: { color: '#64748b', marginTop: 6 },
    cardMeta: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
    cardPhoto: { width: '100%', height: 140, borderRadius: 10, marginTop: 10 },
    cancelar: {
        marginTop: 12,
        height: 42,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelarTexto: { color: '#dc2626', fontWeight: '800' },
    empty: { color: '#64748b', textAlign: 'center', marginTop: 50 }
});

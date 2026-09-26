import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOLICITACOES_KEY = '@techservice:solicitacoes';

const STATUS_COLORS = {
    Pendente: { bg: '#fef3c7', text: '#92400e' },
    'Concluída': { bg: '#dcfce7', text: '#166534' }
};

export default function Solicitacoes({ navigation }) {
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const all = JSON.parse(await AsyncStorage.getItem(SOLICITACOES_KEY) || '[]');
        setSolicitacoes(all.sort((a, b) => b.createdAt - a.createdAt));
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Solicitações</Text>
                <Text style={styles.sub}>{solicitacoes.length} no total</Text>
            </View>
            <FlatList
                data={solicitacoes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            setRefreshing(true);
                            await load();
                            setRefreshing(false);
                        }}
                    />
                }
                ListEmptyComponent={<Text style={styles.empty}>Nenhuma solicitação registrada ainda.</Text>}
                renderItem={({ item }) => {
                    const cor = STATUS_COLORS[item.status] || STATUS_COLORS.Pendente;
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => navigation.navigate('DetalheSolicitacao', { solicitacaoId: item.id })}
                        >
                            <View style={styles.cardTop}>
                                <Text style={styles.cardTitle}>{item.clienteNome}</Text>
                                <Text style={[styles.badge, { backgroundColor: cor.bg, color: cor.text }]}>
                                    {item.status}
                                </Text>
                            </View>
                            <Text numberOfLines={2} style={styles.cardInfo}>{item.descricao}</Text>
                            <Text style={styles.cardMeta}>
                                {new Date(item.createdAt).toLocaleString('pt-BR')}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, paddingTop: 45 },
    title: { fontSize: 25, fontWeight: '800', color: '#0f172a' },
    sub: { color: '#64748b', marginTop: 3 },
    list: { paddingHorizontal: 20, paddingBottom: 30 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, fontSize: 12, fontWeight: '700' },
    cardInfo: { color: '#64748b', marginTop: 6 },
    cardMeta: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
    empty: { color: '#64748b', textAlign: 'center', marginTop: 50 }
});
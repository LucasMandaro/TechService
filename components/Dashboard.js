import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage';

export default function Dashboard({ navigation, user, onLogout }) {
    const [visits, setVisits] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const load = useCallback(
        async () => {
            const all = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.VISITS) || '[]');
            setVisits(all.filter((v) => v.userId === user.id).sort((a, b) => b.createdAt - a.createdAt));
        }, [user.id]
    );

    useFocusEffect(useCallback(() => { load(); }, [load]));
    async function sair() {
        Alert.alert('Sair', 'Deseja encerrar a sessão?',
            [{ text: 'Cancelar' },
            { text: 'Sair', style: 'destructive', onPress: onLogout }
            ]
        );
    }
    return <View style={styles.container}>
        <View style={styles.header}>
            <View>
                <Text style={styles.hello}>
                    Olá, {user.nome.split('')[0]}
                </Text>
                <Text style={styles.sub}>
                    Suas visitas técnicas
                </Text>
            </View>
            <TouchableOpacity onPress={sair}>
                <Text style={styles.logout}>
                    Sair
                </Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('NovaVisita')}>
            <Text style={styles.plus}>+</Text>
            <View>
                <Text style={styles.newTitle}>
                    Nova visita técnica
                </Text>
                <Text style={styles.newSub}>
                    Registrar cliente, localização e evidências
                </Text>
            </View>
        </TouchableOpacity>
        <Text style={styles.section}>
            Visitas registradas ({visits.length})
        </Text>
        <FlatList data={visits} keyExtractor={(item) => item.id} refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
            }
            } />
        }
            ListFooterComponent={<Text style={styles.empty}>Nenhuma visita registrada ainda. </Text>}
            renderItem={
                ({ item }) =>
                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('NovaVisita', { visitId: item.id })}>
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitle}>
                                {item.cliente}
                            </Text>
                            <Text style={styles.badge}>
                                {item.status}
                            </Text>
                        </View>
                        <Text style={styles.cardInfo}>
                            {item.endereco || 'Localização registrada no mapa'}
                        </Text>
                        <Text style={styles.cardInfo}>
                            {new Date(item.createdAt).toLocaleString('pt-BR')} . {item.fotos?.length || 0} foto(s)
                        </Text>
                    </TouchableOpacity>
            }
        />
    </View>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 35,
        marginBottom: 22
    },
    hello: {
        fontSize: 25,
        fontWeight: '800',
        color: '#0f172a'
    },
    sub: {
        color: '#64748b',
        marginTop: 3
    },
    logout: {
        color: '#dc2626',
        fontWeight: '700'
    },
    newButton: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25
    },
    plus: {
        color: '#fff',
        fontSize: 35,
        marginRight: 13
    },
    newTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800'
    },
    newSub: {
        color: '#dbeafe',
        marginTop: 3
    },
    section: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 10
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        flex: 1
    },
    badge: {
        backgroundColor: '#dcfce7',
        color: '#166534',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 99,
        fontSize: 12,
        fontWeight: '700'
    },
    cardInfo: {
        color: '#64748b',
        marginTop: 6
    },
    empty: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 50
    }
});

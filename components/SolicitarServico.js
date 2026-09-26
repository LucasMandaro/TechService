import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image,RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';


const SOLICITACOES_KEY = '@techservice:solicitacoes';
const LAST_PHOTO_KEY = '@techservice:last_photo';

const STATUS_COLORS = {
    Pendente: {
        bg: '#fef3c7',
        text: '#92400e'
    },
    'Concluída': {
        bg: '#dcfce7',
        text: '#166534'
    }
}

export default function SolicitarServico({ navigation, user }) {
    const [descricao, setDescricao] = useState('');
    const [location, setLocation] = useState(null);
    const [foto, setFoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [buscandoLocal, setBuscandoLocal] = useState(false);
    const [expandido, setExpandido] = useState(true);
    const [historico, setHistorico] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        capturarLocalizacao();
    }, []);

    const carregarHistorico = useCallback(async () => {
        const all = JSON.parse(await AsyncStorage.getItem(SOLICITACOES_KEY) || '[]');
        setHistorico(
            all.filter((s) => s.clienteId === user.id).sort((a, b) => b.createdAt - a.createdAt)
        );
    }, [user.id]);

    useFocusEffect(useCallback(() => { carregarHistorico(); }, [carregarHistorico]));

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            const result = await AsyncStorage.getItem(LAST_PHOTO_KEY);
            if (result) {
                const photo = JSON.parse(result);
                if (photo.owner === user.id && photo.uri && photo.visitDrat === 'solicitacao') {
                    setFoto(photo);
                    await AsyncStorage.removeItem(LAST_PHOTO_KEY);
                }
            }
        });
        return unsubscribe;
    }, [navigation, user.id]);

    async function capturarLocalizacao() {
        setBuscandoLocal(true);
        try {
            const p = await Location.requestForegroundPermissionsAsync();
            if (p.status !== 'granted') {
                Alert.alert('Localização', 'Permita a localização para registrar onde o serviço será realizado.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(pos.coords);
        } catch {
            Alert.alert('Localização', 'Não foi possível obter sua posição.');
        } finally {
            setBuscandoLocal(false);
        }
    }

    function tirarFoto() {
        navigation.navigate('Camera', {
            photoType: 'Aparelho',
            userId: user.id,
            visitDrat: 'solicitacao'
        });
    }

    function moverMarcador(coordinate) {
        setLocation(coordinate);
    }

    async function enviarSolicitacao() {
        if (!descricao.trim())
            return Alert.alert('Atenção', 'Descreva o serviço que você precisa.');
        if (!location)
            return Alert.alert('Atenção', 'Aguarde a localização ser capturada, ou toque no mapa para marcar o local.');

        setLoading(true);
        try {
            const all = JSON.parse(await AsyncStorage.getItem(SOLICITACOES_KEY) || '[]');
            const nova = {
                id: `${Date.now()}`,
                clienteId: user.id,
                clienteNome: user.nome,
                descricao: descricao.trim(),
                location,
                foto,
                status: 'Pendente',
                fotoConclusao: null,
                createdAt: Date.now(),
                concludedAt: null
            };
            await AsyncStorage.setItem(SOLICITACOES_KEY, JSON.stringify([...all, nova]));
            setDescricao('');
            setFoto(null);
            setExpandido(false);
            await carregarHistorico();
            Alert.alert('Solicitação enviada', 'Um técnico vai atender seu chamado em breve.');
        } finally {
            setLoading(false);
        }
    }

    const formulario = (
        <View>
            <Text style={styles.title}>Solicitar serviço técnico</Text>
            <Text style={styles.sub}>Olá, {user.nome?.split(' ')[0]}</Text>

            <TouchableOpacity style={styles.toggle} onPress={() => setExpandido((v) => !v)}>
                <Text style={styles.toggleText}>
                    {expandido ? '▲  Recolher formulário' : '▼  Nova solicitação'}
                </Text>
            </TouchableOpacity>

            {expandido && (
                <View style={styles.form}>
                    <Text style={styles.label}>Descrição do problema *</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="Descreva o que precisa ser consertado ou instalado..."
                        multiline
                        value={descricao}
                        onChangeText={setDescricao}
                    />

                    <View style={styles.locationCard}>
                        <Text style={styles.locationTitle}>📍 Local do atendimento</Text>
                        {location ? (
                            <>
                                <Text style={styles.locationText}>
                                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </Text>
                                <MapView
                                    style={styles.map}
                                    region={{
                                        latitude: location.latitude,
                                        longitude: location.longitude,
                                        latitudeDelta: 0.004,
                                        longitudeDelta: 0.004
                                    }}
                                    onPress={(e) => moverMarcador(e.nativeEvent.coordinate)}
                                >
                                    <Marker
                                        coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                                        draggable
                                        onDragEnd={(e) => moverMarcador(e.nativeEvent.coordinate)}
                                        title="Local do atendimento"
                                    />
                                </MapView>
                                <Text style={styles.hint}>Toque no mapa ou arraste o marcador para ajustar</Text>
                            </>
                        ) : (
                            <Text style={styles.locationText}>
                                {buscandoLocal ? 'Buscando localização...' : 'Localização não capturada'}
                            </Text>
                        )}
                        <TouchableOpacity onPress={capturarLocalizacao}>
                            <Text style={styles.action}>Usar minha localização atual</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.cameraButton} onPress={tirarFoto}>
                        <Text style={styles.cameraButtonText}>
                            {foto ? '📷 Trocar foto do aparelho' : '📷 Foto do aparelho'}
                        </Text>
                    </TouchableOpacity>

                    {foto && (
                        <View style={styles.photoCard}>
                            <Image source={{ uri: foto.uri }} style={styles.photo} />
                        </View>
                    )}

                    <TouchableOpacity style={styles.saveButton} onPress={enviarSolicitacao} disabled={loading}>
                        <Text style={styles.saveText}>{loading ? 'Enviando...' : 'Enviar solicitação'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.section}>Meu histórico ({historico.length})</Text>
        </View>
    )

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.content}
            data={historico}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={formulario}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={async () => {
                        setRefreshing(true);
                        await carregarHistorico();
                        setRefreshing(false);
                    }}
                />
            }
            ListEmptyComponent={<Text style={styles.empty}>Você ainda não fez nenhuma solicitação.</Text>}
            renderItem={({ item }) => {
                const cor = STATUS_COLORS[item.status] || STATUS_COLORS.Pendente;
                return (
                    <View style={styles.historicoCard}>
                        <View style={styles.cardTop}>
                            <Text numberOfLines={1} style={styles.cardTitle}>{item.descricao}</Text>
                            <Text style={[styles.badge, { backgroundColor: cor.bg, color: cor.text }]}>
                                {item.status}
                            </Text>
                        </View>
                        <Text style={styles.cardMeta}>
                            {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </Text>
                        {item.status === 'Concluída' && item.fotoConclusao && (
                            <Image source={{ uri: item.fotoConclusao.uri }} style={styles.cardPhoto} />
                        )}
                    </View>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        backgroundColor: '#f8fafc' 
    },
    content: { 
        padding: 20, 
        paddingTop: 45, 
        paddingBottom: 45 
    },
    title: { 
        fontSize: 25, 
        fontWeight: '800', 
        color: '#0f172a' 
    },
    sub: { 
        color: '#64748b', 
        marginTop: 3, 
        marginBottom: 15 
    },
    toggle: {
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 8
    },
    toggleText: { 
        color: '#3730a3', 
        fontWeight: '700' },
    form: { 
        marginTop: 4 
    },
    label: { 
        color: '#334155', 
        fontWeight: '700', 
        marginBottom: 7, 
        marginTop: 12 
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        minHeight: 50,
        paddingHorizontal: 14
    },
    textarea: { 
        minHeight: 110, 
        paddingTop: 14, 
        textAlignVertical: 'top' 
    },
    locationCard: { 
        backgroundColor: '#eff6ff', 
        borderRadius: 14, 
        padding: 15, 
        marginTop: 16 
    },
    locationTitle: { 
        fontWeight: '800', 
        color: '#1e3a8a' 
    },
    locationText: { 
        color: '#475569', 
        marginTop: 6 
    },
    map: { 
        width: '100%', 
        height: 180, 
        borderRadius: 12, 
        marginTop: 10 
    },
    hint: { 
        color: '#94a3b8', 
        fontSize: 12, 
        marginTop: 6 
    },
    action: { 
        color: '#2563eb', 
        fontWeight: '700', 
        marginTop: 8 
    },
    cameraButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20
    },
    cameraButtonText: { 
        color: '#fff', 
        fontWeight: '800' 
    },
    photoCard: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    photo: { 
        width: '100%', 
        height: 200 
    },
    saveButton: {
        height: 54,
        borderRadius: 13,
        backgroundColor: '#16a34a',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25
    },
    saveText: { 
        color: '#fff', 
        fontWeight: '800', 
        fontSize: 16 
    },
    section: { 
        fontSize: 18, 
        fontWeight: '800', 
        color: '#0f172a', 
        marginTop: 28, 
        marginBottom: 10 
    },
    historicoCard: {
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
        fontSize: 15, 
        fontWeight: '700', 
        color: '#0f172a', 
        flex: 1, 
        marginRight: 8 
    },
    badge: { 
        paddingHorizontal: 9, 
        paddingVertical: 4, 
        borderRadius: 99, 
        fontSize: 12, 
        fontWeight: '700' 
    },
    cardMeta: { 
        color: '#94a3b8', 
        marginTop: 6, 
        fontSize: 12 
    },
    cardPhoto: { 
        width: '100%', 
        height: 140, 
        borderRadius: 10, 
        marginTop: 10 
    },
    empty: { 
        color: '#64748b', 
        textAlign: 'center', 
        marginTop: 10, 
        marginBottom: 20 
    }
});

import React, { useCallback, useState } from 'react';
import { Alert, DeviceEventEmitter, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buscarPorId, concluirSolicitacao } from '../database';
import { sincronizar } from '../sync';

const LAST_PHOTO_KEY = '@techservice:last_photo';

export default function DetalheSolicitacao({ navigation, route, user }) {
    const { solicitacaoId } = route.params;
    const [solicitacao, setSolicitacao] = useState(null);
    const [fotoPreparada, setFotoPreparada] = useState(null);
    const [concluindo, setConcluindo] = useState(false);

    const load = useCallback(async () => {
        setSolicitacao(await buscarPorId(solicitacaoId));
    }, [solicitacaoId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    useFocusEffect(
        useCallback(() => {
            (async () => {
                try{

                const result = await AsyncStorage.getItem(LAST_PHOTO_KEY);
                if (!result){
                    return
                }
                const photo = JSON.parse(result);

                if (
                    photo.owner === user.id &&
                    photo.uri &&
                    photo.solicitacaoId === solicitacaoId
                ) {
                    setFotoPreparada({ uri: photo.uri });
                    await AsyncStorage.removeItem(LAST_PHOTO_KEY);
                    }
                }catch (error){
                    console.log('erro ao processar foto de conclusão:', error);
                }
            })()
        }, [user.id, solicitacaoId])
    );

    function tirarFotoConclusao() {
        navigation.navigate('Camera', {
            photoType: 'Conclusão',
            userId: user.id,
            solicitacaoId: solicitacaoId
        });
    }

    async function concluir() {
        if (!fotoPreparada || concluindo) return;
        setConcluindo(true);
        try {
            await concluirSolicitacao(solicitacaoId, fotoPreparada);
            setFotoPreparada(null);
            sincronizar();
            await load();
            DeviceEventEmitter.emit('solicitacao-atualizada');
            Alert.alert('Atendimento concluído', 'A solicitação foi marcada como concluída.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ], { cancelable: false });
        } finally {
            setConcluindo(false);
        }
    }

    if (!solicitacao) {
        return (
            <View style={styles.container}>
                <Text style={styles.empty}>Solicitação não encontrada.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.back}>‹ Voltar</Text>
            </TouchableOpacity>

            <View style={styles.headerRow}>
                <Text style={styles.title}>{solicitacao.clienteNome}</Text>
                <Text style={styles.badge}>{solicitacao.status}</Text>
            </View>
            <Text style={styles.meta}>
                Solicitado em {new Date(solicitacao.createdAt).toLocaleString('pt-BR')}
            </Text>

            <Text style={styles.sectionLabel}>Descrição do serviço</Text>
            <Text style={styles.descricao}>{solicitacao.descricao}</Text>

            {!!solicitacao.endereco && (
                <>
                    <Text style={styles.sectionLabel}>Endereço</Text>
                    <Text style={styles.descricao}>📍 {solicitacao.endereco}</Text>
                </>
            )}

            {solicitacao.foto && (
                <>
                    <Text style={styles.sectionLabel}>Foto do aparelho (enviada pelo cliente)</Text>
                    <Image source={{ uri: solicitacao.foto.uri }} style={styles.photo} />
                </>
            )}

            {solicitacao.location && (
                <>
                    <Text style={styles.sectionLabel}>Local do atendimento</Text>
                    <MapView
                        style={styles.map}
                        region={{
                            latitude: solicitacao.location.latitude,
                            longitude: solicitacao.location.longitude,
                            latitudeDelta: 0.004,
                            longitudeDelta: 0.004
                        }}
                    >
                        <Marker
                            coordinate={{
                                latitude: solicitacao.location.latitude,
                                longitude: solicitacao.location.longitude
                            }}
                        />
                    </MapView>
                </>
            )}

            {solicitacao.fotoConclusao && (
                <>
                    <Text style={styles.sectionLabel}>Foto de conclusão</Text>
                    <Image source={{ uri: solicitacao.fotoConclusao.uri }} style={styles.photo} />
                </>
            )}

            {solicitacao.status === 'Aceita' && solicitacao.tecnicoId === user.id && (
                <>
                    {fotoPreparada ? (
                        <>
                            <Text style={styles.sectionLabel}>Foto de conclusão (prévia)</Text>
                            <Image source={{ uri: fotoPreparada.uri }} style={styles.photo} />
                            <TouchableOpacity style={styles.trocarButton} onPress={tirarFotoConclusao} disabled={concluindo}>
                                <Text style={styles.trocarText}>Trocar foto</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.concluirButton} onPress={concluir} disabled={concluindo}>
                                <Text style={styles.concluirText}>{concluindo ? 'Concluindo...' : 'Concluir atendimento'}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.concluirButton} onPress={tirarFotoConclusao}>
                            <Text style={styles.concluirText}>Tirar foto para concluir</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingTop: 45, paddingBottom: 45 },
    back: { color: '#2563eb', fontWeight: '700', marginBottom: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
    badge: {
        backgroundColor: '#dcfce7',
        color: '#166534',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        fontSize: 12,
        fontWeight: '700'
    },
    meta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    sectionLabel: { fontWeight: '800', color: '#334155', marginTop: 20, marginBottom: 8 },
    descricao: { color: '#0f172a', lineHeight: 20 },
    photo: { width: '100%', height: 200, borderRadius: 12 },
    map: { width: '100%', height: 180, borderRadius: 12 },
    concluirButton: {
        height: 54,
        borderRadius: 13,
        backgroundColor: '#16a34a',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30
    },
    trocarButton: {
        height: 50,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14
    },
    trocarText: { color: '#2563eb', fontWeight: '800', fontSize: 16 },
    concluirText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    empty: { color: '#64748b', textAlign: 'center', marginTop: 50 }
});
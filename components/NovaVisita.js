import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage';

const PHOTO_TYPES = ['Fachada', 'Equipamento', 'Antes', 'Depois', 'Documento'];

export default function NovaVisita({ navigation, route, user }) {
    const [visitId, setVisitId] = useState(route.params?.visitId || null);
    const [cliente, setCliente] = useState('');
    const [endereco, setEndereco] = useState('');
    const [descricao, setDescricao] = useState('');
    const [location, setLocation] = useState(null);
    const [fotos, setFotos] = useState([]);
    const [tipoFoto, setTipoFoto] = useState('Fachada');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const all = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.VISITS) || '[]');
            const existing = all.find((v) => v.id === route.params?.visitId);
            if (existing) {
                setVisitId(existing.id);
                setCliente(existing.cliente);
                setEndereco(existing.endereco || '');
                setDescricao(existing.descricao || '');
                setLocation(existing.location || null);
                setFotos(existing.fotos || []);
            } else {
                capturarLocalizacao();
            }
        })();
    }, []);

    async function capturarLocalizacao() {
        try {
            const p = await Location.requestForegroundPermissionsAsync();
            if (p.status !== 'granted')
                return Alert.alert('Localização', 'Permita a localização para registrar o ponto da visita.');
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(pos.coords);
        } catch {
            Alert.alert(
                'Localização', 'Não foi possível obter sua posição.'
            );
        }
    }

    function adicionarFoto() {
        navigation.navigate('Camera', {
            photoType: tipoFoto,
            userId: user.id,
            visitDrat: visitId || 'new'
        });
    }

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            const result = await AsyncStorage.getItem('@techservice:last_photo');
            if (result) {
                const photo = JSON.parse(result);
                if (photo.owner === user.id && photo.uri && photo.visitDrat === (visitId || 'new')) {
                    setFotos((old) => [...old, photo]);
                    await AsyncStorage.removeItem('@techservice:last_photo');
                }
            }
        });

        return unsubscribe;
    }, [navigation, user.id, visitId]);

    async function salvar() {
        if (!cliente.trim())
            return Alert.alert('Atenção', 'Informe o cliente.');
        setLoading(true);
        try {
            const all = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.VISITS) || '[]');
            const id = visitId || `${Date.now()}`;
            const record = {
                id,
                userId: user.id,
                cliente: cliente.trim(),
                endereco: endereco.trim(),
                descricao: descricao.trim(),
                location,
                fotos,
                status: 'Concluída',
                createdAt: Date.now()
            };
            const next = all.some((v) => v.id === id) ? all.map((v) => v.id === id ? record : v) : [...all, record];
            await AsyncStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(next));
            setVisitId(id);
            Alert.alert('Visita salva', 'Os dados e as fotos foram vinculados à visita.', [{
                text: 'OK',
                onPress: () => navigation.goBack()
            }]);
        } finally {
            setLoading(false);
        }
    }

    return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.Back}>‹ Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{visitId ? 'Editar visita' : 'Nova visita'}</Text>
        </View>

        <Text style={styles.label}>Cliente *</Text>
        <TextInput style={style.input} placeholder='Nome do cliente' value={cliente} onChangeText={setCliente} />

        <Text style={styles.label}>Endereço / local</Text>
        <TextInput style={styles.input} placeholder="Rua, número, cidade" value={endereco} onChangeText={setEndereco} />

        <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>📍 Localização da visita</Text>
            {location ? <>
                <Text style={styles.locationText}>
                    {location.latitude.toFixed(6)},
                    {location.longitude.toFixed(6)}
                </Text>
                <MapView style={styles.map} region={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004
                }}>
                    <Marker coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude
                    }}
                        title="Local da visita" />
                </MapView>
            </> : 
            <Text style={styles.locationText}>
                Ainda não capturada
            </Text>
            }
            <TouchableOpacity onPress={capturarLocalizacao}>
                <Text style={styles.action}>
                    Atualizar localização
                </Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.label}>
            Descrição / serviço executado
        </Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder='Descreva o atendimento técnico...' multiline value={descricao} onChangeText={setDescricao}/>

        <TouchableOpacity style={styles.cameraButton} onPress={adicionarFoto}>
            <Text style={styles.cameraButtonText}>
                📷 Fotografar: {tipoFoto}
            </Text>
        </TouchableOpacity>

        <View style={styles.photos}>
            {fotos.map((foto, i) => 
            <View key={`${foto.uri}-${i}`} style={styles.photoCard}>
                <Image source={{ uri: foto.uri }} style={styles.photo} />
                <Text style={styles.photoLabel}>
                    {foto.tipo || 'Foto'}
                </Text>
            </View>
            )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={salvar} disabled={loading}>
            <Text style={styles.saveText}>
                {loading ? 'Salvando...' : 'Salvar visita técnica'}
            </Text>
        </TouchableOpacity>
    </ScrollView>
}

const styles = StyleSheet.create({ 
    container: { 
        flex: 1, 
        backgroundColor: '#f8fafc' 
    }, 
    content: { 
        padding: 20, 
        paddingBottom: 45 
    }, 
    header: { 
        paddingTop: 30, 
        marginBottom: 22 
    }, 
    back: { 
        color: '#2563eb', 
        fontWeight: '700', 
        marginBottom: 12 
    }, 
    title: { 
        fontSize: 27, 
        fontWeight: '800', 
        color: '#0f172a' 
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
    map: { 
        width: '100%', 
        height: 180, 
        borderRadius: 12, 
        marginTop: 10 
    }, 
    locationTitle: { 
        fontWeight: '800', 
        color: '#1e3a8a' 
    }, 
    locationText: { 
        color: '#475569', 
        marginTop: 6 
    }, 
    action: { 
        color: '#2563eb', 
        fontWeight: '700', 
        marginTop: 8 
    }, 
    chips: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 7 
    }, 
    chip: { 
        borderWidth: 1, 
        borderColor: '#cbd5e1', 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 99, 
        backgroundColor: '#fff' 
    }, 
    chipActive: { 
        backgroundColor: '#dbeafe', 
        borderColor: '#2563eb' 
    }, 
    chipText: { 
        color: '#475569' 
    }, 
    chipTextActive: { 
        color: '#1d4ed8', 
        fontWeight: '700' 
    }, 
    cameraButton: { 
        height: 52, 
        borderRadius: 12, 
        backgroundColor: '#0f172a', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 12 
    }, 
    cameraButtonText: { 
        color: '#fff', 
        fontWeight: '800' 
    }, 
    photos: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 10, 
        marginTop: 15 
    }, 
    photoCard: { 
        width: '31%', 
        backgroundColor: '#fff', 
        borderRadius: 10, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: '#e2e8f0' 
    }, 
    photo: { 
        width: '100%', 
        height: 90 
    }, 
    photoLabel: { 
        fontSize: 11, 
        fontWeight: '700', 
        padding: 6, 
        color: '#475569' 
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
    } 
});

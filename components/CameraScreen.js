import React, { useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { STORAGE_KEYS } from "../storage";

export default function CameraScreen({ navigation, route }) {
    const cameraRef = useRef(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions(
        { writeOnly: true }
    );
    const [facing, setFacing] = useState('back');
    const [saving, setSaving] = useState(false);
    const tipo = route.params?.photoType || 'Foto';

    async function takePicture() {
        if (!cameraRef.current || saving)
            return;
        setSaving(true);
        try {
            if (!permission?.granted) {
                const p = await requestPermission();
                if (!p.granted)
                    throw new Error('Permissão da câmera negada.');
            }
            let mp = mediaPermission;
            if (!mp?.granted)
                mp = await requestMediaPermission();
            if (!mp?.granted)
                throw new Error('Permissão para salvar na galeria negada.');
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: false
            });
            if (!photo?.uri)
                throw new Error('não foi possível capturar a foto.');
            await MediaLibrary.saveToLibraryAsync(photo.uri);
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_PHOTO, JSON.stringify({
                uri: photo.uri,
                tipo,
                owner: route.params?.userId, visitDraft: route.params?.visitDraft || 'new', createdAt: Date.now()
            }));
            Alert.alert('Foto salva', 'A foto foi slava na galeria. volte para a visita para vê-la anexada.',
                [{
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }]
            );
        } catch (e) {
            Alert.alert('Erro', e.message || 'Falha ao salvar foto.');
        } finally {
            setSaving(false);
        }
    }

    if (!permission)
        return <View style={styles.center}>
            <Text>
                Verificando câmera
            </Text>
        </View>;
    if (!permission.granted)
        return <View style={styles.center}>
            <Text style={styles.title}>
                Permissão da câmera
            </Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
                <Text style={styles.buttonText}>
                    Permitir câmera
                </Text>
            </TouchableOpacity>
        </View>;
    return <SafeAreaView style={styles.container}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="picture" />
        <View style={styles.top}>
            <Text style={styles.type}>
                {tipo}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.close}>
                    Fechar
                </Text>
            </TouchableOpacity>
        </View>
        <View style={styles.controls}>
            <TouchableOpacity style={styles.flip} onPress={() => setFacing((v) => v === 'back' ? 'front' : 'back')}>
                <Text style={styles.flipText}>
                    ↻
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.capture} onPress={takePicture} disabled={saving}>
                <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.spacer} />
        </View>
    </SafeAreaView>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000'
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 15
    },
    title: {
        fontSize: 20,
        fontWeight: '800'
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 15,
        borderRadius: 10
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700'
    },
    top: {
        position: 'absolute',
        top: 20,
        left: 18,
        right: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    type: {
        color: '#fff',
        fontWeight: '800',
        backgroundColor: 'rgba(0,0,0,.55)',
        padding: 9,
        borderRadius: 10
    },
    close: {
        color: '#fff',
        fontWeight: '700',
        backgroundColor: 'rgba(0,0,0,.55)',
        padding: 9,
        borderRadius: 10
    },
    controls: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 35
    },
    flip: {
        width: 55,
        height: 55,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,.9)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    flipText: {
        fontSize: 28
    },
    capture: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 5,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center'
    },
    captureInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#fff'

    },
    spacer: {
        width: 55
    }
});
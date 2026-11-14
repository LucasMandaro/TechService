import React, { useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from 'expo-media-library/legacy';
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
    const savingRef = useRef(false);
    const [preview, setPreview] = useState(null);
    const tipo = route.params?.photoType || 'Foto';

    async function takePicture() {
        if (!cameraRef.current || saving)
            return;
        savingRef.current = true;
        setSaving(true);
        try {
            if (!permission?.granted) {
                const p = await requestPermission();
                if (!p.granted)
                    throw new Error('Permissão da câmera negada.');
            }
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: false
            });
            if (!photo?.uri)
                throw new Error('Não foi possível capturar a foto.');
            setPreview(photo.uri);
        } catch (e) {
            Alert.alert('Erro', e.message || 'Falha ao capturar foto.');
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    async function usarFoto() {
        if (!preview || saving)
            return;
        setSaving(true);
        try {
            try {
                let mp = mediaPermission;
                if (!mp?.granted)
                    mp = await requestMediaPermission();
                if (mp?.granted)
                    await MediaLibrary.saveToLibraryAsync(preview);
            } catch (e) {
                console.log('Foto não salva na galeria:', e?.message);
            }
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_PHOTO, JSON.stringify({
                uri: preview,
                tipo,
                owner: route.params?.userId,
                solicitacaoId: route.params?.solicitacaoId,
                createdAt: Date.now()
            }));
            if (navigation.canGoBack())
                navigation.goBack();
        } catch (e) {
            Alert.alert('Erro', e.message || 'Falha ao anexar a foto.');
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
    if (preview)
        return <SafeAreaView style={styles.container}>
            <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            <View style={styles.previewTop}>
                <Text style={styles.previewTitle}>Prévia da foto ({tipo})</Text>
            </View>
            <View style={styles.previewButtons}>
                <TouchableOpacity
                    style={[styles.previewBtn, styles.previewRetake]}
                    onPress={() => setPreview(null)}
                    disabled={saving}
                >
                    <Text style={styles.previewRetakeText}>Tirar outra</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.previewBtn, styles.previewUse]}
                    onPress={usarFoto}
                    disabled={saving}
                >
                    <Text style={styles.previewUseText}>{saving ? 'Anexando...' : 'Usar foto'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>;
    return <SafeAreaView style={styles.container}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="picture" />
        <View style={styles.top}>
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.close}
            >
                <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
        <View style={styles.controls}>
            <TouchableOpacity
                style={styles.flip}
                onPress={() => setFacing((v) => v === 'back' ? 'front' : 'back')}
            >
                <Ionicons name="camera-reverse" size={28} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.capture}
                onPress={takePicture} disabled={saving}
            >
                <Ionicons name="camera" size={60} color="#000000" />
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
        borderRadius: 10,
        marginTop: 20
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
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center'
    },
    spacer: {
        width: 55
    },
    previewTop: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center'
    },
    previewTitle: {
        color: '#fff',
        fontWeight: '800',
        backgroundColor: 'rgba(0,0,0,.55)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        overflow: 'hidden'
    },
    previewButtons: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 30,
        flexDirection: 'row',
        gap: 12
    },
    previewBtn: {
        flex: 1,
        height: 54,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center'
    },
    previewRetake: {
        backgroundColor: 'rgba(255,255,255,.92)'
    },
    previewRetakeText: {
        color: '#0f172a',
        fontWeight: '800',
        fontSize: 16
    },
    previewUse: {
        backgroundColor: '#16a34a'
    },
    previewUseText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16
    }
});

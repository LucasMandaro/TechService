import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PHOTO_KEY = '@techservice:last_photo';

export default function Perfil({ navigation, user, onUpdateUser, onLogout }) {
    const [editando, setEditando] = useState(false);
    const [nome, setNome] = useState(user.nome || '');
    const [email, setEmail] = useState(user.email || '');
    const [foto, setFoto] = useState(user.foto || null);
    const [salvando, setSalvando] = useState(false);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const result = await AsyncStorage.getItem(LAST_PHOTO_KEY);
                if (result) {
                    const photo = JSON.parse(result);
                    if (photo.owner === user.id && photo.uri && photo.visitDrat === 'perfil') {
                        setFoto(photo);
                        await AsyncStorage.removeItem(LAST_PHOTO_KEY);
                    }
                }
            })();
        }, [user.id])
    );

    function trocarFoto() {
        navigation.navigate('Camera', {
            photoType: 'Perfil',
            userId: user.id,
            visitDrat: 'perfil'
        });
    }

    function sair() {
        Alert.alert('Sair', 'Deseja encerrar a sessão?', [
            { text: 'Cancelar' },
            { text: 'Sair', style: 'destructive', onPress: onLogout }
        ]);
    }

    async function salvar() {
        if (!nome.trim())
            return Alert.alert('Atenção', 'Informe seu nome.');
        if (!email.trim() || !email.includes('@'))
            return Alert.alert('Atenção', 'Informe um e-mail válido.');

        setSalvando(true);
        try {
            await onUpdateUser({ ...user, nome: nome.trim(), email: email.trim(), foto });
            setEditando(false);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Meu perfil</Text>

            <View style={styles.avatarWrap}>
                {foto ? (
                    <Image source={{ uri: foto.uri }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitial}>
                            {(nome || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {editando && (
                    <TouchableOpacity onPress={trocarFoto}>
                        <Text style={styles.action}>Trocar foto</Text>
                    </TouchableOpacity>
                )}
            </View>

            {editando ? (
                <>
                    <Text style={styles.label}>Nome</Text>
                    <TextInput style={styles.input} value={nome} onChangeText={setNome} />

                    <Text style={styles.label}>E-mail</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TouchableOpacity style={styles.saveButton} onPress={salvar} disabled={salvando}>
                        <Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Salvar alterações'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditando(false)}>
                        <Text style={styles.cancel}>Cancelar</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Nome</Text>
                        <Text style={styles.infoValue}>{user.nome}</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>E-mail</Text>
                        <Text style={styles.infoValue}>{user.email}</Text>
                    </View>

                    <TouchableOpacity style={styles.editButton} onPress={() => setEditando(true)}>
                        <Text style={styles.editText}>Editar perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={sair}>
                        <Text style={styles.logout}>Sair da conta</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingTop: 45, paddingBottom: 45, alignItems: 'center' },
    title: { fontSize: 25, fontWeight: '800', color: '#0f172a', alignSelf: 'flex-start', marginBottom: 20 },
    avatarWrap: { alignItems: 'center', marginBottom: 20 },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    avatarPlaceholder: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 34, fontWeight: '800', color: '#1d4ed8' },
    action: { color: '#2563eb', fontWeight: '700', marginTop: 8 },
    label: { color: '#334155', fontWeight: '700', marginBottom: 7, marginTop: 12, alignSelf: 'flex-start' },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        minHeight: 50,
        paddingHorizontal: 14,
        width: '100%'
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '100%',
        marginBottom: 10
    },
    infoLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
    infoValue: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginTop: 4 },
    editButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 15
    },
    editText: { color: '#fff', fontWeight: '800' },
    saveButton: {
        height: 54,
        borderRadius: 13,
        backgroundColor: '#16a34a',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 20
    },
    saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    cancel: { color: '#64748b', textAlign: 'center', marginTop: 12, fontWeight: '600' },
    logout: { color: '#dc2626', fontWeight: '700', marginTop: 20 }
});
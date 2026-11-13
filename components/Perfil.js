import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const LAST_PHOTO_KEY = '@techservice:last_photo';

export default function Perfil({ navigation, user, onUpdateUser, onLogout }) {
    const [editando, setEditando] = useState(false);
    const [nome, setNome] = useState(user.nome || '');
    const [email, setEmail] = useState(user.email || '');
    const [foto, setFoto] = useState(user.foto || null);
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const result = await AsyncStorage.getItem(LAST_PHOTO_KEY);
                    if (!result) {
                        return;
                    }

                    const photo = JSON.parse(result);

                    console.log('Foto recebida no perfil:', photo)

                    if (
                        photo.owner === user.id &&
                        photo.uri &&
                        photo.solicitacaoId === 'perfil'
                    ) {
                        setFoto({
                            uri: photo.uri
                        });

                        await AsyncStorage.removeItem(LAST_PHOTO_KEY);
                    }
                } catch (error) {
                    console.log('Erro ao carregar foto do perfil:', error);
                }
            })();
        }, [user.id])
    );

    function trocarFoto() {
        navigation.navigate('Camera', {
            photoType: 'Perfil',
            userId: user.id,
            solicitacaoId: 'perfil'
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
        if (senha !== '' || confirmacao !== '') {
            if (senha === '' || confirmacao === '') {
                Alert.alert('Atenção', 'Preencha os campos de senha e confirmação.');
                return;
            }
        }
        if (senha !== confirmacao)
            return Alert.alert('Atenção', 'As senhas não coincidem.');

        setSalvando(true);
        try {
            await onUpdateUser({
                ...user,
                nome: nome.trim(),
                email: email.trim(),
                foto,
                ...(senha !== '' ? { senha } : {}),
            });
            setEditando(false);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
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
                            editable={false}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={styles.label}>Senha</Text>

                        <View style={styles.passwordContainer}>

                            <TextInput
                                style={styles.passwordInput}
                                value={senha}
                                onChangeText={setSenha}
                                secureTextEntry={!mostrarSenha}
                            />

                            <TouchableOpacity
                                onPress={() => setMostrarSenha(!mostrarSenha)}
                                style={styles.eyeButton}
                            >
                                <Ionicons
                                    name={mostrarSenha ? 'eye-off' : 'eye'}
                                    size={24}
                                    color="#2563eb"
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Confirmar senha</Text>

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={confirmacao}
                                onChangeText={setConfirmacao}
                                secureTextEntry={!mostrarConfirmacao}
                            />

                            <TouchableOpacity
                                onPress={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                                style={styles.eyeButton}
                            >
                                <Ionicons
                                    name={mostrarConfirmacao ? 'eye-off' : 'eye'}
                                    size={24}
                                    color="#2563eb"
                                />
                            </TouchableOpacity>
                        </View>

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
        </KeyboardAvoidingView>
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
        paddingBottom: 45,
        alignItems: 'center'
    },
    title: {
        fontSize: 25,
        fontWeight: '800',
        color: '#0f172a',
        alignSelf: 'flex-start',
        marginBottom: 20
    },
    avatarWrap: {
        alignItems: 'center',
        marginBottom: 20
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48
    },
    avatarPlaceholder: {
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarInitial: {
        fontSize: 34,
        fontWeight: '800',
        color: '#1d4ed8'
    },
    action: {
        color: '#2563eb',
        fontWeight: '700',
        marginTop: 8
    },
    label: {
        color: '#334155',
        fontWeight: '700',
        marginBottom: 7,
        marginTop: 12,
        alignSelf: 'flex-start'
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        minHeight: 50,
        paddingHorizontal: 12,
        width: '100%'
    },

    passwordInput: {
        flex: 1,
        height: '100%',
        color: '#000',
        paddingHorizontal: 0,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 52,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    eyeButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
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
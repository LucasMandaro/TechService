import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function TelaLogin({ navigation, onLogin }) {
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [ativo, setAtivo] = useState(false);
    const [mostrarSenha, setMostrarSenha] = useState(false);

    async function entrar(useBiometrics = false) {
        if (!usuario.trim() || !senha) {
            Alert.alert('Atenção', 'Preencha usuário/e-mail e senha.');
            return;
        }

        setAtivo(true)

        try {
            const email = usuario.trim().toLowerCase();
            let cred;
            try {
                cred = await signInWithEmailAndPassword(auth, email, senha);
            } catch (e) {
                const invalido = [
                    'auth/invalid-credential', 'auth/wrong-password',
                    'auth/user-not-found', 'auth/invalid-email'
                ].includes(e.code);

                if (invalido) {
                    Alert.alert('Login inválido', 'E-mail ou senha incorretos.');
                } else if (e.code === 'auth/network-request-failed') {
                    Alert.alert('Sem conexão', 'Conecte-se à internet para entrar.');
                } else if (e.code === 'auth/too-many-requests') {
                    Alert.alert('Muitas tentativas', 'Aguarde um pouco e tente de novo.');
                } else {
                    console.log('Erro ao fazer login:', e);
                    Alert.alert('Erro', 'Não foi possível realizar o login.');
                }
                return;
            }

            if (useBiometrics) {
                const result =
                    await LocalAuthentication.authenticateAsync({
                        promptMessage: 'Confirme sua identidade'
                    });

                if (!result.success) {
                    await signOut(auth);
                    return;
                }
            }

            let perfil = {};
            try {
                const snap = await getDoc(doc(db, 'users', cred.user.uid));
                if (snap.exists())
                    perfil = snap.data();
                if (perfil.fotoBase64) {
                    perfil = { ...perfil, foto: { uri: `data:image/jpeg;base64,${perfil.fotoBase64}` } };
                    delete perfil.fotoBase64
                }
            } catch (e) {
                console.log('Perfil indisponível:', e?.code || e?.message);
            }

            await onLogin({
                nome: email.split('@')[0],
                ...perfil,
                id: cred.user.uid,
                email
            });
        } catch (error) {
            console.log('Erro ao fazer login:', error);
            Alert.alert('Erro', 'Não foi possível realizar o login.');
        } finally {
            setAtivo(false);
        }
    }

    async function entrarComBiometria() {
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
            Alert.alert('Biometria indisponível', 'Cadastre uma biometria no dispositivo ou entre com sua senha.');
            return;
        }
        if (!usuario.trim() || !senha) {
            Alert.alert('Identificação', 'Informe usuário/e-mail e senha uma vez para associar o acesso biométrico.');
            return;
        }
        await entrar(true);
    }

    return (
        <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.logoView}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.imageLogo}
                        resizeMode="contain"
                    />

                    <Text style={styles.title}>
                        TechService
                    </Text>

                    <Text style={styles.subtitle}>
                        Visita técnica em campo
                    </Text>
                </View>

                <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor="#94a3b8"
                    value={usuario}
                    onChangeText={setUsuario}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Senha"
                        placeholderTextColor="#94a3b8"
                        value={senha}
                        onChangeText={setSenha}
                        secureTextEntry={!mostrarSenha}
                    />
                    <TouchableOpacity
                        onPress={() => setMostrarSenha(!mostrarSenha)}
                        style={styles.eyeButton}
                    >
                        <Ionicons
                            name={mostrarSenha ? "eye-off" : "eye"}
                            size={24}
                            color="#2563eb"
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => entrar(false)}
                    disabled={ativo}
                >
                    <Text style={styles.buttonText}>
                        {ativo ? 'Entrando...' : 'Entrar'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.outline}
                    onPress={entrarComBiometria}
                >
                    <Text style={styles.outlineText}>
                        Entrar com Biometria
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Cadastro')}
                >
                    <Text style={styles.link}>
                        Criar uma conta
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({

    keyboardContainer: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },

    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        marginBottom: 12,
        paddingHorizontal: 16,
    },

    passwordInput: {
        flex: 1,
        height: '100%',
        color: '#000',
        paddingHorizontal: 0,
    },

    eyeButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },

    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        paddingTop: 40,
        paddingBottom: 40
    },
    logoView: {
        alignItems: 'center',
        marginBottom: 30
    },
    logo: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: '#2563eb',
        color: '#fff',
        fontSize: 25,
        fontWeight: '800',
        textAlign: 'center',
        paddingTop: 17,
        marginBottom: 12
    },
    imageLogo: {
        width: 64,
        height: 64,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#0f172a'
    },
    subtitle: {
        color: '#64748b',
        marginTop: 5
    },
    input: {
        height: 52,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        fontSize: 16,
        color: '#000'
    },
    button: {
        height: 52,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16
    },
    outline: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12
    },
    outlineText: {
        color: '#2563eb',
        fontWeight: '700'
    },
    link: {
        textAlign: 'center',
        color: '#2563eb',
        fontWeight: '700',
        marginTop: 24
    },
});
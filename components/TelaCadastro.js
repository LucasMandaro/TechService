import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'

export default function TelaCadastro({ navigation }) {
    const [nome, setnome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false)
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)

    async function cadastrar() {
        if (!nome.trim() || !email.trim() || !senha)
            return Alert.alert('Atenção', 'Preencha todos os campos.');

        if (senha.length < 6)
            return Alert.alert('Senha', 'Use pelo menos 6 caracteres.');

        if (senha !== confirmacao)
            return Alert.alert('Senha', 'As senhas não conferem.');

        try {
            const emailLimpo = email.trim().toLowerCase();
            const cred = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
            await setDoc(doc(db, 'users', cred.user.uid), {
                nome: nome.trim(),
                email: emailLimpo,
                createdAt: Date.now()
            });
            await signOut(auth);
        } catch (e) {
            if (e.code === 'auth/email-already-in-use')
                return Alert.alert('Cadastro', 'Este e-mail já está cadastrado.');
            if (e.code === 'auth/invalid-email')
                return Alert.alert('Cadastro', 'E-mail inválido.');
            if (e.code === 'auth/weak-password')
                return Alert.alert('Senha', 'Use pelo menos 6 caracteres.');
            if (e.code === 'auth/network-request-failed')
                return Alert.alert('Sem conexão', 'Conecte-se à internet para criar a conta.');
            console.log('Erro no cadastro:', e);
            return Alert.alert('Erro', 'Não foi possível criar a conta.');
        }

        Alert.alert('Cadastro realizado', 'Agora você pode entrar no TechService.',
            [{ text: 'Entrar', onPress: () => navigation.goBack() }]
        );
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
                <Image
                    source={require('../assets/logo.png')}
                    style={styles.imageLogo}
                    resizeMode="contain"
                />

                <Text style={styles.title}>
                    Criar conta
                </Text>

                <Text style={styles.subtitle}>
                    Cadastre-se no TechService.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Nome completo"
                    placeholderTextColor="#94a3b8"
                    value={nome}
                    onChangeText={setnome}
                />

                <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
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

                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Confirmar senha"
                        placeholderTextColor="#94a3b8"
                        value={confirmacao}
                        onChangeText={setConfirmacao}
                        secureTextEntry={!mostrarConfirmacao}
                    />

                    <TouchableOpacity
                        onPress={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                        style={styles.eyeButton}
                    >
                        <Ionicons
                            name={mostrarConfirmacao ? "eye-off" : "eye"}
                            size={24}
                            color="#2563eb"
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={cadastrar}
                >
                    <Text style={styles.buttonText}>
                        Cadastrar
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.link}>
                        Voltar para login
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
        width: 300,
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
        alignItems: 'center',
        padding: 24,
        paddingTop: 40,
        paddingBottom: 40
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a'
    },
    imageLogo: {
        width: 64,
        height: 64,

    },
    subtitle: {
        color: '#64748b',
        marginBottom: 24,
        marginTop: 6
    },
    input: {
        height: 52,
        width: 300,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        color: '#000'
    },
    button: {
        height: 52,
        width: 100,
        backgroundColor: '#2563eb',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16
    },
    link: {
        textAlign: 'center',
        color: '#2563eb',
        fontWeight: '700',
        marginTop: 20
    }
});

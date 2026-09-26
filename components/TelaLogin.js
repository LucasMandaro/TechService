import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage';

export default function TelaLogin({ navigation, onLogin }) {
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [ativo, setAtivo] = useState(false);

    async function entrar(useBiometrics = false) {
        if (!usuario.trim() || !senha) {
            Alert.alert('Atenção', 'Preencha usuário/e-mail e senha.');
            return;
        }
        setAtivo(true)
        try {
            const users = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.USERS) || '[]');
            const user = users.find(
                (item) => (item.email || item.usuario).toLowerCase() === usuario.trim().toLowerCase() && item.senha === senha
            )

            if (useBiometrics) {
                const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme sua identidade' });
                if (!result.success)
                    return;
            }

            await onLogin({ id: user.id, nome: user.nome, email: user.email });
        } finally {
            setAtivo(false);
        }
    }

    async function entrarComBiometria() {
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
            Alert.alert('Biometria indisponível', 'Cadastre uma biometria no dispositivo ou entre com sua senha');
            return;
        }
        if (!usuario.trim() || !senha) {
            Alert.alert('Identificação', 'Informe usuário/e-mail e senha uma vez para associar o acesso biométrico.');
            return;
        }
        await entrar(true);
    }

    return (
        <View style={styles.container}>
            <View style={styles.logoView}>
                <Text style={styles.title}>
                    TechService
                </Text>
                <Text style={styles.subtitle}>
                    Visita técnica em campo
                </Text>
            </View>

            <TextInput style={styles.input} placeholder="E-mail" value={usuario} onChangeText={setUsuario} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={() => entrar(false)} disabled={ativo}>
                <Text style={styles.buttonText}>{ativo ? 'Entrando...' : 'Entrar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outline} onPress={entrarComBiometria}>
                <Text style={styles.outlineText}>Entrar com Biometria</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
                <Text style={styles.link}>Criar uma conta</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        padding: 24
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
        fontSize: 16
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
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from '../storage';

export default function TelaCadastro({ navigation }) {
    const [nome, setnome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');

    async function cadastrar() {
        if (!nome.trim() || !email.trim() || !senha)
            return Alert.alert('Atenção', 'Preencha todos os campos.');

        if (senha.length < 6)
            return Alert.alert('Senha', 'Use pelo menos 6 caracteres.');

        if (senha !== confirmacao)
            return Alert.alert('Senha', 'As senhas não conferem.');

        const users = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.USERS) || '[]');

        if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
            return Alert.alert('Cadastro', 'Este e-mail já está cadastrado.');
        users.push({
            id: `${Date.now()}`, nome: nome.trim(), email: email.trim().toLowerCase(), senha
        });

        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        Alert.alert('Cadastro realizado', 'Agora você pode entrar no TechService.',
            [{ text: 'Entrar', onPress: () => navigation.goBack() }]
        );
    }

    return <View style={styles.container}>
        <Image source={require('../assets/logo.png')} style={styles.imageLogo} resizeMode="contain"/>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Cadastre-se no TechService.</Text>
        <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor="#94a3b8" value={nome} onChangeText={setnome} />
        <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#94a3b8" value={senha} onChangeText={setSenha} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor="#94a3b8" value={confirmacao} onChangeText={setConfirmacao} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={cadastrar}>
            <Text style={styles.buttonText}>Cadastrar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Voltar para login</Text>
        </TouchableOpacity>
    </View>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f8fafc'
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a'
    },
    subtitle: {
        color: '#64748b',
        marginBottom: 24,
        marginTop: 6
    },
    input: {
        height: 52,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dbe3ef',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 12
    },
    button: {
        height: 52,
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

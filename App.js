import React, { useEffect, useState } from 'react';
import {ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import TelaLogin from './components/TelaLogin.js';
import TelaCadastro from './components/TelaCadastro.js';
import BottomTabs from './Bottomtabs.js';
import { STORAGE_KEYS } from './storage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [contaLembrada, setContaLembrada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [travado, setTravado] = useState(false);
  const [autenticandoBiometria, setAutenticandoBiometria] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
        if (salvo) {
          const parsed = JSON.parse(salvo);
          const hardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
          if (parsed.biometricEnabled && enrolled){
            setTravado(true);
            const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloqueie o TechService'});
            if (result.success){
              setSession(parsed);
              setTravado(false);
            } else {
              await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
            }
          } else {
            setSession(parsed);
          }
        } else{
          const lembrada = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACCOUNT);
          if (lembrada){
            setContaLembrada(JSON.parse(lembrada));
          }
        }
      }finally{
        setCarregando(false);
      }
    })();
  }, []);

  async function onLogin(user) {
    const sessionUser = {
      ...user, biometricEnabled: true
    };
    await AsyncStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify(sessionUser)
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_ACCOUNT,
      JSON.stringify(sessionUser)
    );
    setSession(sessionUser);
  }

  async function onUpdateUser(userAtualizado) {
    try{
      const usuariosSalvos = await  AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const usuarios = JSON.parse(usuariosSalvos || '[]');

      const usuariosAtualizados = usuarios.map((usuario) =>
        usuario.id === userAtualizado.id? userAtualizado :usuario
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.USERS,
        JSON.stringify(usuariosAtualizados)
      );

      const sessionUser = {
        ...session,
        ...userAtualizado
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSION,
        JSON.stringify(sessionUser)
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_ACCOUNT,
        JSON.stringify(sessionUser)
      );

      setSession(sessionUser);
    } catch (error){
      console.log('Erro ao atualizar usuário:', error);
      Alert.alert(
        'Erro',
        'Não foi possivel salvar as alterações do perfil.'
      );
    }
  }

  async function logout() {
    const salvo = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
    if (salvo){
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACCOUNT, salvo);
      setContaLembrada(JSON.parse(salvo));
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
  }

  async function trocarConta() {
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_ACCOUNT);
    setContaLembrada(null);
  }

  async function entrarComBiometria() {
    setAutenticandoBiometria(true);
    try{
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
      if (!enrolled){
        Alert.alert('Biometria indisponível', 'Cadastre uma biometria nas configurações do aparelho para usar esse atalho.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Entre no TechService' });
      if (result.success){
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(contaLembrada));
        setSession(contaLembrada);
      }
    }finally{
      setAutenticandoBiometria(false);
    }
  }

  if (carregando || travado){
    return <View style={styles.carregando}>
      <ActivityIndicator size="large" color="#2563eb"/>
      <Text>Carregando TechService...</Text>
    </View>;
  }

  if (session){
    return(
      <>
        <StatusBar barStyle="dark-content"/>
        <BottomTabs user={session} onUpdateUser={onUpdateUser} onLogout={logout}/>
      </>
    );
  }

  if (contaLembrada){
    return (
      <View style={styles.biometriaContainer}>
        <StatusBar barStyle="dark-content"/>
        <Text style={styles.biometriaTitulo}>Bem-vindo de volta,</Text>
        <Text style={styles.biometriaNome}>{contaLembrada.nome}</Text>
        <TouchableOpacity
          style={styles.biometriaBotao}
          onPress={entrarComBiometria}
          disabled={autenticandoBiometria}
        >
          <Text style={styles.biometriaBotaoTexto}>
            {autenticandoBiometria ? 'Verificando...' : '🔒 Entrar com biometria'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={trocarConta}>
          <Text style={styles.biometriaLink}>Entrar com outra conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content"/>
      <Stack.Navigator screenOptions={{ headerShown: false}}>
        <Stack.Screen name='Login'>
          {(props) => <TelaLogin {...props} onLogin={onLogin} /> }
        </Stack.Screen>
        <Stack.Screen
          name='Cadastro'
          component={TelaCadastro}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f8fafc'
  },
  biometriaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  biometriaTitulo: { 
    color: '#64748b', 
    fontSize: 16 
  },
  biometriaNome: { 
    color: '#0f172a', 
    fontSize: 26, 
    fontWeight: '800', 
    marginTop: 4, 
    marginBottom: 30 
  },
  biometriaBotao: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 30,
    marginBottom: 18
  },
  biometriaBotaoTexto: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 16 
  },
  biometriaLink: { 
    color: '#64748b', 
    fontWeight: '600' 
  }
});

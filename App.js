import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import TelaLogin from './components/TelaLogin.js';
import TelaCadastro from './components/TelaCadastro.js';
import BottomTabs from './Bottomtabs.js';
import { STORAGE_KEYS } from './storage';
import { signOut, updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { initDb } from './database';
import { sincronizar } from './sync';
import { fotoParaBase64, paraDataUri } from './fotos.js';
import Perfil from './components/Perfil.js';

const Stack = createNativeStackNavigator();

function AppConteudo() {
  const [session, setSession] = useState(null);
  const [contaLembrada, setContaLembrada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [travado, setTravado] = useState(false);
  const [autenticandoBiometria, setAutenticandoBiometria] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDb();

        await auth.authStateReady();
        const uidAuth = auth.currentUser?.uid;

        const salvo = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
        const parsedSalvo = salvo ? JSON.parse(salvo) : null;

        if (parsedSalvo && parsedSalvo.id === uidAuth) {
          const parsed = parsedSalvo;
          const hardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
          if (parsed.biometricEnabled && enrolled) {
            setTravado(true);
            const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloqueie o TechService' });
            if (result.success) {
              setSession(parsed);
              setTravado(false);
            } else {
              await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
            }
          } else {
            setSession(parsed);
          }
        } else {
          if (salvo)
            await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
          const lembradaSalva = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACCOUNT);
          const lembrada = lembradaSalva ? JSON.parse(lembradaSalva) : null;
          if (lembrada && lembrada.id === uidAuth) {
            setContaLembrada(lembrada);
          } else if (lembradaSalva) {
            await AsyncStorage.removeItem(STORAGE_KEYS.LAST_ACCOUNT);
          }
        }
      } catch (e) {
        console.log('[init] ERRO:', e?.stack || e);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (session?.id)
      sincronizar();
  }, [session?.id]);

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
    try {
      const usuarioAuth = auth.currentUser;
      if (!usuarioAuth)
        throw new Error('sem-login');

      const { senha, ...perfil } = userAtualizado;

      const emailMudou = (perfil.email || '').trim().toLowerCase() !== session.email;
      perfil.email = session.email;

      if (senha) {
        await updatePassword(usuarioAuth, senha);
      }

      const dadosRemotos = { nome: perfil.nome, email: perfil.email };

      if (perfil.foto?.uri && !perfil.foto.uri.startsWith('data:')) {
        try {
          const b64 = await fotoParaBase64(perfil.foto.uri, [{ largura: 300, qualidade: 0.5 }]);
          perfil.foto = { uri: paraDataUri(b64) };
        } catch (e) {
          console.log('Foto de perfil mantida só no aparelho:', e?.message);
        }
      }
      if (perfil.foto?.uri?.startsWith('data:')) {
        dadosRemotos.fotoParaBase64 = perfil.foto.uri.split(',')[1];
      }

      await setDoc(doc(db, 'users', usuarioAuth.uid), dadosRemotos, { merge: true });

      const sessionUser = {
        ...session,
        ...perfil
      };

      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionUser));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACCOUNT, JSON.stringify(sessionUser));

      setSession(sessionUser);

      if (emailMudou) {
        Alert.alert('E-mail', 'O e-mail de login não pode ser alterado por aqui. As demais alterações foram salvas.');
      }
    } catch (error) {
      console.log('Erro ao atualizar usuário:', error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Segurança', 'Para trocar a senha, saia e entre novamente na conta e tente de novo.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Senha', 'Use pelo menos 6 caracteres.')
      } else {
        Alert.alert('Erro', 'Não foi possível salvar as alterações do perfil.')
      }
    }
  }

  async function onTrocarModo(modo) {
    const sessionUser = { ...session, modo };
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionUser));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACCOUNT, JSON.stringify(sessionUser));
    setSession(sessionUser);
  }

  async function logout() {
    const salvo = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
    if (salvo) {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACCOUNT, salvo);
      setContaLembrada(JSON.parse(salvo));
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
  }

  async function trocarConta() {
    await signOut(auth);
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_ACCOUNT);
    setContaLembrada(null);
  }

  async function entrarComBiometria() {
    setAutenticandoBiometria(true);
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Biometria indisponível', 'Cadastre uma biometria nas configurações do aparelho para usar esse atalho.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Entre no TechService' });
      if (result.success) {
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(contaLembrada));
        setSession(contaLembrada);
      }
    } finally {
      setAutenticandoBiometria(false);
    }
  }

  if (carregando || travado) {
    return <View style={styles.carregando}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text>Carregando TechService...</Text>
    </View>;
  }

  if (session) {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <BottomTabs user={session} onUpdateUser={onUpdateUser} onLogout={logout} onTrocarModo={onTrocarModo} />
      </>
    );
  }

  if (contaLembrada) {
    return (
      <View style={styles.biometriaContainer}>
        <StatusBar barStyle="dark-content" />
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
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name='Login'>
          {(props) => <TelaLogin {...props} onLogin={onLogin} />}
        </Stack.Screen>
        <Stack.Screen
          name='Cadastro'
          component={TelaCadastro}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

let BarraNavegacao = null;
try {
  BarraNavegacao = require('expo-navigation-bar').NavigationBar;
} catch {
  BarraNavegacao = null;
}

export default function App() {
  return (
    <>
      {BarraNavegacao && <BarraNavegacao hidden />}
      <AppConteudo />
    </>
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

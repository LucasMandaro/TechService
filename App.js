import React, { useEffect, useState } from 'react';
import {ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import TelaLogin from './components/TelaLogin.js';
import TelaCadastro from './components/TelaCadastro.js';
import Dashboard from './components/Dashboard.js';
import NovaVisita from './components/NovaVisita.js';
import { STORAGE_KEYS } from './storage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [travado, setTravado] = useState(false);

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
    setSession(sessionUser);
  }

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    setSession(null);
  }

  if (carregando || travado){
    return <View style={styles.carregando}>
      <ActivityIndicator size="large" color="#2563eb"/>
      <Text>Carregando TechService...</Text>
    </View>;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content"/>
      <Stack.Navigator screenOptions={{ headerShown: false}}>
        {session ? (
          <>
            <Stack.Screen name="Dashboard">
              {(props) => <Dashboard {...props} user={session} onLogout={logout}/> }
            </Stack.Screen>
            <Stack.Screen name="NovaVisita">
              {(props) => <NovaVisita {...props} user={session} />}
            </Stack.Screen>
            <Stack.Screen name="Camera">
              {(props) => <CameraScreen {...props} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => <TelaLogin {...props} onLogin={onLogin} />}
            </Stack.Screen>
            <Stack.Screen 
              name="Cadastro" 
              component={TelaCadastro} 
            />
          </>
        )}
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
});

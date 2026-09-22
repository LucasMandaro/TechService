import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Mapa from './components/Mapa';
import TelaSeguraCamera from './components/CameraScreen';

export function TelaSegura() {
  const [access, setAccess] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mostrarCamera, setMostrarCamera] = useState(false);

  useEffect(() => {
    (async () => {
      const authentication = await LocalAuthentication.authenticateAsync();
      if (authentication.success)
        setAccess(true)
      else
        setAccess(false)
    })();
  }, []);
  return (
    <View style={styles.telaprincipal}>
      {access ? (
        <>
          <Text>Usuário logado com sucesso!</Text>
          <TouchableOpacity onPress={() => setMostrarMapa(!mostrarMapa)}>
            <Image
              style={styles.mapIcon}
              source={require('./assets/mapIcon.png')}
            />
          </TouchableOpacity>
          {mostrarMapa && <Mapa />}
          <TouchableOpacity onPress={() => setMostrarCamera(!mostrarCamera)}>
            <Image
              style={styles.cameraIcon}
              source={require('./assets/camera.png')}
            />
          </TouchableOpacity>
          {mostrarCamera && <TelaSeguraCamera />}

        </>
      ) : (
        <View style={styles.autenticacaonaorealizada}>
          <Text style={styles.autenticacaonaorealizada}>Autenticação não realizada.</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [biometria, setBiometria] = useState(false);
  const [render, setRender] = useState(false);

  const changeRender = () => setRender(true)

  useEffect(() => {
    (async () => {
      const compativel = await LocalAuthentication.hasHardwareAsync();
      setBiometria(compativel);
    })();
  }, []);


  if (render) {
    return (
      <TelaSegura />
    )
  } else {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionTitle}>Bem-vindo ao TechService!</Text>
        <Text style={styles.label}>Usuário: </Text>
        

        <Text style={styles.label}>Senha: </Text>
        <Text>
          {biometria
            ? 'Faça o login com biometria'
            : 'Dispositivo não compatível com biometria'
          }
        </Text>
        <TouchableOpacity onPress={changeRender}><Text>Logar</Text></TouchableOpacity>
        <StatusBar style='auto' />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  autenticacaonaorealizada: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  telaprincipal: {
    backgroundColor: '#406fa5',
    flex: 1,
  },

  mapIcon: {
    width: 50,
    height: 50,
    marginTop: 20,
  },

  cameraIcon: {
    width: 50,
    height: 50,
    marginTop: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#fff',
  },

  permissionTitle: {
    marginBottom: 12,
    color: '#111827',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  permissionMessage: {
    marginBottom: 25,
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },

  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },

  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  buttonContainer: {
    position: 'absolute',
    right: 0,
    bottom: 30,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 35,
  },

  flipButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },

  captureButton: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 38,
    backgroundColor: '#fff',
  },

  disabledButton: {
    opacity: 0.5,
  },

  icon: {
    width: '65%',
    height: '65%',
    resizeMode: 'contain',
  },

  captureIcon: {
    width: '65%',
    height: '65%',
    resizeMode: 'contain',
  },

  savingContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  savingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },

  previewImage: {
    width: '100%',
    height: '80%',
  },

  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#fff',
  },

  closeIcon: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },

  savedMessage: {
    position: 'absolute',
    bottom: 25,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

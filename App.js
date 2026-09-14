import { StatusBar } from 'expo-status-bar';
import React,{ useEffect, useState, useRef } from 'react';
import { 
  Alert, 
  Image, 
  Modal, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { 
  CameraView, 
  useCameraPermissions, 
} from 'expo-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';


function CameraScreen() {
  const cameraRef = useRef(null);

  const [facing, setFacing] = useState('back');
  const [capturedImage, setCapturedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({writeOnly: true});
  
  async function requestPermissions() {
    try {
      const cameraResult = await requestCameraPermission();
      const mediaResult = await requestMediaPermission();

      if (!cameraResult.granted || !mediaResult.granted) {
        Alert.alert(
          'Permissões necessárias',
          'É necessário permitir o uso da câmera e o salvamento de fotos.'
        );
        return;
      }

      Alert.alert(
        'Permissões concedidas', 
        'Você pode usar a câmera e salvar fotos.'
      );
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      Alert.alert(
        'Erro',
        'Não foi possível solicitar as permissões.'
      );
    }
  }

  useEffect(() => {
    if (!cameraPermission?.granted || !mediaPermission?.granted) {
      requestPermissions();
    }
  }, []);

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (!cameraRef.current || isSaving) {
      return;
    }
    try {
      setIsSaving(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      });

      if (!photo?.uri){
        throw new Error('Falha ao capturar a foto.');
      }

      const fileName =
        photo.uri.split('/').pop();
      
      console.log('Nome do arquivo:', fileName);
      console.log('URI da foto:', photo.uri);
      console.log(
        'Tamanho do Base64:',
        photo.base64?.length ?? 0
      );

      let permission = mediaPermission;

      if(!permission?.granted){
        permission = await requestMediaPermission();
      }
      if (!permission?.granted){
        throw new Error('Permissão para salvar fotos não concedida.');
      };

      await MediaLibrary.saveToLibraryAsync(photo.uri);

      console.log('Status: Foto salva com sucesso na galeria!');
      console.log('Destino: galeria geral do celular');
      console.log('Nome do arquivo:', fileName);
      console.log('URI da foto:', photo.uri);

      setCapturedImage(photo.uri);
      setModalVisible(true);

      Alert.alert(
        'Foto salva com sucesso',
        'A foto foi salva na galeria do dispositivo.'
      );
    } catch (error) {
      console.error(
        'Erro ao capturar ou salvar a foto:',
        error
      );
      Alert.alert(
        'Erro',
        error?.message ||
          'Não foi possível capturar ou salvar a foto.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!cameraPermission || !mediaPermission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Verificando permissões...
        </Text>
      </View>
    );
  }

  if (!cameraPermission.granted || !mediaPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>
          Permissões necessárias
        </Text>
        <Text style={styles.permissionMessage}>
          Autorize o uso da câmera e o salvamento de fotos na galeria.
        </Text>

        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermissions}
        >
          <Text style={styles.permissionButtonText}>
            Conceder Permissões
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.cameraContainer}
      edges={['top', 'bottom']}
    >
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="picture"
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
            disabled={isSaving}
          >
            <Image
              style={styles.icon}
              source={require('./assets/flip.png')}
            />
          </TouchableOpacity>

          <TouchableOpacity
          style={[
            styles.captureButton,
            isSaving && styles.disabledButton,
          ]}
          onPress={takePicture}
          disabled={isSaving}
          >
            <Image
              style={styles.captureIcon}
              source={require('./assets/camera.png')}
            />
          </TouchableOpacity>
        </View>

        {isSaving && (
          <View style={styles.savingContainer}>
            <Text style={styles.savingText}>
              Salvando foto...
            </Text>
          </View>
        )}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Image
              style={styles.closeIcon}
              source={require('./assets/close.png')}
            />
          </TouchableOpacity>

          {capturedImage && (
            <Image
              style={styles.previewImage}
              source={{ uri: capturedImage }}
              resizeMode="contain"
            />
          )}

          <Text style={styles.savedMessage}>
            Foto salva na galeria
          </Text>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}


export function Map({location, text}){
  return(
    <View style={styles.mapContainer}>
      <MapView 
        loadingEnabled={true}
        region={location? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        } : {
          latitude: 0,
          longitude: 0,
          latitudeDelta: 0,
          longitudeDelta: 1000,
        }}
        style={styles.map}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Eu estou aqui"
            />
          )}
        </MapView>

        <Text>{text}</Text>
    </View>
  );
}

export function TelaSegura({location,text}){
  const [access, setAccess] = useState(false);

  useEffect(() => {
  (async () => {
    const authentication = await LocalAuthentication.authenticateAsync();
    if (authentication.success)
      setAccess(true)
    else
      setAccess(false)
  })();
}, []);
  return(
    <View style={{ flex: 1}}>
      {access ?(
        <>
          <Text>Usuário logado com sucesso!</Text>

          <Map
            location={location}
            text={text}
          />
          <SafeAreaProvider>
            <CameraScreen/>
          </SafeAreaProvider>
        </>
      ) : (
        <View style={styles.container}>
          <Text>Autenticação não realizada.</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [biometria, setBiometria] = useState(false);
  const [render, setRender] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const changeRender = () => setRender(true)

  useEffect(() => {
    (async () => {
      const compativel = await LocalAuthentication.hasHardwareAsync();
      setBiometria(compativel);
    })();
  },[]);
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão da localização negada!');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    })();
  }, []);

  let text = 'Aguarde...';
  if (errorMsg){
    text = errorMsg;
  } else if (location){
    text = JSON.stringify(location);
  }

  if (render){
    return (
      <TelaSegura
        location={location}
        text={text}
      />
    )
  }else{
    return(
      <View style={styles.container}>
        <Text>
          {biometria
            ? 'Faça o login com biometria'
            : 'Dispositivo não compatível com biometria'
          }
        </Text>
        <TouchableOpacity onPress={changeRender}><Text>Logar</Text></TouchableOpacity>
        <StatusBar style='auto'/>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapContainer: {
    flex: 1,
    width: '100%'
  },
  map: {
    width: "100%",
    height: "50%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  loadingText: {
    color: '#fff',
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

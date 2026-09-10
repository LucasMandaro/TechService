import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

export function Map({location, text}){
  return(
    <View style={styles.mapContainer}>
      <MapView 
        loadingEnabled={true}
        region={
          location ?
            {
              latitude: 0,
              longitude: 0,
              latitudeDelta: 0,
              longitudeDelta: 1000,
            } :
            {
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001,
            }
        }
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
      {access &&(
        <>
          <Text>Usuário logado com sucesso!</Text>

          <Map
            location={location}
            text={text}
            />
        </>
      )}
    </View>
  )

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

  mapConteiner: {
    flex: 1,
    width: '100%'
  },
  map: {
    width: "100%",
    height: "50%",
  },
});

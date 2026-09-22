import { StyleSheet, Text, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

export default function Mapa() {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permissão da localização negada!');
                    return;
                }

                const ligado = await Location.hasServicesEnabledAsync();
                if (!ligado) {
                    setErrorMsg('Ative a localização (GPS) do celular.');
                    return;
                }

                let posicao;
                try {
                    posicao = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                } catch (e) {
                    posicao = await Location.getLastKnownPositionAsync();
                }

                if (!posicao) {
                    setErrorMsg('Não foi possível obter a localização.');
                    return;
                }

                setLocation(posicao.coords);
            } catch (error) {
                console.error('Erro ao obter localização:', error);
                setErrorMsg('Não foi possível obter a localização.');
            }
        })();
    }, []);

    let text = 'Aguarde...';
    if (errorMsg) {
        text = errorMsg;
    } else if (location) {
        text = JSON.stringify(location);
    }

    return (
        <View style={styles.container}>
            <MapView
                loadingEnabled={true}
                region={
                    location ?
                        {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.001,
                            longitudeDelta: 0.001,
                        } :
                        {
                            latitude: 0,
                            longitude: 0,
                            latitudeDelta: 50,
                            longitudeDelta: 50,
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefefe',
        alignItems: 'center',
        justifyContent: 'center',
    },

    map: {
        width: "100%",
        height: "50%",
    },
});
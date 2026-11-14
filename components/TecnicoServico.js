import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { buscarAtivaDoTecnico, listarPendentes } from '../database';
import { aceitarSolicitacao, sincronizar } from '../sync';
import { buscarRota } from '../mapbox';
import { tocarAlertaSolicitacao } from '../alerta';

const POLL_MS = 10000;

function distanciaKm(a, b) {
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLon = rad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function formatarDistancia(km) {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function TecnicoServico({ navigation, user }) {
    const chaveRejeitadas = `@techservice:rejeitadas:${user.id}`;
    const mapRef = useRef(null);
    const vistas = useRef(null);
    const [pos, setPos] = useState(null);
    const [pendentes, setPendentes] = useState([]);
    const [ativa, setAtiva] = useState(null);
    const [aceitando, setAceitando] = useState(false);
    const [rota, setRota] = useState(null);
    const [mapKey, setMapKey] = useState(0);
    const tinhaRota = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                const p = await Location.requestForegroundPermissionsAsync();
                if (p.status !== 'granted') {
                    Alert.alert('Localização', 'Permita a localização para ver as solicitações perto de você.');
                    return;
                }
                let atual;
                try {
                    atual = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                } catch {
                    atual = await Location.getLastKnownPositionAsync();
                }
                if (atual) setPos(atual.coords);
            } catch (e) {
                console.log('Erro ao obter localização do técnico:', e?.message);
            }
        })();
    }, []);

    const load = useCallback(async () => {
        const salvas = await AsyncStorage.getItem(chaveRejeitadas);
        const rejeitadas = salvas ? JSON.parse(salvas) : [];
        const lista = (await listarPendentes()).filter(
            (s) => s.clienteId !== user.id && s.location && !rejeitadas.includes(s.id)
        );
        const ids = new Set(lista.map((s) => s.id));
        if (vistas.current === null) {
            vistas.current = ids;
        } else {
            const novas = lista.filter((s) => !vistas.current.has(s.id));
            vistas.current = new Set([...vistas.current, ...ids]);
            if (novas.length > 0)
                tocarAlertaSolicitacao();
        }
        setPendentes(lista);
        setAtiva(await buscarAtivaDoTecnico(user.id));
    }, [chaveRejeitadas, user.id]);

    useFocusEffect(useCallback(() => {
        let ativo = true;
        const ciclo = async () => {
            await load();
            const ok = await sincronizar();
            if (ativo && ok) await load();
        };
        ciclo();
        const timer = setInterval(ciclo, POLL_MS);
        return () => {
            ativo = false;
            clearInterval(timer);
        };
    }, [load]));

    const ordenadas = pos
        ? [...pendentes].sort((a, b) => distanciaKm(pos, a.location) - distanciaKm(pos, b.location))
        : pendentes;
    const atual = ativa || ordenadas[0] || null;
    const restantes = ativa ? ordenadas.length : Math.max(0, ordenadas.length - 1);

    const rotaAtual = rota && rota.destinoId === atual?.id ? rota : null;

    useEffect(() => {
        if (tinhaRota.current && !rotaAtual) {
            console.log('[mapa] rota removida: recriando o mapa');
            setMapKey((k) => k + 1);
        }
        tinhaRota.current = !!rotaAtual;
    }, [!!rotaAtual]);

    useEffect(() => {
        console.log('[mapa] estado:', JSON.stringify({
            ativa: ativa?.id ?? null,
            atual: atual?.id ?? null,
            pendentes: ordenadas.length,
            rota: !!rotaAtual
        }));
    }, [ativa?.id, atual?.id, ordenadas.length, !!rotaAtual]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('solicitacao-atualizada', () => {
            console.log('[mapa] solicitação atualizada: limpando rota e recriando o mapa');
            setRota(null);
            setAtiva(null);
            setMapKey((k) => k + 1);
            load();
        });
        return () => sub.remove();
    }, [load]);

    useEffect(() => {
        let cancelado = false;
        setRota(null);
        if (!pos || !atual?.location) return;
        const destinoId = atual.id;
        buscarRota(pos, atual.location)
            .then((r) => { if (!cancelado) setRota({ ...r, destinoId }); })
            .catch((e) => console.log('Rota indisponível:', e?.message));
        return () => { cancelado = true; };
    }, [atual?.id, pos?.latitude, pos?.longitude]);

    useEffect(() => {
        if (!mapRef.current) return;
        if (atual?.location) {
            const pontos = rotaAtual?.coordenadas ?? [atual.location, ...(pos ? [pos] : [])];
            mapRef.current.fitToCoordinates(pontos, {
                edgePadding: { top: 90, right: 60, bottom: 340, left: 60 },
                animated: true
            });
        } else if (pos) {
            centralizar();
        }
    }, [atual?.id, !!pos, !!rotaAtual]);

    function centralizar() {
        if (!pos || !mapRef.current) return;
        mapRef.current.animateToRegion({
            latitude: pos.latitude,
            longitude: pos.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
        }, 400);
    }

    async function aceitar() {
        if (!atual || aceitando) return;
        setAceitando(true);
        try {
            await aceitarSolicitacao(atual.id, { id: user.id, nome: user.nome });
            await load();
        } catch (e) {
            if (e?.message === 'indisponivel') {
                Alert.alert('Chamado indisponível', 'Outro técnico já aceitou esta solicitação.');
                await sincronizar();
                await load();
            } else if (e?.code === 'permission-denied') {
                Alert.alert('Sem permissão', 'O servidor recusou o aceite. Verifique as regras de segurança do Firestore.');
            } else if (e?.code === 'unavailable' || e?.message === 'timeout') {
                Alert.alert('Sem conexão', 'Não foi possível aceitar agora. Verifique sua internet e tente de novo.');
            } else {
                Alert.alert('Erro', 'Não foi possível aceitar a solicitação.');
            }
        } finally {
            setAceitando(false);
        }
    }

    async function rejeitar() {
        if (!atual) return;
        const salvas = await AsyncStorage.getItem(chaveRejeitadas);
        const rejeitadas = salvas ? JSON.parse(salvas) : [];
        await AsyncStorage.setItem(chaveRejeitadas, JSON.stringify([...rejeitadas, atual.id]));
        await load();
    }

    const distancia = rotaAtual
        ? `${rotaAtual.duracaoMin} min · ${formatarDistancia(rotaAtual.distanciaKm)}`
        : atual?.location && pos ? formatarDistancia(distanciaKm(pos, atual.location)) : null;

    return (
        <View style={styles.container}>
            <MapView
                key={mapKey}
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                showsUserLocation={!!pos}
                initialRegion={{
                    latitude: pos?.latitude ?? -15.78,
                    longitude: pos?.longitude ?? -47.93,
                    latitudeDelta: pos ? 0.01 : 30,
                    longitudeDelta: pos ? 0.01 : 30
                }}
                showsMyLocationButton={false}
            >
                {ordenadas.map((s) => (
                    <Marker
                        key={s.id}
                        coordinate={s.location}
                        title={s.clienteNome}
                        pinColor={!ativa && s.id === atual?.id ? '#dc2626' : '#94a3b8'}
                    />
                ))}
                {rotaAtual && (
                    <Polyline key={rotaAtual.destinoId} coordinates={rotaAtual.coordenadas} strokeColor="#2563eb" strokeWidth={5} />
                )}
                {ativa?.location && (
                    <Marker coordinate={ativa.location} title={ativa.clienteNome} pinColor="#16a34a" />
                )}
            </MapView>

            <TouchableOpacity style={styles.centralizar} onPress={centralizar} disabled={!pos}>
                <Text style={styles.centralizarIcone}>◎</Text>
            </TouchableOpacity>

            <View style={styles.sheet}>
                {!atual && (
                    <View style={styles.vazio}>
                        <ActivityIndicator color="#2563eb" />
                        <Text style={styles.vazioTitulo}>Procurando solicitações…</Text>
                        <Text style={styles.vazioSub}>Você está disponível. Novos chamados aparecem aqui.</Text>
                    </View>
                )}

                {atual && (
                    <>
                        <View style={styles.topo}>
                            <Text style={styles.tag}>{ativa ? 'Atendimento em andamento' : 'Nova solicitação'}</Text>
                            {!!distancia && <Text style={styles.distancia}>{distancia}</Text>}
                        </View>
                        <Text style={styles.nome}>{atual.clienteNome || 'Cliente'}</Text>
                        <Text style={styles.descricao} numberOfLines={3}>{atual.descricao}</Text>
                        <Text style={styles.endereco} numberOfLines={2}>
                            📍 {atual.endereco || 'Endereço não disponível (veja o pino no mapa)'}
                        </Text>

                        {ativa ? (
                            <TouchableOpacity
                                style={styles.aceitar}
                                onPress={() => navigation.navigate('DetalheSolicitacao', { solicitacaoId: ativa.id })}
                            >
                                <Text style={styles.btnTexto}>Ver detalhes / concluir</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.botoes}>
                                <TouchableOpacity style={[styles.aceitar, styles.semMargem]} onPress={aceitar} disabled={aceitando}>
                                    <Text style={styles.btnTexto}>{aceitando ? 'Aceitando...' : 'Aceitar'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.rejeitar} onPress={rejeitar} disabled={aceitando}>
                                    <Text style={styles.rejeitarTexto}>Rejeitar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {restantes > 0 && (
                            <Text style={styles.fila}>
                                +{restantes} {restantes === 1 ? 'solicitação' : 'solicitações'} na fila
                            </Text>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 24,
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12
    },
    centralizar: {
        position: 'absolute',
        top: 50,
        right: 16,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6
    },
    centralizarIcone: { fontSize: 24, color: '#2563eb' },
    vazio: { alignItems: 'center', paddingVertical: 14, gap: 8 },
    vazioTitulo: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
    vazioSub: { color: '#64748b', textAlign: 'center' },
    topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tag: { color: '#2563eb', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
    distancia: { color: '#0f172a', fontWeight: '800' },
    nome: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 6 },
    descricao: { color: '#334155', marginTop: 6, lineHeight: 20 },
    endereco: { color: '#64748b', marginTop: 8 },
    botoes: { gap: 10, marginTop: 18 },
    semMargem: { marginTop: 0 },
    rejeitar: {
        height: 54,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center'
    },
    rejeitarTexto: { color: '#dc2626', fontWeight: '800', fontSize: 16 },
    aceitar: {
        height: 54,
        borderRadius: 13,
        backgroundColor: '#16a34a',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18
    },
    btnTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
    fila: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 12 }
});

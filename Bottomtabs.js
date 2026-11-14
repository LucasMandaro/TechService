import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import SolicitarServico from './components/SolicitarServico';
import TecnicoServico from './components/TecnicoServico';
import Historico from './components/Historico';
import DetalheSolicitacao from './components/DetalheSolicitacao';
import Perfil from './components/Perfil';
import Camera from './components/CameraScreen';

const HistoricoStack = createNativeStackNavigator();
const ServicoStack = createNativeStackNavigator();
const PerfilStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HistoricoStackScreen({ user }) {
    return (
        <HistoricoStack.Navigator screenOptions={{ headerShown: false }}>
            <HistoricoStack.Screen name="HistoricoLista">
                {(props) => <Historico {...props} user={user} />}
            </HistoricoStack.Screen>
            <HistoricoStack.Screen name="DetalheSolicitacao">
                {(props) => <DetalheSolicitacao {...props} user={user} />}
            </HistoricoStack.Screen>
            <HistoricoStack.Screen name="Camera" component={Camera} />
        </HistoricoStack.Navigator>
    );
}

function ServicoStackScreen({ user }) {
    const tecnico = user.modo === 'tecnico';
    return (
        <ServicoStack.Navigator screenOptions={{ headerShown: false }}>
            <ServicoStack.Screen name={tecnico ? 'TecnicoServico' : 'SolicitarServico'}>
                {(props) => tecnico
                    ? <TecnicoServico {...props} user={user} />
                    : <SolicitarServico {...props} user={user} />}
            </ServicoStack.Screen>
            <ServicoStack.Screen name="DetalheSolicitacao">
                {(props) => <DetalheSolicitacao {...props} user={user} />}
            </ServicoStack.Screen>
            <ServicoStack.Screen name="Camera" component={Camera} />
        </ServicoStack.Navigator>
    );
}

function PerfilStackScreen({ user, onUpdateUser, onLogout, onTrocarModo }) {
    return (
        <PerfilStack.Navigator screenOptions={{ headerShown: false }}>
            <PerfilStack.Screen name="PerfilHome">
                {(props) => (
                    <Perfil {...props} user={user} onUpdateUser={onUpdateUser}
                        onLogout={onLogout} onTrocarModo={onTrocarModo} />
                )}
            </PerfilStack.Screen>
            <PerfilStack.Screen name="Camera" component={Camera} />
        </PerfilStack.Navigator>
    );
}

function TabIcon({ emoji, focused }) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Text style={styles.iconEmoji}>{emoji}</Text>
        </View>
    );
}

function Abas({ user, onUpdateUser, onLogout, onTrocarModo }) {
    const insets = useSafeAreaInsets();
    const tecnico = user.modo === 'tecnico';
    const emojis = { Historico: '🕘', Servico: tecnico ? '🔧' : '🧰', Perfil: '👤' };
    return (
        <NavigationContainer>
            <Tab.Navigator
                initialRouteName="Servico"
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarActiveTintColor: '#2563eb',
                    tabBarInactiveTintColor: '#64748b',
                    tabBarLabelStyle: styles.label,
                    tabBarStyle: [styles.tabBar, { height: 62 + insets.bottom, paddingBottom: 8 + insets.bottom }],
                    tabBarIcon: ({ focused }) => <TabIcon emoji={emojis[route.name]} focused={focused} />
                })}
            >
                <Tab.Screen name="Historico" options={{ tabBarLabel: 'Histórico' }}>
                    {() => <HistoricoStackScreen user={user} />}
                </Tab.Screen>
                <Tab.Screen name="Servico" options={{ tabBarLabel: 'Serviço' }}>
                    {() => <ServicoStackScreen user={user} />}
                </Tab.Screen>
                <Tab.Screen name="Perfil" options={{ tabBarLabel: 'Perfil' }}>
                    {() => (
                        <PerfilStackScreen user={user} onUpdateUser={onUpdateUser}
                            onLogout={onLogout} onTrocarModo={onTrocarModo} />
                    )}
                </Tab.Screen>
            </Tab.Navigator>
        </NavigationContainer>
    );
}

export default function BottomTabs(props) {
    return (
        <SafeAreaProvider>
            <Abas {...props} />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        paddingTop: 8,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    label: {
        fontSize: 12,
        fontWeight: '700'
    },
    iconWrap: {
        width: 40,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconWrapActive: {
        backgroundColor: '#dbeafe'
    },
    iconEmoji: {
        fontSize: 16
    }
});

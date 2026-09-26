import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SolicitarServico from './components/SolicitarServico';
import Solicitacoes from './components/Solicitacoes';
import DetalheSolicitacao from './components/DetalheSolicitacao';
import Perfil from './components/Perfil';
import Camera from './components/CameraScreen';

const ClienteStack = createNativeStackNavigator();
const TecnicoStack = createNativeStackNavigator();
const UsuarioStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ClienteStackScreen({ user }) {
    return (
        <ClienteStack.Navigator screenOptions={{ headerShown: false }}>
            <ClienteStack.Screen name="SolicitarServico">
                {(props) => <SolicitarServico {...props} user={user} />}
            </ClienteStack.Screen>
            <ClienteStack.Screen name="Camera" component={Camera} />
        </ClienteStack.Navigator>
    );
}

function TecnicoStackScreen({ user }) {
    return (
        <TecnicoStack.Navigator screenOptions={{ headerShown: false }}>
            <TecnicoStack.Screen name="Solicitacoes">
                {(props) => <Solicitacoes {...props} user={user} />}
            </TecnicoStack.Screen>
            <TecnicoStack.Screen name="DetalheSolicitacao">
                {(props) => <DetalheSolicitacao {...props} user={user} />}
            </TecnicoStack.Screen>
            <TecnicoStack.Screen name="Camera" component={Camera} />
        </TecnicoStack.Navigator>
    );
}

function UsuarioStackScreen({ user, onUpdateUser, onLogout }) {
    return (
        <UsuarioStack.Navigator screenOptions={{ headerShown: false }}>
            <UsuarioStack.Screen name="Perfil">
                {(props) => (
                    <Perfil {...props} user={user} onUpdateUser={onUpdateUser} onLogout={onLogout} />
                )}
            </UsuarioStack.Screen>
            <UsuarioStack.Screen name="Camera" component={Camera} />
        </UsuarioStack.Navigator>
    );
}

// Ícones em emoji, para não depender de nenhuma lib de ícones nova.
const ICONS = {
    Cliente: '🧰',
    Tecnico: '🔧',
    Usuario: '👤'
};

function TabIcon({ routeName, focused }) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Text style={styles.iconEmoji}>{ICONS[routeName]}</Text>
        </View>
    );
}

export default function BottomTabs({ user, onUpdateUser, onLogout }) {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarActiveTintColor: '#2563eb',
                    tabBarInactiveTintColor: '#64748b',
                    tabBarLabelStyle: styles.label,
                    tabBarStyle: styles.tabBar,
                    tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />
                })}
            >
                <Tab.Screen name="Cliente" options={{ tabBarLabel: 'Cliente' }}>
                    {() => <ClienteStackScreen user={user} />}
                </Tab.Screen>
                <Tab.Screen name="Tecnico" options={{ tabBarLabel: 'Técnico' }}>
                    {() => <TecnicoStackScreen user={user} />}
                </Tab.Screen>
                <Tab.Screen name="Usuario" options={{ tabBarLabel: 'Usuário' }}>
                    {() => (
                        <UsuarioStackScreen user={user} onUpdateUser={onUpdateUser} onLogout={onLogout} />
                    )}
                </Tab.Screen>
            </Tab.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: 70,
        paddingTop: 8,
        paddingBottom: 12,
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
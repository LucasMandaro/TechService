import React, {useState} from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

function TelaLogin(){
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');

    function entrar(){
        if (!usuario.trim() || !senha){
            Alert.alert('Atenção', 'Preencha usuário e senha.');
            return;
        }
        console.log('Usuário:', usuario);
        console.log('Senha:', senha);
    }

    return(
        <View style={styles.container}>
            <Text style={styles.title}>Bem-vindo ao TechService!</Text>
            <Text>Usuário:</Text>
            <TextInput
                style={styles.input}
                placeholder="Digite seu usuário ou e-mail"
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <Text>Senha:</Text>
            <TextInput
                style={styles.input}
                placeholder="Digite sua senha"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
            />
            <TouchableOpacity style={styles.button} onPress={entrar}>
                <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },

    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        width: '80%',
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginTop: 10,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
import { Vibration } from 'react-native';

let player = null;
let tentou = false;

function obterPlayer() {
    if (tentou) return player;
    tentou = true;
    try {
        const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
        setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
        player = createAudioPlayer(require('./assets/nova-solicitacao.wav'));
    } catch (e) {
        console.log('Som indisponível neste build:', e?.message);
    }
    return player;
}

export async function tocarAlertaSolicitacao() {
    Vibration.vibrate(300);
    const p = obterPlayer();
    if (!p) return;
    try {
        await p.seekTo(0);
        p.play();
    } catch (e) {
        console.log('Falha ao tocar o som:', e?.message);
    }
}

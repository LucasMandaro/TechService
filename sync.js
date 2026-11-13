import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db, storage } from './firebase';
import { STORAGE_KEYS } from './storage';
import { marcarSincronizada, pendentes, upsertRemota } from './database';

const ENVIAR_FOTOS = true;

const TIMEOUT_MS = 10000;

function comTimeout(promise, ms = TIMEOUT_MS) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

export async function uploadFoto(uri, caminho) {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const r = ref(storage, caminho);
    await comTimeout(uploadBytes(r, blob, { contentType: 'image/jpeg' }), 30000);
    return comTimeout(getDownloadURL(r));
}

async function enviarPendentes() {
    const lista = await pendentes();

    for (const s of lista) {
        try {
            let fotoUrl = s.foto_url;
            let conclusaoUrl = s.foto_conclusao_url;

            if (ENVIAR_FOTOS) {
                if (!fotoUrl && s.foto_uri)
                    fotoUrl = await uploadFoto(s.foto_uri, `solicitacoes/${s.id}/aparelho.jpg`);
                if (!conclusaoUrl && s.foto_conclusao_uri)
                    conclusaoUrl = await uploadFoto(s.foto_conclusao_uri, `solicitacoes/${s.id}/conclusao.jpg`);
            }

            const payload = {
                id: s.id,
                clienteId: s.cliente_id,
                clienteNome: s.cliente_nome ?? null,
                descricao: s.descricao,
                location: s.latitude != null ? { latitude: s.latitude, longitude: s.longitude } : null,
                foto: fotoUrl ? { url: fotoUrl } : null,
                status: s.status,
                fotoConclusao: conclusaoUrl ? { url: conclusaoUrl } : null,
                createdAt: s.created_at,
                concludedAt: s.concluded_at ?? null,
                updatedAt: s.updated_at,
            };

            await comTimeout(setDoc(doc(db, 'solicitacoes', s.id), payload, { merge: true }));
            await marcarSincronizada(s.id, s.updated_at, fotoUrl, conclusaoUrl);
        } catch (e) {
            if (e?.message === 'timeout') throw e;
            console.log(`Falha ao enviar solicitação ${s.id}:`, e?.message);
        }
    }
}

async function baixarAtualizacoes() {
    const ultimo = Number((await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC)) || 0);
    const inicio = Date.now();

    const q = query(
        collection(db, 'solicitacoes'),
        where('updatedAt', '>', Math.max(0, ultimo - 60000))
    );
    const snap = await comTimeout(getDocs(q));
    for (const d of snap.docs)
        await upsertRemota(d.data());

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(inicio));
}

let emAndamento = null;

export function sincronizar() {
    if (!auth.currentUser)
        return Promise.resolve(false);
    if (!emAndamento) {
        emAndamento = (async () => {
            try {
                await enviarPendentes();
                await baixarAtualizacoes();
                return true;
            } catch (e) {
                console.log('Sincronização adiada:', e?.code || e?.message);
                return false;
            } finally {
                emAndamento = null;
            }
        })();
    }
    return emAndamento;
}
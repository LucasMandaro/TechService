import { collection, doc, getDoc, getDocs, query, runTransaction, setDoc, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import { STORAGE_KEYS } from './storage';
import { fotoParaBase64 } from './fotos';
import { fotosFaltando, marcarAceita, marcarSincronizada, pendentes, salvarFotoRemota, upsertRemota } from './database';

const ENVIAR_FOTOS = true;

const TIMEOUT_MS = 10000;

function comTimeout(promise, ms = TIMEOUT_MS) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
}

async function enviarFoto(id, tipo, uri, clienteId) {
    const base64 = await fotoParaBase64(uri);
    console.log(`[foto ${tipo}] ${base64.length} caracteres`);
    await comTimeout(
        setDoc(doc(db, 'solicitacoes', id, 'fotos', tipo), {
            base64,
            clienteId,
            updateAt: Date.now(),
        }),
        30000
    );
}

async function baixarFoto(id, tipo) {
    const snap = await comTimeout(getDoc(doc(db, 'solicitacoes', id, 'fotos', tipo)), 30000);
    if (snap.exists() && snap.data().base64) {
        await salvarFotoRemota(id, tipo, snap.data().base64);
    }
}

async function enviarPendentes() {
    const lista = await pendentes();

    for (const s of lista) {
        try {
            let fotoOk = !!s.foto_url;
            let conclusaoOK = !!s.foto_conclusao_url;

            if (ENVIAR_FOTOS) {
                if (!fotoOk && s.foto_uri) {
                    await enviarFoto(s.id, 'aparelho', s.foto_uri, s.cliente_id);
                    fotoOk = true;
                }

                if (!conclusaoOK && s.foto_conclusao_uri) {
                    await enviarFoto(s.id, 'conclusao', s.foto_conclusao_uri, s.cliente_id);
                    conclusaoOK = true;
                }
            }

            console.log('[local]', s.latitude, s.longitude, Object.keys(s).join(','));
            const payload = {
                id: s.id,
                clienteId: s.cliente_id,
                clienteNome: s.cliente_nome ?? null,
                descricao: s.descricao,
                endereco: s.endereco ?? null,
                tecnicoId: s.tecnico_id ?? null,
                tecnicoNome: s.tecnico_nome ?? null,
                location:
                    s.latitude != null && s.longitude != null &&
                        Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude))
                        ? { latitude: Number(s.latitude), longitude: Number(s.longitude) }
                        : null,
                status: s.status,
                createdAt: s.created_at,
                concludedAt: s.concluded_at ?? null,
                updatedAt: s.updated_at,
            };

            if (fotoOk) payload.temFoto = true;
            if (conclusaoOK) payload.temFotoConclusao = true;

            const indefinidos = Object.entries(payload).filter(([, v]) => v === undefined).map(([k]) => k);
            if (indefinidos.length)
                console.log('Campos undefined:', indefinidos);

            await comTimeout(setDoc(doc(db, 'solicitacoes', s.id), payload, { merge: true }));

            await marcarSincronizada(
                s.id,
                s.updated_at,
                !s.foto_url && fotoOk ? 'enviada' : null,
                !s.foto_conclusao_url && conclusaoOK ? 'enviada' : null
            );
        } catch (e) {
            if (e?.message === 'timeout') throw e;
            console.log(`Falha ao enviar solicitação ${s.id} (tentar de novo depois):`, e?.code, e?.message);
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

    for (const d of snap.docs) {
        const dados = d.data();
        await upsertRemota(dados);

        if (ENVIAR_FOTOS) {
            for (const tipo of await fotosFaltando(dados)) {
                await baixarFoto(dados.id, tipo);
            }
        }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(inicio));
}

export async function aceitarSolicitacao(id, tecnico) {
    const ref = doc(db, 'solicitacoes', id);
    const agora = Date.now();
    await comTimeout(runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('indisponivel');
        if (snap.data().status !== 'Pendente') throw new Error('indisponivel');
        tx.update(ref, {
            status: 'Aceita',
            tecnicoId: tecnico.id,
            tecnicoNome: tecnico.nome ?? null,
            updatedAt: agora,
        });
    }));
    await marcarAceita(id, tecnico, agora);
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
                console.log('Sincronização adiada:', e?.stack || e?.message || e);
                return false;
            } finally {
                emAndamento = null;
            }
        })();
    }
    return emAndamento;
}
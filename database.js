import * as SQLite from 'expo-sqlite';

let dbPromise = null;
function getDb(){
    if(!dbPromise) dbPromise = SQLite.openDatabaseAsync('techservice.db');
    return dbPromise;
}

export function novoId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function initDb(){
    const db = await getDb();
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS solicitacoes (
            id TEXT PRIMARY KEY NOT NULL,
            cliente_id TEXT NOT NULL,
            cliente_nome TEXT,
            descricao TEXT,
            latitude REAL,
            longitude REAL,
            foto_uri TEXT,
            foto_url TEXT,
            status TEXT NOT NULL DEFAULT 'Pendente',
            foto_conclusao_uri TEXT,
            foto_conclusao_url TEXT,
            created_at INTEGER NOT NULL,
            concluded_at INTEGER,
            updated_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_solic_cliente ON solicitacoes (cliente_id);
        CREATE INDEX IF NOT EXISTS idx_solic_synced ON solicitacoes (synced);
    `);
}

function paraObjeto(r){
    const uriFoto = r.foto_uri || r.foto_url;
    const uriConclusao = r.foto_conclusao_uri || r.foto_conclusao_url;
    return {
        id: r.id,
        clienteId: r.cliente_id,
        clienteNome: r.cliente_nome,
        descricao: r.descricao,
        location: r.latitude != null ? { latitude: r.latitude, longitude: r.longitude } : null,
        foto: uriFoto ? { uri: uriFoto } : null,
        status: r.status,
        fotoConclusao: uriConclusao ? { uri: uriConclusao } : null,
        createdAt: r.created_at,
        concludedAt: r.concluded_at,
    };
}

export async function criarSolicitacao(s){
    const db = await getDb();
    const agora = Date.now();
    await db.runAsync(
        `INSERT INTO solicitacoes
            (id, cliente_id, cliente_nome, descricao, latitude, longitude, foto_uri, 
            status, created_at, updated_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
            s.id, s.clienteId, s.clienteNome ?? null, s.descricao,
            s.location?.latitude ?? null, s.location?.longitude ?? null,
            s.foto?.uri ?? null, s.status ?? 'Pendente',
            s.createdAt ?? agora, agora,
        ]
    );
}

export async function listarPorCliente(clienteId){
    const db = await getDb();
    const rows = await db.getAllAsync(
        'SELECT * FROM solicitacoes WHERE cliente_id = ? ORDER BY created_at DESC',
        [clienteId]
    );
    return rows.map(paraObjeto);
}

export async function listarTodas(){
    const db = await getDb();
    const rows = await db.getAllAsync(
        'SELECT * FROM solicitacoes ORDER BY created_at DESC'
    );
    return rows.map(paraObjeto);
}

export async function buscarPorId(id){
    const db = await getDb();
    const row = await db.getFirstAsync(
        'SELECT * FROM solicitacoes WHERE id = ?',
        [id]
    );
    return row ? paraObjeto(row) : null;
}

export async function concluirSolicitacao(id, fotoConclusao){
    const db = await getDb();
    const agora = Date.now();
    await db.runAsync(
        `UPDATE solicitacoes
            SET status = 'Concluída', foto_conclusao_uri = ?, concluded_at = ?,
                updated_at = ?, synced = 0
            WHERE id = ?`,
        [fotoConclusao?.uri ?? null, agora, agora, id]
    );
}

export async function pendentes(){
    const db = await getDb();
    return db.getAllAsync(
        'SELECT * FROM solicitacoes WHERE synced = 0 ORDER BY updated_at ASC'
    );
}

export async function marcarSincronizada(id, updatedAtEnviado, fotoUrl, fotoConclusaoUrl){
    const db = await getDb();
    await db.runAsync(
        `UPDATE solicitacoes
            SET foto_url = COALESCE(?, foto_url),
                foto_conclusao_url = COALESCE(?, foto_conclusao_url)
            WHERE id = ?`,
        [fotoUrl ?? null, fotoConclusaoUrl ?? null, id]
    );

    await db.runAsync(
        'UPDATE solicitacoes SET synced = 1 WHERE id = ? AND updated_at = ?',
        [id, updatedAtEnviado]
    );
}

export async function upsertRemota(d){
    const db = await getDb();
    const local = await db.getFirstAsync(
        'SELECT synced, updated_at FROM solicitacoes WHERE id = ?',
        [d.id]
    );

    if(local && (local.synced === 0 || local.updated_at > d.updatedAt)) return;

    await db.runAsync(
        `INSERT INTO solicitacoes
            (id, cliente_id, cliente_nome, descricao, latitude, longitude, foto_url, status, foto_conclusao_url,
            created_at, concluded_at, updated_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
            cliente_nome = excluded.cliente_nome,
            descricao = excluded.descricao,
            status = excluded.status,
            foto_url = excluded.foto_url,
            foto_conclusao_url = excluded.foto_conclusao_url,
            concluded_at = excluded.concluded_at,
            updated_at = excluded.updated_at,
            synced = 1`,
        [
            d.id, d.clienteId, d.clienteNome ?? null, d.descricao ?? '',
            d.location?.latitude ?? null, d.location?.longitude ?? null,
            d.foto?.url ?? null, d.status ?? 'Pendente',
            d.fotoConclusao?.url ?? null,
            d.createdAt ?? Date.now(), d.concludedAt ?? null, d.updatedAt ?? Date.now(),
        ]
    );
}
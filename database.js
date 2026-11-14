import * as SQLite from 'expo-sqlite';

let dbPromise = null;
function getDb() {
    if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('techservice.db');
    return dbPromise;
}

export function novoId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function initDb() {
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

    const colunas = (await db.getAllAsync('PRAGMA table_info(solicitacoes)')).map((c) => c.name);
    for (const [nome, tipo] of [['tecnico_id', 'TEXT'], ['tecnico_nome', 'TEXT'], ['endereco', 'TEXT']]) {
        if (!colunas.includes(nome))
            await db.execAsync(`ALTER TABLE solicitacoes ADD COLUMN ${nome} ${tipo}`);
    }
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_solic_tecnico ON solicitacoes (tecnico_id);');
}

const COLS_LEVES = `id, cliente_id, cliente_nome, descricao, latitude, longitude, status,
    created_at, concluded_at, updated_at, tecnico_id, tecnico_nome, endereco`;

const soDataUri = (v) => (typeof v === 'string' && v.startsWith('data:') ? v : null);

function paraObjeto(r) {
    const uriFoto = r.foto_uri || soDataUri(r.foto_url);
    const uriConclusao = r.foto_conclusao_uri || soDataUri(r.foto_conclusao_url);
    return {
        id: r.id,
        clienteId: r.cliente_id,
        clienteNome: r.cliente_nome,
        descricao: r.descricao,
        endereco: r.endereco ?? null,
        tecnicoId: r.tecnico_id ?? null,
        tecnicoNome: r.tecnico_nome ?? null,
        location: r.latitude != null ? { latitude: r.latitude, longitude: r.longitude } : null,
        foto: uriFoto ? { uri: uriFoto } : null,
        status: r.status,
        fotoConclusao: uriConclusao ? { uri: uriConclusao } : null,
        createdAt: r.created_at,
        concludedAt: r.concluded_at,
    };
}

export async function criarSolicitacao(s) {
    const db = await getDb();
    const agora = Date.now();
    await db.runAsync(
        `INSERT INTO solicitacoes
            (id, cliente_id, cliente_nome, descricao, endereco, latitude, longitude, foto_uri,
            status, created_at, updated_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
            s.id, s.clienteId, s.clienteNome ?? null, s.descricao, s.endereco ?? null,
            s.location?.latitude ?? null, s.location?.longitude ?? null,
            s.foto?.uri ?? null, s.status ?? 'Pendente',
            s.createdAt ?? agora, agora,
        ]
    );
}

export async function listarPorCliente(clienteId) {
    const db = await getDb();
    const rows = await db.getAllAsync(
        'SELECT * FROM solicitacoes WHERE cliente_id = ? ORDER BY created_at DESC',
        [clienteId]
    );
    return rows.map(paraObjeto);
}

export async function listarPorTecnico(tecnicoId) {
    const db = await getDb();
    const rows = await db.getAllAsync(
        'SELECT * FROM solicitacoes WHERE tecnico_id = ? ORDER BY created_at DESC',
        [tecnicoId]
    );
    return rows.map(paraObjeto);
}

export async function listarPendentes() {
    const db = await getDb();
    const rows = await db.getAllAsync(
        `SELECT ${COLS_LEVES} FROM solicitacoes WHERE status = 'Pendente' ORDER BY created_at ASC`
    );
    return rows.map(paraObjeto);
}

export async function buscarAtivaDoTecnico(tecnicoId) {
    const db = await getDb();
    const row = await db.getFirstAsync(
        `SELECT ${COLS_LEVES} FROM solicitacoes
            WHERE tecnico_id = ? AND status = 'Aceita' ORDER BY updated_at DESC`,
        [tecnicoId]
    );
    return row ? paraObjeto(row) : null;
}

export async function marcarAceita(id, tecnico, updatedAt) {
    const db = await getDb();
    await db.runAsync(
        `UPDATE solicitacoes
            SET status = 'Aceita', tecnico_id = ?, tecnico_nome = ?, updated_at = ?, synced = 1
            WHERE id = ?`,
        [tecnico.id, tecnico.nome ?? null, updatedAt, id]
    );
}

export async function listarTodas() {
    const db = await getDb();
    const rows = await db.getAllAsync(
        'SELECT * FROM solicitacoes ORDER BY created_at DESC'
    );
    return rows.map(paraObjeto);
}

export async function buscarPorId(id) {
    const db = await getDb();
    const row = await db.getFirstAsync(
        'SELECT * FROM solicitacoes WHERE id = ?',
        [id]
    );
    return row ? paraObjeto(row) : null;
}

export async function concluirSolicitacao(id, fotoConclusao) {
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

export async function pendentes() {
    const db = await getDb();
    return db.getAllAsync(
        'SELECT * FROM solicitacoes WHERE synced = 0 ORDER BY updated_at ASC'
    );
}

export async function marcarSincronizada(id, updatedAtEnviado, fotoUrl, fotoConclusaoUrl) {
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

export async function upsertRemota(d) {
    const db = await getDb();
    const local = await db.getFirstAsync(
        'SELECT synced, updated_at FROM solicitacoes WHERE id = ?',
        [d.id]
    );
    if (local && (local.synced === 0 || local.updated_at > d.updatedAt))
        return;
    await db.runAsync(
        `INSERT INTO solicitacoes
            (id, cliente_id, cliente_nome, descricao, latitude, longitude, status,
            created_at, concluded_at, updated_at, tecnico_id, tecnico_nome, endereco, synced)
        VALUES (? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,1)
        ON CONFLICT(id) DO UPDATE SET
            cliente_nome = excluded.cliente_nome,
            descricao = excluded.descricao,
            tecnico_id = excluded.tecnico_id,
            tecnico_nome = excluded.tecnico_nome,
            endereco = excluded.endereco,
            status = excluded.status,
            concluded_at = excluded.concluded_at,
            updated_at = excluded.updated_at,
            synced = 1`,
        [
            d.id, d.clienteId, d.clienteNome ?? null, d.descricao ?? '',
            d.location?.latitude ?? null, d.location?.longitude ?? null,
            d.status ?? 'Pendente',
            d.createdAt ?? Date.now(), d.concludedAt ?? null, d.updatedAt ?? Date.now(),
            d.tecnicoId ?? null, d.tecnicoNome ?? null, d.endereco ?? null,
        ]
    );
}

export async function fotosFaltando(d) {
    const db = await getDb();
    const l = await db.getFirstAsync(
        `SELECT foto_uri, foto_url, foto_conclusao_uri, foto_conclusao_url
            FROM solicitacoes WHERE id = ?`,
        [d.id]
    );
    if (!l)
        return [];
    const falta = [];
    if (d.temFoto && !l.foto_uri && !soDataUri(l.foto_url)) falta.push('aparelho');
    if (d.temFotoConclusao && !l.foto_conclusao_uri && !soDataUri(l.foto_conclusao_url))
        falta.push('conclusao');
    return falta;
}

export async function salvarFotoRemota(id, tipo, base64) {
    const db = await getDb();
    const coluna = tipo === 'aparelho' ? 'foto_url' : 'foto_conclusao_url';
    await db.runAsync(`UPDATE solicitacoes SET ${coluna} = ? WHERE id = ?`, [
        `data:image/jpeg;base64,${base64}`,
        id,
    ]);
}
export async function cancelarSolicitacao(id) {
    const db = await getDb();
    const agora = Date.now();
    await db.runAsync(
        `UPDATE solicitacoes
            SET status = 'Cancelada', updated_at = ?, synced = 0
            WHERE id = ? AND status IN ('Pendente', 'Aceita')`,
        [agora, id]
    );
}

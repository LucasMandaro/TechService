const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const TIMEOUT_MS = 10000;

export const temTokenMapbox = !!TOKEN;

export async function buscarRota(origem, destino) {
    if (!TOKEN)
        throw new Error('sem-token');

    const coords = `${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
        `?geometries=geojson&overview=full&access_token=${TOKEN}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const resposta = await fetch(url, { signal: controller.signal });
        if (!resposta.ok)
            throw new Error(`mapbox-${resposta.status}`);
        const dados = await resposta.json();
        const rota = dados.routes?.[0];
        if (!rota)
            throw new Error('sem-rota');
        return {
            coordenadas: rota.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
            distanciaKm: rota.distance / 1000,
            duracaoMin: Math.max(1, Math.round(rota.duration / 60))
        };
    } finally {
        clearTimeout(timer);
    }
}

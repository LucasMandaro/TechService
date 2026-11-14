const ETAPAS_PADRAO = [
    { largura: 800, qualidade: 0.5 },
    { largura: 640, qualidade: 0.4 },
    { largura: 480, qualidade: 0.3 },
];

const LIMITE_BASE64 = 700000;

export async function fotoParaBase64(uri, etapas = ETAPAS_PADRAO) {
    let mod;

    try{
        mod = await import('expo-image-manipulator');
    } catch (e){
        throw new Error('expo-image-manipulator indisponível: gere um novo build do app');
    }

    const { ImageManipulator, SaveFormat } = mod;

    for(const {largura, qualidade} of etapas){
        let res;
        if (typeof ImageManipulator?.manipulate === 'function'){
            const ctx = ImageManipulator.manipulate(uri);
            ctx.resize({ width: largura });
            const img = await ctx.renderAsync();
            res = await img.saveAsync({ format: SaveFormat.JPEG, compress: qualidade, base64: true});
        } else {
            res = await mod.manipulateAsync(
                uri,
                [{ resize: { width: largura } }],
                {compress: qualidade, format: SaveFormat.JPEG, base64: true}
            );
        }
        if (res.base64 && res.base64.length <= LIMITE_BASE64)
            return res.base64;
    }
    throw new Error('Foto grande demais mesmo depois de reduzida');
}

export function paraDataUri(base64){
    return `data:image/jpeg;base64,${base64}`;
}
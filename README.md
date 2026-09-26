# TechService — Visita Técnica

Aplicativo Expo/React Native para registro de visitas técnicas em campo.

## O que foi implementado

- Cadastro de técnico com nome, e-mail e senha.
- Login local usando `AsyncStorage`.
- Sessão persistente usando `AsyncStorage`.
- Desbloqueio biométrico da sessão quando o dispositivo possui biometria cadastrada.
- Dashboard com histórico das visitas do usuário.
- Cadastro/edição de visita técnica.
- Captura da localização GPS da visita.
- Mapa dentro da visita com marcador da localização capturada.
- Câmera frontal/traseira.
- Fotos salvas na galeria do dispositivo.
- Fotos anexadas à visita por categoria: Fachada, Equipamento, Antes, Depois e Documento.
- Armazenamento local dos registros da visita em `AsyncStorage`.

## Instalação

```bash
npm install
npx expo start
```

Para Android:

```bash
npm run android
```

## Observação importante

O cadastro, sessão, visitas e metadados das fotos são locais ao dispositivo. O projeto não possui backend nem sincronização com servidor.

Para produção, não é recomendado armazenar senhas em texto puro no `AsyncStorage`. O ideal é usar autenticação em backend e armazenamento seguro de tokens/credenciais.

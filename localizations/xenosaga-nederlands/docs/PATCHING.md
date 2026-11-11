# Patching — Dutch v1.0.17

1. Open `https://madeby.re/localizations/xenosaga-nederlands/`.
2. Select the exact clean Japanese Xenosaga I+II Nintendo DS ROM.
3. The browser verifies the source SHA-256 locally.
4. The site loads and verifies `assets/patch/Xenosaga_I_II_DS_Dutch_v1.0.17.bps`.
5. BPS is applied locally in a Web Worker.
6. The generated ROM SHA-256 must match the canonical target.
7. Only then is the local download enabled.

No ROM bytes are sent to a server.

Source SHA-256: `938d07521cfc937d179402e85c8b0b43f3e929a494838ff1455b29126b56d356`

Patch SHA-256: `8c102caaff764de32ca677d7de9cfb7622041a8c1f5001a5be60d55498783ae9`

Expected output SHA-256: `ab4b66928073ff6caa61dc0c4f2fcbafa0150a69f003133d252c3737efb26a0b`

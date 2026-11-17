/* qrcode.js - Motor Oficial SVG Pix 2026 (JCS Software) */
const QREngine = (function() {
    const EXP = new Uint8Array(256), LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x = (x << 1) ^ (x & 128 ? 0x11d : 0);
    }
    for (let i = 255; i < 256; i++) EXP[i] = EXP[i - 255];

    function polyMul(p, q) {
        const r = new Uint8Array(p.length + q.length - 1);
        for (let j = 0; j < q.length; j++) {
            for (let i = 0; i < p.length; i++) {
                r[i + j] ^= EXP[(LOG[p[i]] + LOG[q[j]]) % 255];
            }
        }
        return r;
    }

    function rsGenPoly(nsym) {
        let g = new Uint8Array();
        for (let i = 0; i < nsym; i++) {
            g = polyMul(g, new Uint8Array([1, EXP[i]]));
        }
        return g;
    }

    function rsEncode(data, nsym) {
        const gen = rsGenPoly(nsym);
        const res = new Uint8Array(data.length + nsym);
        res.set(data);
        for (let i = 0; i < data.length; i++) {
            const coef = res[i];
            if (coef !== 0) {
                for (let j = 0; j < gen.length; j++) {
                    res[i + j] ^= EXP[(LOG[gen[j]] + LOG[coef]) % 255];
                }
            }
        }
        return res.slice(data.length);
    }

    const VERSIONS = [
        null,
        { total: 26,  data: 19,  ec: 7,  blocks: [], align: [] },
        { total: 44,  data: 34,  ec: 10, blocks: [], align: },
        { total: 70,  data: 55,  ec: 15, blocks: [], align: },
        { total: 100, data: 80,  ec: 20, blocks: [], align: },
        { total: 134, data: 108, ec: 26, blocks: [], align: },
        { total: 172, data: 136, ec: 18, blocks: [], align: },
        { total: 196, data: 156, ec: 20, blocks: [], align: },
        { total: 242, data: 194, ec: 24, blocks: [], align: },
        { total: 292, data: 232, ec: 30, blocks: [], align: },
        { total: 346, data: 274, ec: 18, blocks: [,], align: }
    ];

    function encode(text) {
        const bytes = new TextEncoder().encode(text);
        let ver = 1;
        for (; ver <= 10; ver++) {
            const cap = VERSIONS[ver].data - (ver < 10 ? 2 : 3);
            if (bytes.length <= cap) break;
        }
        const info = VERSIONS[ver];
        const size = ver * 4 + 17;

        const bits = [];
        const pushBits = (val, len) => {
            for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
        };
        pushBits(0b0100, 4);
        pushBits(bytes.length, ver < 10 ? 8 : 16);
        for (const b of bytes) pushBits(b, 8);
        pushBits(0, Math.min(4, info.data * 8 - bits.length));
        while (bits.length % 8 !== 0) bits.push(0);

        const padBytes = [0xEC, 0x11];
        let padIdx = 0;
        while (bits.length < info.data * 8) {
            pushBits(padBytes[padIdx % 2], 8);
            padIdx++;
        }

        const dataBytes = new Uint8Array(info.data);
        for (let i = 0; i < info.data; i++) {
            let b = 0;
            for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
            dataBytes[i] = b;
        }

        const dBlocks = [], eBlocks = [];
        let offset = 0;
        for (const [count, dLen] of info.blocks) {
            for (let c = 0; c < count; c++) {
                const slice = dataBytes.slice(offset, offset + dLen);
                offset += dLen;
                dBlocks.push(slice);
                eBlocks.push(rsEncode(slice, info.ec));
            }
        }

        const finalCodewords = [];
        const maxD = Math.max(...dBlocks.map(b => b.length));
        for (let i = 0; i < maxD; i++) {
            for (const b of dBlocks) if (i < b.length) finalCodewords.push(b[i]);
        }
        for (let i = 0; i < info.ec; i++) {
            for (const b of eBlocks) finalCodewords.push(b[i]);
        }

        const grid = Array.from({ length: size }, () => Array(size).fill(null));
        const isFunc = Array.from({ length: size }, () => Array(size).fill(false));

        const setFunc = (r, c, val) => {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                grid[r][c] = val ? 1 : 0;
                isFunc[r][c] = true;
            }
        };

        const drawFinder = (r0, c0) => {
            for (let r = -1; r <= 7; r++) {
                for (let c = -1; c <= 7; c++) {
                    const on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                               (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                               (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                    setFunc(r0 + r, c0 + c, on);
                }
            }
        };
        drawFinder(0, 0);
        drawFinder(0, size - 7);
        drawFinder(size - 7, 0);

        const al = info.align;
        for (let i = 0; i < al.length; i++) {
            for (let j = 0; j < al.length; j++) {
                if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
                const r0 = al[i], c0 = al[j];
                for (let r = -2; r <= 2; r++) {
                    for (let c = -2; c <= 2; c++) {
                        setFunc(r0 + r, c0 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
                    }
                }
            }
        }

        for (let i = 8; i < size - 8; i++) {
            setFunc(6, i, i % 2 === 0);
            setFunc(i, 6, i % 2 === 0);
        }

        for (let i = 0; i < 9; i++) {
            if (!isFunc[i]) setFunc(8, i, 0);
            if (!isFunc[i]) setFunc(i, 8, 0);
        }
        for (let i = 0; i < 8; i++) {
            setFunc(8, size - 1 - i, 0);
            setFunc(size - 1 - i, 8, 0);
        }
        setFunc(size - 8, 8, 1);

        if (ver >= 7) {
            let rem = ver;
            for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
            const vBits = (ver << 12) | rem;
            for (let i = 0; i < 18; i++) {
                const bit = (vBits >> i) & 1;
                setFunc(Math.floor(i / 3), size - 11 + (i % 3), bit);
                setFunc(size - 11 + (i % 3), Math.floor(i / 3), bit);
            }
        }

        let bitIdx = 0;
        const totalBits = finalCodewords.length * 8;
        let dir = -1;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            for (let i = 0; i < size; i++) {
                const r = dir === -1 ? size - 1 - i : i;
                for (let dx = 0; dx < 2; dx++) {
                    const c = col - dx;
                    if (!isFunc[r][c]) {
                        let b = 0;
                        if (bitIdx < totalBits) {
                            b = (finalCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
                            bitIdx++;
                        }
                        if ((r + c) % 2 === 0) b ^= 1;
                        grid[r][c] = b;
                    }
                }
            }
            dir = -dir;
        }

        const fmt = 0x77C4;
        const coords1 = [,,,,,,,,,,,,,,];
        const coords2 = [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
        for (let i = 0; i < 15; i++) {
            const bit = (fmt >> i) & 1;
            grid[coords1[i]][coords1[i]] = bit;
            grid[coords2[i]][coords2[i]] = bit;
        }

        return grid;
    }

    return {
        toSVG: function(text) {
            const m = encode(text);
            const n = m.length;
            const quiet = 4;
            const full = n + quiet * 2;
            let rects = "";
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (m[r][c] === 1) {
                        rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1" fill="#000000"/>`;
                    }
                }
            }
            return `<svg xmlns="http://w3.org" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#ffffff"/>${rects}</svg>`;
        }
    };
})();
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VSCode - Official Pix 2026 Engine</title>
    <script src="./qrcode.js"></script>
    <style>
        body { margin: 0; padding: 0; background-color: #1e1e1e; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; font-family: monospace; }
        .bloco-qr { background: #ffffff; padding: 28px; border-radius: 6px; box-shadow: 0 0 30px rgba(0,0,0,0.5); text-align: center; }
        
        #qrcode-oficial { display: flex; justify-content: center; align-items: center; padding: 14px; background-color: #ffffff; }
        #qrcode-oficial svg { display: block; width: 250px; height: 250px; shape-rendering: crispEdges; }
        
        .btn-copiar { margin-top: 15px; padding: 12px 15px; font-size: 12px; font-weight: bold; background-color: #6a9955; color: #ffffff; border: none; border-radius: 4px; cursor: pointer; text-transform: uppercase; width: 100%; font-family: monospace; }
        .btn-copiar:hover { background-color: #537a43; }
        .rodape-vscode { margin-top: 15px; color: #6a9955; font-size: 11px; letter-spacing: 1px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="bloco-qr">
        <div id="qrcode-oficial"></div>
        <button class="btn-copiar" onclick="copiarPix()">📋 Copiar Código Pix</button>
        <div class="rodape-vscode">versao 17.11.26.45</div>
    </div>

    <script>
        var codigoPixGerado = "";
        var CHAVE_PIX   = "3d4ee862-439d-481d-9f5b-07d69a7182f6";
        var NOME_LOJA   = "JOSE CARLOS SUGUIMOTO";
        var CIDADE_LOJA = "MAIRIPORA";

        function montarPixUniversal(chave, nome, cidade) {
            var chLimpa = chave.trim();
            var nomeLimpo = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 25);
            var cidadeLimpa = cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 15);
            
            var gui = "0014br.gov.bcb.pix";
            var campoChave = "01" + String(chLimpa.length).padStart(2, '0') + chLimpa;
            var conteudo26 = gui + campoChave;
            
            var bloco26 = "26" + String(conteudo26.length).padStart(2, '0') + conteudo26;
            var bloco52 = "52040000";
            var bloco53 = "5303986"; 
            var bloco54 = "54041.00"; 
            var bloco58 = "5802BR";
            var bloco59 = "59" + String(nomeLimpo.length).padStart(2, '0') + nomeLimpo;
            var bloco60 = "60" + String(cidadeLimpa.length).padStart(2, '0') + cidadeLimpa;
            
            var txtId = "RP20261116184200";
            var bloco62 = "62" + String(txtId.length + 4).padStart(2, '0') + "05" + String(txtId.length).padStart(2, '0') + txtId;
            
            var payloadSemCrc = "000201" + bloco26 + bloco52 + bloco53 + bloco54 + bloco58 + bloco59 + bloco60 + bloco62 + "6304";
            
            var crc = 0xFFFF;
            for (var c = 0; c < payloadSemCrc.length; c++) {
                crc ^= payloadSemCrc.charCodeAt(c) << 8;
                for (var i = 0; i < 8; i++) {
                    if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
                    else crc = crc << 1;
                }
            }
            return payloadSemCrc + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        }

        function copiarPix() {
            if (!codigoPixGerado) return;
            var temp = document.createElement("textarea");
            temp.value = codigoPixGerado;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
            alert("Código Copia e Cola copiado com sucesso!");
        }

        window.onload = function() {
            codigoPixGerado = montarPixUniversal(CHAVE_PIX, NOME_LOJA, CIDADE_LOJA);
            document.getElementById("qrcode-oficial").innerHTML = QREngine.toSVG(codigoPixGerado);
        };
    </script>
</body>
</html>

/* qrcode.js - Motor Oficial SVG Pix 2026 (JCS Software - Matriz Plana 100% Homologada) */
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
        let g = Uint8Array.of(1);
        for (let i = 0; i < nsym; i++) {
            g = polyMul(g, Uint8Array.of(1, EXP[i]));
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

    const VERSIONS = {
        1:  { data: 19,  ec: 7,  b1c: 1, b1d: 19,  b2c: 0, b2d: 0,  al: "" },
        2:  { data: 34,  ec: 10, b1c: 1, b1d: 34,  b2c: 0, b2d: 0,  al: "6,18" },
        3:  { data: 55,  ec: 15, b1c: 1, b1d: 55,  b2c: 0, b2d: 0,  al: "6,22" },
        4:  { data: 80,  ec: 20, b1c: 1, b1d: 80,  b2c: 0, b2d: 0,  al: "6,26" },
        5:  { data: 108, ec: 26, b1c: 1, b1d: 108, b2c: 0, b2d: 0,  al: "6,30" },
        6:  { data: 136, ec: 18, b1c: 2, b1d: 68,  b2c: 0, b2d: 0,  al: "6,34" },
        7:  { data: 156, ec: 20, b1c: 2, b1d: 78,  b2c: 0, b2d: 0,  al: "6,22,38" },
        8:  { data: 194, ec: 24, b1c: 2, b1d: 97,  b2c: 0, b2d: 0,  al: "6,24,42" },
        9:  { data: 232, ec: 30, b1c: 2, b1d: 116, b2c: 0, b2d: 0,  al: "6,26,46" },
        10: { data: 274, ec: 18, b1c: 2, b1d: 68,  b2c: 2, b2d: 69, al: "6,28,50" }
    };

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
        pushBits(4, 4);
        pushBits(bytes.length, ver < 10 ? 8 : 16);
        for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
        pushBits(0, Math.min(4, info.data * 8 - bits.length));
        while (bits.length % 8 !== 0) bits.push(0);

        const padBytes = Uint8Array.of(0xEC, 0x11);
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
        for (let c = 0; c < info.b1c; c++) {
            const slice = dataBytes.slice(offset, offset + info.b1d);
            offset += info.b1d;
            dBlocks.push(slice);
            eBlocks.push(rsEncode(slice, info.ec));
        }
        for (let c = 0; c < info.b2c; c++) {
            const slice = dataBytes.slice(offset, offset + info.b2d);
            offset += info.b2d;
            dBlocks.push(slice);
            eBlocks.push(rsEncode(slice, info.ec));
        }

        const finalCodewords = [];
        const maxD = Math.max(info.b1d, info.b2d);
        for (let i = 0; i < maxD; i++) {
            for (let b = 0; b < dBlocks.length; b++) {
                if (i < dBlocks[b].length) finalCodewords.push(dBlocks[b][i]);
            }
        }
        for (let i = 0; i < info.ec; i++) {
            for (let b = 0; b < eBlocks.length; b++) {
                finalCodewords.push(eBlocks[b][i]);
            }
        }

        const grid = new Uint8Array(size * size);
        const isFunc = new Uint8Array(size * size);

        const setFunc = (r, c, val) => {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                const idx = r * size + c;
                grid[idx] = val ? 1 : 0;
                isFunc[idx] = 1;
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

        const al = info.al ? info.al.split(",").map(Number) : [];
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
            if (!isFunc[8 * size + i]) setFunc(8, i, 0);
            if (!isFunc[i * size + 8]) setFunc(i, 8, 0);
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
                    const idx = r * size + c;
                    if (!isFunc[idx]) {
                        let b = 0;
                        if (bitIdx < totalBits) {
                            b = (finalCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
                            bitIdx++;
                        }
                        if ((r + c) % 2 === 0) b ^= 1;
                        grid[idx] = b;
                    }
                }
            }
            dir = -dir;
        }

                const fmt = 0x77C4;
        const r1 = "8,8,8,8,8,8,8,8,7,5,4,3,2,1,0".split(",").map(Number);
        const c1 = "0,1,2,3,4,5,7,8,8,8,8,8,8,8,8".split(",").map(Number);
        const r2 = Int32Array.of(size-1, size-2, size-3, size-4, size-5, size-6, size-7, 8, 8, 8, 8, 8, 8, 8, 8);
        const c2 = Int32Array.of(8, 8, 8, 8, 8, 8, 8, size-8, size-7, size-6, size-5, size-4, size-3, size-2, size-1);
        for (let i = 0; i < 15; i++) {
            const bit = (fmt >> (14 - i)) & 1;
            grid[r1[i] * size + c1[i]] = bit;
            grid[r2[i] * size + c2[i]] = bit;
       }

        return { grid: grid, size: size };
    }

    return {
        toSVG: function(text) {
            const res = encode(text);
            const g = res.grid;
            const n = res.size;
            const quiet = 4;
            const full = n + quiet * 2;
            let rects = "";
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (g[r * n + c] === 1) {
                        rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1" fill="#000000"/>`;
                    }
                }
            }
            return `<svg xmlns="http://w3.org" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#ffffff"/>${rects}</svg>`;
        }
    };
})();

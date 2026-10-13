# Monster Energy · A jornada (conceito APX Web)

Experiência web conceitual em 3D, guiada pelo scroll, sobre a linha Monster Energy no Brasil.
**Projeto conceitual desenvolvido pela APX Web. Não afiliado ou endossado pela Monster Energy.**

## Rodar

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # typecheck + build de produção em dist/
npm run preview    # http://localhost:4174
npm run test:e2e   # Playwright (desktop + mobile), sobe build + preview sozinho
```

Parâmetros de teste: `?nogl` força o caminho sem WebGL; `?lite` força o perfil leve de mobile.

## Arquitetura

| Camada | Onde |
| --- | --- |
| Dados dos produtos (auditáveis) | `src/data/catalog.json`, gerado por `tools/build-catalog.py` a partir das páginas oficiais salvas em `tools/data/pages` (`tools/extract-catalog.py`) |
| Copy das etapas | `src/data/stations.ts` |
| Progresso do scroll (Lenis, sem re-render React) | `src/motion/scroll.ts` |
| Partitura da narrativa (câmera, lata, golpes, impressão, tampa, luz) | `src/three/timeline.ts` (keyframes cúbicos monotônicos, sem overshoot) |
| Diretor: resolve o estado de cada quadro | `src/three/Director.tsx`, `src/three/frame.ts` |
| Lata: perfis de torno com morph disco → copo → parede → fundo → gargalo | `src/three/can/profiles.ts`, `lathe.ts`, `parts.ts` |
| Materiais (impressão em etapas, dissolução, projeção das embalagens oficiais) | `src/three/can/materials.ts`, `textures.ts` |
| Cenas | `src/three/scenes/` (Origin, Press, FillLine, RevealLight, Catalog3D, Atmosphere, JourneyCan) |
| Palco, pós-processamento, DPR adaptativo, aquecimento de shaders | `src/three/Stage.tsx`, `Precompile.tsx` |
| DOM: abertura/etapas, catálogo, ficha, encerramento | `src/sections/` |

A cena inteira é função do progresso do scroll: subir o scroll reproduz o filme ao contrário,
quadro a quadro (há um teste de diferença de pixels para isso). A lata do catálogo segue um
elemento DOM (`#can-slot`), então o layout responsivo manda e o 3D acompanha.

## Fontes

- Catálogo: https://www.monsterenergy.com/pt-br/energy-drinks/ (consultado em 12/10/2026): 17 variantes em 4 linhas.
- Cada produto: página oficial individual (URL em `sources` de cada registro), com nome, perfil de sabor,
  descrição, calorias, cafeína e açúcares totais exatamente como publicados.
- Volume: 269 ml declarado na própria página; 473 ml quando citado nos links de compra exibidos na página
  oficial ou legível na embalagem oficial. Ultra Strawberry Dreams fica como "não informado".
- Ingredientes: não publicados nas páginas consultadas, sinalizados como tal.
- Imagens de produto, símbolo (garra) e logotipo: arquivos oficiais do site. Todos os rasters em `public/`
  levam a origem embutida (`impeccable embed-prompt --read <arquivo>`).

## Imagens em alta

O site oficial só publica as latas em 250×625 px. `tools/compose-hd.py` gera versões de 600 px:
Real-ESRGAN (x4plus) na arte e nos logotipos, e ampliação Lanczos simples nas faixas de texto miúdo
(parágrafo de denominação, volume lateral, canto do selo frontal), para que nenhuma letra do rótulo seja
alterada. Saídas: `public/products/hd/*.webp` (imagens com transparência) e `public/products/tex/*.jpg`
(texturas da projeção 3D com margens já preenchidas, decodificadas fora da thread principal).

```bash
realesrgan-ncnn-vulkan -i tools/data/renders -o <saida-4x> -n realesrgan-x4plus -s 4 -f png
python tools/compose-hd.py <saida-4x>
```

No celular, a fileira final usa a versão de 250 px e a lata em destaque busca a HD só do sabor selecionado.

## Qualidade

- `npm run test:e2e`: carregamento sem erros, progresso das etapas, reversibilidade por pixels, 17 variantes,
  filtros por linha, dados por sabor, ficha (abrir, próximo/anterior, Esc), campos ausentes sinalizados,
  teclado na faixa, sem overflow horizontal, aviso legal, sem WebGL, movimento reduzido, fontes e imagens.
- `node scripts/perf.mjs <url> <w> <h> [cpuThrottle]`: varredura de tempo de quadro da página inteira.
- `node scripts/capture-stills.mjs`: regenera os quadros do caminho sem WebGL a partir da cena 3D.

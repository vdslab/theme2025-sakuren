// オフスクリーンcanvasに六角形グリッド背景を描画するユーティリティ
// canvasWidthPx, canvasHeightPx, tileEdge: 必須
// options: { tileScale, fillColor, tileOffset, extraMargin }

/**
 * @param {number} canvasWidthPx - 出力canvasのピクセル幅（devicePixelRatio考慮済み）
 * @param {number} canvasHeightPx - 出力canvasのピクセル高さ（devicePixelRatio考慮済み）
 * @param {number} tileEdge - 六角形の1辺長（ピクセル）
 * @param {object} [options]
 * @param {number} [options.tileScale=0.95] - 六角形の縮小率
 * @param {string} [options.fillColor='#fff'] - 塗り色
 * @param {number} [options.tileOffset=1] - グリッドオフセット
 * @param {number} [options.extraMargin=2] - 余白
 * @returns {HTMLCanvasElement} - 描画済みオフスクリーンcanvas
 */
export function buildHexBackgroundCanvas(
  canvasWidthPx,
  canvasHeightPx,
  tileEdge,
  options = {}
) {
  const tileScale = options.tileScale !== undefined ? options.tileScale : 0.95;
  const fillColor = options.fillColor || "#ddd";
  const tileOffset = options.tileOffset !== undefined ? options.tileOffset : 1;
  const gridUnit = options.gridUnit || { width: 0.75, height: 1.0 };
  const providedTileCounts = options.tileCounts;
  const extraMargin =
    options.extraMargin !== undefined ? options.extraMargin : 2;

  const off = document.createElement("canvas");
  off.width = canvasWidthPx;
  off.height = canvasHeightPx;
  const ctx = off.getContext("2d");
  ctx.clearRect(0, 0, off.width, off.height);

  const tileSizeWidth = Math.sqrt(3) * tileEdge;
  const tileSizeHeight = 2 * tileEdge;
  const tileCountsWidth =
    providedTileCounts?.width !== undefined
      ? providedTileCounts.width
      : Math.floor(
          canvasWidthPx / (tileSizeWidth * gridUnit.width) - tileOffset * 2
        );
  const tileCountsHeight =
    providedTileCounts?.height !== undefined
      ? providedTileCounts.height
      : Math.floor(
          canvasHeightPx / (tileSizeHeight * gridUnit.height) - tileOffset * 2
        );

  const xStart = -extraMargin;
  const xEnd = tileCountsWidth + extraMargin;
  const yStart = -extraMargin;
  const yEnd = tileCountsHeight + extraMargin;

  ctx.fillStyle = fillColor;
  for (let x = xStart; x < xEnd; x++) {
    for (let y = yStart; y < yEnd; y++) {
      const drawOffsetX = y % 2 === 0 ? 0.5 : 0.0;
      const centerX =
        tileSizeWidth * ((x + tileOffset) * gridUnit.width + drawOffsetX);
      const centerY =
        tileSizeHeight * ((y + tileOffset) * gridUnit.height + 0.0);
      const sw = tileSizeWidth * tileScale;
      const sh = tileSizeHeight * tileScale;
      const p1x = centerX - sw * 0.5,
        p1y = centerY - sh * 0.25;
      const p2x = centerX,
        p2y = centerY - sh * 0.5;
      const p3x = centerX + sw * 0.5,
        p3y = centerY - sh * 0.25;
      const p4x = centerX + sw * 0.5,
        p4y = centerY + sh * 0.25;
      const p5x = centerX,
        p5y = centerY + sh * 0.5;
      const p6x = centerX - sw * 0.5,
        p6y = centerY + sh * 0.25;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.lineTo(p5x, p5y);
      ctx.lineTo(p6x, p6y);
      ctx.closePath();
      ctx.fill();
    }
  }
  console.log(`tiles (計算): ${tileCountsWidth} x ${tileCountsHeight}`);
  console.log(`tiles (描画): ${xEnd - xStart} x ${yEnd - yStart}`);
  return off;
}

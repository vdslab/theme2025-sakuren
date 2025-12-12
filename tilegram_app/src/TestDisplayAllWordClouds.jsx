import { useRef, useState } from "react";
import WordCloud from "wordcloud";
import normdata from "../public/wordcloud_layout_norm.json";

export const TestDisplayAllWordClouds = () => {
  const [zoom, setZoom] = useState(1); // ズーム倍率
  const canvasRefs = useRef({});

  const prefectures = [
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "秋田県",
    "山形県",
    "福島県",
    "茨城県",
    "栃木県",
    "群馬県",
    "埼玉県",
    "千葉県",
    "東京都",
    "神奈川県",
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
    "三重県",
    "滋賀県",
    "京都府",
    "大阪府",
    "兵庫県",
    "奈良県",
    "和歌山県",
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県",
  ];

  const maskPath = "/prefecture_layer";

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(`mask読めない: ${src}`);
      img.src = src;
    });

  const generateCloud = async (pref) => {
    const canvas = canvasRefs.current[pref];
    if (!canvas) return;

    const img = await loadImage(`${maskPath}/${pref}/${pref}.png`);
    const words = Object.entries(normdata[pref]).map(([text, size]) => [
      text,
      size,
    ]);

    // mask用キャンバス作成
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = img.width;
    maskCanvas.height = img.height;
    const ctx = maskCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0, maskCanvas.width, maskCanvas.height);

    // WordCloudJS に渡す
    WordCloud(canvas, {
      list: words,
      gridSize: 4,
      weightFactor: (size) => size * zoom,
      fontFamily: "sans-serif",
      rotateRatio: 0,
      backgroundColor: "transparent",
      drawOutOfBound: false,
      maskCanvas: maskCanvas,
    });
  };

  const generateAll = async () => {
    for (const pref of prefectures) {
      try {
        await generateCloud(pref);
        console.log(`${pref} 完了`);
      } catch (err) {
        console.error(`${pref} 失敗`, err);
      }
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={generateAll}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        47都道府県の WordCloud を全て生成して表示
      </button>

      {/* ズームスライダー */}
      <div className="mt-4">
        <label>
          ズーム: {zoom.toFixed(1)}x
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="ml-2"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        {prefectures.map((pref) => (
          <div key={pref}>
            <h3 className="font-bold text-center">{pref}</h3>
            <canvas
              ref={(el) => (canvasRefs.current[pref] = el)}
              width={500}
              height={500}
              style={{
                border: "1px solid #ddd",
                width: "100%",
                height: "auto",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

import cloud from "d3-cloud";
import { useState } from "react";
import normdata from "../public/wordcloud_layout_norm.json";

export const GenerateAllWordClouds = () => {
  const [currentPref, setCurrentPref] = useState("");
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState([]);

  const maskUrls = "/prefecture_layer";

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

  const generateLayouts = async () => {
    setErrors([]);
    setStatus("生成中...");

    const allLayouts = [];

    for (const pref of prefectures) {
      setCurrentPref(pref);
      console.log(`⏳ ${pref} を生成中…`);

      try {
        // ---------------------------------
        // ① mask 読み込み
        // ---------------------------------
        const maskUrl = `${maskUrls}/${pref}/${pref}.png`;
        let img;
        try {
          img = await loadImage(maskUrl);
        } catch (e) {
          throw new Error(`mask画像が読み込めません: ${maskUrl}`);
        }

        // ---------------------------------
        // ② ImageData
        // ---------------------------------
        let maskArray;
        try {
          maskArray = getMaskArray(img);
        } catch (e) {
          throw new Error(`mask画像 → ImageData 変換エラー (${pref})`);
        }

        // ---------------------------------
        // ③ words
        // ---------------------------------
        const words = Object.entries(normdata[pref]).map(([text, size]) => ({
          text,
          size,
        }));
        if (!words || words.length === 0) {
          throw new Error(`wordデータなし: ${pref}`);
        }

        // ---------------------------------
        // ④ d3-cloud レイアウト生成
        // ---------------------------------
        let layout;
        try {
          layout = await generateCloudLayout(words, maskArray);
        } catch (e) {
          throw new Error(`d3-cloud レイアウト生成エラー (${pref})`);
        }

        allLayouts.push({ prefecture: pref, layout });
      } catch (err) {
        console.error(`❌ ${pref} の生成に失敗:`, err);
        setErrors((prev) => [...prev, { pref, error: err.message }]);
        // 失敗しても次へ進む
      }
    }

    // 全件処理後
    downloadJSON(allLayouts);
    setStatus("完了しました！");
    setCurrentPref("");
  };

  return (
    <div className="p-4">
      <button
        onClick={generateLayouts}
        className="p-2 bg-blue-500 text-white rounded"
      >
        47都道府県 全ての WordCloud を生成し JSON をダウンロード
      </button>

      {/* 現在の進捗表示 */}
      {status && (
        <div className="mt-4 text-lg">
          <div>{status}</div>
          {currentPref && <div className="font-bold">▶ {currentPref}</div>}
        </div>
      )}

      {/* エラーがある場合 */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
          <div className="font-bold text-red-700">
            ⚠ エラーが発生した都道府県:
          </div>
          <ul className="mt-2 list-disc ml-6">
            {errors.map((e, idx) => (
              <li key={idx}>
                {e.pref}: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ----- Utility Functions ----- */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function getMaskArray(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

function generateCloudLayout(words, maskArray) {
  return new Promise((resolve, reject) => {
    try {
      cloud()
        .size([3000, 3000])
        .words(words)
        .padding(1)
        .rotate(0)
        .font("sans-serif")
        .fontSize((d) => d.size)
        .on("end", resolve)
        .start();
    } catch (e) {
      reject(e);
    }
  });
}

function downloadJSON(obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prefecture_wordclouds.json";
  a.click();
  URL.revokeObjectURL(url);
}

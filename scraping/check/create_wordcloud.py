#!/usr/bin/env python3
"""
Per-file square wordcloud generator.

For each `*.txt` under `./scraping/check/data/` this script will:
 - extract tokens (MeCab if available, otherwise regexp)
 - compute frequencies and save `<stem>_word_freq.json`
 - generate a square wordcloud image `<stem>_wordcloud.png`
 - save layout JSON `<stem>_wordcloud_layout.json` with positions/colors/font sizes

Usage:
 python3 create_wordcloud.py --data-dir ./scraping/check/data --out-dir ./scraping/check/output --font /path/to/font.ttf --size 2000 --top 200
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import List

from wordcloud import WordCloud


def read_text_file(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        try:
            return p.read_text(encoding="shift_jis")
        except Exception:
            print(f"Warning: failed to read {p}")
            return ""


def tokenize_with_mecab(text: str) -> List[str] | None:
    try:
        import MeCab

        try:
            import ipadic

            tagger = MeCab.Tagger(ipadic.MECAB_ARGS)
        except Exception:
            tagger = MeCab.Tagger()
    except Exception:
        return None

    # Preprocess similarly to draw_detail.py
    text = unicodedata.normalize("NFKC", text)
    text = text.upper()
    text = re.sub(r"[【】 ()（）『』　「」]", "", text)
    text = re.sub(r"[[［］]]", " ", text)
    text = re.sub(r"[@＠]\w+", "", text)
    text = re.sub(r"\d+\.\d+", "", text)

    node = tagger.parseToNode(text)
    words: List[str] = []
    while node:
        feat = node.feature.split(",")[0]
        if feat == "名詞":
            s = node.surface
            if s:
                words.append(s)
        node = node.next
    return words


def simple_tokenize(text: str) -> List[str]:
    # normalize like mecab path
    text = unicodedata.normalize("NFKC", text)
    text = text.upper()
    # Latin words / numbers
    words: List[str] = re.findall(r"[A-Za-z0-9_]+", text)
    # Japanese sequences (Kanji/Hiragana/Katakana)
    words += re.findall(r"[一-龯ぁ-んァ-ヴー]+", text)
    # filter short tokens
    return [w for w in words if len(w) >= 2]


# prefectures list and stopwords copied/derived from draw_detail.py
prefectures = [
    "北海道",
    "青森",
    "岩手",
    "宮城",
    "秋田",
    "山形",
    "福島",
    "茨城",
    "栃木",
    "群馬",
    "埼玉",
    "千葉",
    "東京",
    "神奈川",
    "新潟",
    "富山",
    "石川",
    "福井",
    "山梨",
    "長野",
    "岐阜",
    "静岡",
    "愛知",
    "三重",
    "滋賀",
    "京都",
    "大阪",
    "兵庫",
    "奈良",
    "和歌山",
    "鳥取",
    "島根",
    "岡山",
    "広島",
    "山口",
    "徳島",
    "香川",
    "愛媛",
    "高知",
    "福岡",
    "佐賀",
    "長崎",
    "熊本",
    "大分",
    "宮崎",
    "鹿児島",
    "沖縄",
]

stopwords = set(
    [
        "ーー",
        "店",
        "円",
        "味",
        "料理",
        "さん",
        "ランチ",
        "最高",
        "麺",
        "雰囲気",
        "丼",
        "定食",
        "メニュー",
        "満足",
        "注文",
        "人",
        "感じ",
        "店員",
        "普通",
        "セット",
        "2",
        "時",
        "酒",
        "方",
        "利用",
        "値段",
        "ご飯",
        "的",
        "時間",
        "スープ",
        "ボリューム",
        "量",
        "中",
        "屋",
        "こと",
        "訪問",
        "1",
        "コース",
        "放題",
        "店内",
        "牛",
        "一",
        "刺身",
        "ー",
        "接客",
        "ここ",
        "どれ",
        "日",
        "好き",
        "焼き",
        "味噌",
        "野菜",
        "種類",
        "パ",
        "何",
        "感",
        "予約",
        "コス",
        "よう",
        "食事",
        "残念",
        "揚げ",
        "対応",
        "目",
        "3",
        "気",
        "個室",
        "そう",
        "席",
        "塩",
        "前",
        "豊富",
        "もの",
        "魚",
        "唐",
        "おすすめ",
        "パン",
        "駅",
        "今日",
        "醤油",
        "中華",
        "提供",
        "笑",
        "これ",
        "丁寧",
        "サービス",
        "今回",
        "コスパ",
        "日本",
        "温泉",
        "お昼",
        "ごちそうさま",
        "隠岐",
        "来店",
        "近江",
        "琵琶湖",
        "購入",
        "綺麗",
        "ゴルフ",
        "会津",
        "白河",
        "限定",
        "仕事",
        "新鮮",
        "お腹",
        "来店",
        "久しぶり",
        "台湾",
        "いっぱい",
        "ごちそうさま",
        "食堂",
        "購入",
        "家族",
        "絶品",
        "オーダー",
        "越前",
        "駐車",
        "300",
        "郡山",
        "飛騨",
        "500",
        "みたい",
        "好み",
        "100",
        "人気",
        "レストラン",
        "淡路島",
        "直島",
        "三盆",
        "奄美",
        "天草",
        "伊勢",
        "信州",
        "軽井沢",
        "大変",
        "平日",
        "五島",
        "佐世保",
        "島原",
        "替玉",
        "無料",
        "中津",
        "別府",
        "スタッフ",
        "安定",
        "一一",
        "佐野",
        "伊豆",
        "阿波",
        "鳴門",
        "素材",
        "リーズナブル",
        "親切",
        "オススメ",
        "価格",
        "居心地",
        "全部",
        "大山",
        "氷見",
    ]
    + prefectures
)


def build_freqs(text: str) -> Counter:
    words = tokenize_with_mecab(text)
    if words is None:
        words = simple_tokenize(text)

    # filter tokens: length, stopwords, digits and prefecture names
    filtered = []
    for w in words:
        if not w:
            continue
        if w.isdigit():
            continue
        if len(w) < 2:
            continue
        if w in stopwords:
            continue
        if w in prefectures:
            continue
        filtered.append(w)

    return Counter(filtered)


def save_freqs(counter: Counter, out_dir: Path, stem: str):
    out = out_dir / f"{stem}_word_freq.json"
    obj = [{"word": w, "count": c} for w, c in counter.most_common()]
    out.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved frequencies: {out}")


def make_wordcloud_and_layout(
    counter: Counter,
    out_dir: Path,
    stem: str,
    font_path: str | None = None,
    size: int = 2000,
    max_words: int = 200,
):
    if WordCloud is None:
        print("Error: wordcloud package not installed. pip install wordcloud pillow")
        return

    freq = {w: int(c) for w, c in counter.items()}

    # respect provided font_path, otherwise fallback to common mac path
    if not font_path:
        font_path = "/Library/Fonts/YuGothR.ttc"

    wc = WordCloud(
        width=size,
        height=size,
        background_color="white",
        font_path=font_path,
        collocations=False,
        max_words=max_words,
    )
    wc.generate_from_frequencies(freq)

    img_path = out_dir / f"{stem}_wordcloud.png"
    wc.to_file(str(img_path))
    print(f"Saved image: {img_path}")

    # layout_: list of tuples (word, font_size, position, orientation, color)
    layout = []
    for entry in wc.layout_:
        word = entry[0]
        font_size = entry[1]
        position = entry[2]
        orientation = entry[3]
        color = entry[4]
        layout.append(
            {
                "word": word,
                "count": int(freq.get(word, 0)),
                "font_size": font_size,
                "x": float(position[0]),
                "y": float(position[1]),
                "orientation": orientation,
                "color": color,
            }
        )

    layout_path = out_dir / f"{stem}_wordcloud_layout.json"
    layout_path.write_text(
        json.dumps(layout, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Saved layout: {layout_path}")


def main() -> None:
    data_dir = "scraping/check/data"
    out_dir = "./scraping/check/output"
    font_path = "/Library/Fonts/YuGothR.ttc"
    topn = 200
    size = 2000

    data_dir = Path(data_dir)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(data_dir.glob("*.txt"))
    if not files:
        print("No .txt files found in data dir")
        return

    for f in files:
        stem = f.stem
        print(f"Processing {f.name} ...")
        text = read_text_file(f)
        if not text.strip():
            print(f"  skip empty: {f.name}")
            continue

        freqs = build_freqs(text)
        if not freqs:
            print(f"  no tokens for {f.name}")
            continue

        top_counter = Counter(dict(freqs.most_common(topn)))

        save_freqs(top_counter, out_dir, stem)
        make_wordcloud_and_layout(
            top_counter,
            out_dir,
            stem,
            font_path=font_path,
            size=size,
            max_words=topn,
        )


if __name__ == "__main__":
    main()

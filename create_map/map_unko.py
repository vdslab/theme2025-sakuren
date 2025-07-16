import os
from PIL import Image
import matplotlib.pyplot as plt

# 白背景を透明に変換する関数
def make_white_transparent(img):
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # RGBすべてが240以上なら白っぽいと判断し透明に
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))  # 透明
        else:
            newData.append(item)
    img.putdata(newData)
    return img

# 都道府県画像のフォルダパス
image_folder = "./prefecture_layer/"

# 画像ファイル一覧取得（pngファイルのみ）
image_files = [f for f in os.listdir(image_folder) if f.endswith(".png")]

if not image_files:
    raise ValueError("画像フォルダにPNGファイルがありません")

# 1枚目の画像を基準に読み込み（大きさ取得）
base_image = Image.open(os.path.join(image_folder, image_files[0]))
width, height = base_image.size

# すべての画像を読み込み、白背景を透明に変換してリサイズも
images = []
for f in image_files:
    img = Image.open(os.path.join(image_folder, f))
    img = make_white_transparent(img)  # 白背景を透明に
    if img.size != (width, height):
        img = img.resize((width, height))
    images.append(img)

# 透明キャンバス作成
combined = Image.new("RGBA", (width, height), (255, 255, 255, 0))

# 全画像を重ねる
for img in images:
    combined = Image.alpha_composite(combined, img)

# 表示
plt.figure(figsize=(10, 10))
plt.imshow(combined)
plt.axis("off")
plt.show()

# 必要なら保存
combined.save("combined_prefectures.png")
print("✅ 画像を合成して保存しました: combined_prefectures.png")

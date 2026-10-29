# Put a caption bar under each captured frame:  python3 tools/anim/label.py IN_DIR OUT_DIR
# Captions come from labels.json ("boss|facing|move"); edit NAMES / MOVES below for new bosses and moves.
import json, os, sys, glob
from PIL import Image, ImageDraw, ImageFont
src, dst = sys.argv[1], sys.argv[2]
fonts = glob.glob('/usr/share/fonts/**/NotoSansCJK-Bold.ttc', recursive=True) + glob.glob('/usr/share/fonts/**/*CJK*.tt[cf]', recursive=True)
F = fonts[0] if fonts else None
font = lambda s: ImageFont.truetype(F, s, index=0) if F else ImageFont.load_default()
NAMES = {'deathknight': 'デスナイト', 'goblinking': 'ゴブリンキング', 'ghostcaptain': 'ゆうれいせんちょう', 'cyclops': 'サイクロプス', 'shadowhero': 'シャドウヒーロー', 'demongeneral': 'まぐんしょうぐん', 'fallenangel': 'だてんし', 'nightmare': 'ナイトメア', 'fenrir': 'フェンリル', 'bonedragon': 'ボーンドラゴン', 'leviathan': 'リヴァイアサン', 'quetzal': 'ケツァルコアトル', 'hydra': 'ヒュドラ', 'cerberus': 'ケルベロス', 'voideye': 'ヴォイドアイ', 'clockmachine': 'クロックマシン', 'kraken': 'クラーケン', 'kingslime': 'キングスライム', 'treant': 'ジャイアントトレント', 'spiderqueen': 'クイーンスパイダー', 'dragon': 'えんりゅう', 'thunderbird': 'サンダーバード', 'lich': 'リッチ', 'icequeen': 'こおりの女王', 'pharaoh': 'ファラオ', 'archmage': 'だいまどうし'}
FACE = {'f': '正面', 'r': '右向き', 'l': '左向き', 'b': '後ろ向き'}
MOVES = {'idle': 'たいき', 'stalk': 'あるく', 'quake': 'じひびき', 'darkwave': 'やみのざんげき', 'sweep': 'おおぶり', 'dash3': '3れんとっしん', 'charge': 'とっしん',
         'rocks': 'いわとばし', 'aimed5': 'たまうち', 'cannons': 'いっせいほうげき', 'triple': 'まほうのわ', 'bombs': 'ばくだんなげ', 'boulders': 'いわなだれ', 'jump': 'ジャンプ', 'twin': 'りょうば',
         'spiral': 'うずまきだん', 'homing': 'ついびだん', 'dreamorbs': 'あくむの あわ', 'breath': 'ブレス', 'gapring': 'すきまの わ', 'packhunt': 'まぼろしの むれ',
         'tentacles': 'しょくしゅ', 'tsunami': 'だいつなみ', 'wave': 'なみうち', 'tail': 'しっぽ', 'tornado': 'たつまき',
         'regen': 'さいせい', 'laser3': '3ほうこう ビーム', 'cross': 'じゅうじ ビーム', 'warp': 'ワープ', 'gaze': 'ついびの まなざし', 'clock': 'とけいの はり',
         'timestop': 'タイムストップ', 'mines': 'じらい', 'fireball': 'ひのたま', 'ink': 'すみの うみ', 'breath3': '3つくびの ブレス',
         'split': 'ぶんれつジャンプ', 'ring': 'わっか だん', 'aimed3': 'ねらいうち', 'roots': 'ねっこしばり', 'webnet': 'くものす ばくだん', 'laser': 'ビーム', 'thunderlines': 'いかずちの あみ', 'aimed5': 'ねらいうち', 'rain': 'ふりそそぐ', 'scythe': 'おおがま', 'soulstorm': 'たましいの うず', 'icecage': 'こおりの おり', 'quicksand': 'すなじごく', 'illusion': 'げんえいじゅつ', 'summon': 'しょうかん', 'spiral3': 'うずまきだん'}
os.makedirs(dst, exist_ok=True)
L = json.load(open(os.path.join(src, 'labels.json')))
files = sorted(f for f in os.listdir(src) if f.startswith('f') and f.endswith('.png'))
for i, fn in enumerate(files):
    boss, d, m = L[i].split('|'); im = Image.open(os.path.join(src, fn)).convert('RGB')
    txt = f"{NAMES.get(boss, boss)}（{FACE.get(d, d)}）　{MOVES.get(m, m)}"
    c = Image.new('RGB', (im.width, im.height + 52), (16, 14, 24)); c.paste(im, (0, 0)); g = ImageDraw.Draw(c)
    fs = font(30); tw = g.textlength(txt, font=fs)
    if tw > im.width - 16: fs = font(int(30 * (im.width - 16) / tw)); tw = g.textlength(txt, font=fs)
    g.text(((im.width - tw) / 2, im.height + 8), txt, font=fs, fill=(255, 236, 170)); c.save(os.path.join(dst, fn))

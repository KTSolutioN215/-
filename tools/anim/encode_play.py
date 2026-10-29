"""Encode complete-game recordings in one stream; verify every frame before delivery."""
import argparse,json,os,shutil,subprocess,tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--input',default='out/play_motion');p.add_argument('--out',required=True);args=p.parse_args()
folder=Path(args.input).resolve();out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
recording=json.loads((folder/'recording.json').read_text());count=recording['frameCount'];frames=[folder/('f%05d.png'%i) for i in range(count)];assert all(p.is_file() for p in frames)
with tempfile.TemporaryDirectory(prefix='yusha-play-') as temp:
 normal=Path(temp)/'normal.mp4';slow=Path(temp)/'slow.mp4'
 process=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-c:v','libx264','-threads','2','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(normal)],stdin=subprocess.PIPE)
 try:
  for frame in frames:process.stdin.write(frame.read_bytes())
 finally:process.stdin.close()
 assert process.wait()==0
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(normal),'-vf','setpts=2*PTS','-r','15','-c:v','libx264','-threads','2','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(slow)],check=True)
 for src,name,seconds in [(normal,'boss_batch3.mp4',count/30),(slow,'boss_batch3_slow.mp4',count/15)]:
  subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(src),'-f','null','-'],check=True)
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','format=duration:stream=nb_read_frames','-of','json',str(src)]));assert abs(float(info['format']['duration'])-seconds)<.04;assert int(info['streams'][0]['nb_read_frames'])==count
  shutil.copy2(src,out/name);print(f'{name}: {count} frames / {seconds:.1f} seconds / full decode passed',flush=True)
from PIL import Image,ImageDraw,ImageFont
fontfile=os.environ.get('FONT');font=ImageFont.truetype(fontfile,23) if fontfile else ImageFont.load_default();title=ImageFont.truetype(fontfile,30) if fontfile else font
poster=Image.new('RGB',(1170,1190),'#14131b');draw=ImageDraw.Draw(poster);draw.text((20,15),'元絵の部品を使った全身モーション・検証プレイ',font=title,fill='#eee3b8')
shots=['spiderqueen_f_webnet_25.png','dragon_f_breath_25.png','thunderbird_f_thunderlines_65.png','kraken_f_tentacles_65.png','clockmachine_r_timestop_25.png']
for i,file in enumerate(shots):
 im=Image.open(folder/file).resize((390,560),Image.Resampling.NEAREST);poster.paste(im,(i%3*390,65+i//3*560))
draw.text((800,680),'勇者・背景・弾・予告',font=font,fill='#eee3b8');draw.text((800,725),'すべてゲーム内描画',font=font,fill='#eee3b8');draw.text((800,790),'動作確認用：',font=font,fill='#b7b4bc');draw.text((800,830),'勇者無敵・技を指定',font=font,fill='#b7b4bc')
poster.save(out/'boss_batch3_sheet.png')

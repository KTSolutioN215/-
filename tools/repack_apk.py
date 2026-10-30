"""Update web assets in an existing wrapper APK; align and sign with the fixed project key.
Use only while the Android wrapper itself is unchanged. Official Android build-tools are required.
"""
import argparse,pathlib,re,subprocess,tempfile,zipfile,shutil
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--build-tools',required=True);p.add_argument('--out',default='ButsukariYusha.apk');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parent.parent;tools=pathlib.Path(a.build_tools).resolve();base=pathlib.Path(a.base).resolve();dest=pathlib.Path(a.out).resolve();dest.parent.mkdir(parents=True,exist_ok=True)
def cert(file):
 text=subprocess.check_output([str(tools/'apksigner'),'verify','--print-certs',str(file)],text=True)
 return re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]+)',text).group(1)
old_cert=cert(base)
assets={'assets/'+f.name:f.read_bytes() for f in (root/'web').glob('*.js')}
head='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'
assets['assets/index.html']=(head+(root/'web/index.html').read_text()+'</body></html>').encode()
with tempfile.TemporaryDirectory(prefix='yusha-apk-') as folder:
 folder=pathlib.Path(folder);unsigned=folder/'unsigned.apk';aligned=folder/'aligned.apk';signed=folder/'signed.apk'
 with zipfile.ZipFile(base) as src,zipfile.ZipFile(unsigned,'w') as out:
  seen=set()
  for info in src.infolist():
   if info.filename.startswith('META-INF/'):continue
   out.writestr(info,assets.get(info.filename,src.read(info.filename)));seen.add(info.filename)
  for name,data in assets.items():
   if name not in seen:out.writestr(name,data,compress_type=zipfile.ZIP_DEFLATED)
 subprocess.run([str(tools/'zipalign'),'-p','-f','4',str(unsigned),str(aligned)],check=True)
 subprocess.run([str(tools/'apksigner'),'sign','--ks',str(root/'app/debug.keystore'),'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','androiddebugkey','--v2-signing-enabled','true','--out',str(signed),str(aligned)],check=True)
 assert cert(signed)==old_cert,'Signing certificate changed'
 with zipfile.ZipFile(signed) as z,zipfile.ZipFile(base) as original:
  assert z.testzip() is None
  for name,data in assets.items():assert z.read(name)==data,name
  for name in original.namelist():
   if not name.startswith(('assets/','META-INF/')):assert z.read(name)==original.read(name),'Wrapper changed: '+name
 subprocess.run([str(tools/'zipalign'),'-c','-p','4',str(signed)],check=True)
 shutil.copy2(signed,dest)
print('Verified: unchanged wrapper, current assets, same signing certificate, alignment and ZIP CRC:',dest)

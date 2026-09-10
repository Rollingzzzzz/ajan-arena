import mss
import time
import os

vd = r"D:\projeler\ajan-arena\video\ekran"
os.makedirs(vd, exist_ok=True)
sure = 120          # saniye
fps = 2             # kare/sn
aralik = 1.0 / fps

print("ekran kaydi basliyor:", sure, "sn ·", fps, "fps")
with mss.mss() as sct:
    monitor = sct.monitors[1]   # ana monitor
    for i in range(int(sure * fps)):
        goruntu = sct.grab(monitor)
        dosya = os.path.join(vd, "ekran_%04d.png" % i)
        mss.tools.to_png(goruntu.rgb, goruntu.size, output=dosya)
        if i % 20 == 0:
            print("kare", i)
        time.sleep(aralik)
print("ekran kaydi bitti:", i + 1, "kare")

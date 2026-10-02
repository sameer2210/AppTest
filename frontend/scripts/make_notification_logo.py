from PIL import Image, ImageDraw
import os

src = r"d:\Stron-w\Stron-App_ReactNative\assets\logo\logo.png"
out_dir = r"d:\Stron-w\Stron-App_ReactNative\plugins\native\res\drawable"
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src).convert("RGBA")
pixels = img.load()
w, h = img.size

sil = Image.new("RGBA", (w, h), (0, 0, 0, 0))
sp = sil.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        brightness = (r + g + b) / 3
        if a < 20 or brightness < 28:
            sp[x, y] = (0, 0, 0, 0)
        else:
            sp[x, y] = (255, 255, 255, 255)

size = max(w, h)
pad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
pad.paste(sil, ((size - w) // 2, (size - h) // 2), sil)
pad = pad.resize((96, 96), Image.Resampling.LANCZOS)
pad_path = os.path.join(out_dir, "notification_icon.png")
pad.save(pad_path, "PNG")

badge_size = 192
blue = Image.new("RGBA", (badge_size, badge_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(blue)
margin = 4
draw.rounded_rectangle(
    [margin, margin, badge_size - margin - 1, badge_size - margin - 1],
    radius=42,
    fill=(8, 108, 255, 255),
)
inner = 128
sil_scaled = sil.resize((inner, inner), Image.Resampling.LANCZOS)
ox = (badge_size - inner) // 2
oy = (badge_size - inner) // 2
blue.paste(sil_scaled, (ox, oy), sil_scaled)
badge_path = os.path.join(out_dir, "stron_notification_logo.png")
blue.save(badge_path, "PNG")

print("wrote", pad_path, os.path.getsize(pad_path))
print("wrote", badge_path, os.path.getsize(badge_path))

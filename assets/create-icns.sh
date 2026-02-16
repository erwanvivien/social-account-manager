cd /Users/erwanvivien/account_manager
mkdir -p /tmp/icon.iconset

for size in 16 32 64 128 256 512; do
  sips -z $size $size assets/icon.png --out /tmp/icon.iconset/icon_${size}x${size}.png >/dev/null;
done

for size in 16 32 128 256; do 
  double=$((size * 2)); 
  sips -z $double $double assets/icon.png --out /tmp/icon.iconset/icon_${size}x${size}@2x.png >/dev/null; 
done

sips -z 1024 1024 assets/icon.png --out /tmp/icon.iconset/icon_512x512@2x.png >/dev/null
iconutil -c icns /tmp/icon.iconset -o assets/icon.icns

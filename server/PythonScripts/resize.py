import sys
from PIL import Image
import base64
import io

def compress_image(img, target_size_kb):
    if not target_size_kb or target_size_kb == 'undefined':
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=95, optimize=True)
        return buffer.getvalue(), buffer.getbuffer().nbytes

    target_bytes = int(float(target_size_kb)) * 1024
    quality = 95
    step = 10

    while quality >= 1:
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        size = buffer.getbuffer().nbytes
        
        if size <= target_bytes:
            return buffer.getvalue(), size
            
        quality -= step
        step = max(1, step // 2)
    
    return buffer.getvalue(), size

def resize_image(input_path, width, height, target_size_kb, output_format):
    with Image.open(input_path) as img:
        img = img.convert('RGB')
        img = img.resize((int(width), int(height)), Image.LANCZOS)
        
        jpeg_data, compressed_size = compress_image(img, target_size_kb)
        
        if output_format.lower() == 'png':
            buffer = io.BytesIO()
            Image.open(io.BytesIO(jpeg_data)).save(buffer, format='PNG')
            final_data = buffer.getvalue()
        else:
            final_data = jpeg_data

        return base64.b64encode(final_data).decode('utf-8'), compressed_size / 1024

if __name__ == "__main__":
    input_path, width, height, *args = sys.argv[1:]
    target_size_kb = args[0] if len(args) > 1 else None
    output_format = args[-1]
    
    resized_image, actual_size = resize_image(input_path, width, height, target_size_kb, output_format)
    print(f"{resized_image},{actual_size:.2f}")
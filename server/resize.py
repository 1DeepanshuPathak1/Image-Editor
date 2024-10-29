import sys
from PIL import Image
import base64
import io

def compress_image(img, target_size_kb, output_format):
    target_size_bytes = int(target_size_kb) * 1024
    max_quality = 95
    min_quality = 1
    quality = max_quality
    step = 5

    while True:
        buffer = io.BytesIO()
        if output_format.lower() == 'png':
            img.save(buffer, format='PNG', optimize=True, quality=quality)
        else:
            img.save(buffer, format=output_format.upper(), quality=quality, optimize=True)
        
        size = buffer.getbuffer().nbytes
        print(f"Debug: Compressed to {size / 1024:.2f} KB with quality {quality}")

        if size <= target_size_bytes or quality <= min_quality:
            return buffer.getvalue(), size

        if quality == min_quality:
            # If we're at minimum quality and still over size, we can't compress further
            print(f"Warning: Could not meet target size. Smallest achieved: {size / 1024:.2f} KB")
            return buffer.getvalue(), size

        # Binary search approach for faster convergence
        if size > target_size_bytes:
            max_quality = quality
            quality = max(quality - step, min_quality)
        else:
            min_quality = quality
            quality = min(quality + step, max_quality)
        
        step = max(step // 2, 1)

def resize_image(input_path, width, height, target_size_kb, output_format):
    print(f"Debug: Starting resize_image with target size {target_size_kb} KB")
    with Image.open(input_path) as img:
        # Resize the image to the specified dimensions
        img = img.resize((int(width), int(height)), Image.LANCZOS)
        print(f"Debug: Image resized to {width}x{height}")
        
        # Convert to the desired format
        if output_format.lower() != 'png':
            img = img.convert('RGB')
        
        # Compress the image
        compressed_image, final_size = compress_image(img, target_size_kb, output_format)
        
        # Encode as base64
        encoded_image = base64.b64encode(compressed_image).decode('utf-8')
        
        print(f"Debug: Final size: {final_size / 1024:.2f} KB")
        return encoded_image, final_size / 1024  # Return size in KB

if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python resize.py <input_path> <width> <height> <target_size_kb> <output_format>")
        sys.exit(1)

    input_path = sys.argv[1]
    width = sys.argv[2]
    height = sys.argv[3]
    target_size_kb = float(sys.argv[4])
    output_format = sys.argv[5]

    print(f"Debug: Arguments received: {sys.argv[1:]}")

    resized_image, actual_size = resize_image(input_path, width, height, target_size_kb, output_format)
    print(f"{resized_image},{actual_size:.2f}")
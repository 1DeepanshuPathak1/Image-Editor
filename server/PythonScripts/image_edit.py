from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageDraw
import sys
import io
import numpy as np

def apply_filter(image_data, filter_type, rotation, intensity=50):
    img = Image.open(io.BytesIO(image_data))
    factor = intensity / 50

    if filter_type == 'greyscale':
        img = ImageOps.grayscale(img)
    elif filter_type == 'blackwhite':
        img = img.convert('L').point(lambda p: 255 if p > 128 else 0, '1')
    elif filter_type == 'blur':
        img = img.filter(ImageFilter.GaussianBlur(factor * 10))
    elif filter_type == 'brightness':
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(factor * 2) 
    elif filter_type == 'contrast':
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(factor * 2)
    elif filter_type == 'sepia':
        img_array = np.array(img)
        sepia_matrix = np.array([
            [0.393, 0.769, 0.189],
            [0.349, 0.686, 0.168],
            [0.272, 0.534, 0.131]
        ])
        sepia_array = np.dot(img_array, sepia_matrix.T)
        sepia_array = np.clip(sepia_array * factor, 0, 255).astype(np.uint8)
        img = Image.fromarray(sepia_array)
    elif filter_type == 'invert':
        img = ImageOps.invert(img)
    elif filter_type == 'edge':
        img = img.filter(ImageFilter.FIND_EDGES)
    elif filter_type == 'vignette':
        y, x = np.ogrid[:img.height, :img.width]
        center_y, center_x = img.height / 2, img.width / 2
        distances = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        max_distance = np.sqrt((img.width/2)**2 + (img.height/2)**2)
        alpha = 255 * (1 - (distances/max_distance) * factor)
        alpha = np.clip(alpha, 0, 255).astype('uint8')
        mask = Image.fromarray(alpha)
        img = Image.composite(img, Image.new("RGB", img.size, "black"), mask)

    img = img.rotate(rotation)

    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()

if __name__ == '__main__':
    filter_type = sys.argv[1]
    rotation = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    intensity = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    image_data = sys.stdin.buffer.read()
    edited_image = apply_filter(image_data, filter_type, rotation, intensity)
    sys.stdout.buffer.write(edited_image)

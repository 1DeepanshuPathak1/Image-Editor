from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import sys
import io

def apply_filter(image_data, filter_type, rotation):
    img = Image.open(io.BytesIO(image_data))

    if filter_type == 'greyscale':
        img = ImageOps.grayscale(img)
    elif filter_type == 'blackwhite':
        img = img.convert('L').point(lambda p: 255 if p > 128 else 0, '1')
    elif filter_type == 'rotate':
        img = img.rotate(rotation, expand=True)  # Expand to fit rotated image
    elif filter_type == 'blur':
        img = img.filter(ImageFilter.GaussianBlur(5))
    elif filter_type == 'brightness':
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.5)
    elif filter_type == 'contrast':
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)
    elif filter_type == 'sepia':
        sepia = [(r * 0.393 + g * 0.769 + b * 0.189,
                  r * 0.349 + g * 0.686 + b * 0.168,
                  r * 0.272 + g * 0.534 + b * 0.131)
                 for r, g, b in img.convert("RGB").getdata()]
        img.putdata([tuple(map(int, pixel)) for pixel in sepia])
    elif filter_type == 'invert':
        img = ImageOps.invert(img)
    elif filter_type == 'edge':
        img = img.filter(ImageFilter.FIND_EDGES)
    elif filter_type == 'vignette':
        mask = Image.new("L", img.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([(0, 0), img.size], fill=255)
        img = Image.composite(img, ImageOps.colorize(mask, "black", "black"), mask)

    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()

if __name__ == '__main__':
    filter_type = sys.argv[1]
    rotation = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    image_data = sys.stdin.buffer.read()
    edited_image = apply_filter(image_data, filter_type, rotation)
    sys.stdout.buffer.write(edited_image)

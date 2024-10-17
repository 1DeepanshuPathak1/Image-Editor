from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageDraw
import sys
import io

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
        # Apply sepia filter
        sepia_image = Image.new("RGB", img.size)
        for y in range(img.height):
            for x in range(img.width):
                r, g, b = img.getpixel((x, y))
                tr = int(r * 0.393 + g * 0.769 + b * 0.189)
                tg = int(r * 0.349 + g * 0.686 + b * 0.168)
                tb = int(r * 0.272 + g * 0.534 + b * 0.131)

                # Apply intensity factor
                tr = min(255, int(tr * factor))
                tg = min(255, int(tg * factor))
                tb = min(255, int(tb * factor))

                sepia_image.putpixel((x, y), (tr, tg, tb))
        
        img = sepia_image
    elif filter_type == 'invert':
        img = ImageOps.invert(img)
    elif filter_type == 'edge':
        img = img.filter(ImageFilter.FIND_EDGES)
    elif filter_type == 'vignette':
        mask = Image.new("L", img.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        for y in range(img.height):
            for x in range(img.width):
                distance = ((x - img.width / 2) ** 2 + (y - img.height / 2) ** 2) ** 0.5
                max_distance = ((img.width / 2) ** 2 + (img.height / 2) ** 2) ** 0.5
                alpha = int(255 * (1 - distance / max_distance))
                alpha = max(0, min(255, alpha))
                mask_draw.point((x, y), fill=alpha)

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

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
        img = img.rotate(rotation)  # Rotate based on passed rotation
    elif filter_type == 'crop':
        width, height = img.size
        img = img.crop((0, 0, width // 2, height // 2))
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
                 for r, g, b in img.getdata()]
        img.putdata([tuple(map(int, pixel)) for pixel in sepia])
    elif filter_type == 'invert':
        img = ImageOps.invert(img)
    elif filter_type == 'edge':
        img = img.filter(ImageFilter.FIND_EDGES)

    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()

if __name__ == '__main__':
    filter_type = sys.argv[1]
    rotation = int(sys.argv[2]) if len(sys.argv) > 2 else 0  # Get rotation from command line
    image_data = sys.stdin.buffer.read()  # Read image from stdin
    edited_image = apply_filter(image_data, filter_type, rotation)
    sys.stdout.buffer.write(edited_image)  # Write image to stdout

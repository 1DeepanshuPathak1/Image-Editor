import sys
import os
from PIL import Image

def resize_image(input_path, width, height):
    try:
        with Image.open(input_path) as img:
            img = img.resize((int(width), int(height)))
            output_path = 'uploads/resized_image.png'  # Change this to your desired output path
            img.save(output_path)
            print(f'Successfully resized image to {output_path}')
            return output_path
    except Exception as e:
        print(f'Error resizing image: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python image_edit.py <input_path> <width> <height>")
        sys.exit(1)

    input_path = sys.argv[1]
    width = sys.argv[2]
    height = sys.argv[3]

    # Ensure the input path is valid
    if not os.path.exists(input_path):
        print(f"Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(1)

    resize_image(input_path, width, height)

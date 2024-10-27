import sys
from PIL import Image
import base64

def resize_image(image_path, width, height):
    # Open an image file
    with Image.open(image_path) as img:
        # Resize image
        img = img.resize((int(width), int(height)))

        # Save the resized image to a temporary file
        output_path = 'resized_image.png'  # Change this to your desired output path
        img.save(output_path)

        # Return the base64 string of the resized image
        with open(output_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return encoded_string

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Not enough arguments. Provide image path, width, and height.")
        sys.exit(1)

    image_path = sys.argv[1]
    width = sys.argv[2]
    height = sys.argv[3]
    
    # Call the resize function and print the base64 string
    resized_image = resize_image(image_path, width, height)
    print(resized_image)

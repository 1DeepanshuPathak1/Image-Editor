import sys
import base64
from PIL import Image
from io import BytesIO

# Get the filter type from the command line arguments
filter_type = sys.argv[1]

# Read image data from standard input
input_data = sys.stdin.buffer.read()

# Process the image
image = Image.open(BytesIO(input_data))

# Apply the specified filter
if filter_type == "crop":
    image = image.crop((0, 0, image.width // 2, image.height // 2))  # Example crop
elif filter_type == "greyscale":
    image = image.convert("L")
elif filter_type == "blackwhite":
    image = image.convert("1")

# Save the edited image to a BytesIO object
output_buffer = BytesIO()
image.save(output_buffer, format='PNG')
output_buffer.seek(0)

# Write the edited image to standard output
sys.stdout.buffer.write(output_buffer.read())

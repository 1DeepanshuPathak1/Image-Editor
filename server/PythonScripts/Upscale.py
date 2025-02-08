import torch
import numpy as np
import sys
import io
import json
import traceback
import os
from PIL import Image
from torchvision.transforms import ToTensor, ToPILImage

# Load the SwinIR model
def load_swinir_model():
    from models.network_swinir import SwinIR as net
    model = net(upscale=4, in_chans=3, img_size=64, window_size=8,
                img_range=1., depths=[6, 6, 6, 6, 6, 6], embed_dim=180, num_heads=[6, 6, 6, 6, 6, 6],
                mlp_ratio=2, upsampler='nearest+conv', resi_connection='1conv')
    
    # Define model path relative to script location
    model_path = os.path.join(os.path.dirname(__file__), '001_classicalSR_DIV2K_s48w8_SwinIR-M_x4.pth')
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}")
    
    checkpoint = torch.load(model_path)
    model.load_state_dict(checkpoint['params'], strict=True)
    model.eval()
    return model

# Upscale an image using SwinIR
def upscale_image(image_data):
    try:
        # Load and convert image
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        img_np = np.array(image)

        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model = load_swinir_model().to(device)

        # Preprocess the image
        img_tensor = ToTensor()(image).unsqueeze(0).to(device)

        # Upscale the image
        with torch.no_grad():
            output_tensor = model(img_tensor)

        # Convert the output tensor to an image
        output_image = ToPILImage()(output_tensor.squeeze(0).cpu().clamp(0, 1))

        # Save the upscaled image to a buffer
        buffer = io.BytesIO()
        output_image.save(buffer, format='PNG')
        return buffer.getvalue()

    except Exception as e:
        error_message = f"Error in SwinIR upscaling: {str(e)}"
        print(error_message, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise RuntimeError(error_message)

if __name__ == "__main__":
    try:
        # Read image data from stdin
        image_data = sys.stdin.buffer.read()

        # Upscale the image
        result = upscale_image(image_data)

        # Write the result to stdout
        sys.stdout.buffer.write(result)

    except Exception as e:
        error_message = f"Error: {str(e)}"
        print(error_message, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

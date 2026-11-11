import sys
import os
import glob
from PIL import Image

def build_gif(input_pattern, output_path, fps=10, end_pause_sec=2.0, colors=256):
    files = sorted(glob.glob(input_pattern))
    if not files:
        print(f"No frames found for pattern: {input_pattern}")
        sys.exit(1)

    print(f"Loading {len(files)} frames...")
    images = [Image.open(f) for f in files]

    duration_per_frame = int(1000 / fps) # e.g. 50 ms for 20 fps
    durations = [duration_per_frame] * len(images)
    # Pause on the last frame so user can see outcome before it loops
    durations[-1] = int(end_pause_sec * 1000)

    # Convert to adaptive 256-color palette with dithering for maximum visual quality
    print("Quantizing frames for high visual fidelity...")
    quantized_images = [img.convert("P", palette=Image.Palette.ADAPTIVE, colors=colors) for img in images]

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    print(f"Saving GIF to {output_path} (frames={len(quantized_images)}, fps={fps})...")
    quantized_images[0].save(
        output_path,
        save_all=True,
        append_images=quantized_images[1:],
        duration=durations,
        loop=0,
        optimize=True
    )
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Done! Created {output_path} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python encode_gif.py <input_pattern> <output_path> [fps] [end_pause_sec]")
        sys.exit(1)
    pat = sys.argv[1]
    out = sys.argv[2]
    f = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    pause = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
    build_gif(pat, out, f, pause)

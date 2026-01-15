import os
from PIL import Image

def optimize_images(directory):
    max_size_mb = 0.5 # More aggressive threshold
    max_dimension = 1280 # Smaller max dimension for web/mobile

    print(f"Scanning {directory} for large images...")
    
    for filename in os.listdir(directory):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            filepath = os.path.join(directory, filename)
            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            
            if size_mb > max_size_mb:
                print(f"Optimizing {filename} ({size_mb:.2f} MB)...")
                
                try:
                    with Image.open(filepath) as img:
                        width, height = img.size
                        print(f"  Current dimensions: {width}x{height}")
                        
                        # Forever resize if > max_dimension OR if file is just huge
                        should_resize = width > max_dimension or height > max_dimension
                        if should_resize:
                            ratio = min(max_dimension / width, max_dimension / height)
                            new_size = (int(width * ratio), int(height * ratio))
                            img = img.resize(new_size, Image.Resampling.LANCZOS)
                            print(f"  Resizing to {new_size[0]}x{new_size[1]}")
                        
                        # SAVE STRATEGY:
                        # If meaningful resizing happened or it's a PNG, we might want to convert to JPG to save massive space.
                        # We will save as JPG if it was a PNG and we want to optimize.
                        
                        output_path = filepath
                        final_filename = filename
                        
                        if filename.lower().endswith('.png'):
                             # Convert to JPG for maximum compression
                             rgb_img = img.convert('RGB')
                             output_path = os.path.splitext(filepath)[0] + '.jpg'
                             rgb_img.save(output_path, optimize=True, quality=80)
                             final_filename = os.path.basename(output_path)
                             print(f"  Converted to JPG: {final_filename}")
                             
                             # Remove original PNG if different name
                             if output_path != filepath:
                                 try:
                                     os.remove(filepath)
                                     print(f"  Removed original: {filename}")
                                 except Exception as e:
                                     print(f"  Could not remove original: {e}")
                        else:
                             img.save(filepath, optimize=True, quality=80)
                             
                    new_size_mb = os.path.getsize(output_path) / (1024 * 1024)
                    print(f"  Done! New size: {new_size_mb:.2f} MB")
                except Exception as e:
                    print(f"  Error optimizing {filename}: {e}")

if __name__ == "__main__":
    target_dir = os.path.join(os.getcwd(), 'public', 'screenshots')
    if os.path.exists(target_dir):
        optimize_images(target_dir)
    else:
        print(f"Directory not found: {target_dir}")

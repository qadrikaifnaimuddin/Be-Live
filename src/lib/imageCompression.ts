/**
 * Utility for compressing images client-side using HTML5 Canvas.
 * Resizes the image to fit within maxWidth/maxHeight constraints,
 * and exports as a compressed JPEG Blob and Base64 string.
 */
export interface CompressedResult {
  blob: Blob;
  base64: string;
}

export function compressImage(
  file: File,
  maxWidth = 300,
  maxHeight = 300,
  quality = 0.8
): Promise<CompressedResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Apply aspect ratio scale limits
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context.'));
          return;
        }

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Generate base64
        const base64 = canvas.toDataURL('image/jpeg', quality);

        // Generate blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, base64 });
            } else {
              reject(new Error('Failed to generate image Blob.'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
  });
}

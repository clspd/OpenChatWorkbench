import {
    createGzipDecoder,
    unpackTar,
} from "modern-tar";

export async function extractTgz(
    tgz: Blob
): Promise<Map<string, Uint8Array>> {
    const stream = tgz
        .stream()
        .pipeThrough(createGzipDecoder());

    const entries = await unpackTar(stream);

    const result = new Map<string, Uint8Array>();

    for (const entry of entries) {
        // entry.header.name
        // entry.data (Uint8Array)
        if (entry.header.type === "file" && entry.data) {
            result.set(entry.header.name, entry.data);
        }
    }

    return result;
}

export function compressImage(
    image: Blob,
    fmt: string = 'image/jpeg',
    q: number = 0.8,
    maxSize?: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (!image.type.startsWith('image/')) {
            return reject(new Error('Incorrect mime type, please check your input'));
        }

        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            try {
                let width = img.width;
                let height = img.height;

                if (maxSize && (width > maxSize || height > maxSize)) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    return reject(new Error('Cannot get canvas context'));
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Cannot compress the image'));
                    },
                    fmt,
                    q
                );
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };

        img.src = URL.createObjectURL(image);
    });
}


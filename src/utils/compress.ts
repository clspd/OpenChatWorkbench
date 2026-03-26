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

// attachment.ts: message attachment create & management

import { fs } from "@/userdata";
import { getChatAttachmentPath } from "./path";

export async function GetAttachmentById(id: string) {
    return new Blob([await fs.readFile(getChatAttachmentPath(id)) as Uint8Array<ArrayBuffer>]);
}

export async function PutAttachment(data: Blob): Promise<string> {
    const id = crypto.randomUUID();
    await fs.writeFile(getChatAttachmentPath(id), new Uint8Array(await data.arrayBuffer()));
    return id;
}

export async function DeleteAttachment(id: string) {
    await fs.unlink(getChatAttachmentPath(id));
}


import { api } from "@/lib/api-client";

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export interface UploadFolder {
  folder: "logos" | "products" | "avatars" | "documents";
}

/**
 * Uploads a file to R2 via presigned URL (two-step):
 * 1. POST /uploads/:folder/presigned → { key, uploadUrl, publicUrl }
 * 2. PUT file to uploadUrl
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File,
  folder: UploadFolder["folder"],
  onProgress?: (percent: number) => void,
): Promise<string> {
  const { uploadUrl, publicUrl } = await api.post<PresignedUpload>(
    `/uploads/${folder}/presigned`,
    { filename: file.name, mimeType: file.type },
  );

  await putToPresignedUrl(uploadUrl, file, onProgress);
  return publicUrl;
}

function putToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

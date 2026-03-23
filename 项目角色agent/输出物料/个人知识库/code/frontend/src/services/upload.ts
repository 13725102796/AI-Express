import { apiUpload, apiJson } from "@/lib/api";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
  "text/html",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith(".md")) {
    return `不支持的文件格式: ${file.type || file.name.split(".").pop()}`;
  }
  if (file.size > MAX_SIZE) {
    return `文件大小超过限制（最大 50MB）`;
  }
  return null;
}

export async function uploadFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<{ documentId: string }> {
  // Note: XMLHttpRequest is used here to support upload progress tracking.
  // fetch() does not provide upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem("knowbase_token");

    xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/upload`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    // Do NOT set Content-Type — let the browser set multipart boundary automatically

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail?.message || err.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("网络错误，请检查连接后重试"));

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export async function uploadFromUrl(url: string): Promise<{ documentId: string }> {
  return apiJson<{ documentId: string }>("/api/documents/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

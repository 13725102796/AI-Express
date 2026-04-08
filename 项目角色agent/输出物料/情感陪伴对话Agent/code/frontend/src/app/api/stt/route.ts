const STT_URL = process.env.STT_API_URL || "http://localhost:8001";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "缺少音频文件" }, { status: 400 });
  }

  // 保留原始文件名，让 STT 服务正确推断格式
  const filename = file instanceof File ? file.name : "recording.webm";
  const upstream = new FormData();
  upstream.append("file", file, filename);

  const resp = await fetch(`${STT_URL}/transcribe`, {
    method: "POST",
    body: upstream,
  });

  if (!resp.ok) {
    return Response.json(
      { error: `STT 服务异常 (${resp.status})` },
      { status: 502 }
    );
  }

  const data = await resp.json();
  return Response.json(data);
}

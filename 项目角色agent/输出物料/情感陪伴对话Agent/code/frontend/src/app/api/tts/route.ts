const TTS_URL = process.env.TTS_API_URL || "http://localhost:8002";

export async function POST(req: Request) {
  const body = await req.json();

  const resp = await fetch(`${TTS_URL}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    return Response.json(
      { error: `TTS 服务异常 (${resp.status})` },
      { status: 502 }
    );
  }

  // 透传 chunked PCM 流
  return new Response(resp.body, {
    headers: {
      "Content-Type": "audio/pcm",
      "X-Sample-Rate": resp.headers.get("X-Sample-Rate") || "24000",
      "Transfer-Encoding": "chunked",
    },
  });
}

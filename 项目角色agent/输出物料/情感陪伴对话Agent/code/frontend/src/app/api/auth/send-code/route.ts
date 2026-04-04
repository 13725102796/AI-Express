import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

// In-memory rate limiting (replace with Redis in production)
const rateLimits = new Map<string, { count: number; lastReset: number }>();
const codeSentTimes = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    // Validate phone format
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "请输入正确的手机号" },
        { status: 400 }
      );
    }

    // Rate limiting: 60s between sends
    const lastSent = codeSentTimes.get(phone);
    if (lastSent && Date.now() - lastSent < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { success: false, message: `请${remaining}秒后再试` },
        { status: 429 }
      );
    }

    // Rate limiting: 5 times per day
    const today = new Date().toDateString();
    const rateKey = `${phone}-${today}`;
    const rate = rateLimits.get(rateKey) || { count: 0, lastReset: Date.now() };
    if (rate.count >= 5) {
      return NextResponse.json(
        { success: false, message: "今天验证码发送次数已用完，明天再试" },
        { status: 429 }
      );
    }

    // Generate code
    const code = process.env.SMS_MOCK === "true"
      ? "888888"
      : String(Math.floor(100000 + Math.random() * 900000));

    // Store code (in production, use DB)
    // For MVP, console log the code
    console.log(`[SMS] Verification code for ${phone}: ${code}`);

    // Update rate limits
    codeSentTimes.set(phone, Date.now());
    rateLimits.set(rateKey, { count: rate.count + 1, lastReset: Date.now() });

    return NextResponse.json({
      success: true,
      message: "验证码已发送",
      // In dev mode, return code for testing
      ...(process.env.SMS_MOCK === "true" ? { code } : {}),
    });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { success: false, message: "发送失败，请稍后再试" },
      { status: 500 }
    );
  }
}

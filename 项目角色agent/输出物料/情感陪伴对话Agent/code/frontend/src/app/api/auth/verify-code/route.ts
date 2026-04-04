import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

// Temporary in-memory store (replace with DB in production)
const mockUsers = new Map<string, { id: string; nickname: string; isNew: boolean }>();

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    // Validate inputs
    if (!phone || !code) {
      return NextResponse.json(
        { success: false, message: "请输入手机号和验证码" },
        { status: 400 }
      );
    }

    // Verify code (MVP: accept 888888 in mock mode)
    const isValidCode = process.env.SMS_MOCK === "true"
      ? code === "888888"
      : false; // In production, verify against stored code

    if (!isValidCode) {
      return NextResponse.json(
        { success: false, message: "验证码不正确" },
        { status: 400 }
      );
    }

    // Check if user exists
    let user = mockUsers.get(phone);
    const isNewUser = !user;

    if (isNewUser) {
      user = {
        id: nanoid(),
        nickname: "",
        isNew: true,
      };
      mockUsers.set(phone, user);
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user!.id,
        nickname: user!.nickname,
        aiName: "留白",
        phone: phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
        companionStyle: "warm",
        tier: "free",
        onboardingCompleted: !isNewUser,
        darkMode: "system",
        notificationsEnabled: true,
        echoLetterReminder: true,
        breathingVibration: true,
        registeredDays: isNewUser ? 0 : 32,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { success: false, message: "验证失败，请稍后再试" },
      { status: 500 }
    );
  }
}

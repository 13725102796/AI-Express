import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Get user from session/DB
  return NextResponse.json({
    user: {
      id: "demo-user",
      nickname: "阿栗",
      aiName: "留白",
      companionStyle: "warm",
      tier: "free",
      onboardingCompleted: true,
      darkMode: "system",
      registeredDays: 32,
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const updates = await req.json();
    // TODO: Update user in DB
    return NextResponse.json({ success: true, user: updates });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "更新失败" },
      { status: 500 }
    );
  }
}

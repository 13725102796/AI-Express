"""提示词模板占位符渲染."""
from __future__ import annotations

from typing import Mapping


def render_prompt(template: str, ctx: Mapping[str, str]) -> str:
    """替换 {{key}} 形式的占位符为 ctx[key]."""
    out = template
    for k, v in ctx.items():
        out = out.replace(f"{{{{{k}}}}}", str(v))
    return out


def build_user_birth_summary(profile) -> str:
    """构造用户出生信息可读化字符串（中文）."""
    cal = "阳历" if profile.birth_type == "solar" else "农历"
    leap = "闰" if profile.is_leap_month else ""
    time_names = ["早子时", "丑时", "寅时", "卯时", "辰时", "巳时",
                  "午时", "未时", "申时", "酉时", "戌时", "亥时", "晚子时"]
    t = time_names[profile.birth_time_index] if 0 <= profile.birth_time_index < 13 else ""
    place = ""
    if profile.birth_place_province:
        place = f"，出生地：{profile.birth_place_province}"
        if profile.birth_place_city:
            place += profile.birth_place_city
    return (
        f"{cal}{profile.birth_year}年{leap}{profile.birth_month}月{profile.birth_day}日 {t}{place}"
    )


def gender_to_chinese(gender: str) -> str:
    return "乾造（男）" if gender == "male" else "坤造（女）"

"""排盘格式化工具，从原 app.py 重构而来. 保持算法一致."""
from __future__ import annotations

EARTHLY_BRANCH_MAP = {
    "ziEarthly": "子", "chouEarthly": "丑", "yinEarthly": "寅",
    "maoEarthly": "卯", "chenEarthly": "辰", "siEarthly": "巳",
    "wuEarthly": "午", "weiEarthly": "未", "shenEarthly": "申",
    "youEarthly": "酉", "xuEarthly": "戌", "haiEarthly": "亥",
}

HEAVENLY_STEM_MAP = {
    "jiaHeavenly": "甲", "yiHeavenly": "乙", "bingHeavenly": "丙",
    "dingHeavenly": "丁", "wuHeavenly": "戊", "jiHeavenly": "己",
    "gengHeavenly": "庚", "xinHeavenly": "辛", "renHeavenly": "壬",
    "guiHeavenly": "癸",
}

PALACE_ORDER = [
    "子女宫", "夫妻宫", "兄弟宫", "命宫",
    "父母宫", "福德宫", "田宅宫", "官禄宫",
    "交友宫", "迁移宫", "疾厄宫", "财帛宫",
]

TIME_NAMES = [
    "早子时", "丑时", "寅时", "卯时", "辰时", "巳时",
    "午时", "未时", "申时", "酉时", "戌时", "亥时", "晚子时",
]

SOUL_MASTER = {
    "子": "贪狼", "丑": "巨门", "寅": "禄存", "卯": "文曲",
    "辰": "廉贞", "巳": "武曲", "午": "破军", "未": "武曲",
    "申": "廉贞", "酉": "文曲", "戌": "禄存", "亥": "巨门",
}

BODY_MASTER = {
    "子": "火星", "丑": "天相", "寅": "天梁", "卯": "天同",
    "辰": "文昌", "巳": "天机", "午": "火星", "未": "天相",
    "申": "天梁", "酉": "天同", "戌": "文昌", "亥": "天机",
}

DOU_JUN = {
    "子": "亥", "丑": "戌", "寅": "酉", "卯": "申",
    "辰": "未", "巳": "午", "午": "巳", "未": "辰",
    "申": "卯", "酉": "寅", "戌": "丑", "亥": "子",
}


def eb(key: str) -> str:
    return EARTHLY_BRANCH_MAP.get(key, key)


def hs(key: str) -> str:
    return HEAVENLY_STEM_MAP.get(key, key)


def _format_star(star: dict) -> str:
    s = star["name"]
    if star.get("brightness"):
        s += f"[{star['brightness']}]"
    if star.get("mutagen"):
        s += f"[生年{star['mutagen']}]"
    return s


def _format_star_list(stars: list[dict]) -> str:
    if not stars:
        return "无"
    return ",".join(_format_star(s) for s in stars)


def build_tree(chart, iztro_dict: dict) -> str:
    """将排盘数据格式化为文墨天机风格的树形文本."""
    lines = []
    ln = lines.append

    raw = chart.raw_chinese_date
    year_branch_cn = eb(raw.year_branch)

    ln("紫微斗数命盘")
    ln("│")
    ln("├基本信息")
    ln("│ │")
    ln(f"│ ├性别 : {iztro_dict['gender']}")
    ln(f"│ ├农历时间 : {iztro_dict['lunarDate']}{iztro_dict['time']}")
    ln(f"│ ├四柱 : {iztro_dict['chineseDate']}")
    ln(f"│ ├五行局数 : {iztro_dict['fiveElementsClass']}")

    soul_master = SOUL_MASTER.get(year_branch_cn, "?")
    body_master = BODY_MASTER.get(year_branch_cn, "?")
    dou_jun = DOU_JUN.get(year_branch_cn, "?")
    body_palace_eb = iztro_dict["earthlyBranchOfBodyPalace"]

    ln(f"│ └身主:{body_master}; 命主:{soul_master}; "
       f"{year_branch_cn}年斗君:{dou_jun}; 身宫:{body_palace_eb}")
    ln("│")

    ln("├命盘十二宫")
    palaces_dict = {p["name"]: p for p in iztro_dict["palaces"]}
    palaces_model = {eb(p.earthly_branch): p for p in chart.palaces}

    for i, palace_name in enumerate(PALACE_ORDER):
        pd = palaces_dict.get(palace_name)
        if not pd:
            continue
        eb_v = pd["earthlyBranch"]
        hs_v = pd["heavenlyStem"]
        pm = palaces_model.get(eb_v)
        is_last = (i == len(PALACE_ORDER) - 1)
        prefix = "└" if is_last else "├"
        cont = " " if is_last else "│"

        label = f"{palace_name}[{hs_v}{eb_v}]"
        if pd.get("isBodyPalace"):
            label += "[身宫]"
        ln(f"│ {cont}")
        ln(f"│ {prefix}{label}")
        ln(f"│ {cont} ├主星 : {_format_star_list(pd['majorStars'])}")
        ln(f"│ {cont} ├辅星 : {_format_star_list(pd['minorStars'])}")
        ln(f"│ {cont} ├小星 : {_format_star_list(pd['adjectiveStars'])}")
        ln(f"│ {cont} ├神煞")
        ln(f"│ {cont} │ ├岁前星 : {pd.get('suiqian12', '?')}")
        ln(f"│ {cont} │ ├将前星 : {pd.get('jiangqian12', '?')}")
        ln(f"│ {cont} │ ├十二长生 : {pd.get('changsheng12', '?')}")
        ln(f"│ {cont} │ └太岁煞禄 : {pd.get('boshi12', '?')}")
        if pm and pm.decadal:
            r = pm.decadal.range
            ln(f"│ {cont} ├大限 : {r[0]}~{r[1]}虚岁")
        else:
            ln(f"│ {cont} ├大限 : ?")
        if pm and pm.ages:
            small = ",".join(str(a) for a in pm.ages[:5])
            ln(f"│ {cont} ├小限 : {small}虚岁")
        if pm and pm.ages:
            flow = ",".join(str(a) for a in pm.ages[:5])
            ln(f"│ {cont} └流年 : {flow}虚岁")

    ln("│")
    ln("└[备注: 基于 iztro-py 计算引擎]")
    return "\n".join(lines)


def enrich_iztro_dict(chart, iztro_dict: dict) -> dict:
    """补 decadal/ages + 命主/身主/斗君（与原 paipan_json 一致）."""
    eb_to_model = {eb(p.earthly_branch): p for p in chart.palaces}
    for pd in iztro_dict["palaces"]:
        pm = eb_to_model.get(pd["earthlyBranch"])
        if pm and pm.decadal:
            pd["decadal"] = {"range": list(pm.decadal.range)}
        if pm and pm.ages:
            pd["ages"] = pm.ages[:10]

    raw = chart.raw_chinese_date
    yb = eb(raw.year_branch)
    iztro_dict["soulMaster"] = SOUL_MASTER.get(yb)
    iztro_dict["bodyMaster"] = BODY_MASTER.get(yb)
    iztro_dict["douJun"] = DOU_JUN.get(yb)
    return iztro_dict

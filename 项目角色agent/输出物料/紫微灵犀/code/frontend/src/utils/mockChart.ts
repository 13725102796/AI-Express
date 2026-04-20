/**
 * 开发态命盘 mock 数据
 * 仅在 backend 不可用时兜底，方便独立开发 P02。
 * 数据结构严格遵循 shared-types.md 的 ChartData / ChartJson。
 * 内容转录自 pages/P02-paipan.html 设计稿（非真实排盘，仅用于视觉还原验收）。
 */
import type { ChartData, ChartPalace } from "@/types/api";

function p(
  name: string,
  earthlyBranch: string,
  heavenlyStem: string,
  major: Array<[string, string?, string?]>, // [name, brightness?, mutagen?]
  minor: string[] = [],
  decadal: [number, number] = [0, 0],
  isBodyPalace = false,
  ages: number[] = [],
): ChartPalace {
  return {
    name,
    earthlyBranch,
    heavenlyStem,
    isBodyPalace,
    majorStars: major.map(([n, b, m]) => ({
      name: n,
      brightness: b,
      mutagen: m,
    })),
    minorStars: minor.map((n) => ({ name: n })),
    adjectiveStars: [],
    suiqian12: "",
    jiangqian12: "",
    changsheng12: "",
    boshi12: "",
    decadal: { range: decadal },
    ages,
  };
}

export function buildMockChartData(): ChartData {
  const palaces: ChartPalace[] = [
    p("命宫", "亥", "乙", [["紫微", "庙"], ["天府", "旺"]], ["禄存", "天钺"], [16, 25]),
    p("父母", "子", "丙", [["天梁", "旺"]], ["恩光", "天贵"], [6, 15]),
    p("福德", "丑", "丁", [["天同", "", "科"]], ["天马"], [116, 125]),
    p("田宅", "寅", "戊", [["武曲", "庙"]], ["三台", "八座"], [106, 115]),
    p("官禄", "卯", "己", [["太阳", "", "权"]], ["文昌"], [96, 105]),
    p("奴仆", "辰", "庚", [["七杀", "庙"]], ["铃星"], [86, 95]),
    p("迁移", "巳", "辛", [["天机", "平"]], ["文曲", "火星"], [76, 85], true),
    p("疾厄", "午", "壬", [["紫微", "庙"]], ["右弼", "天魁"], [66, 75]),
    p("财帛", "未", "癸", [["太阴", "", "禄"]], ["左辅", "天钺"], [56, 65]),
    p("子女", "申", "甲", [["贪狼", "旺"]], ["陀罗"], [46, 55]),
    p("夫妻", "酉", "乙", [["巨门", "", "忌"]], ["天空", "地劫"], [36, 45]),
    p("兄弟", "戌", "丙", [["天相", "得"]], ["擎羊"], [26, 35]),
  ];

  return {
    id: "mock-chart-0001",
    user_id: "mock-user",
    profile_id: "mock-profile",
    chart_json: {
      gender: "男",
      lunarDate: "乙亥年八月廿二",
      time: "子时",
      chineseDate: "乙亥 丙戌 戊午 壬子",
      fiveElementsClass: "木三局",
      earthlyBranchOfBodyPalace: "巳",
      soulMaster: "廉贞",
      bodyMaster: "天梁",
      douJun: "寅",
      palaces,
    },
    chart_text: "（mock）紫微灵犀示例命盘",
    api_params: {
      birth_year: 1995,
      birth_month: 10,
      birth_day: 15,
      birth_time_index: 0,
      gender: "male",
      birth_type: "solar",
    },
    created_at: new Date().toISOString(),
  };
}

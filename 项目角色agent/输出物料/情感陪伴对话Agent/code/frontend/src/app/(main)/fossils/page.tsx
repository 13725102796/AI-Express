"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { FossilSkeleton } from "@/components/ui/Skeleton";
import type { Fossil } from "@/types/fossil";

type TabId = "fossils" | "landscape" | "echo-letters" | "memories";

// Mock data matching page-specs.md
const MOCK_FOSSILS: Fossil[] = [
  {
    id: "fossil-001", conversationId: "conv-001",
    inscription: "这次是关于「被看见」——你在等一个认可，但那个人可能不知道你在等。不过至少今晚，这份委屈被说出来了。",
    emotionTags: ["委屈", "不甘", "一点释然"], primaryEmotion: "sad",
    emotionColor: "emotion-sad", emotionIntensity: 4,
    timeDisplay: "周三深夜", createdAt: new Date("2026-04-02T23:52:00"),
  },
  {
    id: "fossil-002", conversationId: "conv-002",
    inscription: "深夜的焦虑像涨潮的海水——不知道从哪来，但真实地漫过脚踝。你说了句「万一都白费了」，但其实你从没真的放弃过。",
    emotionTags: ["焦虑", "不安"], primaryEmotion: "anxious",
    emotionColor: "emotion-anxious", emotionIntensity: 4,
    timeDisplay: "周二凌晨", createdAt: new Date("2026-04-01T00:15:00"),
  },
  {
    id: "fossil-003", conversationId: "conv-003",
    inscription: "今天的你像一杯终于停止冒泡的汽水——安静下来的那一刻，反而觉得自在。周末就应该什么都不想。",
    emotionTags: ["平静", "放松"], primaryEmotion: "calm",
    emotionColor: "emotion-calm", emotionIntensity: 2,
    timeDisplay: "上周日晚上", createdAt: new Date("2026-03-30T22:30:00"),
  },
  {
    id: "fossil-004", conversationId: "conv-004",
    inscription: "下班路上那段空白时间，你说「不知道在等什么」。也许你不是在等什么人，而是在等自己回过神来。",
    emotionTags: ["倦怠", "迷茫"], primaryEmotion: "confused",
    emotionColor: "emotion-confused", emotionIntensity: 3,
    timeDisplay: "上周五傍晚", createdAt: new Date("2026-03-28T19:45:00"),
  },
  {
    id: "fossil-005", conversationId: "conv-005",
    inscription: "你说「好像只有我在意这些」——但在意本身不是弱点。它只是证明你还在认真地活着，虽然这样真的很累。",
    emotionTags: ["孤独", "被忽视"], primaryEmotion: "lonely",
    emotionColor: "emotion-lonely", emotionIntensity: 4,
    timeDisplay: "上周三深夜", createdAt: new Date("2026-03-26T23:20:00"),
  },
  {
    id: "fossil-006", conversationId: "conv-006",
    inscription: "方案过了的时候你没有特别开心，反而松了一口气。你已经太习惯把成功当「终于没出错」来感受了。",
    emotionTags: ["释然", "一点骄傲"], primaryEmotion: "calm",
    emotionColor: "emotion-happy", emotionIntensity: 3,
    timeDisplay: "上周一中午", createdAt: new Date("2026-03-24T12:30:00"),
  },
];

const EMOTION_FILTERS = ["全部", "孤独", "委屈", "焦虑", "释然", "开心", "倦怠"];

function FossilsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "fossils";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [selectedFossil, setSelectedFossil] = useState<Fossil | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState("全部");
  const [deleteConfirm, setDeleteConfirm] = useState<Fossil | null>(null);

  const tabs: { id: TabId; label: string }[] = [
    { id: "fossils", label: "化石流" },
    { id: "landscape", label: "地貌" },
    { id: "echo-letters", label: "回声信" },
    { id: "memories", label: "回忆" },
  ];

  const filteredFossils = useMemo(() => {
    let result = MOCK_FOSSILS;
    if (activeFilter !== "全部") {
      result = result.filter((f) => f.emotionTags.some((t) => t.includes(activeFilter)));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.inscription.toLowerCase().includes(q) ||
          f.emotionTags.some((t) => t.includes(q))
      );
    }
    return result;
  }, [activeFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe-area-top mt-2 h-14">
        <h1 className="font-heading text-xl font-semibold text-text-primary">化石层</h1>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-1 text-text-tertiary transition-colors"
          aria-label="搜索"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="px-5 pb-2 animate-float-up">
          <input
            type="text"
            placeholder="搜索关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-1 text-text-primary text-sm
              rounded-full placeholder:text-text-tertiary
              focus:outline-none focus:ring-1 focus:ring-border-focus
              transition-all duration-[var(--duration-normal)]"
            autoFocus
          />
        </div>
      )}

      {/* Sub-tabs */}
      <div className="px-5 mb-3">
        <div className="flex gap-1 bg-surface-1 p-1 rounded-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-2 text-sm font-medium rounded-full
                transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
                ${activeTab === tab.id
                  ? "bg-surface-0 text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-5">
        {activeTab === "fossils" && (
          <>
            {/* Emotion filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
              {EMOTION_FILTERS.map((filter) => (
                <Pill
                  key={filter}
                  active={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                  size="md"
                >
                  {filter}
                </Pill>
              ))}
            </div>

            {/* Fossil cards */}
            {filteredFossils.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-text-tertiary text-sm">
                  {searchQuery ? "没有找到相关的化石" : "每一次深度对话都会留下一块情绪化石"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredFossils.map((fossil) => (
                  <button
                    key={fossil.id}
                    onClick={() => setSelectedFossil(fossil)}
                    className="w-full text-left bg-surface-1 rounded-[var(--radius-md)] overflow-hidden
                      hover:shadow-sm transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
                      active:scale-[0.99]"
                  >
                    <div className="flex">
                      {/* Emotion color bar */}
                      <div
                        className="w-1 flex-shrink-0"
                        style={{ backgroundColor: `var(--color-${fossil.emotionColor})` }}
                      />
                      <div className="p-4 flex-1">
                        <p className="text-xs text-text-tertiary mb-1.5">{fossil.timeDisplay}</p>
                        <p className="text-sm text-text-primary leading-relaxed line-clamp-3">
                          {fossil.inscription}
                        </p>
                        <div className="flex gap-1.5 mt-2.5">
                          {fossil.emotionTags.map((tag) => (
                            <Pill key={tag} size="sm" color={`var(--color-${fossil.emotionColor})`}>
                              {tag}
                            </Pill>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "landscape" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-full h-40 bg-surface-1 rounded-[var(--radius-lg)] mb-6 flex items-center justify-center">
              {/* Simplified landscape visualization */}
              <div className="flex items-end gap-2 h-24 px-4">
                {MOCK_FOSSILS.map((f) => (
                  <div
                    key={f.id}
                    className="w-3 rounded-full transition-all hover:scale-110"
                    style={{
                      height: `${f.emotionIntensity * 16}px`,
                      backgroundColor: `var(--color-${f.emotionColor})`,
                      opacity: 0.7,
                    }}
                    title={f.timeDisplay}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed text-center max-w-sm px-4">
              这两周你的情绪像一条波浪线——工作日攒的疲惫在深夜涌出来，但周末会慢慢回升。你好像正在学会一种节奏：白天撑住，晚上放手。这不是软弱，是你自己的方式。
            </p>
          </div>
        )}

        {activeTab === "echo-letters" && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-text-tertiary text-sm mb-2">还没有写过回声信</p>
            <p className="text-text-tertiary text-xs">
              在某个想说些什么的时刻，给未来的自己留一封信吧
            </p>
          </div>
        )}

        {activeTab === "memories" && (
          <div className="space-y-3 pb-4">
            {[
              { id: "conv-001", dateDisplay: "昨天深夜", preview: "今天也没怎么样，就是莫名其妙的不开心...", emotionTags: ["委屈", "不甘"] },
              { id: "conv-002", dateDisplay: "周二凌晨", preview: "万一都是白费的怎么办...", emotionTags: ["焦虑"] },
              { id: "conv-003", dateDisplay: "上周日", preview: "今天什么都不想做，就窝在家里...", emotionTags: ["平静", "放松"] },
            ].map((conv) => (
              <button
                key={conv.id}
                className="w-full text-left bg-surface-1 rounded-[var(--radius-md)] p-4
                  hover:shadow-sm transition-all duration-[var(--duration-normal)]"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-text-tertiary">{conv.dateDisplay}</p>
                  <div className="flex gap-1">
                    {conv.emotionTags.map((tag) => (
                      <Pill key={tag} size="sm">{tag}</Pill>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-text-primary line-clamp-2">{conv.preview}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fossil detail drawer */}
      <Drawer
        open={!!selectedFossil}
        onClose={() => setSelectedFossil(null)}
        title={selectedFossil?.timeDisplay}
      >
        {selectedFossil && (
          <div>
            <div className="flex gap-1.5 mb-4">
              {selectedFossil.emotionTags.map((tag) => (
                <Pill key={tag} color={`var(--color-${selectedFossil.emotionColor})`}>
                  {tag}
                </Pill>
              ))}
            </div>
            <p className="text-base text-text-primary leading-relaxed font-[var(--font-display)] italic mb-6">
              {selectedFossil.inscription}
            </p>
            <div className="flex flex-col gap-3">
              <button className="text-sm text-primary hover:text-primary-hover transition-colors text-left">
                回看这次对话
              </button>
              <button className="text-sm text-text-secondary hover:text-text-primary transition-colors text-left">
                添加感悟
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(selectedFossil);
                  setSelectedFossil(null);
                }}
                className="text-sm text-error/70 hover:text-error transition-colors text-left"
              >
                删除这块化石
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="这块化石将被永远埋藏"
        description="删除后将无法恢复。"
        confirmText="确定删除"
        danger
        onConfirm={() => {
          // TODO: Delete fossil
          setDeleteConfirm(null);
        }}
      />
    </div>
  );
}

function FossilsLoading() {
  return (
    <div className="flex-1 flex flex-col px-5 pt-16">
      <FossilSkeleton />
      <FossilSkeleton />
      <FossilSkeleton />
    </div>
  );
}

export default function FossilsPage() {
  return (
    <Suspense fallback={<FossilsLoading />}>
      <FossilsContent />
    </Suspense>
  );
}

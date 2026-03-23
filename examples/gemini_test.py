"""
通过 Antigravity 反代调用 Gemini 3.1 Pro 示例
"""

from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:8045/v1",
    api_key="not-needed",  # 反代通常不需要真实 key，填占位符即可
)

response = client.chat.completions.create(
    model="gemini-3.1-pro",
    messages=[{"role": "user", "content": "你用的是哪个模型,具体的模型型号是什么呢"}],
)

print("模型:", response.model)
print("回复:", response.choices[0].message.content)

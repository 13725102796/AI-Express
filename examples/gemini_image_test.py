"""
通过 Antigravity 反代调用 Gemini 3.1 Flash Image 生成图片示例
"""

from openai import OpenAI
import base64

client = OpenAI(
    base_url="http://127.0.0.1:8045/v1",
    api_key="not-needed",
)

response = client.chat.completions.create(
    model="gemini-3.1-flash-image",
    messages=[{"role": "user", "content": "画一只可爱的狗狗，卡通风格"}],
)

# 提取并保存图片
message = response.choices[0].message
print("模型:", response.model)

if message.content and "base64," in message.content:
    # 提取 base64 数据
    b64_data = message.content.split("base64,")[1].split(")")[0]
    img_bytes = base64.b64decode(b64_data)
    import os
    save_path = os.path.join(os.path.dirname(__file__), "gemini_cat1.jpg")
    with open(save_path, "wb") as f:
        f.write(img_bytes)
    print(f"图片已保存到 {save_path}")
else:
    print("回复:", message.content)

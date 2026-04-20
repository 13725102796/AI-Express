# Chrome 证书缓存清理

> 网站已部署有效 HTTPS 证书，但 Chrome 仍显示"不安全"时，用命令行清理缓存。

## 操作步骤

### 1. 完全关闭 Chrome

### 2. 找到缓存文件

```bash
cd ~/Library/Application\ Support/Google/Chrome
grep -rl "你的域名" */Network\ Persistent\ State 2>/dev/null
```

### 3. 清理

```bash
cd ~/Library/Application\ Support/Google/Chrome

python3 -c "
import json

DOMAIN = '你的域名'  # 改成实际域名
PROFILE = 'Profile 2'  # 改成第2步找到的 Profile

f = f'{PROFILE}/Network Persistent State'
with open(f) as fh:
    data = json.load(fh)

props = data.get('net', {}).get('http_server_properties', {})
for key in ['servers', 'broken_alternative_services']:
    if key in props:
        original = len(props[key])
        props[key] = [x for x in props[key] if DOMAIN not in json.dumps(x)]
        removed = original - len(props[key])
        if removed:
            print(f'Removed {removed} entries from {key}')

with open(f, 'w') as fh:
    json.dump(data, fh)
print('Done')
"
```

### 4. 重新打开 Chrome 访问

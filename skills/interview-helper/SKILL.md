# interview-helper Skill

面试学习助手，帮助整理面试知识点，自动生成结构化笔记并通过 PR 模式保存到 GitHub。

## 配置

需要配置 git-repo-manager 的 `config.json`：

```json
{
  "repoUrl": "https://github.com/wzxch/xcm-interview-notes",
  "localPath": "/root/.openclaw/workspace/repos/xcm-interview-notes",
  "token": "ghp_xxxxxxxx"
}
```

## 命令列表

### /inter-start <主题>
开始一个新的主题讨论。

示例：
```
/inter-start JVM垃圾回收
```

系统会自动检查是否已有该主题的笔记，如果有会提示查看。

### /inter-summary
在讨论结束后，生成当前主题的内容摘要并保存到临时文件。

流程：
1. 从对话历史中提取当前主题的讨论
2. 提炼关键信息（核心概念、代码片段、易错点）
3. 去口语化，生成结构化 Markdown
4. 保存到临时文件
5. 返回文件路径和统计信息

示例输出：
```
📝 摘要已生成并保存到临时文件

📄 文件路径：/tmp/interview-helper/jvm-gc-2025-02-26-10-30-00.md
📊 统计信息：
  - 核心概念：3 个
  - 要点总结：4 条
  - 代码示例：2 个
  - 易错点：1 个

💡 使用 "/inter-save /tmp/interview-helper/jvm-gc-2025-02-26-10-30-00.md" 保存到 GitHub
```

### /inter-save <文件路径>
将指定文件保存到 GitHub，支持自动合并历史内容。

流程：
1. 读取指定文件内容
2. 检测历史文件是否存在
   - 不存在 → 直接保存新文件
   - 存在 → 进入 merge 流程
3. **Merge 策略**（结构化合并）：
   - 核心概念：去重合并
   - 要点总结：追加新要点，重新编号
   - 代码示例：追加
   - 易错点：去重合并
4. **自检内容**：检查内容长度、核心概念、代码块格式等
5. **PR 流程**：创建临时分支 → commit → push → 创建 PR

示例：
```
/inter-save /tmp/interview-helper/redis-2025-02-26-10-30-00.md
```

输出示例（新增）：
```
✅ 笔记已保存并创建 PR

📄 文件：redis/redis.md
📝 操作：新增
🔍 自检：✅ 基础检查通过
🔗 PR: https://github.com/wzxch/xcm-interview-notes/pull/6
```

输出示例（更新，自动合并）：
```
✅ 笔记已保存并创建 PR

📄 文件：redis/redis.md
🔄 已自动合并历史内容
📝 操作：更新
🔍 自检：✅ 基础检查通过
🔗 PR: https://github.com/wzxch/xcm-interview-notes/pull/7
```

### /inter-review <主题>
查看已有主题的笔记内容。

示例：
```
/inter-review JVM垃圾回收
```

### /inter-search <关键词>
搜索笔记，支持按主题名和内容搜索。

示例：
```
/inter-search 垃圾回收
/inter-search G1
```

### /inter-list
列出所有已保存的主题。

## 完整使用流程

### 场景 1：新主题学习
```
/inter-start Redis持久化
...进行多轮问答讨论...
/inter-summary                    → 生成摘要，获取临时文件路径
/inter-save /tmp/.../redis-xxx.md → 保存到 GitHub（新增）
```

### 场景 2：补充已有主题
```
/inter-start Redis持久化          → 系统提示已有笔记
...进行补充讨论...
/inter-summary                    → 生成新摘要
/inter-save /tmp/.../redis-xxx.md → 自动合并历史内容，创建 PR
```

### 场景 3：直接编辑已有文件
```
# 用户直接编辑文件后
/inter-save /path/to/edited-file.md → 自动检测并合并
```

## 文件结构

笔记按类别组织：

```
xcm-interview-notes/
├── README.md
├── java/
│   ├── jvm-gc.md
│   └── concurrent-hashmap.md
├── mysql/
├── redis/
└── ...
```

主题分类规则：
- JVM 相关 → `java/`
- MySQL 相关 → `mysql/`
- Redis 相关 → `redis/`
- 其他 → `misc/`

## 笔记格式

自动生成的笔记包含以下结构：

```markdown
# 主题名称

## 核心概念
- **概念1**：说明
- **概念2**：说明

## 要点总结
1. **问题1**
   答案要点...

2. **问题2**
   答案要点...

## 代码示例
### 示例 1
```java
// 代码片段
```

## 易错点
1. 易错点1
2. 易错点2

## 面试要点
- 理解主题的基本原理
- 能够结合实际场景分析
- 了解常见问题和优化方案

---
*最后更新：2025-02-26*
```

## Merge 策略说明

当保存的文件已存在时，系统会自动合并：

| 章节 | 合并策略 | 说明 |
|:---|:---|:---|
| 核心概念 | 去重追加 | 相同概念只保留一次，新概念追加到后面 |
| 要点总结 | 去重追加 | 基于问题标题去重，重新编号 |
| 代码示例 | 追加 | 直接追加，重新编号 |
| 易错点 | 去重追加 | 相同易错点只保留一次 |
| 面试要点 | 保留 | 使用标准模板 |

## 自检机制

/inter-save 会自动进行以下检查：

| 检查项 | 严重程度 | 说明 |
|:---|:---|:---|
| 内容长度 | 严重 | 内容过短可能缺少实质内容 |
| 核心概念部分 | 警告 | 缺少核心概念部分 |
| 待补充标记 | 建议 | 存在 "待补充" 或 "TODO" 标记 |
| 代码块格式 | 严重 | 代码块格式不完整 |

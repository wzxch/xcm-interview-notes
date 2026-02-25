# interview-helper Skill

面试学习助手，帮助整理面试知识点，自动生成结构化笔记并通过 PR 模式保存到 GitHub。

## 配置

需要配置 github-notes 的环境变量：

```bash
export GITHUB_TOKEN="ghp_xxxxxxxx"
export GITHUB_REPO="wzxch/xcm-interview-notes"
export GITHUB_USERNAME="wzxch"
export GITHUB_AUTHOR_NAME="xcm_kimi_claw"
```

## 命令列表

### /inter-start <主题>
开始一个新的主题讨论。

示例：
```
/inter-start JVM垃圾回收
```

系统会自动检查是否已有该主题的笔记，如果有会提示查看。

### /inter-save
在讨论结束后，输入"/inter-save"将当前主题的内容整理成笔记。

流程：
1. 从对话历史中提取当前主题的讨论
2. 提炼关键信息（核心概念、代码片段、易错点）
3. 去口语化，生成结构化 Markdown
4. **自动自检**：使用技术专家视角审查内容，检查技术准确性、表述严谨性等
5. 创建临时分支并推送
6. 创建 Pull Request
7. 返回 PR 链接

自检结果会显示在 PR 描述中，帮助发现潜在问题。

### /inter-review <主题>
查看已有主题的笔记内容，并以技术专家视角进行严格审查。

示例：
```
/inter-review JVM垃圾回收
```

系统会：
1. 拉取最新仓库内容
2. 读取指定主题的笔记
3. 提供技术专家 Review 提示词，帮助发现：
   - 技术准确性错误
   - 表述不严谨之处
   - 遗漏的关键细节
   - 过时的内容
   - 常见误区

### /inter-search <关键词>
搜索笔记，支持按主题名和内容搜索。

示例：
```
/inter-search 垃圾回收
/inter-search G1
```

搜索结果：
- 📄 表示主题名匹配
- 📝 表示内容匹配
- 显示匹配内容的上下文片段

### /inter-list
列出所有已保存的主题（向后兼容，建议使用 /inter-search）。

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

## 使用示例

### 完整学习流程

1. **开始讨论**
   ```
   /inter-start Redis持久化
   ```

2. **进行问答讨论**（多轮对话）

3. **保存笔记**
   ```
   /inter-save
   ```
   系统会返回 PR 链接和自检结果，如：
   ```
   ✅ 笔记已保存并创建 PR
   
   📄 文件：redis/redis-persistence.md
   📝 操作：新增
   🔍 自检：✅ 基础检查通过
   🔗 PR: https://github.com/wzxch/xcm-interview-notes/pull/5
   ```

4. **专家审查**
   ```
   /inter-review Redis持久化
   ```
   系统会拉取最新内容，并提供 Review 提示词帮助审查。

5. **搜索复习**
   ```
   /inter-search 持久化
   ```

## 笔记格式

自动生成的笔记包含以下结构：

```markdown
# 主题名称

## 核心概念
- 概念1：说明
- 概念2：说明

## 要点总结
1. **问题1**
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
*最后更新：2025-02-25*
```

## 自检机制

/inter-save 会自动进行以下检查：

| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| 内容长度 | 严重 | 内容过短可能缺少实质内容 |
| 核心概念部分 | 警告 | 缺少核心概念部分 |
| 待补充标记 | 建议 | 存在 "待补充" 或 "TODO" 标记 |
| 代码块格式 | 严重 | 代码块格式不完整 |

同时，系统会生成技术专家 Review 提示词，供进一步人工审查使用。

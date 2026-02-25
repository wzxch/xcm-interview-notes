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

### /interview <主题>
开始一个新的主题讨论。

示例：
```
/interview JVM垃圾回收
```

系统会自动检查是否已有该主题的笔记，如果有会提示查看。

### 保存
在讨论结束后，输入"保存"将当前主题的内容整理成笔记。

流程：
1. 从对话历史中提取当前主题的讨论
2. 提炼关键信息（核心概念、代码片段、易错点）
3. 去口语化，生成结构化 Markdown
4. 创建临时分支并推送
5. 创建 Pull Request
6. 返回 PR 链接

### /review <主题>
查看已有主题的笔记内容。

示例：
```
/review JVM垃圾回收
```

### /list
列出所有已保存的主题。

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
   /interview Redis持久化
   ```

2. **进行问答讨论**（多轮对话）

3. **保存笔记**
   ```
   保存
   ```
   系统会返回 PR 链接，如：
   ```
   笔记已整理，PR: https://github.com/wzxch/xcm-interview-notes/pull/5
   ```

4. **后续复习**
   ```
   /review Redis持久化
   ```

5. **查看所有主题**
   ```
   /list
   ```

## 笔记格式

自动生成的笔记包含以下结构：

```markdown
# 主题名称

## 核心概念
- 概念1：说明
- 概念2：说明

## 代码示例
\`\`\`java
// 代码片段
\`\`\`

## 易错点
1. 易错点1
2. 易错点2

## 面试要点
- 要点1
- 要点2

---
*最后更新：2025-02-25*
```

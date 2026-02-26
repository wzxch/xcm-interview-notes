# Interview Helper Skill 设计文档

## 1. 概述

本文档记录 interview-helper 及其依赖 skill 的设计背景、架构决策和使用说明。

## 2. 架构设计

### 2.1 Skill 职责

| Skill | 职责 |
|:---|:---|
| github-notes | GitHub API 封装 |
| git-repo-manager | 本地 Git 操作 |
| interview-helper | 业务逻辑编排 |

### 2.2 数据流转

用户对话 → /inter-start → 创建会话 → 多轮对话 → /inter-summary → 临时文件 → /inter-save → Merge → PR

## 3. 核心设计

### 3.1 命令拆分

| 命令 | 职责 |
|:---|:---|
| /inter-summary | 生成摘要，保存临时文件 |
| /inter-save <路径> | 读取文件、Merge、自检、PR |

### 3.2 结构化 Merge

| 章节 | 策略 |
|:---|:---|
| 核心概念 | 去重追加 |
| 要点总结 | 去重追加，重新编号 |
| 代码示例 | 追加，重新编号 |
| 易错点 | 去重追加 |

## 4. 配置

config.json:
```json
{
  "repoUrl": "https://github.com/{user}/{repo}",
  "localPath": "/path/to/repo",
  "token": "ghp_xxx"
}
```

## 5. 使用流程

```
/inter-start <主题>
...对话...
/inter-summary
/inter-save /tmp/xxx.md
```

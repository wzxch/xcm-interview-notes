# github-notes Skill

GitHub API 操作工具，用于读取、创建和更新 GitHub 仓库中的 Markdown 笔记文件。

## 配置

在使用前，需要配置以下环境变量：

```bash
export GITHUB_TOKEN="ghp_xxxxxxxx"      # GitHub Personal Access Token
export GITHUB_REPO="owner/repo"          # 仓库名，如：wzxch/xcm-interview-notes
export GITHUB_USERNAME="your_username"   # GitHub 用户名
export GITHUB_AUTHOR_NAME="Your Name"    # Git commit 作者名
```

## 功能

### 1. 读取文件

```javascript
const { readFile } = require('./github-notes');
const content = await readFile('java/jvm-gc.md');
```

### 2. 列出目录

```javascript
const { listDirectory } = require('./github-notes');
const files = await listDirectory('java');
```

### 3. 创建/更新文件

```javascript
const { createOrUpdateFile } = require('./github-notes');
await createOrUpdateFile('java/new-topic.md', '# 新主题\n\n内容...', '添加新主题笔记');
```

### 4. 创建临时分支

```javascript
const { createBranch } = require('./github-notes');
await createBranch('note-jvm-gc-20250225');
```

### 5. 创建 Pull Request

```javascript
const { createPullRequest } = require('./github-notes');
const pr = await createPullRequest('note-jvm-gc-20250225', 'Add: jvm-gc-20250225', '添加 JVM GC 笔记');
console.log(pr.html_url);
```

## 完整工作流示例

```javascript
const github = require('./github-notes');

// 1. 创建临时分支
await github.createBranch('note-topic-20250225');

// 2. 创建/更新文件
await github.createOrUpdateFile(
  'java/topic.md',
  '# 主题\n\n内容',
  '添加主题笔记',
  'note-topic-20250225'
);

// 3. 创建 PR
const pr = await github.createPullRequest(
  'note-topic-20250225',
  'Add: topic-20250225',
  '添加主题笔记'
);

console.log('PR 链接:', pr.html_url);
```

## API 参考

### readFile(path, branch?)
- `path`: 文件路径（相对于仓库根目录）
- `branch`: 分支名（可选，默认 main）
- 返回: 文件内容字符串，文件不存在返回 null

### listDirectory(path)
- `path`: 目录路径（相对于仓库根目录）
- 返回: 文件和目录列表数组

### createOrUpdateFile(path, content, message, branch?)
- `path`: 文件路径
- `content`: 文件内容
- `message`: commit 消息
- `branch`: 分支名（可选，默认 main）

### createBranch(branchName, baseBranch?)
- `branchName`: 新分支名
- `baseBranch`: 基础分支（可选，默认 main）

### createPullRequest(head, title, body, base?)
- `head`: 源分支名
- `title`: PR 标题
- `body`: PR 描述
- `base`: 目标分支（可选，默认 main）
- 返回: PR 对象，包含 `html_url`

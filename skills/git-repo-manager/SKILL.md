# git-repo-manager Skill

Git 仓库管理工具，用于本地仓库的克隆、拉取、分支管理和文件操作。

## 配置

编辑 `config.json` 配置仓库信息：

```json
{
  "repoUrl": "https://github.com/wzxch/xcm-interview-notes",
  "localPath": "/root/.openclaw/workspace/repos/xcm-interview-notes",
  "token": "your-github-token"
}
```

## API 方法

### clone(repoUrl, localPath, token)
克隆仓库到本地路径。

```javascript
const git = require('./git-repo-manager');
await git.clone(
  'https://github.com/user/repo',
  '/path/to/local',
  'ghp_xxxxxxxx'
);
```

### pull(localPath)
拉取最新代码。

```javascript
await git.pull('/path/to/repo');
```

### fetch(localPath)
获取远程分支信息。

```javascript
await git.fetch('/path/to/repo');
```

### checkout(localPath, branch)
切换到指定分支。

```javascript
await git.checkout('/path/to/repo', 'main');
```

### createBranch(localPath, branchName, baseBranch)
基于指定分支创建新分支。

```javascript
await git.createBranch('/path/to/repo', 'feature-branch', 'main');
```

### commit(localPath, message, files)
提交更改到本地仓库。

```javascript
await git.commit('/path/to/repo', 'Add new feature', ['file1.js', 'file2.js']);
```

### push(localPath, branch)
推送到远程仓库。

```javascript
await git.push('/path/to/repo', 'feature-branch');
```

### readFile(localPath, filePath)
读取本地文件内容。

```javascript
const content = await git.readFile('/path/to/repo', 'README.md');
```

### writeFile(localPath, filePath, content)
写入内容到本地文件。

```javascript
await git.writeFile('/path/to/repo', 'notes.md', '# Hello World');
```

### listFiles(localPath, dir)
递归列出目录下所有 markdown 文件。

```javascript
const files = await git.listFiles('/path/to/repo', 'docs');
// 返回: ['docs/guide.md', 'docs/api.md', ...]
```

### fileExists(localPath, filePath)
检查文件是否存在。

```javascript
const exists = await git.fileExists('/path/to/repo', 'README.md');
```

### ensureRepo(localPath, repoUrl, token)
确保仓库存在（不存在则 clone，存在则 pull）。

```javascript
await git.ensureRepo(
  '/path/to/repo',
  'https://github.com/user/repo',
  'ghp_xxxxxxxx'
);
```

## 使用示例

### 完整工作流

```javascript
const git = require('./git-repo-manager');

// 1. 确保仓库存在
await git.ensureRepo(
  '/root/.openclaw/workspace/repos/notes',
  'https://github.com/user/notes',
  'ghp_xxxxxxxx'
);

// 2. 创建新分支
await git.createBranch('/root/.openclaw/workspace/repos/notes', 'new-feature', 'main');

// 3. 写入文件
await git.writeFile(
  '/root/.openclaw/workspace/repos/notes',
  'new-file.md',
  '# New Content'
);

// 4. 提交更改
await git.commit('/root/.openclaw/workspace/repos/notes', 'Add new file', ['new-file.md']);

// 5. 推送到远程
await git.push('/root/.openclaw/workspace/repos/notes', 'new-feature');
```

## 错误处理

所有方法都返回 Promise，使用 try-catch 处理错误：

```javascript
try {
  await git.clone(repoUrl, localPath, token);
} catch (error) {
  console.error('Clone failed:', error.message);
}
```

## 依赖

- Node.js child_process 模块
- 本地安装 Git

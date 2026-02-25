/**
 * Git Repo Manager - Git 仓库管理工具
 * 用于本地仓库的克隆、拉取、分支管理和文件操作
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * 执行 shell 命令，返回 Promise
 * @param {string} command - 命令
 * @param {string} cwd - 工作目录
 * @returns {Promise<string>} 命令输出
 */
function execPromise(command, cwd = null) {
  return new Promise((resolve, reject) => {
    const options = cwd ? { cwd } : {};
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * 构建带 token 的仓库 URL
 * @param {string} repoUrl - 原始仓库 URL
 * @param {string} token - GitHub token
 * @returns {string} 带认证的 URL
 */
function buildAuthUrl(repoUrl, token) {
  if (!token) return repoUrl;
  
  // 处理 https://github.com/user/repo 格式
  if (repoUrl.startsWith('https://')) {
    const url = new URL(repoUrl);
    url.username = token;
    return url.toString();
  }
  
  return repoUrl;
}

/**
 * 克隆仓库
 * @param {string} repoUrl - 仓库 URL
 * @param {string} localPath - 本地路径
 * @param {string} token - GitHub token（可选）
 * @returns {Promise<string>} 克隆结果
 */
async function clone(repoUrl, localPath, token = null) {
  try {
    // 确保父目录存在
    const parentDir = path.dirname(localPath);
    await fs.mkdir(parentDir, { recursive: true });
    
    const authUrl = buildAuthUrl(repoUrl, token);
    const command = `git clone "${authUrl}" "${localPath}"`;
    
    return await execPromise(command);
  } catch (error) {
    throw new Error(`Clone failed: ${error.message}`);
  }
}

/**
 * 拉取最新代码
 * @param {string} localPath - 本地仓库路径
 * @returns {Promise<string>} 拉取结果
 */
async function pull(localPath) {
  try {
    return await execPromise('git pull', localPath);
  } catch (error) {
    throw new Error(`Pull failed: ${error.message}`);
  }
}

/**
 * 获取远程分支信息
 * @param {string} localPath - 本地仓库路径
 * @returns {Promise<string>} fetch 结果
 */
async function fetch(localPath) {
  try {
    return await execPromise('git fetch --all', localPath);
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

/**
 * 切换分支
 * @param {string} localPath - 本地仓库路径
 * @param {string} branch - 分支名称
 * @returns {Promise<string>} checkout 结果
 */
async function checkout(localPath, branch) {
  try {
    return await execPromise(`git checkout "${branch}"`, localPath);
  } catch (error) {
    throw new Error(`Checkout failed: ${error.message}`);
  }
}

/**
 * 创建新分支
 * @param {string} localPath - 本地仓库路径
 * @param {string} branchName - 新分支名称
 * @param {string} baseBranch - 基础分支（默认 main）
 * @returns {Promise<string>} 创建结果
 */
async function createBranch(localPath, branchName, baseBranch = 'main') {
  try {
    // 先切换到基础分支
    await checkout(localPath, baseBranch);
    // 创建并切换到新分支
    return await execPromise(`git checkout -b "${branchName}"`, localPath);
  } catch (error) {
    throw new Error(`Create branch failed: ${error.message}`);
  }
}

/**
 * 提交更改
 * @param {string} localPath - 本地仓库路径
 * @param {string} message - 提交信息
 * @param {Array<string>} files - 要提交的文件列表（可选，默认全部）
 * @returns {Promise<string>} 提交结果
 */
async function commit(localPath, message, files = null) {
  try {
    // 添加文件
    if (files && files.length > 0) {
      const filePaths = files.map(f => `"${f}"`).join(' ');
      await execPromise(`git add ${filePaths}`, localPath);
    } else {
      await execPromise('git add -A', localPath);
    }
    
    // 提交
    return await execPromise(`git commit -m "${message}"`, localPath);
  } catch (error) {
    throw new Error(`Commit failed: ${error.message}`);
  }
}

/**
 * 推送到远程
 * @param {string} localPath - 本地仓库路径
 * @param {string} branch - 分支名称
 * @returns {Promise<string>} 推送结果
 */
async function push(localPath, branch) {
  try {
    return await execPromise(`git push origin "${branch}"`, localPath);
  } catch (error) {
    throw new Error(`Push failed: ${error.message}`);
  }
}

/**
 * 读取本地文件内容
 * @param {string} localPath - 本地仓库路径
 * @param {string} filePath - 文件相对路径
 * @returns {Promise<string>} 文件内容
 */
async function readFile(localPath, filePath) {
  try {
    const fullPath = path.join(localPath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Read file failed: ${error.message}`);
  }
}

/**
 * 写入本地文件
 * @param {string} localPath - 本地仓库路径
 * @param {string} filePath - 文件相对路径
 * @param {string} content - 文件内容
 * @returns {Promise<void>}
 */
async function writeFile(localPath, filePath, content) {
  try {
    const fullPath = path.join(localPath, filePath);
    
    // 确保父目录存在
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });
    
    await fs.writeFile(fullPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Write file failed: ${error.message}`);
  }
}

/**
 * 递归列出目录下所有 markdown 文件
 * @param {string} localPath - 本地仓库路径
 * @param {string} dir - 目录相对路径（可选，默认根目录）
 * @returns {Promise<Array<string>>} 文件路径列表
 */
async function listFiles(localPath, dir = '') {
  const results = [];
  const targetDir = path.join(localPath, dir);
  
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(localPath, fullPath);
      
      if (entry.isDirectory()) {
        // 跳过 .git 目录
        if (entry.name === '.git') continue;
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(relativePath);
      }
    }
  }
  
  try {
    await walk(targetDir);
    return results;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw new Error(`List files failed: ${error.message}`);
  }
}

/**
 * 检查文件是否存在
 * @param {string} localPath - 本地仓库路径
 * @param {string} filePath - 文件相对路径
 * @returns {Promise<boolean>} 是否存在
 */
async function fileExists(localPath, filePath) {
  try {
    const fullPath = path.join(localPath, filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 确保仓库存在（不存在则 clone，存在则 pull）
 * @param {string} localPath - 本地仓库路径
 * @param {string} repoUrl - 仓库 URL
 * @param {string} token - GitHub token（可选）
 * @returns {Promise<string>} 操作结果
 */
async function ensureRepo(localPath, repoUrl, token = null) {
  try {
    // 检查目录是否存在
    const exists = await fileExists(localPath, '.git');
    
    if (exists) {
      // 存在则拉取最新代码
      return await pull(localPath);
    } else {
      // 不存在则克隆
      return await clone(repoUrl, localPath, token);
    }
  } catch (error) {
    throw new Error(`Ensure repo failed: ${error.message}`);
  }
}

module.exports = {
  clone,
  pull,
  fetch,
  checkout,
  createBranch,
  commit,
  push,
  readFile,
  writeFile,
  listFiles,
  fileExists,
  ensureRepo
};

/**
 * Interview Helper - 面试学习助手
 * 帮助整理面试知识点，自动生成结构化笔记并保存到本地 Git 仓库
 */

// 尝试加载 git-repo-manager 和配置
let git;
let config;
let github;

try {
  git = require('../git-repo-manager/git-repo-manager.js');
  config = require('../git-repo-manager/config.json');
  github = require('../github-notes/github-notes.js');
} catch (error) {
  console.error('Failed to load git-repo-manager or config:', error.message);
}

// 配置检查
function checkConfig() {
  if (!git || !config) {
    return {
      valid: false,
      message: '❌ 配置错误：无法加载 git-repo-manager 或 config.json\n\n' +
               '请先配置 git-repo-manager：\n' +
               '1. 确保 /skills/git-repo-manager/config.json 存在\n' +
               '2. 配置内容示例：\n' +
               '   {\n' +
               '     "repoUrl": "https://github.com/username/repo",\n' +
               '     "localPath": "/path/to/local/repo",\n' +
               '     "token": "your-github-token"\n' +
               '   }'
    };
  }
  
  if (!config.repoUrl || !config.localPath) {
    return {
      valid: false,
      message: '❌ 配置错误：config.json 缺少必要字段\n\n' +
               '需要配置：\n' +
               '- repoUrl: 远程仓库地址\n' +
               '- localPath: 本地仓库路径\n' +
               '- token: GitHub 访问令牌（可选）'
    };
  }
  
  return { valid: true };
}

// 会话状态存储（简单内存存储，实际使用可能需要持久化）
const sessions = new Map();

/**
 * 获取主题分类目录
 * @param {string} topic - 主题名称
 * @returns {string} 分类目录
 */
function getTopicCategory(topic) {
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTopic.includes('jvm') || lowerTopic.includes('java') || 
      lowerTopic.includes('spring') || lowerTopic.includes('并发') ||
      lowerTopic.includes('多线程') || lowerTopic.includes('集合')) {
    return 'java';
  }
  
  if (lowerTopic.includes('mysql') || lowerTopic.includes('sql') || 
      lowerTopic.includes('数据库') || lowerTopic.includes('索引') ||
      lowerTopic.includes('事务') || lowerTopic.includes('锁')) {
    return 'mysql';
  }
  
  if (lowerTopic.includes('redis') || lowerTopic.includes('缓存') ||
      lowerTopic.includes('cache')) {
    return 'redis';
  }
  
  if (lowerTopic.includes('kafka') || lowerTopic.includes('mq') ||
      lowerTopic.includes('消息队列') || lowerTopic.includes('rabbitmq')) {
    return 'mq';
  }
  
  if (lowerTopic.includes('linux') || lowerTopic.includes('操作系统') ||
      lowerTopic.includes('os')) {
    return 'os';
  }
  
  if (lowerTopic.includes('网络') || lowerTopic.includes('tcp') ||
      lowerTopic.includes('http') || lowerTopic.includes('ip') ||
      lowerTopic.includes('socket')) {
    return 'network';
  }
  
  if (lowerTopic.includes('算法') || lowerTopic.includes('数据结构') ||
      lowerTopic.includes('leetcode') || lowerTopic.includes('排序')) {
    return 'algorithm';
  }
  
  if (lowerTopic.includes('docker') || lowerTopic.includes('k8s') ||
      lowerTopic.includes('kubernetes') || lowerTopic.includes('devops') ||
      lowerTopic.includes('ci/cd')) {
    return 'devops';
  }
  
  return 'misc';
}

/**
 * 转换主题为文件名
 * @param {string} topic - 主题名称
 * @returns {string} 文件名（不含扩展名）
 */
function topicToFilename(topic) {
  return topic
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')  // 非字母数字中文转为 -
    .replace(/^-+|-+$/g, '');              // 去除首尾 -
}

/**
 * 获取文件路径
 * @param {string} topic - 主题名称
 * @returns {string} 完整文件路径
 */
function getFilePath(topic) {
  const category = getTopicCategory(topic);
  const filename = topicToFilename(topic);
  return `${category}/${filename}.md`;
}

/**
 * 处理 /interview 命令
 * @param {string} topic - 主题名称
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<Object>} 响应对象
 */
async function startInterview(topic, sessionId) {
  // 检查配置
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return {
      success: false,
      message: configCheck.message
    };
  }

  if (!topic || topic.trim() === '') {
    return {
      success: false,
      message: '请提供主题名称，例如：/inter-start JVM垃圾回收'
    };
  }

  try {
    // 确保仓库存在
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);

    // 保存当前会话主题
    sessions.set(sessionId, {
      topic: topic.trim(),
      startTime: new Date().toISOString(),
      messages: []
    });

    // 检查是否已有笔记
    const filePath = getFilePath(topic);
    const exists = await git.fileExists(config.localPath, filePath);

    let message = `开始讨论主题：**${topic}**\n\n`;
    
    if (exists) {
      message += `📚 该主题已有笔记，可以使用 "/inter-review ${topic}" 查看已有内容。\n`;
      message += `💡 讨论结束后输入"/inter-save"将更新笔记。`;
    } else {
      message += `📝 这是一个新主题。\n`;
      message += `💡 讨论结束后输入"/inter-save"将创建新笔记。`;
    }

    return {
      success: true,
      message: message,
      topic: topic,
      filePath: filePath,
      exists: exists
    };
  } catch (error) {
    return {
      success: false,
      message: `启动讨论失败：${error.message}`
    };
  }
}

/**
 * 添加消息到会话
 * @param {string} sessionId - 会话 ID
 * @param {string} role - 角色（user/assistant）
 * @param {string} content - 消息内容
 */
function addMessage(sessionId, role, content) {
  const session = sessions.get(sessionId);
  if (session) {
    session.messages.push({
      role,
      content,
      time: new Date().toISOString()
    });
  }
}

/**
 * 从对话历史提炼关键信息并生成 Markdown
 * @param {string} topic - 主题名称
 * @param {Array} messages - 对话消息列表
 * @param {string} existingContent - 已有笔记内容（可选）
 * @returns {string} 生成的 Markdown 内容
 */
function generateMarkdown(topic, messages, existingContent = null) {
  // 提取问答内容
  const qaPairs = [];
  let currentQuestion = null;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      currentQuestion = msg.content;
    } else if (msg.role === 'assistant' && currentQuestion) {
      qaPairs.push({
        question: currentQuestion,
        answer: msg.content
      });
      currentQuestion = null;
    }
  }

  // 提取代码片段（简单的正则匹配）
  const codeSnippets = [];
  const codeRegex = /```[\s\S]*?```/g;
  for (const qa of qaPairs) {
    const matches = qa.answer.match(codeRegex);
    if (matches) {
      codeSnippets.push(...matches);
    }
  }

  // 提取关键概念（简单的关键词提取）
  const keyConcepts = extractKeyConcepts(qaPairs);

  // 提取易错点（基于关键词）
  const pitfalls = extractPitfalls(qaPairs);

  // 生成 Markdown
  let md = `# ${topic}\n\n`;
  
  md += `## 核心概念\n\n`;
  if (keyConcepts.length > 0) {
    for (const concept of keyConcepts) {
      md += `- **${concept.name}**：${concept.description}\n`;
    }
  } else {
    md += `- 待补充核心概念\n`;
  }
  md += `\n`;

  md += `## 要点总结\n\n`;
  if (qaPairs.length > 0) {
    for (let i = 0; i < Math.min(qaPairs.length, 5); i++) {
      const qa = qaPairs[i];
      // 简化问题
      const simplifiedQ = simplifyQuestion(qa.question);
      // 提取答案要点（取前200字符）
      const keyPoint = extractKeyPoint(qa.answer);
      md += `${i + 1}. **${simplifiedQ}**\n   ${keyPoint}\n\n`;
    }
  }
  md += `\n`;

  if (codeSnippets.length > 0) {
    md += `## 代码示例\n\n`;
    for (let i = 0; i < Math.min(codeSnippets.length, 3); i++) {
      md += `### 示例 ${i + 1}\n\n`;
      md += codeSnippets[i] + '\n\n';
    }
  }

  if (pitfalls.length > 0) {
    md += `## 易错点\n\n`;
    for (let i = 0; i < pitfalls.length; i++) {
      md += `${i + 1}. ${pitfalls[i]}\n`;
    }
    md += `\n`;
  }

  md += `## 面试要点\n\n`;
  md += `- 理解${topic}的基本原理\n`;
  md += `- 能够结合实际场景分析\n`;
  md += `- 了解常见问题和优化方案\n`;
  md += `\n`;

  md += `---\n`;
  md += `*最后更新：${new Date().toLocaleDateString('zh-CN')}*\n`;

  return md;
}

/**
 * 提取关键概念
 * @param {Array} qaPairs - 问答对
 * @returns {Array} 关键概念列表
 */
function extractKeyConcepts(qaPairs) {
  const concepts = [];
  const conceptKeywords = [
    '原理', '机制', '算法', '模型', '架构', '设计', '模式',
    '原理是', '机制是', '核心是', '本质是', '关键在于'
  ];

  for (const qa of qaPairs) {
    for (const keyword of conceptKeywords) {
      if (qa.answer.includes(keyword)) {
        const idx = qa.answer.indexOf(keyword);
        const start = Math.max(0, idx - 20);
        const end = Math.min(qa.answer.length, idx + 100);
        const context = qa.answer.substring(start, end).replace(/\n/g, ' ');
        
        if (context.length > 10) {
          concepts.push({
            name: keyword,
            description: context + '...'
          });
        }
        break;
      }
    }
  }

  // 去重
  return concepts.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i).slice(0, 5);
}

/**
 * 提取易错点
 * @param {Array} qaPairs - 问答对
 * @returns {Array} 易错点列表
 */
function extractPitfalls(qaPairs) {
  const pitfalls = [];
  const pitfallKeywords = [
    '注意', '小心', '避免', '错误', '误区', '坑', '陷阱',
    '容易', '常见问题', '不要', '切忌'
  ];

  for (const qa of qaPairs) {
    for (const keyword of pitfallKeywords) {
      if (qa.answer.includes(keyword)) {
        const sentences = qa.answer.split(/[。！；\n]/);
        for (const sentence of sentences) {
          if (sentence.includes(keyword) && sentence.length > 10 && sentence.length < 100) {
            pitfalls.push(sentence.trim() + '。');
            break;
          }
        }
        break;
      }
    }
  }

  return [...new Set(pitfalls)].slice(0, 5);
}

/**
 * 简化问题
 * @param {string} question - 原始问题
 * @returns {string} 简化后的问题
 */
function simplifyQuestion(question) {
  // 去除命令前缀
  let simplified = question
    .replace(/^\/(inter-start|inter-review)\s*/i, '')
    .replace(/^\/inter-save\s*/i, '')
    .trim();
  
  // 限制长度
  if (simplified.length > 50) {
    simplified = simplified.substring(0, 50) + '...';
  }
  
  return simplified || '相关问题';
}

/**
 * 提取答案要点
 * @param {string} answer - 答案内容
 * @returns {string} 要点
 */
function extractKeyPoint(answer) {
  // 去除代码块
  let clean = answer.replace(/```[\s\S]*?```/g, '[代码]').trim();
  
  // 取第一段
  const firstPara = clean.split(/\n\n/)[0];
  
  // 限制长度
  if (firstPara.length > 150) {
    return firstPara.substring(0, 150) + '...';
  }
  
  return firstPara;
}

/**
 * 处理保存命令
 * @param {string} sessionId - 会话 ID
 * @param {Array} sessionHistory - 会话历史（外部传入的完整历史）
 * @returns {Promise<Object>} 响应对象
 */
async function saveNotes(sessionId, sessionHistory = null) {
  // 检查配置
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return {
      success: false,
      message: configCheck.message
    };
  }

  const session = sessions.get(sessionId);
  
  if (!session && !sessionHistory) {
    return {
      success: false,
      message: '没有正在进行的讨论，请先使用 "/inter-start <主题>" 开始讨论'
    };
  }

  const topic = session?.topic || '未命名主题';
  const messages = sessionHistory || session?.messages || [];
  
  if (messages.length === 0) {
    return {
      success: false,
      message: '当前主题没有讨论内容，无法保存'
    };
  }

  try {
    // 设置环境变量供 github-notes 使用
    process.env.GITHUB_TOKEN = config.token;
    process.env.GITHUB_REPO = config.repoUrl.replace('https://github.com/', '');
    process.env.GITHUB_USERNAME = config.repoUrl.split('/')[3];
    process.env.GITHUB_AUTHOR_NAME = 'xcm_kimi_claw';

    // 1. ensureRepo 确保本地仓库存在
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);
    
    // 2. pull 最新代码
    await git.pull(config.localPath);
    
    // 3. 检查文件是否存在（本地）
    const filePath = getFilePath(topic);
    const exists = await git.fileExists(config.localPath, filePath);
    
    // 4. 获取已有内容（如果是更新）
    let existingContent = null;
    if (exists) {
      existingContent = await git.readFile(config.localPath, filePath);
    }

    // 5. 生成 Markdown
    const markdown = generateMarkdown(topic, messages, existingContent);

    // 6. 使用 review 逻辑自检内容
    const selfReviewResult = await selfReviewContent(topic, markdown);

    // 7. 创建临时分支（本地）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const branchName = `note-${topicToFilename(topic)}-${timestamp}`;
    await git.createBranch(config.localPath, branchName, 'main');
    await git.checkout(config.localPath, branchName);

    // 8. 写入文件（本地）
    await git.writeFile(config.localPath, filePath, markdown);

    // 9. commit（本地）
    const commitMessage = exists 
      ? `Update: ${topic} - ${new Date().toLocaleDateString('zh-CN')}`
      : `Add: ${topic} - ${new Date().toLocaleDateString('zh-CN')}`;
    await git.commit(config.localPath, commitMessage, [filePath]);

    // 10. push 到远程临时分支
    await git.push(config.localPath, branchName);

    // 11. 切回 main 分支
    await git.checkout(config.localPath, 'main');

    // 12. 创建 PR（使用 github-notes）
    const prTitle = `${exists ? 'Update' : 'Add'}：${topic}-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}`;
    const prBody = `## ${exists ? '更新' : '添加'}笔记：${topic}\n\n` +
                   `### 变更内容\n` +
                   `- ${exists ? '更新' : '新增'} ${filePath}\n` +
                   `- 基于 ${messages.length} 条对话记录整理\n\n` +
                   `### 自检结果\n` +
                   `${selfReviewResult.summary}\n\n` +
                   `### 笔记摘要\n` +
                   `- 主题：${topic}\n` +
                   `- 分类：${getTopicCategory(topic)}\n` +
                   `- 时间：${new Date().toLocaleString('zh-CN')}`;
    
    const pr = await github.createPullRequest(branchName, prTitle, prBody);

    // 13. 清理会话
    sessions.delete(sessionId);

    return {
      success: true,
      message: `✅ 笔记已保存并创建 PR\n\n📄 文件：${filePath}\n📝 操作：${exists ? '更新' : '新增'}\n🔍 自检：${selfReviewResult.summary}\n🔗 PR: ${pr?.html_url || '创建成功'}`,
      filePath: filePath,
      isUpdate: exists,
      prUrl: pr?.html_url,
      selfReview: selfReviewResult
    };

  } catch (error) {
    return {
      success: false,
      message: `保存失败：${error.message}`
    };
  }
}

/**
 * 技术专家 Review 提示词
 */
const REVIEWER_PROMPT = `你是一名资深技术专家，拥有10年以上后端开发经验，精通Java、JVM、MySQL、Redis、消息队列等核心技术。

你的任务是以严格、挑剔的视角审查以下技术文档，帮助发现潜在问题：

## 审查维度
1. **技术准确性**：概念、原理、数据是否有错误？
2. **表述严谨性**：描述是否过于绝对？是否有歧义？
3. **完整性**：关键细节是否遗漏？边界条件是否说明？
4. **时效性**：内容是否过时？是否有新版本的变化未提及？
5. **常见误区**：是否忽略了初学者容易犯的错误？

## 输出格式
请以以下结构输出审查结果：

### ✅ 整体评价
简要评价文档质量（优秀/良好/需改进）

### 🔍 发现的问题
按严重程度列出发现的问题：
- **严重**：技术错误、概念混淆
- **警告**：表述不严谨、可能误导
- **建议**：可以补充的细节、优化建议

### 📌 修正建议
针对每个问题给出具体的修改建议

---
现在开始审查以下内容：`;

/**
 * 处理 /review 命令
 * @param {string} topic - 主题名称
 * @returns {Promise<Object>} 响应对象
 */
async function reviewNotes(topic) {
  // 检查配置
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return {
      success: false,
      message: configCheck.message
    };
  }

  if (!topic || topic.trim() === '') {
    return {
      success: false,
      message: '请提供主题名称，例如：/inter-review JVM垃圾回收'
    };
  }

  try {
    // 确保仓库存在并拉取最新内容
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);
    await git.pull(config.localPath);
    
    const filePath = getFilePath(topic);
    const content = await git.readFile(config.localPath, filePath);

    if (content === null) {
      return {
        success: false,
        message: `未找到主题 "${topic}" 的笔记。\n\n可以使用 "/inter-start ${topic}" 开始新的讨论。`
      };
    }

    return {
      success: true,
      message: `📚 **${topic}** 的笔记内容：\n\n${content}`,
      topic: topic,
      content: content,
      reviewPrompt: REVIEWER_PROMPT
    };

  } catch (error) {
    return {
      success: false,
      message: `读取笔记失败：${error.message}`
    };
  }
}

/**
 * 自检生成的笔记内容
 * @param {string} topic - 主题名称
 * @param {string} content - 笔记内容
 * @returns {Promise<Object>} 自检结果
 */
async function selfReviewContent(topic, content) {
  // 基础自检：检查常见错误模式
  const issues = [];
  
  // 检查空内容
  if (!content || content.trim().length < 100) {
    issues.push({ severity: '严重', issue: '内容过短，可能缺少实质内容' });
  }
  
  // 检查是否有核心概念部分
  if (!content.includes('## 核心概念')) {
    issues.push({ severity: '警告', issue: '缺少核心概念部分' });
  }
  
  // 检查是否有占位符
  if (content.includes('待补充') || content.includes('TODO')) {
    issues.push({ severity: '建议', issue: '存在待补充内容标记' });
  }
  
  // 检查代码块格式
  const codeBlockMatches = content.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    issues.push({ severity: '严重', issue: '代码块格式不完整（可能缺少闭合）' });
  }
  
  // 生成自检摘要
  const criticalCount = issues.filter(i => i.severity === '严重').length;
  const warningCount = issues.filter(i => i.severity === '警告').length;
  const suggestionCount = issues.filter(i => i.severity === '建议').length;
  
  let summary = '';
  if (criticalCount === 0 && warningCount === 0 && suggestionCount === 0) {
    summary = '✅ 基础检查通过';
  } else {
    const parts = [];
    if (criticalCount > 0) parts.push(`${criticalCount}个严重问题`);
    if (warningCount > 0) parts.push(`${warningCount}个警告`);
    if (suggestionCount > 0) parts.push(`${suggestionCount}个建议`);
    summary = `⚠️ 发现 ${parts.join('、')}`;
  }
  
  return {
    summary,
    issues,
    reviewPrompt: REVIEWER_PROMPT + '\n\n' + content
  };
}

/**
 * 处理 /search 命令 - 搜索主题和内容
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Object>} 响应对象
 */
async function searchNotes(keyword) {
  // 检查配置
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return {
      success: false,
      message: configCheck.message
    };
  }

  if (!keyword || keyword.trim() === '') {
    return {
      success: false,
      message: '请提供搜索关键词，例如：/inter-search 垃圾回收'
    };
  }

  try {
    // 确保仓库存在并拉取最新内容
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);
    await git.pull(config.localPath);
    
    const searchTerm = keyword.trim().toLowerCase();
    const files = await git.listFiles(config.localPath);
    
    if (files.length === 0) {
      return {
        success: true,
        message: '还没有保存任何笔记。\n\n使用 "/inter-start <主题>" 开始第一个讨论吧！'
      };
    }

    // 搜索结果
    const results = [];
    
    for (const file of files) {
      const filename = file.split('/').pop().replace('.md', '').toLowerCase();
      const content = await git.readFile(config.localPath, file);
      const contentLower = (content || '').toLowerCase();
      
      // 检查文件名匹配
      const nameMatch = filename.includes(searchTerm);
      // 检查内容匹配
      const contentMatch = contentLower.includes(searchTerm);
      
      if (nameMatch || contentMatch) {
        // 提取匹配片段
        let snippet = '';
        if (contentMatch && content) {
          const idx = contentLower.indexOf(searchTerm);
          const start = Math.max(0, idx - 50);
          const end = Math.min(content.length, idx + searchTerm.length + 100);
          snippet = content.substring(start, end).replace(/\n/g, ' ');
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
        }
        
        results.push({
          file: file,
          filename: file.split('/').pop().replace('.md', ''),
          category: file.split('/')[0],
          nameMatch,
          contentMatch,
          snippet
        });
      }
    }
    
    // 排序：文件名匹配优先
    results.sort((a, b) => {
      if (a.nameMatch && !b.nameMatch) return -1;
      if (!a.nameMatch && b.nameMatch) return 1;
      return 0;
    });

    if (results.length === 0) {
      return {
        success: true,
        message: `未找到包含 "${keyword}" 的笔记。\n\n可以尝试：\n- 使用更简单的关键词\n- 使用 "/inter-start ${keyword}" 开始新的讨论`,
        keyword: keyword,
        results: []
      };
    }

    let message = `🔍 搜索 "${keyword}" 的结果（共 ${results.length} 条）：\n\n`;
    
    // 按分类分组
    const groups = {};
    for (const r of results) {
      if (!groups[r.category]) {
        groups[r.category] = [];
      }
      groups[r.category].push(r);
    }
    
    for (const [dir, items] of Object.entries(groups)) {
      message += `**${dir}/**\n`;
      for (const item of items) {
        const matchType = item.nameMatch ? '📄' : '📝';
        message += `  ${matchType} ${item.filename}`;
        if (item.snippet) {
          message += `\n     ${item.snippet}`;
        }
        message += '\n';
      }
      message += '\n';
    }
    
    message += `💡 使用 "/inter-review <主题>" 查看完整内容`;

    return {
      success: true,
      message: message,
      keyword: keyword,
      results: results
    };

  } catch (error) {
    return {
      success: false,
      message: `搜索失败：${error.message}`
    };
  }
}

/**
 * 处理 /list 命令 - 列出所有主题（保留向后兼容）
 * @returns {Promise<Object>} 响应对象
 */
async function listTopics() {
  // 检查配置
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return {
      success: false,
      message: configCheck.message
    };
  }

  try {
    // 确保仓库存在并拉取最新内容
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);
    await git.pull(config.localPath);
    
    const files = await git.listFiles(config.localPath);
    
    if (files.length === 0) {
      return {
        success: true,
        message: '还没有保存任何笔记。\n\n使用 "/inter-start <主题>" 开始第一个讨论吧！'
      };
    }

    // 按目录分组
    const groups = {};
    for (const file of files) {
      const dir = file.split('/')[0];
      if (!groups[dir]) {
        groups[dir] = [];
      }
      // 提取文件名（不含扩展名）
      const filename = file.split('/').pop().replace('.md', '');
      groups[dir].push(filename);
    }

    let message = '📚 已保存的主题列表：\n\n';
    for (const [dir, topics] of Object.entries(groups)) {
      message += `**${dir}/**\n`;
      for (const topic of topics) {
        message += `  - ${topic}\n`;
      }
      message += '\n';
    }

    message += `共 ${files.length} 个主题`;

    return {
      success: true,
      message: message,
      topics: files.map(f => ({
        name: f.split('/').pop().replace('.md', ''),
        path: f,
        category: f.split('/')[0]
      }))
    };

  } catch (error) {
    return {
      success: false,
      message: `列出主题失败：${error.message}`
    };
  }
}

/**
 * 获取当前会话信息
 * @param {string} sessionId - 会话 ID
 * @returns {Object|null} 会话信息
 */
function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * 清理会话
 * @param {string} sessionId - 会话 ID
 */
function clearSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = {
  startInterview,
  saveNotes,
  reviewNotes,
  listTopics,
  searchNotes,
  addMessage,
  getSession,
  clearSession,
  getFilePath,
  getTopicCategory,
  generateMarkdown,
  selfReviewContent
};

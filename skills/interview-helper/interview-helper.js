/**
 * Interview Helper - 面试学习助手
 * 帮助整理面试知识点，自动生成结构化笔记并通过 PR 模式保存到 GitHub
 */

const fs = require('fs');
const path = require('path');

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

// 会话状态存储
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
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
 * 处理 /inter-start 命令
 * @param {string} topic - 主题名称
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<Object>} 响应对象
 */
async function startInterview(topic, sessionId) {
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return { success: false, message: configCheck.message };
  }

  if (!topic || topic.trim() === '') {
    return {
      success: false,
      message: '请提供主题名称，例如：/inter-start JVM垃圾回收'
    };
  }

  try {
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);

    sessions.set(sessionId, {
      topic: topic.trim(),
      startTime: new Date().toISOString(),
      messages: []
    });

    const filePath = getFilePath(topic);
    const exists = await git.fileExists(config.localPath, filePath);

    let message = `开始讨论主题：**${topic}**\n\n`;
    
    if (exists) {
      message += `📚 该主题已有笔记，可以使用 "/inter-review ${topic}" 查看已有内容。\n`;
      message += `💡 讨论结束后输入"/inter-summary"生成摘要，然后用"/inter-save <文件路径>"保存。`;
    } else {
      message += `📝 这是一个新主题。\n`;
      message += `💡 讨论结束后输入"/inter-summary"生成摘要，然后用"/inter-save <文件路径>"保存。`;
    }

    return {
      success: true,
      message: message,
      topic: topic,
      filePath: filePath,
      exists: exists
    };
  } catch (error) {
    return { success: false, message: `启动讨论失败：${error.message}` };
  }
}

/**
 * 添加消息到会话
 * @param {string} sessionId - 会话 ID
 * @param {string} role - 角色
 * @param {string} content - 消息内容
 */
function addMessage(sessionId, role, content) {
  const session = sessions.get(sessionId);
  if (session) {
    session.messages.push({ role, content, time: new Date().toISOString() });
  }
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
          concepts.push({ name: keyword, description: context + '...' });
        }
        break;
      }
    }
  }

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
 * 从对话历史生成 Markdown 摘要
 * @param {string} topic - 主题名称
 * @param {Array} messages - 对话消息列表
 * @returns {string} 生成的 Markdown 内容
 */
function generateMarkdown(topic, messages) {
  const qaPairs = [];
  let currentQuestion = null;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      currentQuestion = msg.content;
    } else if (msg.role === 'assistant' && currentQuestion) {
      qaPairs.push({ question: currentQuestion, answer: msg.content });
      currentQuestion = null;
    }
  }

  const codeSnippets = [];
  const codeRegex = /```[\s\S]*?```/g;
  for (const qa of qaPairs) {
    const matches = qa.answer.match(codeRegex);
    if (matches) codeSnippets.push(...matches);
  }

  const keyConcepts = extractKeyConcepts(qaPairs);
  const pitfalls = extractPitfalls(qaPairs);

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
      const simplifiedQ = qa.question
        .replace(/^\/(inter-start|inter-review)\s*/i, '')
        .replace(/^\/inter-save\s*/i, '')
        .trim();
      const displayQ = simplifiedQ.length > 50 ? simplifiedQ.substring(0, 50) + '...' : simplifiedQ;
      
      let clean = qa.answer.replace(/```[\s\S]*?```/g, '[代码]').trim();
      const firstPara = clean.split(/\n\n/)[0];
      const keyPoint = firstPara.length > 150 ? firstPara.substring(0, 150) + '...' : firstPara;
      
      md += `${i + 1}. **${displayQ || '相关问题'}**\n   ${keyPoint}\n\n`;
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
 * 处理 /inter-summary 命令
 * 从对话历史生成摘要并保存到临时文件
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<Object>} 响应对象
 */
async function summaryNotes(sessionId) {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return {
      success: false,
      message: '没有正在进行的讨论，请先使用 "/inter-start <主题>" 开始讨论'
    };
  }

  const topic = session.topic;
  const messages = session.messages || [];
  
  if (messages.length === 0) {
    return {
      success: false,
      message: '当前主题没有讨论内容，无法生成摘要'
    };
  }

  try {
    // 生成 Markdown
    const markdown = generateMarkdown(topic, messages);
    
    // 保存到临时文件
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const tmpDir = '/tmp/interview-helper';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const tmpFile = path.join(tmpDir, `${topicToFilename(topic)}-${timestamp}.md`);
    fs.writeFileSync(tmpFile, markdown, 'utf-8');
    
    // 统计信息
    const stats = {
      concepts: (markdown.match(/## 核心概念[\s\S]*?(?=##)/) || [''])[0].split('\n-').length - 1,
      keyPoints: (markdown.match(/## 要点总结[\s\S]*?(?=##)/) || [''])[0].split(/^\d+\./gm).length - 1,
      codeBlocks: (markdown.match(/```[\s\S]*?```/g) || []).length,
      pitfalls: (markdown.match(/## 易错点[\s\S]*?(?=##)/) || [''])[0].split(/^\d+\./gm).length - 1
    };

    return {
      success: true,
      message: `📝 摘要已生成并保存到临时文件\n\n` +
                `📄 文件路径：${tmpFile}\n` +
                `📊 统计信息：\n` +
                `  - 核心概念：${stats.concepts} 个\n` +
                `  - 要点总结：${stats.keyPoints} 条\n` +
                `  - 代码示例：${stats.codeBlocks} 个\n` +
                `  - 易错点：${stats.pitfalls} 个\n\n` +
                `💡 使用 "/inter-save ${tmpFile}" 保存到 GitHub`,
      tmpFile: tmpFile,
      content: markdown,
      stats: stats
    };

  } catch (error) {
    return { success: false, message: `生成摘要失败：${error.message}` };
  }
}

/**
 * 解析 Markdown 文档结构
 * @param {string} content - Markdown 内容
 * @returns {Object} 解析后的结构
 */
function parseMarkdownStructure(content) {
  const structure = {
    title: '',
    sections: {}
  };
  
  const lines = content.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    // 提取标题
    if (line.startsWith('# ') && !structure.title) {
      structure.title = line.substring(2).trim();
      continue;
    }
    
    // 提取章节
    const sectionMatch = line.match(/^## (.+)$/);
    if (sectionMatch) {
      if (currentSection) {
        structure.sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = sectionMatch[1].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  if (currentSection) {
    structure.sections[currentSection] = currentContent.join('\n').trim();
  }
  
  return structure;
}

/**
 * 合并两个 Markdown 文档（结构化 Merge）
 * @param {string} existingContent - 历史文档内容
 * @param {string} newContent - 新文档内容
 * @param {string} topic - 主题名称
 * @returns {string} 合并后的内容
 */
function mergeMarkdown(existingContent, newContent, topic) {
  const existing = parseMarkdownStructure(existingContent);
  const newDoc = parseMarkdownStructure(newContent);
  
  // 合并核心概念（去重）
  let mergedConcepts = '';
  const existingConcepts = existing.sections['核心概念'] || '';
  const newConcepts = newDoc.sections['核心概念'] || '';
  
  const conceptSet = new Set();
  const allConcepts = [];
  
  // 提取已有概念
  const existingMatches = existingConcepts.match(/^- \*\*(.+?)\*\*：(.+)$/gm) || [];
  for (const match of existingMatches) {
    const nameMatch = match.match(/^- \*\*(.+?)\*\*/);
    if (nameMatch) {
      const name = nameMatch[1];
      if (!conceptSet.has(name)) {
        conceptSet.add(name);
        allConcepts.push(match);
      }
    }
  }
  
  // 提取新概念（去重）
  const newMatches = newConcepts.match(/^- \*\*(.+?)\*\*：(.+)$/gm) || [];
  for (const match of newMatches) {
    const nameMatch = match.match(/^- \*\*(.+?)\*\*/);
    if (nameMatch) {
      const name = nameMatch[1];
      if (!conceptSet.has(name)) {
        conceptSet.add(name);
        allConcepts.push(match);
      }
    }
  }
  
  mergedConcepts = allConcepts.join('\n') || '- 待补充核心概念';
  
  // 合并要点总结（追加，重新编号）
  let mergedKeyPoints = '';
  const existingPoints = existing.sections['要点总结'] || '';
  const newPoints = newDoc.sections['要点总结'] || '';
  
  const allPoints = [];
  const existingPointMatches = existingPoints.match(/^\d+\. \*\*(.+?)\*\*[\s\S]*?(?=^\d+\.|$)/gm) || [];
  const newPointMatches = newPoints.match(/^\d+\. \*\*(.+?)\*\*[\s\S]*?(?=^\d+\.|$)/gm) || [];
  
  // 去重：基于问题标题
  const pointSet = new Set();
  for (const point of existingPointMatches) {
    const titleMatch = point.match(/^\d+\. \*\*(.+?)\*\*/);
    if (titleMatch) {
      const title = titleMatch[1];
      if (!pointSet.has(title)) {
        pointSet.add(title);
        allPoints.push(point.replace(/^\d+\./, ''));
      }
    }
  }
  
  for (const point of newPointMatches) {
    const titleMatch = point.match(/^\d+\. \*\*(.+?)\*\*/);
    if (titleMatch) {
      const title = titleMatch[1];
      if (!pointSet.has(title)) {
        pointSet.add(title);
        allPoints.push(point.replace(/^\d+\./, ''));
      }
    }
  }
  
  mergedKeyPoints = allPoints.map((p, i) => `${i + 1}.${p}`).join('\n\n');
  
  // 合并代码示例（追加）
  let mergedCode = '';
  const existingCode = existing.sections['代码示例'] || '';
  const newCode = newDoc.sections['代码示例'] || '';
  
  const existingBlocks = existingCode.match(/### 示例 \d+[\s\S]*?(?=### 示例 \d+|\n*$)/g) || [];
  const newBlocks = newCode.match(/### 示例 \d+[\s\S]*?(?=### 示例 \d+|\n*$)/g) || [];
  
  const allBlocks = [...existingBlocks, ...newBlocks];
  mergedCode = allBlocks.map((b, i) => b.replace(/### 示例 \d+/, `### 示例 ${i + 1}`)).join('\n\n');
  
  // 合并易错点（去重）
  let mergedPitfalls = '';
  const existingPitfalls = existing.sections['易错点'] || '';
  const newPitfalls = newDoc.sections['易错点'] || '';
  
  const pitfallSet = new Set();
  const allPitfalls = [];
  
  const existingPitfallMatches = existingPitfalls.match(/^\d+\. (.+)$/gm) || [];
  const newPitfallMatches = newPitfalls.match(/^\d+\. (.+)$/gm) || [];
  
  for (const p of existingPitfallMatches) {
    const content = p.replace(/^\d+\. /, '');
    if (!pitfallSet.has(content)) {
      pitfallSet.add(content);
      allPitfalls.push(content);
    }
  }
  
  for (const p of newPitfallMatches) {
    const content = p.replace(/^\d+\. /, '');
    if (!pitfallSet.has(content)) {
      pitfallSet.add(content);
      allPitfalls.push(content);
    }
  }
  
  mergedPitfalls = allPitfalls.map((p, i) => `${i + 1}. ${p}`).join('\n');
  
  // 组装最终文档
  let merged = `# ${topic}\n\n`;
  merged += `## 核心概念\n\n${mergedConcepts}\n\n`;
  merged += `## 要点总结\n\n${mergedKeyPoints}\n\n`;
  
  if (mergedCode) {
    merged += `## 代码示例\n\n${mergedCode}\n\n`;
  }
  
  if (mergedPitfalls) {
    merged += `## 易错点\n\n${mergedPitfalls}\n\n`;
  }
  
  merged += `## 面试要点\n\n`;
  merged += `- 理解${topic}的基本原理\n`;
  merged += `- 能够结合实际场景分析\n`;
  merged += `- 了解常见问题和优化方案\n\n`;
  merged += `---\n`;
  merged += `*最后更新：${new Date().toLocaleDateString('zh-CN')}*\n`;
  
  return merged;
}

/**
 * 自检内容
 * @param {string} topic - 主题名称
 * @param {string} content - 笔记内容
 * @returns {Object} 自检结果
 */
function selfReviewContent(topic, content) {
  const issues = [];
  
  if (!content || content.trim().length < 100) {
    issues.push({ severity: '严重', issue: '内容过短，可能缺少实质内容' });
  }
  
  if (!content.includes('## 核心概念')) {
    issues.push({ severity: '警告', issue: '缺少核心概念部分' });
  }
  
  if (content.includes('待补充') || content.includes('TODO')) {
    issues.push({ severity: '建议', issue: '存在待补充内容标记' });
  }
  
  const codeBlockMatches = content.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    issues.push({ severity: '严重', issue: '代码块格式不完整（可能缺少闭合）' });
  }
  
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
  
  return { summary, issues };
}

/**
 * 处理 /inter-save 命令
 * 读取文件、检测历史、merge、自检、PR 流程
 * @param {string} filePath - 要保存的文件路径（临时文件）
 * @param {string} topic - 主题名称（可选，从文件名推断）
 * @returns {Promise<Object>} 响应对象
 */
async function saveNotes(filePath, topic = null) {
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return { success: false, message: configCheck.message };
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return {
      success: false,
      message: '请提供有效的文件路径，例如：/inter-save /tmp/interview-helper/redis-xxx.md'
    };
  }

  try {
    // 1. 读取临时文件
    const newContent = fs.readFileSync(filePath, 'utf-8');
    
    // 从内容或文件名推断主题
    const parsed = parseMarkdownStructure(newContent);
    const inferredTopic = topic || parsed.title || path.basename(filePath, '.md').replace(/-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, '');
    
    // 设置环境变量
    process.env.GITHUB_TOKEN = config.token;
    process.env.GITHUB_REPO = config.repoUrl.replace('https://github.com/', '');
    process.env.GITHUB_USERNAME = config.repoUrl.split('/')[3];
    process.env.GITHUB_AUTHOR_NAME = 'xcm_kimi_claw';

    // 2. 确保仓库存在并拉取最新代码
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);
    await git.pull(config.localPath);
    
    // 3. 检测历史文件是否存在
    const targetFilePath = getFilePath(inferredTopic);
    const exists = await git.fileExists(config.localPath, targetFilePath);
    
    let finalContent = newContent;
    let mergeInfo = '';
    
    // 4. 如果存在则 merge
    if (exists) {
      const existingContent = await git.readFile(config.localPath, targetFilePath);
      finalContent = mergeMarkdown(existingContent, newContent, inferredTopic);
      mergeInfo = '\n🔄 已自动合并历史内容';
    }

    // 5. 自检内容
    const selfReviewResult = selfReviewContent(inferredTopic, finalContent);

    // 6. PR 流程
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const branchName = `note-${topicToFilename(inferredTopic)}-${timestamp}-${Date.now()}`;
    
    await git.createBranch(config.localPath, branchName, 'main');
    await git.checkout(config.localPath, branchName);
    await git.writeFile(config.localPath, targetFilePath, finalContent);
    
    const commitMessage = exists 
      ? `Update: ${inferredTopic} - ${new Date().toLocaleDateString('zh-CN')}`
      : `Add: ${inferredTopic} - ${new Date().toLocaleDateString('zh-CN')}`;
    await git.commit(config.localPath, commitMessage, [targetFilePath]);
    await git.push(config.localPath, branchName);
    await git.checkout(config.localPath, 'main');

    // 创建 PR
    const prTitle = `${exists ? 'Update' : 'Add'}：${inferredTopic}`;
    const prBody = `## ${exists ? '更新' : '添加'}笔记：${inferredTopic}\n\n` +
                   `### 变更内容\n` +
                   `- ${exists ? '更新' : '新增'} ${targetFilePath}${mergeInfo}\n\n` +
                   `### 自检结果\n` +
                   `${selfReviewResult.summary}\n\n` +
                   `### 笔记摘要\n` +
                   `- 主题：${inferredTopic}\n` +
                   `- 分类：${getTopicCategory(inferredTopic)}\n` +
                   `- 时间：${new Date().toLocaleString('zh-CN')}`;
    
    const pr = await github.createPullRequest(branchName, prTitle, prBody);

    return {
      success: true,
      message: `✅ 笔记已保存并创建 PR\n\n` +
                `📄 文件：${targetFilePath}${mergeInfo}\n` +
                `📝 操作：${exists ? '更新' : '新增'}\n` +
                `🔍 自检：${selfReviewResult.summary}\n` +
                `🔗 PR: ${pr?.html_url || '创建成功'}`,
      filePath: targetFilePath,
      isUpdate: exists,
      prUrl: pr?.html_url,
      selfReview: selfReviewResult
    };

  } catch (error) {
    return { success: false, message: `保存失败：${error.message}` };
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
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return { success: false, message: configCheck.message };
  }

  if (!topic || topic.trim() === '') {
    return {
      success: false,
      message: '请提供主题名称，例如：/inter-review JVM垃圾回收'
    };
  }

  try {
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
    return { success: false, message: `读取笔记失败：${error.message}` };
  }
}

/**
 * 处理 /search 命令
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Object>} 响应对象
 */
async function searchNotes(keyword) {
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return { success: false, message: configCheck.message };
  }

  if (!keyword || keyword.trim() === '') {
    return {
      success: false,
      message: '请提供搜索关键词，例如：/inter-search 垃圾回收'
    };
  }

  try {
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

    const results = [];
    
    for (const file of files) {
      const filename = file.split('/').pop().replace('.md', '').toLowerCase();
      const content = await git.readFile(config.localPath, file);
      const contentLower = (content || '').toLowerCase();
      
      const nameMatch = filename.includes(searchTerm);
      const contentMatch = contentLower.includes(searchTerm);
      
      if (nameMatch || contentMatch) {
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
    
    const groups = {};
    for (const r of results) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }
    
    for (const [dir, items] of Object.entries(groups)) {
      message += `**${dir}/**\n`;
      for (const item of items) {
        const matchType = item.nameMatch ? '📄' : '📝';
        message += `  ${matchType} ${item.filename}`;
        if (item.snippet) message += `\n     ${item.snippet}`;
        message += '\n';
      }
      message += '\n';
    }
    
    message += `💡 使用 "/inter-review <主题>" 查看完整内容`;

    return { success: true, message, keyword, results };

  } catch (error) {
    return { success: false, message: `搜索失败：${error.message}` };
  }
}

/**
 * 处理 /list 命令
 * @returns {Promise<Object>} 响应对象
 */
async function listTopics() {
  const configCheck = checkConfig();
  if (!configCheck.valid) {
    return { success: false, message: configCheck.message };
  }

  try {
    await git.ensureRepo(config.localPath, config.repoUrl, config.token);
    await git.pull(config.localPath);
    
    const files = await git.listFiles(config.localPath);
    
    if (files.length === 0) {
      return {
        success: true,
        message: '还没有保存任何笔记。\n\n使用 "/inter-start <主题>" 开始第一个讨论吧！'
      };
    }

    const groups = {};
    for (const file of files) {
      const dir = file.split('/')[0];
      if (!groups[dir]) groups[dir] = [];
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
      message,
      topics: files.map(f => ({
        name: f.split('/').pop().replace('.md', ''),
        path: f,
        category: f.split('/')[0]
      }))
    };

  } catch (error) {
    return { success: false, message: `列出主题失败：${error.message}` };
  }
}

module.exports = {
  startInterview,
  summaryNotes,
  saveNotes,
  reviewNotes,
  listTopics,
  searchNotes,
  addMessage,
  getSession: (sessionId) => sessions.get(sessionId) || null,
  clearSession: (sessionId) => sessions.delete(sessionId),
  getFilePath,
  getTopicCategory
};

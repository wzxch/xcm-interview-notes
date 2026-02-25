/**
 * Interview Helper - 面试学习助手
 * 帮助整理面试知识点，自动生成结构化笔记并保存到 GitHub
 */

const github = require('../github-notes/github-notes');

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
  if (!topic || topic.trim() === '') {
    return {
      success: false,
      message: '请提供主题名称，例如：/interview JVM垃圾回收'
    };
  }

  // 保存当前会话主题
  sessions.set(sessionId, {
    topic: topic.trim(),
    startTime: new Date().toISOString(),
    messages: []
  });

  // 检查是否已有笔记
  const filePath = getFilePath(topic);
  const exists = await github.fileExists(filePath);

  let message = `开始讨论主题：**${topic}**\n\n`;
  
  if (exists) {
    message += `📚 该主题已有笔记，可以使用 "/review ${topic}" 查看已有内容。\n`;
    message += `💡 讨论结束后输入"保存"将更新笔记。`;
  } else {
    message += `📝 这是一个新主题。\n`;
    message += `💡 讨论结束后输入"保存"将创建新笔记。`;
  }

  return {
    success: true,
    message: message,
    topic: topic,
    filePath: filePath,
    exists: exists
  };
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
    .replace(/^\/(interview|review)\s*/i, '')
    .replace(/^保存\s*/i, '')
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
  const session = sessions.get(sessionId);
  
  if (!session && !sessionHistory) {
    return {
      success: false,
      message: '没有正在进行的讨论，请先使用 "/interview <主题>" 开始讨论'
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
    // 1. 检查是否已有笔记
    const filePath = getFilePath(topic);
    const exists = await github.fileExists(filePath);
    
    // 2. 获取已有内容（如果是更新）
    let existingContent = null;
    if (exists) {
      existingContent = await github.readFile(filePath);
    }

    // 3. 生成 Markdown
    const markdown = generateMarkdown(topic, messages, existingContent);

    // 4. 创建临时分支
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const branchName = `note-${topicToFilename(topic)}-${timestamp}`;
    
    await github.createBranch(branchName);

    // 5. 推送文件
    const commitMessage = exists 
      ? `Update: ${topic} - ${new Date().toLocaleDateString('zh-CN')}`
      : `Add: ${topic} - ${new Date().toLocaleDateString('zh-CN')}`;
    
    await github.createOrUpdateFile(filePath, markdown, commitMessage, branchName);

    // 6. 创建 PR
    const prTitle = `${exists ? 'Update' : 'Add'}：${topic}-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}`;
    const prBody = `## ${exists ? '更新' : '添加'}笔记：${topic}\n\n` +
                   `### 变更内容\n` +
                   `- ${exists ? '更新' : '新增'} ${filePath}\n` +
                   `- 基于 ${messages.length} 条对话记录整理\n\n` +
                   `### 笔记摘要\n` +
                   `- 主题：${topic}\n` +
                   `- 分类：${getTopicCategory(topic)}\n` +
                   `- 时间：${new Date().toLocaleString('zh-CN')}`;
    
    const pr = await github.createPullRequest(branchName, prTitle, prBody);

    // 7. 清理会话
    sessions.delete(sessionId);

    return {
      success: true,
      message: `✅ 笔记已整理并创建 PR\n\n📄 文件：${filePath}\n🔗 PR 链接：${pr.html_url}`,
      prUrl: pr.html_url,
      filePath: filePath,
      branchName: branchName
    };

  } catch (error) {
    return {
      success: false,
      message: `保存失败：${error.message}`
    };
  }
}

/**
 * 处理 /review 命令
 * @param {string} topic - 主题名称
 * @returns {Promise<Object>} 响应对象
 */
async function reviewNotes(topic) {
  if (!topic || topic.trim() === '') {
    return {
      success: false,
      message: '请提供主题名称，例如：/review JVM垃圾回收'
    };
  }

  try {
    const filePath = getFilePath(topic);
    const content = await github.readFile(filePath);

    if (content === null) {
      return {
        success: false,
        message: `未找到主题 "${topic}" 的笔记。\n\n可以使用 "/interview ${topic}" 开始新的讨论。`
      };
    }

    return {
      success: true,
      message: `📚 **${topic}** 的笔记内容：\n\n${content}`,
      topic: topic,
      content: content
    };

  } catch (error) {
    return {
      success: false,
      message: `读取笔记失败：${error.message}`
    };
  }
}

/**
 * 处理 /list 命令
 * @returns {Promise<Object>} 响应对象
 */
async function listTopics() {
  try {
    const files = await github.listAllFiles();
    
    if (files.length === 0) {
      return {
        success: true,
        message: '还没有保存任何笔记。\n\n使用 "/interview <主题>" 开始第一个讨论吧！'
      };
    }

    // 按目录分组
    const groups = {};
    for (const file of files) {
      const dir = file.path.split('/')[0];
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(file.name.replace('.md', ''));
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
        name: f.name.replace('.md', ''),
        path: f.path,
        category: f.path.split('/')[0]
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
  addMessage,
  getSession,
  clearSession,
  getFilePath,
  getTopicCategory,
  generateMarkdown
};

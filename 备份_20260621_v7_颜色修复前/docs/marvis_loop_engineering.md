---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 1d901ace6510f3f7162dab4a93f6993e_329361796d1e11f1a0095254002afed2
    ReservedCode1: SfUu88jzorXISJXf2Dfce1FHMPne9kL/rO7StGltyLtjHrCCJWAphqcOqDOAWl0h11XmBXcaSEhEnCMvAJaSZwYG35Axa7/fLys8EqikHtRlEpSoBftS3LxczrU/MZK79zxTNUzdHXIGo0NQ/CV4em6AhD3Spq79PVqsfauNW1uSZEdcWS8oW6PQfsk=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 1d901ace6510f3f7162dab4a93f6993e_329361796d1e11f1a0095254002afed2
    ReservedCode2: SfUu88jzorXISJXf2Dfce1FHMPne9kL/rO7StGltyLtjHrCCJWAphqcOqDOAWl0h11XmBXcaSEhEnCMvAJaSZwYG35Axa7/fLys8EqikHtRlEpSoBftS3LxczrU/MZK79zxTNUzdHXIGo0NQ/CV4em6AhD3Spq79PVqsfauNW1uSZEdcWS8oW6PQfsk=
---

# Marvis Loop Engineering 运行框架

> 框架生效日期：2026-06-21  
> 设计依据：Loop Engineering（循环工程）2026 AI 新范式  
> 核心理念：**AI 自主走完「执行→验证→迭代→终止」全闭环，人类只定目标、规则与终止条件**

---

## 一、Loop 公式

```
Goal → Plan → Execute → Observe → Evaluate → [Revise | Terminate]
```

| 阶段 | 含义 | Marvis 动作 |
|------|------|-------------|
| Goal | 用户定义目标 | 提取 `<overall_goal>`，明确成功标准 |
| Plan | 自主规划路径 | 按 Sub Agent → Skill → Tool 优先级编排 |
| Execute | 执行动作 | dispatch_task / tool 调用 |
| Observe | 采集执行结果 | 读取工具返回、Sub Agent 报告 |
| Evaluate | 对照目标验证 | 判断是否达标、有无遗漏 |
| Revise | 不达标则修正 | 调整参数/切换Agent/补充执行 |
| Terminate | 达标则终止 | present_result / 产出物声明 / 归档 |

---

## 二、六大模块在 Marvis 中的映射

### 1. Automations（自动化触发）
- **现有能力**：`create_scheduled_task` / `modify_scheduled_task`
- **Loop 增强**：定时任务到期后，Agent 自动进入 Goal 阶段，无需人工启动

### 2. Worktrees（隔离工作区）
- **现有能力**：每个对话 session 有独立 workspace（conv_xxx），output/ 和 temp/ 严格分离
- **Loop 增强**：多 Agent 并行时各自在独立目录运行，产物写入 output/

### 3. Skills（知识固化）
- **现有能力**：`use_skill` 加载专业指令；docs/ 目录沉淀项目规范
- **Loop 增强**：每个项目落地后必须产出一份 SKILL.md / README.md 到 docs/，避免"金鱼记忆"

### 4. Connectors（现实系统对接）
- **现有能力**：`shell_executor`（Shell）、`web_fetch`（Web）、`browser` agent（浏览器）
- **Loop 增强**：任务涉及外部系统时，优先通过 Connector 直接操作，减少人工中转

### 5. Sub-agents + Maker-Checker（分工验证）
- **现有能力**：`dispatch_task` 派发专业 Agent（file-agent / computer-agent / app-agent / browser / search-agent）
- **Loop 增强 - Maker-Checker 模式**：
  - **Maker**：一个 Agent 负责产出（代码/文档/数据）
  - **Checker**：另一独立 Agent 负责验证（对照规则审计、边界测试）
  - 各司其职，权责分离，规避自我审查盲区

### 6. Memory（状态记忆）
- **现有能力**：`memory_ids` 传递历史上下文；`inherit_agent_id` 延续 Agent 会话
- **Loop 增强**：复杂多轮任务必须维护 STATE.md，记录当前进度、已完成步骤、待处理项、报错信息，确保中断后可无缝续接

---

## 三、终止条件与防失控机制

### 终止条件（必须明确）
1. **成功终止**：产出物达到 Goal 定义的标准，Evaluate 通过
2. **上限终止**：同类操作重试 ≤ 2 次，超过则报告失败原因并交还用户决策
3. **成本终止**：Token 消耗达到预设阈值时暂停，询问是否继续
4. **阻塞终止**：遇到需人工介入的障碍（登录、验证码、权限不足），立即报告

### 防失控规则
- 每次 Execute 后必须 Evaluate，不达标则 Revise（最多 2 轮）
- Sub Agent 并行调度上限：每轮 ≤ 5 个
- 禁止同类失败后无脑重试（相同工具+相同参数）

---

## 四、与传统 Prompt 模式的本质区别

| 维度 | 传统 Prompt 模式 | Loop Engineering 模式 |
|------|-----------------|----------------------|
| 人类角色 | 反复修改提示词的"监工" | 定义目标+规则的"架构师" |
| AI 角色 | 单次问答工具 | 持续运行的闭环工作系统 |
| 执行流 | 人→AI→人→AI→人 | AI→AI→AI→AI→终止 |
| 纠错机制 | 人工发现、手动修正 | 系统自校验、自动迭代 |
| 任务粒度 | 单步问答 | 完整长任务自主完成 |

---

## 五、落地承诺

从本框架生效起，Marvis 将以 Loop Engineering 模式运行：

1. **接到任务后**：先明确 Goal + 成功标准，再执行
2. **每次执行后**：自主 Evaluate 结果，不达标自动 Revise
3. **复杂任务**：启用 Maker-Checker 双 Agent 分工
4. **长任务**：写入 STATE.md 保存进度，防止中断丢失
5. **任务完成后**：产出物声明 → 规则文档归档 → 关闭 Loop

---

## 六、STATE.md 模板

```markdown
# STATE - [任务名称]

- **开始时间**：YYYY-MM-DD HH:MM
- **Goal**：[用户原始目标]
- **进度**：[当前阶段 / 总阶段]

## 已完成
- [x] 步骤1
- [x] 步骤2

## 待处理
- [ ] 步骤3
- [ ] 步骤4

## 报错/阻塞
- [问题描述] → [已尝试的解决方案] → [当前状态]

## 产出物
- [文件路径1]
- [文件路径2]
```

---

> **参考来源**：  
> - Peter Steinberger（OpenClaw 创始人）："别再给 Agent 写提示词，去设计循环"  
> - Boris Cherny（Claude Code 负责人）：100% AI 驱动代码提交，不再打开 IDE  
> - Addy Osmani（Google Cloud AI 总监）：Loop Engineering 官方命名与架构奠基者  
> - AI 范式演进路径：Prompt → Context → Harness → Loop
*（内容由AI生成，仅供参考）*

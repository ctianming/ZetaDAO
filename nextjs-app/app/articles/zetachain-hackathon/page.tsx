import Header from '@/components/layout/Header'
import { markdownToHtml } from '@/lib/markdown'
import AuthorInline from '@/components/content/AuthorInline'
import ShareButtons from '@/components/content/ShareButtons'
import { formatDate } from '@/lib/utils'

// Hardcoded markdown content for the article
const markdownContent = `
# **ZetaChain × 阿里云「通用 AI」共学黑客松正式启动！最高可获 $200,000 生态资助**

![ZetaChain x Alibaba Cloud - Chinese.png](/images/ZetaChain_x_Alibaba_Cloud_-_Chinese.webp)

ZetaChain 与阿里云共同发起**「通用 AI」共学黑客松**：一场融合 AI 与通用区块链创新的共学与开发计划，面向亚太地区开发者开放，总计提供高达 $200,000 的生态资助。本次活动由 LXDAO 联合主办，并负责共学营的整体策划与组织执行。

ZetaChain的使命是打造一条具备原生访问能力的通用区块链 (Universal Blockchain)，让加密世界如同互联网般开放、多样与互联。此次与阿里云及 LXDAO 的合作，将联合来自亚太地区的开发者、技术导师与社区代表，共同探索 “多链互通 + 人工智能” 的前沿方向，在 ZetaChain 上打造最前沿的通用应用。

# 活动形式

本次计划分为两个阶段：两周「共学营」 + 两周「线上黑客松」。

在共学营阶段，参与者将深入学习 ZetaChain 的核心技术，包括通用 EVM、通用智能合约，以及通义千问 (Qwen AI) 的集成文档。所有学习资料将开源于 GitHub，学员可每日打卡学习、加入专属讨论群交流。每周将举办一次直播课程，由来自 ZetaChain、阿里云和 LXDAO 的专家讲师联合授课与答疑。

黑客松阶段将让学员们的学习成果真正落地。基于 ZetaChain 设计并构建原型应用，探索 AI 在跨链智能化场景中的应用潜力。表现突出的团队将有机会获得 ZetaChain 生态基金最高 $200,000 的后续资助与孵化支持，将原型项目打造成成熟产品，共同推动通用区块链生态的发展。

# 活动主题

本次活动设立两大主题方向，鼓励开发者从不同角度探索 Web3 与 A I的结合潜能。

### **1️⃣ 通用 DeFi（Universal DeFi）**

借助 ZetaChain 的原生跨链能力，所有部署在链上的通用应用都能原生访问并组合主流公链的资产与协议。当基础设施的边界被打通，创新的焦点将回到应用层。在ZetaChain，开发者可以重新定义 DeFi 的组合方式与用户体验。无论是借贷、稳定币、收益聚合、LSDFi，还是社交资产与 Restaking 应用，不同生态的要素都能在 ZetaChain 上被重组与融合，形成全新的跨链 DeFi 模式。在此基础上，通义千问能进一步赋能策略与交互，实现智能化的收益管理与自动化操作。用户将无需切换网络、无需桥接资产，就能在 ZetaChain 上直接访问多链生态的统一入口。这正是 「通用 DeFi」 的愿景，也是本次黑客松期待激发的创新方向。

### **2️⃣ 通用AI 应用（Universal AI Applications）**

随着大模型能力的不断提升，AI 正在成为 Web3 应用的重要交互层。借助阿里云通义千问的智能推理与生成能力，开发者可以在 ZetaChain 上构建更具理解力与行动力的智能应用。在通用区块链的架构下，AI 不再只是“工具”，而能成为多链世界的主动参与者。它可以分析跨链数据、理解用户意图，并通过 通用智能合约直接触发链上操作：从自然语言钱包、智能代理（Agent），到自动化 DeFi 策略与跨链数据洞察，AI 都能为 Web3 带来更自然、更高效的交互方式。这不仅仅是技术层面的融合，更是一次对 Web3 应用形态的重新想象。**通用区块链 x AI** 将让每一个应用都具备跨链理解与自主行动的能力，这也将成为本次黑客松最值得期待的探索方向之一。

# ZetaChain 在亚太地区的新篇章

随着Web3 与 AI 在全球范围的快速发展，亚太地区正成为创新实验与应用落地的核心区域。本次 「通用AI」共学黑客松是 ZetaChain 推动通用区块链生态在亚洲生根的重要一步。

依托阿里云的技术生态与 LXDAO 的开发者网络，本次活动将帮助更多华语开发者深入理解通用区块链的潜力与实际应用路径，同时也让 ZetaChain 的跨链能力在真实的 AI 场景中被进一步验证与拓展。

我们相信，Web3 的未来将是多链互通、智能驱动、用户主导的。而这场活动，也将成为通往这一未来的重要起点，让更多建设者在真实的场景中实践、验证与创新。

# 加入我们

如果你关注 **跨链互操作性、AI 应用开发**，或正在思考 Web3 的下一阶段，这将是一次不可错过的机会。

「通用AI」共学黑客松现已正式开启报名。在这里，你可以学习 ZetaChain 的核心技术，了解通义千问（Qwen AI）的模型能力，并通过实践构建真正能运行于多链之上的智能应用。表现优异的团队将获得 **最高 $200,000 的生态资助与孵化机会**，进入 ZetaChain 的长期生态支持计划，在通用区块链的全球舞台上持续成长与发光。

👉 **立即报名:** https://intensivecolearn.ing/programs/Universal-AI

# 关于ZetaChain

ZetaChain 是首个具备原生跨链访问能力的通用区块链，可直接连接 Bitcoin、Ethereum、Solana 等多条主流公链，为全球用户带来无缝体验与统一的流动性。依托其通用EVM，开发者可在 ZetaChain 上构建可原生运行于任意区块链的通用应用（Universal Apps），从单一平台实现多链生态的流畅互通。
`;

// Article metadata
const article = {
  title: 'ZetaChain × 阿里云「通用 AI」共学黑客松正式启动！',
  publishedAt: '2024-05-20T10:00:00Z',
  authorName: 'zetachain-CN',
  imageUrl: '/images/ZetaChain_x_Alibaba_Cloud_-_Chinese.webp',
  tags: ['ZetaChain', 'Alibaba Cloud', 'AI', 'Hackathon'],
};

export default function ZetaChainHackathonPage() {
  const articleHtml = markdownToHtml(markdownContent);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span>发布于 {formatDate(article.publishedAt)}</span>
              <span>•</span>
              {/* Custom Author Name, Avatar Hidden */}
              <AuthorInline uid="zetachain-cn" name={article.authorName} avatarUrl={null} />
            </div>
            <div className="flex gap-2 mt-4">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </header>

          {/* Share Buttons */}
          <ShareButtons title={article.title} tags={article.tags} imageUrl={article.imageUrl} className="mb-6 flex items-center gap-2 flex-wrap" />

          {/* Article Content */}
          <div
            className="prose prose-lg max-w-none prose-img:w-full prose-img:rounded-lg prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg"
            dangerouslySetInnerHTML={{ __html: articleHtml }}
          />
        </article>
      </main>
    </div>
  );
}


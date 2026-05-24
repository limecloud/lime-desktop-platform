const base = process.env.VITEPRESS_BASE || '/'

const v1Sidebar = [
  {
    text: '开始',
    items: [
      { text: '概览', link: '/zh/' },
      { text: 'v1 路线图', link: '/v1/' }
    ]
  },
  {
    text: '产品与架构',
    items: [
      { text: 'PRD', link: '/v1/prd' },
      { text: '架构与流程图', link: '/v1/architecture-diagrams' },
      { text: 'Agent Runtime 策略', link: '/v1/agent-runtime-strategy' },
      { text: '平台能力边界', link: '/v1/platform-capabilities' },
      { text: '平台方法论', link: '/v1/platform-methodology' }
    ]
  },
  {
    text: '宿主契约',
    items: [
      { text: 'Host 与数据契约', link: '/v1/host-contracts' },
      { text: '宿主运行手册', link: '/v1/host-runtime-playbook' },
      { text: '工作流模型', link: '/v1/workflow-model' },
      { text: 'limecore 控制面', link: '/v1/limecore-control-plane' }
    ]
  },
  {
    text: '产品与验收',
    items: [
      { text: 'UI 蓝图', link: '/v1/ui-blueprint' },
      { text: '用户故事与流程映射', link: '/v1/user-story-flow-map' },
      { text: '完成审计', link: '/v1/completion-audit' },
      { text: '实施计划', link: '/v1/implementation-plan' }
    ]
  },
  {
    text: '示例与 Fixture',
    items: [
      { text: 'zhongcao 示例指南', link: '/v1/zhongcao-integration' },
      { text: 'zhongcao 示例提示词', link: '/v1/zhongcao-handoff-prompt' }
    ]
  }
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const mermaidRuntime = `
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.14.0/dist/mermaid.esm.min.mjs';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });

let mermaidRenderQueued = false;

const renderMermaid = () => {
  if (mermaidRenderQueued) {
    return;
  }
  mermaidRenderQueued = true;
  requestAnimationFrame(() => {
    mermaidRenderQueued = false;
    const hasPendingMermaid = document.querySelector('.language-mermaid .mermaid:not([data-processed]), pre.mermaid:not([data-processed])');
    if (!hasPendingMermaid) {
      return;
    }
  mermaid.run({ querySelector: '.language-mermaid .mermaid, pre.mermaid' }).catch((error) => {
    console.warn('[lime-desktop-platform-docs] Mermaid render failed', error);
  });
  });
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', renderMermaid, { once: true });
} else {
  renderMermaid();
}
window.addEventListener('load', renderMermaid);
new MutationObserver(renderMermaid).observe(document.documentElement, { childList: true, subtree: true });
`

export default {
  title: 'Lime Desktop Platform',
  description: 'Agent App 标准桌面宿主文档。',
  base,
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#176c5f' }],
    ['script', { type: 'module' }, mermaidRuntime]
  ],
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const info = token.info.trim()
        if (info === 'mermaid') {
          return `<div class="language-mermaid"><pre class="mermaid">${escapeHtml(token.content)}</pre></div>`
        }
        return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
      }
    }
  },
  themeConfig: {
    siteTitle: 'Lime Desktop Platform',
    nav: [
      { text: '首页', link: '/zh/' },
      { text: 'v1', link: '/v1/' },
      { text: 'Agent App 标准', link: 'https://github.com/limecloud/agentapp' },
      { text: 'GitHub', link: 'https://github.com/limecloud/lime-desktop-platform' }
    ],
    sidebar: {
      '/zh/': v1Sidebar,
      '/v1/': v1Sidebar
    },
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/limecloud/lime-desktop-platform/edit/main/docs/:path',
      text: '在 GitHub 编辑本页'
    },
    footer: {
      message: 'Agent App 标准桌面宿主文档。',
      copyright: 'Released for Lime Cloud desktop platform implementation.'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/limecloud/lime-desktop-platform' }
    ]
  }
}

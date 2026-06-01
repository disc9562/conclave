import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DreamCoder',
  tagline: 'Claude Code 的开源桌面 GUI 工作台 —— 面向国内创造者的 AI 编程利器',
  favicon: 'img/favicon.ico',

  // 本地开发与 GitHub Pages 路径
  url: 'https://godiao.github.io',
  baseUrl: '/dreamcoder/',

  onBrokenLinks: 'ignore',

  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/GoDiao/dreamcoder/tree/master/website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark', // 默认夜间模式
      respectPrefersColorScheme: true, // 尊崇系统主题
    },
    navbar: {
      title: 'DreamCoder',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        {
          href: 'https://github.com/GoDiao/dreamcoder',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2024-${new Date().getFullYear()} GoDiao & DreamCoder Contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.Config,
};

export default config;

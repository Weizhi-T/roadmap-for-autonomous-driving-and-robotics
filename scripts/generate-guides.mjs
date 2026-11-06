/** Generate crawlable bilingual reading guides from the atlas's existing data.
 * Run from any directory: node scripts/generate-guides.mjs
 * No packages, network access, or changes to the interactive routes are needed.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://weizhi-t.github.io/roadmap-for-autonomous-driving-and-robotics/';
const repo = 'https://github.com/Weizhi-T/roadmap-for-autonomous-driving-and-robotics';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context, { timeout: 2000 });
const { zh, en } = context.window.ATLAS_I18N;
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md = text => escape(text).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
const stageLinks = prefix => zh.stages.map((s, i) => `<li><a href="${prefix}${s.id}/">${escape(s.subtitle)} <span lang="en">/ ${escape(en.stages[i].subtitle)}</span></a></li>`).join('\n');
const head = (title, description, url, stylesheet) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${url}">
<link rel="sitemap" type="application/xml" href="${base}sitemap.xml">
<meta name="theme-color" content="#173d31">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Embodied Atlas">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${stylesheet}">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url,inLanguage:['zh-CN','en'],isPartOf:{'@type':'WebSite',name:'Embodied Atlas',url:base}}).replace(/</g, '\\u003c')}</script>
</head>`;
const footer = home => `<footer><p>内容快照 <span lang="en">/ Content snapshot</span>: ${escape(zh.updated)}. <a href="${home}#guide">来源、许可与说明 <span lang="en">/ Sources, licenses &amp; notes</span></a></p><p><a href="${repo}">GitHub 仓库 <span lang="en">/ Repository</span></a> · <a href="${repo}/issues">讨论与建议 <span lang="en">/ Discussion &amp; suggestions</span></a></p></footer>`;

for (const stage of zh.stages) {
  const english = en.stages.find(s => s.id === stage.id);
  if (!english) throw new Error(`Missing English stage: ${stage.id}`);
  const title = `${stage.subtitle} / ${english.subtitle} · Embodied Atlas`;
  const description = `${stage.description} ${english.description} 自动驾驶与机器人 / Autonomous driving and robotics.`;
  const toc = stage.categories.map(c => `<li><a href="#category-${c.id}">${escape(c.title)} <span lang="en">/ ${escape(english.categories.find(x => x.id === c.id).title)}</span></a></li>`).join('\n');
  const categories = stage.categories.map(category => {
    const ec = english.categories.find(c => c.id === category.id);
    const nodes = category.leaves.map(node => {
      const englishNode = ec.leaves.find(n => n.id === node.id);
      if (!englishNode) throw new Error(`Missing English node: ${node.id}`);
      return `<article id="method-${node.id}"><h3>${escape(node.title)} <span lang="en">/ ${escape(englishNode.title)}</span></h3>
<div class="parallel"><div lang="zh-CN">${node.body.map(p => `<p>${md(p)}</p>`).join('\n')}</div><div lang="en">${englishNode.body.map(p => `<p>${md(p)}</p>`).join('\n')}</div></div>
<p><a class="action" href="../../#node/${node.id}">查看完整方法、分支与参考文献 <span lang="en">/ Open method, branches &amp; references</span> ↗</a></p></article>`;
    }).join('\n');
    return `<section id="category-${category.id}"><h2>${escape(category.title)} <span lang="en">/ ${escape(ec.title)}</span></h2>${nodes}</section>`;
  }).join('\n');
  write(`guides/${stage.id}/index.html`, `${head(title, description, base + 'guides/' + stage.id + '/', '../style.css')}
<body><a class="skip" href="#main">跳到正文 / Skip to content</a>
<header><a href="../../">EMBODIED ATLAS</a><nav aria-label="主导航 / Main navigation"><a href="../">专题导读 / Reading guides</a><a href="../../#stage/${stage.id}">交互图谱 / Interactive atlas ↗</a></nav></header>
<main id="main"><p class="eyebrow">${escape(stage.number)} / AUTONOMOUS DRIVING &amp; ROBOTICS</p><h1>${escape(stage.subtitle)} <span lang="en">/ ${escape(english.subtitle)}</span></h1>
<p>${escape(stage.description)} <span lang="en">${escape(english.description)}</span></p>
<p class="note">本页收录图谱中该环节的方法正文。完整分支、图示和论文链接见交互图谱。<br><span lang="en">This reading guide contains the atlas's method explanations for this stage. Open the interactive atlas for the full branches, illustrations and reference records.</span></p>
<nav class="contents" aria-label="本页目录 / On this page"><h2>本页目录 / Contents</h2><ul>${toc}</ul></nav>
${categories}
<nav class="contents" aria-label="其他研发环节 / Other research stages"><h2>继续阅读 / Keep reading</h2><ul>${stageLinks('../')}</ul></nav></main>${footer('../../')}
</body></html>\n`);
}

write('guides/index.html', `${head('自动驾驶与机器人专题导读 / Research Guides · Embodied Atlas', '按数据、训练、执行、评测与反馈阅读自动驾驶与机器人技术。Bilingual guides to data, learning, decision-making, control and evaluation.', base + 'guides/', 'style.css')}
<body><a class="skip" href="#main">跳到正文 / Skip to content</a><header><a href="../">EMBODIED ATLAS</a><nav aria-label="主导航 / Main navigation"><a href="../#home">交互图谱 / Interactive atlas ↗</a></nav></header>
<main id="main"><p class="eyebrow">AUTONOMOUS DRIVING &amp; ROBOTICS</p><h1>自动驾驶与机器人专题导读 <span lang="en">/ Research Guides</span></h1>
<p>沿着数据、训练、执行、评测与反馈四个研发环节，阅读技术解释并返回交互图谱查看方法分支和原始来源。</p><p lang="en">Follow four research stages: data, training, execution, and evaluation and feedback. Read the method explanations here, then explore branches and original sources in the interactive atlas.</p>
<div class="guide-grid">${zh.stages.map((s, i) => `<article><p class="eyebrow">${escape(s.number)}</p><h2><a href="${s.id}/">${escape(s.subtitle)} <span lang="en">/ ${escape(en.stages[i].subtitle)}</span></a></h2><p>${escape(s.description)}</p><p lang="en">${escape(en.stages[i].description)}</p></article>`).join('\n')}</div>
<p class="note">这些导读直接来自中英文图谱数据，无需 JavaScript 即可阅读。<br><span lang="en">These guides are generated from the same bilingual atlas data and can be read without JavaScript.</span></p></main>${footer('../')}</body></html>\n`);

const summary = `<section class="crawl-summary" aria-labelledby="atlas-summary-title">
<p class="eyebrow">EMBODIED ATLAS</p>
<h1 id="atlas-summary-title">自动驾驶与机器人技术图谱 <span lang="en">/ Autonomous Driving &amp; Robotics Roadmap</span></h1>
<p>面向自动驾驶、机器人与具身智能的中英双语研究知识图谱。从数据与环境、建模与学习，到在线决策与控制、验证与反馈，连接方法解释、技术分支和原始论文。</p>
<p lang="en">A bilingual research atlas for autonomous driving, robotics and embodied intelligence. Explore data and simulation, representation and policy learning, planning and control, safety, and closed-loop evaluation, with explanations and links to original research.</p>
<h2>专题导读 <span lang="en">/ Reading guides</span></h2>
<ul>${stageLinks('guides/')}</ul>
<p>交互图谱加载后可切换中文与英文、搜索方法、逐层展开知识树。无需脚本的阅读可从以上导读开始。</p>
<p lang="en">When the interactive atlas loads, switch language, search methods and unfold the knowledge tree. The guides above remain readable without JavaScript.</p>
<p><a href="${repo}">GitHub 仓库 / Repository</a> · <a href="${repo}/issues">讨论与建议 / Discussion &amp; suggestions</a></p>
</section>`;
const indexPath = path.join(root, 'index.html');
const index = fs.readFileSync(indexPath, 'utf8');
const start = '<!-- generated:atlas-summary:start -->';
const end = '<!-- generated:atlas-summary:end -->';
if (!index.includes(start) || !index.includes(end)) throw new Error('Homepage summary markers are missing.');
write('index.html', index.slice(0, index.indexOf(start) + start.length) + '\n' + summary + '\n' + index.slice(index.indexOf(end)));
const urls = ['', 'guides/', ...zh.stages.map(s => `guides/${s.id}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(p => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Generated ${zh.stages.length} stage guides, directory, homepage summary and sitemap.`);

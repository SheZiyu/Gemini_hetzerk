/**
 * 抓取 AlphaFold Server 页面内容分析 3D 渲染实现
 */

const https = require('https');
const fs = require('fs');

const URL = 'https://alphafoldserver.com/example/examplefold_pdb_8aw3';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function analyzeAlphaFold() {
  console.log('🔍 正在抓取 AlphaFold Server 页面...\n');

  try {
    const html = await fetchPage(URL);

    // 保存原始 HTML
    fs.writeFileSync('scripts/alphafold-page.html', html);
    console.log('✅ HTML 已保存到 scripts/alphafold-page.html\n');

    // 分析 JavaScript 配置
    console.log('📦 分析页面中的 JavaScript 配置...\n');

    // 查找 Molstar/3D 相关配置
    const molstarMatch = html.match(/molstar|mol-plugin|mol-gl/gi);
    if (molstarMatch) {
      console.log('🎯 发现 Molstar 相关引用:', [...new Set(molstarMatch)].join(', '));
    }

    // 查找 pLDDT 颜色配置
    const plddtColors = html.match(/#[0-9a-fA-F]{6}|rgb\([^)]+\)/g);
    if (plddtColors) {
      console.log('\n🎨 发现颜色值:', [...new Set(plddtColors)].slice(0, 20).join(', '));
    }

    // 查找 viewport/canvas 配置
    const viewportMatch = html.match(/viewport|canvas3d|renderer/gi);
    if (viewportMatch) {
      console.log('\n🖼️ 发现渲染相关配置:', [...new Set(viewportMatch)].join(', '));
    }

    // 查找内联脚本
    const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    console.log(`\n📜 发现 ${scripts.length} 个 script 标签`);

    // 提取内联 JavaScript 内容
    const inlineScripts = scripts.filter(s => !s.includes('src='));
    console.log(`   其中 ${inlineScripts.length} 个内联脚本`);

    // 保存内联脚本供分析
    let scriptContent = '';
    inlineScripts.forEach((script, i) => {
      const content = script.replace(/<\/?script[^>]*>/gi, '');
      if (content.trim().length > 100) {
        scriptContent += `\n// ========== Script ${i + 1} ==========\n${content}\n`;
      }
    });

    if (scriptContent) {
      fs.writeFileSync('scripts/alphafold-scripts.js', scriptContent);
      console.log('\n✅ 内联脚本已保存到 scripts/alphafold-scripts.js');
    }

    // 查找 Next.js/React 数据
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        fs.writeFileSync('scripts/alphafold-next-data.json', JSON.stringify(nextData, null, 2));
        console.log('\n✅ Next.js 数据已保存到 scripts/alphafold-next-data.json');

        // 分析 props
        if (nextData.props?.pageProps) {
          console.log('\n📊 Page Props 结构:');
          console.log(JSON.stringify(Object.keys(nextData.props.pageProps), null, 2));
        }
      } catch (e) {
        console.log('\n⚠️ 无法解析 Next.js 数据');
      }
    }

    // 查找外部脚本 URL
    const externalScripts = scripts
      .filter(s => s.includes('src='))
      .map(s => s.match(/src="([^"]+)"/)?.[1])
      .filter(Boolean);

    console.log('\n🔗 外部脚本:');
    externalScripts.forEach(url => console.log(`   ${url}`));

    // 查找 CSS
    const cssLinks = html.match(/<link[^>]*stylesheet[^>]*>/gi) || [];
    console.log(`\n🎨 发现 ${cssLinks.length} 个样式表`);

    // 查找与 3D 渲染相关的 class 名称
    const classNames = html.match(/class="[^"]*mol[^"]*"|class="[^"]*viewer[^"]*"|class="[^"]*canvas[^"]*"/gi);
    if (classNames) {
      console.log('\n🏷️ 3D 渲染相关 class:');
      [...new Set(classNames)].forEach(c => console.log(`   ${c}`));
    }

    // 查找 data 属性
    const dataAttrs = html.match(/data-[a-z-]+="[^"]*"/gi);
    if (dataAttrs) {
      const uniqueDataAttrs = [...new Set(dataAttrs)].filter(d =>
        d.includes('mol') || d.includes('viewer') || d.includes('structure') || d.includes('plddt')
      );
      if (uniqueDataAttrs.length > 0) {
        console.log('\n📌 相关 data 属性:');
        uniqueDataAttrs.forEach(d => console.log(`   ${d}`));
      }
    }

    console.log('\n✅ 分析完成！请查看保存的文件获取更多细节。');

  } catch (error) {
    console.error('❌ 抓取失败:', error.message);
  }
}

analyzeAlphaFold();

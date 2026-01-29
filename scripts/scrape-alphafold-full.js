/**
 * 使用 Puppeteer 抓取 AlphaFold Server 完整渲染后的页面
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = 'https://alphafoldserver.com/example/examplefold_pdb_8aw3';

async function scrapeAlphaFold() {
  console.log('🚀 启动浏览器...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 设置视口大小
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📡 正在加载 AlphaFold Server 页面...');

  // 收集网络请求
  const requests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('mol') || url.includes('viewer') || url.includes('structure') || url.includes('pdb')) {
      requests.push({ url, type: request.resourceType() });
    }
  });

  try {
    await page.goto(URL, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 等待页面完全加载
    console.log('⏳ 等待 3D 视图加载...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // 截图
    await page.screenshot({ path: 'scripts/alphafold-screenshot.png', fullPage: true });
    console.log('📸 截图已保存到 scripts/alphafold-screenshot.png\n');

    // 获取完整渲染后的 HTML
    const html = await page.content();
    fs.writeFileSync('scripts/alphafold-rendered.html', html);
    console.log('✅ 渲染后的 HTML 已保存\n');

    // 分析页面结构
    console.log('🔍 分析 3D 视图组件...\n');

    // 查找 canvas 元素
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map(c => ({
        id: c.id,
        className: c.className,
        width: c.width,
        height: c.height,
        parent: c.parentElement?.className || 'unknown'
      }));
    });

    console.log('🎨 Canvas 元素:');
    canvasInfo.forEach(c => {
      console.log(`   - id: ${c.id || 'none'}, class: ${c.className || 'none'}, size: ${c.width}x${c.height}, parent: ${c.parent}`);
    });

    // 查找与 mol*/viewer 相关的元素
    const viewerElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="mol"], [class*="viewer"], [class*="structure"], [class*="canvas"]');
      return Array.from(elements).slice(0, 20).map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id
      }));
    });

    console.log('\n🔬 Viewer 相关元素:');
    viewerElements.forEach(el => {
      console.log(`   - <${el.tag}> class="${el.className}" id="${el.id || 'none'}"`);
    });

    // 获取全局变量中的配置
    const globalConfig = await page.evaluate(() => {
      const config = {};
      // 查找可能的 Molstar 配置
      if (window.molstar) config.molstar = 'found';
      if (window.viewer) config.viewer = 'found';
      if (window.plugin) config.plugin = 'found';

      // 查找 pLDDT 相关配置
      const plddtElements = document.querySelectorAll('[class*="plddt"], [class*="confidence"]');
      config.plddtElements = plddtElements.length;

      return config;
    });

    console.log('\n⚙️ 全局配置:', globalConfig);

    // 获取选择残基时显示的信息区域
    const infoPanel = await page.evaluate(() => {
      // 查找可能的信息面板
      const panels = document.querySelectorAll('[class*="info"], [class*="status"], [class*="detail"], [class*="residue"]');
      return Array.from(panels).slice(0, 10).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.substring(0, 100)
      }));
    });

    console.log('\n📋 信息面板元素:');
    infoPanel.forEach(el => {
      console.log(`   - <${el.tag}> class="${el.className}"`);
      if (el.text) console.log(`     text: "${el.text.trim().substring(0, 50)}..."`);
    });

    // 保存相关网络请求
    console.log('\n🌐 相关网络请求:');
    requests.forEach(r => console.log(`   - [${r.type}] ${r.url.substring(0, 100)}`));

    // 尝试获取页面中的颜色定义
    const colors = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets).flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules || []).map(rule => rule.cssText);
        } catch {
          return [];
        }
      });

      const colorMatches = styles.join('\n').match(/#[0-9a-fA-F]{6}|rgb\([^)]+\)/g) || [];
      return [...new Set(colorMatches)].slice(0, 30);
    });

    console.log('\n🎨 页面颜色值:');
    console.log('   ', colors.join(', '));

    // 提取所有脚本中的 Molstar 相关代码
    const scripts = await page.evaluate(() => {
      const scriptTags = document.querySelectorAll('script');
      let molstarCode = '';

      scriptTags.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('mol') || content.includes('viewer') || content.includes('plddt')) {
          molstarCode += content.substring(0, 5000) + '\n---\n';
        }
      });

      return molstarCode;
    });

    if (scripts) {
      fs.writeFileSync('scripts/alphafold-viewer-code.js', scripts);
      console.log('\n✅ Viewer 相关代码已保存到 scripts/alphafold-viewer-code.js');
    }

  } catch (error) {
    console.error('❌ 抓取失败:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ 浏览器已关闭');
  }
}

scrapeAlphaFold();

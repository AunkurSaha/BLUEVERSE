import { mkdir, writeFile } from 'node:fs/promises'

const port = process.env.CHROME_DEBUG_PORT ?? '9334'
const phase = process.argv[2] ?? 'inspect'
const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const tab = tabs.find((item) => item.type === 'page')
const socket = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
let sequence = 0
const pending = new Map()
const errors = []
const requests = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const job = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) job?.reject(new Error(message.error.message))
    else job?.resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('/api/')) requests.push(message.params.request.url)
})
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  pending.set(id, { resolve, reject })
  socket.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const waitFor = async (expression, timeout = 45000) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(300)
  }
  throw new Error(`Timed out: ${expression}`)
}
const clickText = (text, selector = 'button') => evaluate(`(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)});
  if (!el) throw new Error('Missing control: ' + ${JSON.stringify(text)});
  el.scrollIntoView({block:'nearest'}); el.click(); return true;
})()`)
const metrics = () => evaluate(`(() => {
  const rect = selector => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,rows:s.gridTemplateRows,heightCSS:s.height}; };
  return {viewport:[innerWidth,innerHeight], shell:rect('.workspace-shell'),map:rect('.map-workspace'),globe:rect('.map-workspace > div'),canvas:rect('.cesium-widget canvas'),footer:rect('footer'),sidebar:rect('.workflow-sidebar'),scroll:rect('.workflow-sidebar .scientific-scroll'),inspector:rect('.context-drawer'),overflow:document.documentElement.scrollWidth>innerWidth,play:[...document.querySelectorAll('button')].filter(el=>/time animation/.test(el.getAttribute('aria-label')??'')).map(el=>({text:el.textContent,disabled:el.disabled})),temporal:document.querySelector('.temporal-context')?.textContent};
})()`)
const out = new URL(`../../.tmp-viewport-audit/`, import.meta.url)
await mkdir(out, { recursive: true })
const screenshot = async (name) => {
  const result = await call('Page.captureScreenshot', { format: 'png' })
  await writeFile(new URL(`${name}.png`, out), Buffer.from(result.data, 'base64'))
}
await call('Page.enable')
await call('Runtime.enable')
await call('Network.enable')
try {
  if (phase === 'inspect') {
    console.log(JSON.stringify({ metrics: await metrics(), text: await evaluate('document.body.innerText') }, null, 2))
  } else if (phase === 'before') {
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await call('Page.navigate', { url: process.env.APP_URL ?? 'http://localhost:5173' })
    await waitFor(`document.querySelector('.cesium-widget canvas')`)
    await evaluate(`document.querySelector('.historical-tool').open=true`)
    await waitFor(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Explore Historical Ocean'&&!el.disabled)`)
    const current = await metrics()
    await clickText('Explore Historical Ocean')
    await waitFor(`document.querySelector('input[name="historical-mode"]')`)
    await evaluate(`document.querySelector('input[name="historical-mode"][value="phase_mean"]').click()`)
    await evaluate(`(() => { const el=[...document.querySelectorAll('button')].find(el=>el.querySelector('span')?.textContent==='After'); el.scrollIntoView({block:'nearest'}); el.click(); })()`)
    await delay(2500)
    await screenshot('before-1440-phase-after')
    const phaseAfter = await metrics()
    await clickText('Details', '.workspace-header button')
    await delay(500)
    await screenshot('before-1440-inspector')
    console.log(JSON.stringify({ current, phaseAfter, inspector:await metrics(), errors }, null, 2))
  } else if (phase === 'diagnose') {
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await delay(400)
    console.log('initial', JSON.stringify(await metrics()))
    console.log('ancestors',JSON.stringify(await evaluate(`(() => {const el=[...document.querySelectorAll('button')].find(el=>el.querySelector('span')?.textContent==='After'); const nodes=[];for(let n=el;n;n=n.parentElement){const r=n.getBoundingClientRect();const s=getComputedStyle(n);nodes.push({tag:n.tagName,cls:n.className,y:r.y,height:r.height,scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,overflow:s.overflow,display:s.display})} el.focus(); el.scrollIntoView({block:'nearest'});return nodes})()`)))
    await delay(500)
    await screenshot('before-focused-after')
    console.log('focused',JSON.stringify(await metrics()))
    console.log('deep-focus',JSON.stringify(await evaluate(`(() => {document.querySelector('.historical-tool details').open=true; const el=[...document.querySelectorAll('button')].find(el=>el.textContent==='Inspect Ocean Here');el.focus();el.scrollIntoView();return {shellScroll:document.querySelector('main').scrollTop,sidebarScroll:document.querySelector('.scientific-scroll').scrollTop}})()`)))
    await delay(200)
    await screenshot('before-deep-focus')
    console.log('deep',JSON.stringify(await metrics()))
  } else if (phase === 'after') {
    const reports = []
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await call('Page.navigate', { url: process.env.APP_URL ?? 'http://localhost:5173' })
    await waitFor(`document.querySelector('.cesium-widget canvas')`)
    await evaluate(`document.querySelector('.historical-tool').open=true`)
    await waitFor(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Explore Historical Ocean'&&!el.disabled)`)
    await clickText('Explore Historical Ocean')
    await waitFor(`document.querySelector('input[name="historical-mode"]')`)
    await evaluate(`window.auditCanvas=document.querySelector('.cesium-widget canvas'); true`)
    for (const [width,height] of [[1920,1080],[1440,900],[1280,720],[1024,768],[768,1024],[390,844]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      await evaluate(`document.querySelector('input[name="historical-mode"][value="phase_mean"]').click()`)
      await evaluate(`(() => {const el=[...document.querySelectorAll('.historical-phase-options button')].find(el=>el.textContent.startsWith('After'));el.focus();el.scrollIntoView({block:'nearest'});el.click();})()`)
      await delay(300)
      if (width < 1024) await evaluate(`document.querySelector('[aria-label="Open workflow controls"]').click()`)
      await evaluate(`document.querySelector('.historical-phase-options').scrollIntoView({block:'center'})`)
      await delay(250)
      await screenshot(`after-${width}-controls`)
      const controls = await evaluate(`({buttons:[...document.querySelectorAll('.historical-phase-options button')].map(el=>({text:el.textContent,clipped:el.scrollWidth>el.clientWidth})),sidebarScroll:document.querySelector('.workflow-sidebar .scientific-scroll').scrollHeight,sidebarHeight:document.querySelector('.workflow-sidebar .scientific-scroll').clientHeight})`)
      if(width<1024) await clickText('Close','.workflow-sidebar button')
      await delay(250)
      await screenshot(`after-${width}-map`)
      const mean=await metrics()
      const requestCount=requests.length
      await clickText('Details','.workspace-header button')
      await delay(300)
      const inspector=await metrics()
      await clickText('Close details','.workspace-header button')
      await delay(200)
      await evaluate(`document.querySelector('.historical-tool details').open=true; [...document.querySelectorAll('button')].find(el=>el.textContent==='Inspect Ocean Here').scrollIntoView()`)
      const deep=await metrics()
      const stableCanvas=await evaluate(`window.auditCanvas===document.querySelector('.cesium-widget canvas')`)
      const layoutRequests=requests.slice(requestCount)
      const modes={}
      for(const mode of ['daily','difference']) {
        await evaluate(`document.querySelector('input[name="historical-mode"][value="${mode}"]').click()`)
        await delay(200)
        modes[mode]=await metrics()
      }
      reports.push({width,height,controls,mean,inspector,deep,stableCanvas,layoutRequests,modes})
    }
    await writeFile(new URL('after-report.json',out),JSON.stringify({reports,errors},null,2))
    console.log(JSON.stringify({reports:reports.map(r=>({viewport:[r.width,r.height],map:[r.mean.map.width,r.mean.map.height],gap:r.mean.footer.y-r.mean.map.bottom,deepGap:r.deep.footer.y-r.deep.map.bottom,canvasMatches:r.mean.canvas.height===r.mean.map.height,stableCanvas:r.stableCanvas,controls:r.controls.buttons,overflow:r.mean.overflow,footerBottom:r.mean.footer.bottom,layoutRequests:r.layoutRequests,play:{mean:r.mean.play,daily:r.modes.daily.play,difference:r.modes.difference.play}})),errors},null,2))
  } else if (phase === 'regression') {
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await waitFor(`document.querySelector('.historical-tool')`)
    if(!await evaluate(`Boolean(document.querySelector('input[name="historical-mode"]'))`)) {
      await evaluate(`document.querySelector('.historical-tool').open=true`)
      await waitFor(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Explore Historical Ocean'&&!el.disabled)`)
      await clickText('Explore Historical Ocean')
      await waitFor(`document.querySelector('input[name="historical-mode"]')`)
    }
    await evaluate(`document.querySelector('input[name="historical-mode"][value="phase_mean"]').click()`)
    await evaluate(`document.querySelector('.historical-phase-options button:last-child').click()`)
    await waitFor(`!document.body.innerText.includes('Loading historical model field...')`,60000)
    await screenshot('after-1440-settled')
    const historical = {metrics:await metrics(),text:await evaluate(`document.querySelector('.historical-tool').innerText`)}
    await evaluate(`(() => {const el=document.querySelector('[aria-label="Historical event timeline"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'15');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`)
    await delay(300)
    historical.trackChanged = await metrics()
    await evaluate(`document.querySelector('input[name="historical-mode"][value="daily"]').click()`)
    await waitFor(`!document.body.innerText.includes('Loading historical model field...')`,60000)
    const timeBefore = await evaluate(`document.querySelector('[aria-label="Time selector"]').value`)
    await evaluate(`document.querySelector('[aria-label="Play time animation"]').click()`)
    await delay(1800)
    const timeAfter = await evaluate(`document.querySelector('[aria-label="Time selector"]').value`)
    await evaluate(`document.querySelector('[aria-label="Pause time animation"]')?.click()`)
    const dailyPlayback = {timeBefore,timeAfter}
    await clickText('Return to Current Ocean')
    await waitFor(`document.querySelector('[aria-label="Visualization mode"]')`)
    const checks=[]
    for(const label of ['Salinity','Currents','Temperature']) {
      await clickText(label,'[aria-label="Scientific variable"] button')
      await delay(250)
      checks.push({label,selected:await evaluate(`document.querySelector('[aria-label="Scientific variable"] [aria-checked="true"]').textContent`),metrics:await metrics()})
    }
    for(const label of ['3D','Isosurface','2D Map']) {
      await clickText(label,'[aria-label="Visualization mode"] button')
      await delay(250)
      checks.push({label,selected:await evaluate(`document.querySelector('[aria-label="Visualization mode"] [aria-pressed="true"]').textContent`),metrics:await metrics()})
    }
    await evaluate(`[...document.querySelectorAll('.tool-row')].find(el=>el.textContent.startsWith('Transect')).click()`)
    checks.push({label:'Transect',active:await evaluate(`document.body.innerText.includes('Select points on globe')`),metrics:await metrics()})
    await evaluate(`[...document.querySelectorAll('.tool-row')].find(el=>el.textContent.startsWith('Transect')).click()`)
    await evaluate(`[...document.querySelectorAll('.tool-row')].find(el=>el.textContent.startsWith('Ocean Probe')).click()`)
    checks.push({label:'Ocean Probe',active:await evaluate(`document.body.innerText.includes('Ocean Probe active')`),metrics:await metrics()})
    await evaluate(`[...document.querySelectorAll('.tool-row')].find(el=>el.textContent.startsWith('Ocean Probe')).click()`)
    await evaluate(`[...document.querySelectorAll('.tool-row')].find(el=>el.textContent.startsWith('Observations')).click()`)
    for(const label of ['Argo','Glider']) {
      const toggle=await evaluate(`(() => {const el=[...document.querySelectorAll('.toggle-row')].find(el=>el.querySelector('span')?.textContent===${JSON.stringify(label)})?.querySelector('input');if(!el||el.disabled)return {available:false};el.click();return {available:true,checked:el.checked}})()`)
      checks.push({label,toggle,metrics:await metrics()})
      await evaluate(`[...document.querySelectorAll('.toggle-row')].find(el=>el.querySelector('span')?.textContent===${JSON.stringify(label)})?.querySelector('input:checked')?.click()`)
    }
    await writeFile(new URL('regression-report.json',out),JSON.stringify({historical,dailyPlayback,checks,errors},null,2))
    console.log(JSON.stringify({historical,dailyPlayback,checks:checks.map(c=>({...c,metrics:{gap:c.metrics.footer.y-c.metrics.map.bottom,overflow:c.metrics.overflow}})),errors},null,2))
  } else if (phase === 'eval') {
    console.log(JSON.stringify(await evaluate(process.argv[3]), null, 2))
  }
} finally {
  socket.close()
}

// app.js 主程序

import { NAVBAR_COLUMN_CONFIG, LOTTERY_INDEPENDENT_CONFIG, convertToLunarText, GLOBAL_WS_BUS_CONFIG, getActiveYear } from './config.js';
import { wsLine1Transformer, wsLine2Transformer, commonLiveAjaxTransformer, commonHistoryAjaxTransformer } from './transformers.js';
import { commonLiveRenderer, renderYearTabs, renderHistoryBatch } from './renderers.js';
import { getAppHTMLSkeleton } from './templates.js';
import { FushiModule, initTongjiEvents, countma, countstyle, cunma, cunqt } from './gongju.js';
import { initPWAModule, initThemeModule, initInfiniteScroll, initPullToRefresh } from './utils-peripheral.js';
import { countdownEngine } from './countdown-engine.js'; 

/* 校验开奖号码有效性 */
function isValidLotteryNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length < 7) return false;
  const target7 = numbers.slice(0, 7);
  for (let num of target7) {
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 1 || n > 49) {
      return false; 
    }
  }
  return true;
}

/* 动态获取数据转换器 */
function getTransformer(name) {
  if (!name) return (data) => data;
  try {
    return window[name] || eval(name) || ((data) => data);
  } catch (e) {
    console.warn(`[Registry] ⚠️ 动态获取 Transformer [${name}] 失败，使用默认透传`, e);
    return (data) => data;
  }
}

/* 动态获取渲染器 */
function getRenderer(name) {
  if (!name) return () => {};
  try {
    return window[name] || eval(name) || (() => {});
  } catch (e) {
    console.warn(`[Registry] ⚠️ 动态获取 Renderer [${name}] 失败，使用空函数`, e);
    return () => {};
  }
}

/* 全局 WebSocket 总线 */
class GlobalWSBus {
  // 构造函数初始化连接状态
  constructor() {
    this.connections = {};
    this.reconnectTimers = {};
    this.failoverTimer = null;
    this.activeLineKey = null;
    this.isShutdown = false;
    this.lastBusData = {}; 
  }

  // 启动 WebSocket 连接
  startup() {
    this.isShutdown = false;
    if (GLOBAL_WS_BUS_CONFIG.line_1 && GLOBAL_WS_BUS_CONFIG.line_1.enabled) {
      this.connectLine('line_1');
    } else if (GLOBAL_WS_BUS_CONFIG.line_2 && GLOBAL_WS_BUS_CONFIG.line_2.enabled) {
      this.connectLine('line_2');
    }
  }

  // 关闭所有连接并清理定时器
  shutdown() {
    this.isShutdown = true;
    this.clearFailoverTimer();
    Object.keys(this.connections).forEach(lineKey => {
      if (this.connections[lineKey]) {
        this.connections[lineKey].close();
        this.connections[lineKey] = null;
      }
      if (this.reconnectTimers[lineKey]) {
        clearTimeout(this.reconnectTimers[lineKey]);
        this.reconnectTimers[lineKey] = null;
      }
    });
  }

  // 建立指定线路的连接
  connectLine(lineKey) {
    if (this.isShutdown) return;
    const config = GLOBAL_WS_BUS_CONFIG[lineKey];
    if (!config || !config.enabled) return;
    try {
      const ws = new WebSocket(config.url);
      this.connections[lineKey] = ws;
      ws.onopen = () => {
        if (this.isShutdown) { ws.close(); return; }
        if (lineKey === 'line_1') {
          this.clearFailoverTimer();
          if (this.connections['line_2']) {
            try { this.connections['line_2'].close(); } catch(e){}
            this.connections['line_2'] = null;
          }
          if (this.reconnectTimers['line_2']) {
            clearTimeout(this.reconnectTimers['line_2']);
            this.reconnectTimers['line_2'] = null;
          }
        }
        this.activeLineKey = lineKey;
        if (config.subscribeMsg) {
          ws.send(JSON.stringify(config.subscribeMsg));
        }
      };
      ws.onmessage = (event) => {
        if (this.isShutdown) return;
        if (lineKey !== this.activeLineKey) return;
        try {
          const rawData = JSON.parse(event.data);
          const defaultLottery = (config.lotteries && config.lotteries[0]) ? config.lotteries[0] : 'hk';
          const transformerConfig = LOTTERY_INDEPENDENT_CONFIG[defaultLottery] || LOTTERY_INDEPENDENT_CONFIG.hk;
          const transformFn = getTransformer(config.transformer) || (lineKey === 'line_1' ? wsLine1Transformer : wsLine2Transformer);
          const processedData = transformFn(rawData, transformerConfig);
          const renderFn = getRenderer(config.renderer) || commonLiveRenderer;
          if (processedData) {
            const lotteryId = processedData.lotteryType || config.lotteries?.[0];
            const nextPeriodStr = processedData.nextPeriod || '';
            const nextDateStr = processedData.nextDate || ''; 
            const dataSignature = `${lotteryId}_${processedData.period}_${JSON.stringify(processedData.numbers)}_${processedData.status || ''}_${nextPeriodStr}_${nextDateStr}`;
            //const dataSignature = `${lotteryId}_${processedData.period}_${JSON.stringify(processedData.numbers)}_${processedData.status || ''}`;
            if (this.lastBusData[lotteryId] === dataSignature) {
              return; 
            }
            this.lastBusData[lotteryId] = dataSignature;
            const numbersValid = isValidLotteryNumbers(processedData.numbers);
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let calculatedNextDate = processedData.nextDate; 
            if (!numbersValid) {
              if (processedData.nextDate) {
                const timePart = processedData.nextDate.includes('T') ? processedData.nextDate.split('T')[1] : '21:30:00';
                calculatedNextDate = `${todayStr}T${timePart}`;
              }
              delete processedData.dynamicConfigPatch;
            }
            if (processedData.dynamicConfigPatch && lotteryId && LOTTERY_INDEPENDENT_CONFIG[lotteryId]) {
              const targetConfig = LOTTERY_INDEPENDENT_CONFIG[lotteryId];
              const patch = processedData.dynamicConfigPatch;
              if (patch.pollingTimeWindow && patch.pollingTimeWindow.date) {
                if (!targetConfig.pollingTimeWindow) targetConfig.pollingTimeWindow = {};
                const newDate = patch.pollingTimeWindow.date;
                if (numbersValid && targetConfig.pollingTimeWindow.date !== newDate) {
                  targetConfig.pollingTimeWindow.date = newDate;
                }
              }
            }
            const wrapper = document.getElementById(lotteryId + '_rowWrapper');
            const isOpen = wrapper && wrapper.classList.contains('open');
            if (isOpen) {
              config.lotteries.forEach(id => { renderFn(processedData); });
            }
            const lotteryCfg = LOTTERY_INDEPENDENT_CONFIG[lotteryId] || {};
            const title = (lotteryCfg.name || '').replace('彩', '');
            let finalNextTime = calculatedNextDate;
            if (finalNextTime && lotteryCfg.countdownendtime) {
              const dateMatch = finalNextTime.match(/\d{4}-\d{2}-\d{2}/);
              if (dateMatch) finalNextTime = `${dateMatch[0]}T${lotteryCfg.countdownendtime}`;
            }
            countdownEngine.setCountdown(processedData.lotteryType, title, finalNextTime, processedData.period, processedData.numbers, processedData.notice || '');
          }
        } catch (err) {
          console.error(`[WS Bus] ❌ ${lineKey} 消息解析失败:`, err);
        }
      };
      ws.onclose = () => { 
        if (!this.isShutdown) this.handleDisconnect(lineKey); 
      };
      ws.onerror = (err) => { 
        console.error(`[WS Bus] ❌ ${lineKey} 连接发生错误`, err);
        if (!this.isShutdown) ws.close(); 
      };
    } catch (e) {
      console.error(`[WS Bus] ❌ ${lineKey} 创建 WebSocket 实例失败`, e);
      this.handleDisconnect(lineKey);
    }
  }

  // 处理断开连接与重连
  handleDisconnect(lineKey) {
    if (this.isShutdown) return;
    const currentWs = this.connections[lineKey];
    if (currentWs && (currentWs.readyState === 0 || currentWs.readyState === 1)) {
      return;
    }
    if (this.connections[lineKey]) this.connections[lineKey] = null;
    const config = GLOBAL_WS_BUS_CONFIG[lineKey];
    if (lineKey === 'line_1' && !this.failoverTimer) {
      const timeoutLimit = config.failoverTimeout || 10000; 
      this.failoverTimer = setTimeout(() => {
        this.clearFailoverTimer();
        this.activeLineKey = 'line_2'; 
        if (this.connections['line_1']) {
          try { this.connections['line_1'].close(); } catch(e){}
          this.connections['line_1'] = null;
        }
        if (GLOBAL_WS_BUS_CONFIG.line_2 && GLOBAL_WS_BUS_CONFIG.line_2.enabled) {
          this.connectLine('line_2');
        }
      }, timeoutLimit);
    }
    const interval = config?.reconnectInterval || 3000;
    if (this.reconnectTimers[lineKey]) {
      clearTimeout(this.reconnectTimers[lineKey]);
      this.reconnectTimers[lineKey] = null;
    }
    this.reconnectTimers[lineKey] = setTimeout(() => { 
      if (lineKey === 'line_2') {
        if (!this.failoverTimer && this.activeLineKey === 'line_1') {
          if (this.reconnectTimers['line_2']) {
            clearTimeout(this.reconnectTimers['line_2']);
            this.reconnectTimers['line_2'] = null;
          }
          return;
        }
      }
      const doubleCheckWs = this.connections[lineKey];
      if (doubleCheckWs && (doubleCheckWs.readyState === 0 || doubleCheckWs.readyState === 1)) {
        return;
      }
      this.connectLine(lineKey); 
    }, interval);
  }

  // 清除故障转移定时器
  clearFailoverTimer() {
    if (this.failoverTimer) {
      clearTimeout(this.failoverTimer);
      this.failoverTimer = null;
    }
  }
}

export const globalWSBus = new GlobalWSBus();

/* 彩票轮询 AJAX 引擎 */
class LotteryAjaxEngine {
  // 构造函数初始化轮询状态
  constructor() {
    this.pollTimers = {};
    this.lastLiveData = {}; 
    this.loadingStates = {};
  }

  // 判断是否在活动轮询时间窗口内
  isWithinActivePeriod(config) {
    const cfg = config.pollingTimeWindow;
    if (!cfg || cfg.enabled === false) return false;
    const now = new Date();
    if (cfg.date && cfg.date !== "daily") {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      if (cfg.date !== `${yyyy}-${mm}-${dd}`) return false;
    }
    if (!cfg.startTime || !cfg.endTime) return true;
    const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const getSec = (s) => { const p = s.split(':').map(Number); return p[0] * 3600 + p[1] * 60 + (p[2] || 0); };
    return curSec >= getSec(cfg.startTime) && curSec <= getSec(cfg.endTime);
  }

  // 获取实时数据
  async fetchLive(lotteryId, force = false) {
    const config = LOTTERY_INDEPENDENT_CONFIG[lotteryId];
    if (!config || config.ajaxEnabled !== true || !config.liveApiUrl) return;
    if (this.loadingStates[lotteryId]) return;
    try {
      this.loadingStates[lotteryId] = true; 
      const separator = config.liveApiUrl.includes('?') ? '&' : '?';
      const requestUrl = `${config.liveApiUrl}${separator}_t=${Date.now()}`;
      const response = await fetch(requestUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const rawData = await response.json();
      const transformFn = getTransformer(config.pollingTimeWindow?.transformer) || commonLiveAjaxTransformer;
      const renderFn = getRenderer(config.pollingTimeWindow?.renderer) || commonLiveRenderer;
      const processedData = transformFn(rawData, config);
      if (processedData) {
        const targetLotteryId = processedData.lotteryType || lotteryId;
        if (this.lastLiveData[targetLotteryId] && processedData.period) {
          if (!this.periodHistoryBook) this.periodHistoryBook = {};
          const lastRenderedPeriod = parseInt(this.periodHistoryBook[targetLotteryId], 10);
          const incomingPeriod = parseInt(processedData.period, 10);
          if (!isNaN(lastRenderedPeriod) && !isNaN(incomingPeriod) && incomingPeriod < lastRenderedPeriod) {
            return; 
          }
        }
        const nextPeriodStr = processedData.nextPeriod || '';
        const nextDateStr = processedData.nextDate || ''; 
        const dataSignature = `${targetLotteryId}_${processedData.period}_${JSON.stringify(processedData.numbers)}_${processedData.status || ''}_${nextPeriodStr}_${nextDateStr}`;
        //const dataSignature = `${targetLotteryId}_${processedData.period}_${JSON.stringify(processedData.numbers)}_${processedData.status || ''}`;
        if (!force && this.lastLiveData[targetLotteryId] === dataSignature) {
          return; 
        }
        this.lastLiveData[targetLotteryId] = dataSignature;
        if (processedData.period) {
          if (!this.periodHistoryBook) this.periodHistoryBook = {};
          this.periodHistoryBook[targetLotteryId] = processedData.period; 
        }
        const numbersValid = isValidLotteryNumbers(processedData.numbers); 
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        let calculatedNextDate = processedData.nextDate;
        if (!numbersValid) {
          if (processedData.nextDate) {
            const timePart = processedData.nextDate.includes('T') ? processedData.nextDate.split('T')[1] : '21:30:00';
            calculatedNextDate = `${todayStr}T${timePart}`;
          }
          delete processedData.dynamicConfigPatch;
        }
        if (processedData.dynamicConfigPatch && LOTTERY_INDEPENDENT_CONFIG[targetLotteryId]) {
          const targetConfig = LOTTERY_INDEPENDENT_CONFIG[targetLotteryId];
          const patch = processedData.dynamicConfigPatch;
          if (patch.pollingTimeWindow && patch.pollingTimeWindow.date) {
            if (!targetConfig.pollingTimeWindow) targetConfig.pollingTimeWindow = {};
            const newDate = patch.pollingTimeWindow.date;
            if (numbersValid && targetConfig.pollingTimeWindow.date !== newDate) {
              targetConfig.pollingTimeWindow.date = newDate;
            }
          }
        }
        renderFn(processedData);
        const lotteryCfg = LOTTERY_INDEPENDENT_CONFIG[targetLotteryId] || config;
        const title = (lotteryCfg.name || '').replace('彩', '');
        let finalNextTime = calculatedNextDate;
        if (finalNextTime && lotteryCfg.countdownendtime) {
          const dateMatch = finalNextTime.match(/\d{4}-\d{2}-\d{2}/);
          if (dateMatch) finalNextTime = `${dateMatch[0]}T${lotteryCfg.countdownendtime}`;
        }
        countdownEngine.setCountdown(processedData.lotteryType, title, finalNextTime, processedData.period, processedData.numbers, processedData.notice || '');
        if (numbersValid) {
          this.clearTimer(targetLotteryId);
        }
      }
    } catch (error) {
      console.error(`[AJAX] ❌ 获取 ${lotteryId} 实时数据失败:`, error);
    } finally {
      this.loadingStates[lotteryId] = false; 
    }
  }

  // 清除轮询定时器
  clearTimer(lotteryId) {
    if (this.pollTimers[lotteryId]) {
      clearInterval(this.pollTimers[lotteryId]);
      delete this.pollTimers[lotteryId];
    }
  }

  // 确保开启轮询定时器
  ensureTimer(lotteryId, forceUserAction = false) {
    if (!forceUserAction) return;
    const config = LOTTERY_INDEPENDENT_CONFIG[lotteryId];
    const windowEnabled = config?.pollingTimeWindow?.enabled;
    if (!config || config.ajaxEnabled !== true || windowEnabled !== true) {
      this.clearTimer(lotteryId);
      return;
    }
    const wrapper = document.getElementById(lotteryId + '_rowWrapper');
    if (!wrapper || !wrapper.classList.contains('open')) {
      this.clearTimer(lotteryId);
      return;
    }
    if (!this.pollTimers[lotteryId]) {
      const interval = config.pollingTimeWindow.highFreqInterval || 1000;
      this.pollTimers[lotteryId] = setInterval(() => {
        const curWrapper = document.getElementById(lotteryId + '_rowWrapper');
        if (!curWrapper || !curWrapper.classList.contains('open')) {
          this.clearTimer(lotteryId);
          return;
        }
        if (!this.isWithinActivePeriod(config)) {
          return; 
        }
        this.fetchLive(lotteryId);
      }, interval);
    }
  }

  // 初始化全局冷启动
  initGlobalColdBoot() {
    Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
      this.clearTimer(lotteryId);
    });
    Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
      const config = LOTTERY_INDEPENDENT_CONFIG[lotteryId];
      if (config && config.ajaxEnabled === true && config.liveApiUrl) {
        this.fetchLive(lotteryId); 
      }
    });
    if (typeof countdownEngine !== 'undefined' && countdownEngine.targetTimes) {
      Object.keys(countdownEngine.targetTimes).forEach(lotteryId => {
        const noticeText = countdownEngine.notices[lotteryId];
        countdownEngine.updateTick(lotteryId, noticeText); 
      });
    }
  }

  // 初始化当前激活的彩票轮询
  initActiveLottery(currentNavTab) {
    const navConfig = NAVBAR_COLUMN_CONFIG[currentNavTab];
    if (!navConfig || navConfig.type !== 'lottery_hall') return;
    const targetLotteryIds = navConfig.lotteryId ? [navConfig.lotteryId] : [];
    Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lid => {
      const lotteryCfg = LOTTERY_INDEPENDENT_CONFIG[lid];
      const status = lotteryCfg?.initialToggleStatus?.[currentNavTab];
      if (status === 'open' && !targetLotteryIds.includes(lid)) {
        targetLotteryIds.push(lid);
      }
    });
    targetLotteryIds.forEach(lotteryId => {
      this.fetchLive(lotteryId);
      this.ensureTimer(lotteryId, true);
    });
  }

  // 停止所有轮询
  stopAllPolling() {
    Object.keys(this.pollTimers).forEach(lotteryId => this.clearTimer(lotteryId));
  }
}

export const lotteryAjaxEngine = new LotteryAjaxEngine();

/* 全局状态管理类 */
class GlobalStore {
  // 构造函数初始化应用状态与监听器
  constructor() {
    if (typeof window.cancelAutoRefresh === 'function') {
      window.cancelAutoRefresh();
    }
    this.currentNavTab = "hk"; 
    this.currentSortMode = "default"; 
    this.showWuxing = false;
    const columnCfg = NAVBAR_COLUMN_CONFIG[this.currentNavTab];
    this.currentYear = getActiveYear(columnCfg?.ls || "hkls"); 
    this.isYearExpanded = false;
    this.pageSize = 20;
    this.currentPageIndex = 0;
    this.isLoadingMore = false;
    this.historyDataStore = {}; 
    this.domCache = {}; 
    this.historyRequestSeq = 0; 
    this.showMask();
    this.initInitialToggleStatus(this.currentNavTab);
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    this.boundOnlineHandler = this.handleOnlineStatus.bind(this);
    this.initEvents();
    this.initOfflineDefense(); 
    this.initVisibilityWatcher(); 
    initInfiniteScroll(this);
    initPullToRefresh(this);
    this.initMasterClock(); 
    this.deferredPrompt = null;
    initPWAModule(this);
    this.fushiModule = new FushiModule();
    this.fushiModule.initDelegationEvents();
    initTongjiEvents();
    window.countma = countma;
    window.countstyle = countstyle;
    window.cunma = cunma;
    window.cunqt = cunqt;
    setTimeout(() => {
      this.fetchHistoryData();
      globalWSBus.startup();
      lotteryAjaxEngine.initGlobalColdBoot();
    }, 100);
  }

  // 处理页面可见性变化
  async handleVisibilityChange() {
  const currentNavConfig = NAVBAR_COLUMN_CONFIG[this.currentNavTab];
  const isToolZone = currentNavConfig && currentNavConfig.type === 'tool_zone';
  const isPageHidden = document.hidden || document.visibilityState === 'hidden';
  if (isToolZone) return;
  if (isPageHidden) {
    Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
      lotteryAjaxEngine.clearTimer(lotteryId);
    });
  } else {
    if (globalWSBus && typeof globalWSBus.startup === 'function') {
      globalWSBus.startup();
    }
    const activeLotteryIds = Object.keys(LOTTERY_INDEPENDENT_CONFIG).filter(lotteryId => {
      const wrapper = document.getElementById(lotteryId + '_rowWrapper');
      return wrapper && wrapper.classList.contains('open');
    });
    await Promise.all(activeLotteryIds.map(async (lotteryId) => {
      lotteryAjaxEngine.clearTimer(lotteryId);
      lotteryAjaxEngine.loadingStates[lotteryId] = false;
      await lotteryAjaxEngine.fetchLive(lotteryId, true);
      lotteryAjaxEngine.ensureTimer(lotteryId, true);
    }));
  }
}

  // 初始化可见性监听器
  initVisibilityWatcher() {
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
  }

  // 获取历史开奖数据
  async fetchHistoryData(targetLotteryId = null, targetYear = null, isRefresh = false) {
    const activeLotteryId = targetLotteryId || NAVBAR_COLUMN_CONFIG[this.currentNavTab]?.lotteryId;
    if (!activeLotteryId) {  
      this.hideMask();  
      return;  
    }
    const lotteryCfg = LOTTERY_INDEPENDENT_CONFIG[activeLotteryId];
    if (!lotteryCfg?.historySkin?.historyApiUrl) {  
      this.hideMask();  
      return;  
    }
    const currentSeq = ++this.historyRequestSeq;
    const skin = lotteryCfg.historySkin;
    const yearToFetch = targetYear !== null ? targetYear : this.currentYear;
    try {
      renderYearTabs(lotteryCfg.historyStartYear || 2020, yearToFetch, this.isYearExpanded);
    } catch (e) {
      console.warn("[History] 渲染年份标签异常:", e);
    }
    const apiUrl = skin.historyApiUrl;
    const requestUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}y=${yearToFetch}&_t=${Date.now()}`;
    const listContainer = document.querySelector('.lottery_open') || document.querySelector('.main-content');
    if (!isRefresh) this.showMask();
    if (listContainer) {
        const title = lotteryCfg?.historySkin?.title || '歷史開獎'; 
        const oldLoader = listContainer.querySelector('.jz-reload-container-v2');
        if (oldLoader) oldLoader.remove();
        listContainer.insertAdjacentHTML('afterbegin', `<div class="jz-reload-container-v2" style="cursor: pointer; text-align: center; padding: 5px 15px 10px;"><span class="jz-reload-tag-v2"><span class="jz-status-dot"></span>正在请求 ${yearToFetch}年 ${title}</span></div>`);
    }
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => {
      controller.abort(); 
    }, 6000);
    try {
      const response = await fetch(requestUrl, { signal: signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const rawData = await response.json();
      if (currentSeq !== this.historyRequestSeq) {
        return;
      }
      const transformFn = getTransformer(skin.transformer) || commonHistoryAjaxTransformer;
      let processedData = transformFn(rawData, lotteryCfg);
      if (!Array.isArray(processedData)) processedData = [];
      this.historyDataStore[activeLotteryId] = processedData;
      this.currentPageIndex = 0;  
      try {
        this.renderHistoryWithSort();
      } catch (renderErr) {
        console.error(`[History Render] ❌ 渲染历史记录列表抛出异常:`, renderErr);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (currentSeq !== this.historyRequestSeq) return; 
      if (listContainer) {
        const errorText = error.name === 'AbortError' ? '网络连接超时，点击重试' : '网络连接失败或数据解析异常，点击重试';
        listContainer.innerHTML = `<div class="jz-reload-container-v2" style="cursor: pointer; text-align: center; padding: 10px 15px 30px;" id="jz-reload-container-v2"><span class="jz-reload-tag-v2"><span class="jz-status-dot"></span>${errorText}</span></div>`;
        const reloadBtn = listContainer.querySelector('#jz-reload-container-v2');
        if (reloadBtn) {
          reloadBtn.onclick = () => this.fetchHistoryData(activeLotteryId, yearToFetch, false);
        }
      }
    } finally {
      if (currentSeq === this.historyRequestSeq) {
        const loadingScreen = document.getElementById('app-loading-screen');
        if (loadingScreen) {
          if (typeof window.hideLoadingScreen === 'function') {
            window.hideLoadingScreen();
          }
        }
        this.hideMask();
      }
    }
  }

  // 按照排序模式渲染历史记录
  renderHistoryWithSort(isAppend = false) {
    const activeLotteryId = NAVBAR_COLUMN_CONFIG[this.currentNavTab]?.lotteryId || 'hk';
    const allData = this.historyDataStore[activeLotteryId] || [];
    let sliceData = [];
    let renderStartIndex = 0;
    let renderBatchSize = this.pageSize;
    if (isAppend) {
      renderStartIndex = this.currentPageIndex * this.pageSize;
      sliceData = allData.slice(renderStartIndex, renderStartIndex + this.pageSize);
    } else {
      sliceData = allData.slice(0, (this.currentPageIndex + 1) * this.pageSize);
      renderBatchSize = sliceData.length; 
    }
    const processedSlice = sliceData.map(row => {
      const copiedRow = { ...row, zodiacs: row.zodiacs ? [...row.zodiacs] : [], wuxing: row.wuxing ? [...row.wuxing] : [] };
      const nums = row.numbers ? [...row.numbers] : [];
      if (this.currentSortMode === 'size' && nums.length >= 6) {
        copiedRow.numbers = [...nums.slice(0, 6).sort((a, b) => a - b), nums[6]];
      } else {
        copiedRow.numbers = nums;
      }
      return copiedRow;
    });
    renderHistoryBatch(processedSlice, 0, renderBatchSize, isAppend);
    document.body.classList.toggle('show-wuxing-mode', this.showWuxing);
    const daxiaoBtn = document.getElementById('daxiao');
    if (daxiaoBtn) {
      daxiaoBtn.classList.toggle('active', this.currentSortMode === 'size');
      daxiaoBtn.textContent = this.currentSortMode === 'size' ? '落球序' : '大小序';
    }
  }

  // 获取 AJAX 实时数据
  async fetchLiveAjaxData(lotteryId) { 
    await lotteryAjaxEngine.fetchLive(lotteryId); 
  }

  // 获取所有彩票ID
  getAllLotteryIds() {
    const ids = [];
    Object.values(NAVBAR_COLUMN_CONFIG).forEach(cfg => {
      if (cfg.type === 'lottery_hall' && cfg.lotteryId && !ids.includes(cfg.lotteryId)) {
        ids.push(cfg.lotteryId);
      }
    });
    return ids;
  }

  // 显示自定义 Toast
  showCustomToast(message) {
    import('./utils-peripheral.js').then(module => module.showCustomToast(message));
  }

  // 显示加载遮罩
  showMask() { 
    const mask = document.getElementById('page-loading-mask'); 
    if (mask) mask.style.display = 'flex'; 
  }

  // 隐藏加载遮罩
  hideMask() { 
    const mask = document.getElementById('page-loading-mask'); 
    if (mask) mask.style.display = 'none'; 
  }

  // 初始化折叠/展开状态
  initInitialToggleStatus(navType) {
    this.getAllLotteryIds().forEach(lid => {
      const lotteryCfg = LOTTERY_INDEPENDENT_CONFIG[lid];
      const targetStatus = lotteryCfg?.initialToggleStatus?.[navType] || "close";
      const wrapper = document.getElementById(lid + '_rowWrapper');
      const textEl = document.getElementById(lid + '_toggleText');
      const arrowEl = document.getElementById(lid + '_arrow');
      const floatingTipEl = document.getElementById(lid + '_floatingTip');
      if (wrapper) {
        wrapper.classList.toggle('open', targetStatus === 'open');
        if (textEl) textEl.textContent = targetStatus === 'open' ? '收起' : '展开';
        if (arrowEl) arrowEl.textContent = targetStatus === 'open' ? '▲' : '▼';
        if (floatingTipEl) floatingTipEl.style.display = targetStatus === 'open' ? 'none' : '';
      }
    });
  }

  // 初始化事件监听
  initEvents() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.handleNavSwitch(item.getAttribute('data-type')));
    });
    const daxiaoBtn = document.getElementById('daxiao');
    if (daxiaoBtn) {
      daxiaoBtn.addEventListener('click', () => {
        this.showMask();
        this.pageSize = 20;
        this.currentPageIndex = 0;
        this.currentSortMode = this.currentSortMode === 'default' ? 'size' : 'default';
        setTimeout(() => { this.renderHistoryWithSort(); this.hideMask(); }, 50);
      });
    }
    const wuxingBtn = document.getElementById('wuxing');
    if (wuxingBtn) {
      wuxingBtn.addEventListener('click', () => {
        this.showWuxing = !this.showWuxing;
        wuxingBtn.classList.toggle('active', this.showWuxing);
        document.body.classList.toggle('show-wuxing-mode', this.showWuxing);
      });
    }
    const yearListContainer = document.querySelector('.lottery-list');
    if (yearListContainer) {
      yearListContainer.addEventListener('click', (e) => {
        if (e.target.id === 'yearToggleBtn') {
          this.isYearExpanded = !this.isYearExpanded;
          renderYearTabs(LOTTERY_INDEPENDENT_CONFIG[NAVBAR_COLUMN_CONFIG[this.currentNavTab]?.lotteryId || 'hk']?.historyStartYear || 1924, this.currentYear, this.isYearExpanded);
          return;
        }
        const targetLi = e.target.closest('li[data-year]');
        if (!targetLi) return;
        const selectedYear = parseInt(targetLi.getAttribute('data-year'), 10);
        if (!isNaN(selectedYear)) {
          this.currentYear = selectedYear;
          document.querySelectorAll('.lottery-list li[data-year]').forEach(li => {
            li.classList.toggle('active', parseInt(li.getAttribute('data-year'), 10) === selectedYear);
          });
          this.fetchHistoryData();
        }
      });
    }
  }

  // 执行下拉刷新逻辑
  async executeGlobalStorePullRefresh(activeLotteryId) {
    var isAnyPanelStuck = false;
    var openWrappers = document.querySelectorAll('.open[id$="_rowWrapper"]');
    if (typeof countdownEngine !== 'undefined' && countdownEngine.targetTimes) {
      openWrappers.forEach(function(wrapper) {
        var lotteryId = wrapper.id.replace('_rowWrapper', '');
        var targetTime = countdownEngine.targetTimes[lotteryId];
        if (targetTime) {
          var diff = Math.ceil((targetTime - Date.now()) / 1000);
          if ((diff <= 5 || countdownEngine.inJiaozhuFlags[lotteryId]) && (!lotteryAjaxEngine.pollTimers || !lotteryAjaxEngine.pollTimers[lotteryId])) {
            isAnyPanelStuck = true; 
          }
        }
      });
    }
    var liveActionPromise;
    if (isAnyPanelStuck) {
      liveActionPromise = lotteryAjaxEngine.initGlobalColdBoot();
    } else {
      var openPanelsPromises = Array.prototype.map.call(openWrappers, function(wrapper) {
        var lotteryId = wrapper.id.replace('_rowWrapper', '');
        return lotteryAjaxEngine.fetchLive(lotteryId); 
      });
      liveActionPromise = openPanelsPromises.length > 0 ? Promise.all(openPanelsPromises) : Promise.resolve();
    }
    return Promise.all([
      this.fetchHistoryData(activeLotteryId, this.currentYear, true), 
      liveActionPromise                                           
    ]);
  }

  // 处理在线/离线状态
  handleOnlineStatus() {
    const errBar = document.getElementById('network-error-bar');
    if (navigator.onLine) {
      if (errBar) errBar.style.display = 'none';
      const activeLotteryId = NAVBAR_COLUMN_CONFIG[this.currentNavTab]?.lotteryId;
      if (activeLotteryId) this.fetchHistoryData(activeLotteryId, this.currentYear);
      globalWSBus.startup();
      lotteryAjaxEngine.initGlobalColdBoot();
    } else {
      if (errBar) errBar.style.display = 'block';
      Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
        lotteryAjaxEngine.clearTimer(lotteryId);
      });
    }
  }

  // 初始化离线防御
  initOfflineDefense() {
    const errBar = document.getElementById('network-error-bar');
    const retryBtn = document.getElementById('net-retry-btn');
    if (!navigator.onLine && errBar) errBar.style.display = 'block';
    window.addEventListener('online', this.boundOnlineHandler);
    window.addEventListener('offline', this.boundOnlineHandler);
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (navigator.onLine) {
          this.handleOnlineStatus();
          this.showCustomToast("网络已连接，正在刷新最新数据并重启心跳守护...");
        } else {
          this.showCustomToast("当前仍然处于断网状态，请检查您的网络设置后重试。");
        }
      });
    }
  }

  // 处理导航栏切换
  async handleNavSwitch(navType) {
    if (this.currentNavTab === navType) return;
    const navConfig = NAVBAR_COLUMN_CONFIG[navType];
    if (!navConfig) return;
    const oldNavConfig = NAVBAR_COLUMN_CONFIG[this.currentNavTab];
    const isOldTool = oldNavConfig?.type === 'tool_zone';
    const isNewTool = navConfig.type === 'tool_zone';
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-type') === navType);
    });
    if (isNewTool) {
      this.currentNavTab = navType;
      globalWSBus.shutdown(); 
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.style.display = 'none';
      Object.values(NAVBAR_COLUMN_CONFIG).forEach(cfg => {
        if (cfg.type === 'tool_zone' && cfg.panelId) {
          const panel = document.getElementById(cfg.panelId);
          if (panel) panel.style.display = (cfg.panelId === navConfig.panelId) ? 'block' : 'none';
        }
      });
      Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
        lotteryAjaxEngine.clearTimer(lotteryId);
      });
      if (navConfig.subtype === 'external' && navConfig.targetUrl) {
        window.open(navConfig.targetUrl, '_blank');
      }
      return; 
    } 
    this.showMask();
    this.currentSortMode = 'default';
    this.domCache = {};
    if (!isOldTool && !isNewTool) {
      Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
        const wrapper = document.getElementById(lotteryId + '_rowWrapper');
        if (!wrapper || !wrapper.classList.contains('open')) {
          lotteryAjaxEngine.clearTimer(lotteryId); 
        }
      });
    }
    const mainContent = document.querySelector('.main-content');
    Object.values(NAVBAR_COLUMN_CONFIG).forEach(cfg => {
      if (cfg.type === 'tool_zone' && cfg.panelId) {
        const panel = document.getElementById(cfg.panelId);
        if (panel) panel.style.display = 'none';
      }
    });
    if (isOldTool && !isNewTool) {
      globalWSBus.startup();
    }
    if (mainContent) {
      mainContent.style.display = 'block';
    }
    if (navConfig.type === 'lottery_hall') {
      this.currentNavTab = navType;
      this.initInitialToggleStatus(navType); 
      const skin = LOTTERY_INDEPENDENT_CONFIG[navConfig.lotteryId]?.historySkin;
      if (skin) {
        const titleEl = document.getElementById('historyTitle');
        const iconEl = document.getElementById('historyIcon');
        if (titleEl) titleEl.textContent = skin.title;
        if (iconEl) iconEl.src = skin.iconSrc;
      }
      this.currentYear = getActiveYear(navConfig?.ls || "hkls"); 
      this.isYearExpanded = false;
      try {
        await this.fetchHistoryData();
      } catch (e) {
        console.error("[Navigation] 切换栏目加载历史数据异常:", e);
      } finally {
        this.hideMask();
      }
      if (isOldTool && !isNewTool) {
        lotteryAjaxEngine.initGlobalColdBoot();
      } else {
        Object.keys(LOTTERY_INDEPENDENT_CONFIG).forEach(lotteryId => {
          const wrapper = document.getElementById(lotteryId + '_rowWrapper');
        if (wrapper && wrapper.classList.contains('open')) {
          lotteryAjaxEngine.clearTimer(lotteryId);
          lotteryAjaxEngine.loadingStates[lotteryId] = false;
          lotteryAjaxEngine.fetchLive(lotteryId);
          setTimeout(() => {
            lotteryAjaxEngine.ensureTimer(lotteryId, true);
          }, 150);
        }
        });
      }
    } else {
      this.hideMask();
    }
  }

  // 切换行展开与收起
  async toggleRows(id) {
  const wrapper = document.getElementById(id + '_rowWrapper');
  const textEl = document.getElementById(id + '_toggleText');
  const arrowEl = document.getElementById(id + '_arrow');
  const floatingTipEl = document.getElementById(id + '_floatingTip');
  if (wrapper) {
    wrapper.classList.toggle('open');
    const isOpen = wrapper.classList.contains('open');
    if (textEl) textEl.textContent = isOpen ? '收起' : '展开';
    if (arrowEl) arrowEl.textContent = isOpen ? '▲' : '▼';
    if (floatingTipEl) floatingTipEl.style.display = isOpen ? 'none' : '';
    if (isOpen) {
      const config = LOTTERY_INDEPENDENT_CONFIG[id];
      const windowEnabled = config?.pollingTimeWindow?.enabled;
      if (config && config.ajaxEnabled === true && windowEnabled === true) {
        lotteryAjaxEngine.clearTimer(id);
        lotteryAjaxEngine.loadingStates[id] = false;
        await lotteryAjaxEngine.fetchLive(id);
        lotteryAjaxEngine.ensureTimer(id, true);
      }
    } else {
      lotteryAjaxEngine.clearTimer(id);
    }
  }
}

  // 初始化主时钟
  initMasterClock() {
    countdownEngine.registerMasterClock(() => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const lunarText = convertToLunarText(dateStr);
      const weekStr = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.getDay()];
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const timeBarEl = document.getElementById('liveTimeBar');
      if (timeBarEl) {
        timeBarEl.textContent = `${yyyy}/${mm}/${dd} ${lunarText} ${weekStr} ${hh}:${mi}:${ss}`;
      }
    });
  }
}

/* 应用启动引导 */
function bootApp() {
  if (!document.querySelector('.app')) {
    const loadingScreen = document.getElementById('app-loading-screen');
    if (loadingScreen) {
      loadingScreen.remove(); 
    }
    document.body.innerHTML = getAppHTMLSkeleton();
    if (loadingScreen) {
      document.body.insertBefore(loadingScreen, document.body.firstChild);
    }
  }
  if (!window.globalStoreInstance) {
    window.globalStoreInstance = new GlobalStore();
  }
  initThemeModule();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

export default GlobalStore;

// config.js 配置

import { lottoNodes } from './year.js';

const WUXING_NAMES = ["金", "木", "水", "火", "土"];

const WUXING_MATRIX = [
  0,0,3,3,1,1,4,4,0,0,3,3,2,2,4,4,0,0,1,1,2,2,4,4,3,3,1,1,2,2,
  0,0,3,3,1,1,4,4,0,0,3,3,2,2,4,4,0,0,1,1,2,2,4,4,3,3,1,1,2,2,
  0,0,3,3,1,1,4,4,0,0,3,3,2,2,4,4,0,0,1,1,2,2,4,4,3,3,1,1,2,2,
  0,0,3,3,1,1,4,4,0,0,3,3,2,2,4,4,0,0,1,1,2,2,4,4,3,3,1,1
];

function getActiveYear(lotteryType) {
  const now = new Date();
  const targetYearStr = now.getFullYear().toString();
  let activeYear = parseInt(targetYearStr, 10);
  const typeNodes = lottoNodes[lotteryType];
  if (typeNodes && typeNodes[targetYearStr]) {
    const nodeTime = new Date(typeNodes[targetYearStr]).getTime();
    if (now.getTime() < nodeTime) {
      activeYear = activeYear - 1;
    }
  }
  return activeYear;
}

export function YearWxTool(lotteryType, query) {
  const activeYear = getActiveYear(lotteryType);
  if (query === undefined || query === null || query === '') {
    return activeYear;
  }
  const numQuery = Number(query);
  if (!isNaN(numQuery) && String(query).trim() !== "" && !["金", "木", "水", "火", "土"].includes(String(query).trim())) {
    if (numQuery >= 1 && numQuery <= 49) {
      const index = activeYear - 1923 - numQuery;
      return (index >= 0 && index < WUXING_MATRIX.length) ? WUXING_NAMES[WUXING_MATRIX[index]] : "未知";
    }
  }
  if (typeof query === 'string') {
    const cleanQuery = query.trim();
    const WUXING_MAP = {
      "金": 0,
      "木": 1,
      "水": 2,
      "火": 3,
      "土": 4
    };
    const targetCode = WUXING_MAP[cleanQuery];
    if (targetCode === undefined) {
      return ""; 
    }
    const matchedNumbers = [];
    for (let ball = 1; ball <= 49; ball++) {
      const index = activeYear - 1923 - ball;
      if (index >= 0 && index < WUXING_MATRIX.length) {
        if (WUXING_MATRIX[index] === targetCode) {
          matchedNumbers.push(ball);
        }
      }
    }
    return matchedNumbers.join(',');
  }
  return "参数错误";
}

const NAVBAR_COLUMN_CONFIG = {
  hk: {
    type: "lottery_hall",
    lotteryId: "hk",
    ls:"hkls",
    title: "香港彩",
    iconSrc: "/img/xg.png",
    action: "navigate"
  },
  xa: {
    type: "lottery_hall",
    lotteryId: "xa",
    ls:"amls",
    title: "新澳彩",
    iconSrc: "/img/xam.png",
    action: "navigate"
  },
  la: {
    type: "lottery_hall",
    lotteryId: "la",
    ls:"amls",
    title: "老澳彩",
    iconSrc: "/img/xam.png",
    action: "navigate"
  },
  tj: {
    type: "tool_zone",
    lotteryId: "tj",
    panelId: "tongjiToolPanel",
    title: "统计助手",
    iconSrc: "/img/top.png",
    subtype: "internal",
    action: "render_tool"
  },
  fs: {
    type: "tool_zone",
    lotteryId: "fs",
    panelId: "fushiToolPanel",
    title: "复式计算",
    iconSrc: "/img/top.png",
    subtype: "internal",
    action: "render_tool"
  }
  /*外部连接
  fushijs: {
    type: "tool_zone",
    panelId: "fushiToolPanel",
    title: "复式计算",
    iconSrc: "",
    subtype: "external",// 明确告诉系统这是外部跳转
    action: "external_link",// 触发外部打开动作
    targetUrl: "https://tools.lottery-calc.com/fushi"
  }
  */
};

const GLOBAL_WS_BUS_CONFIG = {
  line_1: {
    enabled: true,
    transformer: "wsLine1Transformer",
    renderer: "commonLiveRenderer",
    lotteries: ["hk","xa"],
    url: "wss://d.2026ws.app:2026/ws/v2",
    subscribeMsg: { action: 'subscribe', groups: ['am', 'hk'] },
    reconnectInterval: 3000,
    maxReconnectInterval: 30000,
    failoverTimeout: 20000
  },
  line_2: {
    enabled: true, // false
    transformer: "wsLine2Transformer",
    renderer: "commonLiveRenderer",
    url: "wss://wsws2.gyycgkb.com/ws",
    lotteries: ["hk","xa"],
    subscribeMsg: { event: 'subscribe', channels: ['molhc6', 'hklhc6'] },
    reconnectInterval: 3000,
    maxReconnectInterval: 30000
  }
};

const LOTTERY_INDEPENDENT_CONFIG = {
  hk: {
    id: "hk",
    name: "香港彩",
    currentZodiacYear: getActiveYear("hk"),
    historyStartYear: 2010,
    ajaxEnabled: false,
    liveApiUrl: "https://live3.lhzzcenter.com/data.json",
    countdownendtime:"21:30:00",
    pollingTimeWindow: {
      enabled: true,
      transformer: "commonLiveAjaxTransformer", 
      renderer: "commonLiveRenderer",
      date: "daily",
      startTime: "21:29:55",
      endTime: "21:36:00",
      highFreqInterval: 1000,
    },
    historySkin: {
      title: "香港歷史記錄",
      iconSrc: "/img/xg.png",
      historyApiUrl: "https://ls.kjkj.fit/kj/?g=xg",
      transformer: "commonHistoryAjaxTransformer", 
      renderer: "renderHistoryBatch"
    },
    initialToggleStatus: {
      hk: "open",
      xa: "open",
      la: "close",
      tj: "close",
      fs: "close"
    }
  },
  xa: {
    id: "xa",
    name: "新澳彩",
    currentZodiacYear: getActiveYear("xa"),
    historyStartYear: 2020,
    ajaxEnabled: false,
    liveApiUrl: "https://live3.lhzzcenter.com/data_mo_v2.json",
    countdownendtime:"21:32:05",
    pollingTimeWindow: {
      enabled: true,
      transformer: "commonLiveAjaxTransformer", 
      renderer: "commonLiveRenderer",
      date: "daily",
      startTime: "21:32:00",
      endTime: "21:36:00",
      highFreqInterval: 1000,
    },
    historySkin: {
      title: "新澳歷史記錄",
      iconSrc: "/img/xam.png",
      historyApiUrl: "https://ls.kjkj.fit/kj/?g=am",
      transformer: "commonHistoryAjaxTransformer", 
      renderer: "renderHistoryBatch"
    },
    initialToggleStatus: {
      hk: "open",
      xa: "open",
      la: "close",
      tj: "close",
      fs: "close"
    }
  },
  la: {
    id: "la",
    name: "老澳彩",
    currentZodiacYear: getActiveYear("la"),
    historyStartYear: 2020,
    ajaxEnabled: true,
    liveApiUrl: "https://live3.lhzzcenter.com/data_mo.json",
    countdownendtime:"21:32:35",
    pollingTimeWindow: {
      enabled: true,
      transformer: "commonLiveAjaxTransformer", 
      renderer: "commonLiveRenderer",
      date: "daily",
      startTime: "21:32:30",
      endTime: "21:36:00",
      highFreqInterval: 1000,
    },
    historySkin: {
      title: "老澳歷史記錄",
      iconSrc: "/img/xam.png",
      historyApiUrl: "https://ls.kjkj.fit/kj/?g=oldam",
      transformer: "commonHistoryAjaxTransformer", 
      renderer: "renderHistoryBatch"
    },
    initialToggleStatus: {
      hk: "close",
      xa: "close",
      la: "open",
      tj: "close",
      fs: "close"
    }
  }
};

function hm_ys(b) {
  var num = Number(b);
  if (isNaN(num) || num < 1 || num > 49) {
    return "item-top-box circle-style kjbj kjbjopacity";
  } else {
    return [
      "item-top-box circle-style kjhm_red",
      "item-top-box circle-style kjhm_blue",
      "item-top-box circle-style kjhm_green"
    ][Math.floor(((num - 1 + Math.floor((num - 1) / 10)) % 6) / 2)];
  }
}

var lhc = {
  zodiac: ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"],
  getZodiac: function (year, num, a, b, c) {
    var zodiackj = [];
    if (a === "hk") { zodiackj = ["香", "港", "六", "合", "彩", "開", "獎"]; }
    else if (a === "xa") { zodiackj = ["新", "澳", "六", "合", "彩", "開", "獎"]; }
    else if (a === "la") { zodiackj = ["老", "澳", "六", "合", "彩", "開", "獎"]; }
    else { zodiackj = ["", "連", "接", "", "異", "常", ""]; }
    
    var n = Number(num);
    if (isNaN(n) || n < 1 || n > 49) {
      return zodiackj[b] !== undefined ? zodiackj[b] : "";
    } else {
      return this.getZodiacList(year)[(n - 1) % 12];
    }
  },
  getZodiacList: function (year) {
    var validYear = parseInt(year, 10) || new Date().getFullYear();
    var startYear = 1924;
    var index = (validYear - startYear) % 12;
    if (index < 0) index += 12;
    var a = this.zodiac.slice(0, index + 1).reverse();
    var b = this.zodiac.slice(index + 1).reverse();
    return a.concat(b);
  }
};

function getLotteryWuxing(numStr) {
  var n = parseInt(numStr, 10);
  if (isNaN(n) || n < 1 || n > 49) {
    return "";
  }
  var wuxingMap = {
    "金": [4,5,12,13,26,27,34,35,42,43],
    "木": [8,9,16,17,24,25,38,39,46,47],
    "水": [1,14,15,22,23,30,31,44,45],
    "火": [2,3,10,11,18,19,32,33,40,41,48,49],
    "土": [6,7,20,21,28,29,36,37]
  };
  for (var wx in wuxingMap) {
    if (wuxingMap[wx].indexOf(n) !== -1) {
      return wx;
    }
  }
  return "";
}

function convertToLunarText(dateStr) {
  if (!dateStr) return "";
  var cleanStr = typeof dateStr === 'string' ? dateStr.replace(/-/g, '/') : dateStr;
  var dateObj = new Date(cleanStr);
  if (isNaN(dateObj.getTime())) return "";
  try {
    var formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric'
    });
    var result = formatter.format(dateObj);
    var dayNames = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', 
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', 
                    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    let formatted = result.replace(/\d+/g, function(match) {
      var num = parseInt(match, 10);
      return (num >= 1 && num <= 30) ? (dayNames[num] || match) : match;
    });
    formatted = formatted.replace(/日$/, '');
    return formatted;
  } catch (e) {
    return "正月十五";
  }
}

export { GLOBAL_WS_BUS_CONFIG, NAVBAR_COLUMN_CONFIG, LOTTERY_INDEPENDENT_CONFIG, hm_ys, lhc, getLotteryWuxing, convertToLunarText, getActiveYear };

// countdown-engine.js 倒计时

let globalTickerId = null;

export class LotteryCountdownEngine {
  constructor() {
    this.targetTimes = {};        
    this.lockPeriods = {};        
    this.notices = {};            
    this.isCompletedFlags = {};
    this.inJiaozhuFlags = {};  
    this.customTextFlags = {};    
    this.masterClockCallback = null;  

    this.initGlobalUnifiedTicker();
  }

  isValidLotteryNumber(num) {
    const n = parseInt(num, 10);
    return !isNaN(n) && n >= 1 && n <= 49;
  }

  isValidLotteryNumbers(numbers) {
    if (!Array.isArray(numbers) || numbers.length < 7) return false;
    const target7 = numbers.slice(0, 7);
    return target7.every(num => this.isValidLotteryNumber(num));
  }

  isJiaozhuInProgress(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) return false;
    const validCount = numbers.filter(num => this.isValidLotteryNumber(num)).length;
    return validCount > 0 && validCount < 7;
  }

  getCustomTextStatus(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) return null;
    
    let validChineseChars = [];
    for (let item of numbers) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (trimmed === '' || trimmed === '--') continue;

      if (this.isValidLotteryNumber(trimmed)) continue;

      if (/^[\u4e00-\u9fa5]+$/.test(trimmed)) {
        validChineseChars.push(trimmed);
      }
    }

    const combinedText = validChineseChars.join('');
    return combinedText.length > 0 ? combinedText : null;
  }

  setValueWithAnim(element, newValue) {
    if (!element) return;
    if (element.textContent !== String(newValue)) {
      element.textContent = newValue;
      element.classList.remove('pulse-animation');
      void element.offsetWidth; 
      element.classList.add('pulse-animation');
    }
  }

  registerMasterClock(callback) {
    this.masterClockCallback = callback;
  }

  setCountdown(lotteryId, lotteryGlobalName, endTimeTarget, currentPeriod, numbers, backendCustomNotice) {
    if (!lotteryId) return;

    const isCompleted = this.isValidLotteryNumbers(numbers); 
    const inJiaozhu = this.isJiaozhuInProgress(numbers);     
    const customTextStatus = this.getCustomTextStatus(numbers); 

    let targetMs = 0;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (!isCompleted) {
      let timePart = '21:30:00'; 
      if (endTimeTarget) {
        const strTarget = String(endTimeTarget);
        if (strTarget.includes('T')) {
          timePart = strTarget.split('T')[1];
        } else if (strTarget.includes(' ')) {
          timePart = strTarget.split(' ')[1];
        }
      }
      targetMs = new Date(`${todayStr}T${timePart}`).getTime();
    } else {
      if (/^\d+$/.test(String(endTimeTarget))) {
        targetMs = Number(endTimeTarget);
        if (targetMs < 1e12) targetMs *= 1000;
      } else if (endTimeTarget) {
        targetMs = new Date(String(endTimeTarget).replace(' ', 'T')).getTime();
      }
    }

    if (isNaN(targetMs) || targetMs <= 0) {
      targetMs = Date.now();
    }

    this.targetTimes[lotteryId] = targetMs;
    this.lockPeriods[lotteryId] = currentPeriod;
    this.isCompletedFlags[lotteryId] = isCompleted;
    this.inJiaozhuFlags[lotteryId] = inJiaozhu;
    this.customTextFlags[lotteryId] = customTextStatus; 

    let finalNotice = `${lotteryGlobalName || ''}最快看開獎`; 
    let safeCustomText = customTextStatus || '';
    if (safeCustomText.includes('最快澳門開獎網') || safeCustomText.includes('最快香港開獎網') || safeCustomText.includes('最快澳门开奖网') || safeCustomText.includes('最快香港开奖网') || (safeCustomText.length >= 7 && (safeCustomText.includes('開獎網') || safeCustomText.includes('开奖网')))) {
      safeCustomText = '';
    }
    let safeNotice = backendCustomNotice || '';
    if (safeNotice.includes('最快澳門開獎網') || safeNotice.includes('最快香港開獎網') || safeNotice.includes('最快澳门开奖网') || safeNotice.includes('最快香港开奖网')) {
      safeNotice = '';
    }

    if (inJiaozhu) {
      finalNotice = "正在進行攪珠中"; 
    } else if (safeCustomText) {
      finalNotice = safeCustomText; 
    } else if (isCompleted && safeNotice) {
      finalNotice = safeNotice; 
    }

    this.notices[lotteryId] = finalNotice;
    this.updateTick(lotteryId, finalNotice);
  }

  updateTick(lotteryId, noticeText) {
    const targetTime = this.targetTimes[lotteryId];
    if (!targetTime) return;

    const now = Date.now();
    const diff = Math.ceil((targetTime - now) / 1000);

    const djsEl = document.getElementById(`${lotteryId}_djs`);
    const noticeEl = document.getElementById(`${lotteryId}_notice`);

    if (!djsEl || !noticeEl) return; 

    const inJiaozhu = this.inJiaozhuFlags[lotteryId];

    if (diff > 0 && !inJiaozhu) {
      djsEl.style.display = 'flex';
      noticeEl.style.display = 'none';

      const days = Math.floor(diff / (3600 * 24));
      const hours = Math.floor((diff % (3600 * 24)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const daysEl = document.getElementById(`${lotteryId}_days`);
      const hoursEl = document.getElementById(`${lotteryId}_hours`);
      const minutesEl = document.getElementById(`${lotteryId}_minutes`);
      const secondsEl = document.getElementById(`${lotteryId}_seconds`);

      if (daysEl) this.setValueWithAnim(daysEl, String(days).padStart(2, '0'));
      if (hoursEl) this.setValueWithAnim(hoursEl, String(hours).padStart(2, '0'));
      if (minutesEl) this.setValueWithAnim(minutesEl, String(minutes).padStart(2, '0'));
      if (secondsEl) this.setValueWithAnim(secondsEl, String(seconds).padStart(2, '0'));
      
      if (diff > 5) {
        return;
      }
    } else {
      djsEl.style.display = 'none';
      noticeEl.style.display = 'flex';
      this.setValueWithAnim(noticeEl, noticeText);
    }

    if (typeof lotteryAjaxEngine !== 'undefined' && typeof lotteryAjaxEngine.ensureTimer === 'function') {
      lotteryAjaxEngine.ensureTimer(lotteryId, true);
    }
  }

  initGlobalUnifiedTicker() {
    if (globalTickerId !== null) {
      clearInterval(globalTickerId);
      globalTickerId = null;
    }

    globalTickerId = setInterval(() => {
      if (typeof this.masterClockCallback === 'function') {
        this.masterClockCallback();
      }

      Object.keys(this.targetTimes).forEach(lotteryId => {
        const targetTime = this.targetTimes[lotteryId];
        if (!targetTime) return;

        const noticeText = this.notices[lotteryId];
        this.updateTick(lotteryId, noticeText);
      });
    }, 1000);
  }

  stopAll() {
    this.targetTimes = {};
  }
}

export const countdownEngine = new LotteryCountdownEngine();

// gongju.js 统计与复式

import { YearWxTool } from './config.js';

export const COMMON_BUTTONS = [
  { name: "n_单", title: "01,03,05,07,09,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,", value: "单", className: "" },
  { name: "n_双", title: "02,04,06,08,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,", value: "双", className: "" },
  { name: "n_大", title: "25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,", value: "大", className: "" },
  { name: "n_小", title: "01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,", value: "小", className: "" },
  { name: "n_金", title: "", value: "金", className: "tongji-btn-gold" }, 
  { name: "n_木", title: "", value: "木", className: "tongji-btn-wood" }, 
  { name: "n_水", title: "", value: "水", className: "tongji-btn-water" }, 
  { name: "n_火", title: "", value: "火", className: "tongji-btn-fire" }, 
  { name: "n_土", title: "", value: "土", className: "tongji-btn-earth" }, 
  { name: "n_合单", title: "01,03,05,07,09,10,12,14,16,18,21,23,25,27,29,30,32,34,36,38,41,43,45,47,49,", value: "合单", className: "" },
  { name: "n_合双", title: "02,04,06,08,11,13,15,17,19,20,22,24,26,28,31,33,35,37,39,40,42,44,46,48,", value: "合双", className: "" },
  { name: "n_1段", title: "01,02,03,04,05,06,07,", value: "1段", className: "" },
  { name: "n_2段", title: "08,09,10,11,12,13,14,", value: "2段", className: "" },
  { name: "n_3段", title: "15,16,17,18,19,20,21,", value: "3段", className: "" },
  { name: "n_4段", title: "22,23,24,25,26,27,28,", value: "4段", className: "" },
  { name: "n_5段", title: "29,30,31,32,33,34,35,", value: "5段", className: "" },
  { name: "n_6段", title: "36,37,38,39,40,41,42,", value: "6段", className: "" },
  { name: "n_7段", title: "43,44,45,46,47,48,49,", value: "7段", className: "" },
  { name: "n_红肖", title: "鼠,兔,马,鸡,", value: "红肖", className: "tongji-txt-red" },
  { name: "n_蓝肖", title: "虎,蛇,猴,猪,", value: "蓝肖", className: "tongji-txt-blue" },
  { name: "n_绿肖", title: "牛,龙,羊,狗,", value: "绿肖", className: "tongji-txt-green" },
  { name: "n_单肖", title: "鼠,虎,龙,马,猴,狗,", value: "单肖", className: "" },
  { name: "n_双肖", title: "牛,兔,蛇,羊,鸡,猪,", value: "双肖", className: "" },
  { name: "n_家肖", title: "牛,马,羊,鸡,狗,猪,", value: "家肖", className: "" },
  { name: "n_野肖", title: "鼠,虎,兔,龙,蛇,猴,", value: "野肖", className: "" },
  { name: "n_琴", title: "兔,蛇,鸡,", value: "琴", className: "" },
  { name: "n_棋", title: "鼠,牛,狗,", value: "棋", className: "" },
  { name: "n_红波", title: "01,02,07,08,12,13,18,19,23,24,29,30,34,35,40,45,46,", value: "红波", className: "tongji-border-red tongji-span-v2 tongji-wave-btn" },
  { name: "n_蓝波", title: "03,04,09,10,14,15,20,25,26,31,36,37,41,42,47,48,", value: "蓝波", className: "tongji-border-blue tongji-span-v2 tongji-wave-btn" },
  { name: "n_绿波", title: "05,06,11,16,17,21,22,27,28,32,33,38,39,43,44,49,", value: "绿波", className: "tongji-border-green tongji-span-v2 tongji-wave-btn" },
  { name: "n_天肖", title: "牛,兔,龙,马,猴,猪,", value: "天肖", className: "" },
  { name: "n_地肖", title: "鼠,虎,蛇,羊,鸡,狗,", value: "地肖", className: "" },
  { name: "n_男肖", title: "鼠,牛,虎,龙,马,猴,狗,", value: "男肖", className: "" },
  { name: "n_女肖", title: "兔,蛇,羊,鸡,猪,", value: "女肖", className: "" },
  { name: "n_书", title: "虎,龙,马,", value: "书", className: "" },
  { name: "n_画", title: "羊,猴,猪,", value: "画", className: "" },
  { name: "n_红单", title: "01,07,13,19,23,29,35,45,", value: "红单", className: "tongji-border-red" },
  { name: "n_红双", title: "02,08,12,18,24,30,34,40,46,", value: "红双", className: "tongji-border-red" },
  { name: "n_蓝单", title: "03,09,15,25,31,37,41,47,", value: "蓝单", className: "tongji-border-blue" },
  { name: "n_蓝双", title: "04,10,14,20,26,36,42,48,", value: "蓝双", className: "tongji-border-blue" },
  { name: "n_绿单", title: "05,11,17,21,27,33,39,43,49,", value: "绿单", className: "tongji-border-green" },
  { name: "n_绿双", title: "06,16,22,28,32,38,44,", value: "绿双", className: "tongji-border-green" },
  { name: "n_鼠", title: "", value: "鼠", className: "" },
  { name: "n_牛", title: "", value: "牛", className: "" },
  { name: "n_虎", title: "", value: "虎", className: "" },
  { name: "n_兔", title: "", value: "兔", className: "" },
  { name: "n_0头", title: "01,02,03,04,05,06,07,08,09,", value: "0头", className: "" },
  { name: "n_1头", title: "10,11,12,13,14,15,16,17,18,19,", value: "1头", className: "" },
  { name: "n_2头", title: "20,21,22,23,24,25,26,27,28,29,", value: "2头", className: "" },
  { name: "n_3头", title: "30,31,32,33,34,35,36,37,38,39,", value: "3头", className: "" },
  { name: "n_4头", title: "40,41,42,43,44,45,46,47,48,49,", value: "4头", className: "" },
  { name: "n_龙", title: "", value: "龙", className: "" },
  { name: "n_蛇", title: "", value: "蛇", className: "" },
  { name: "n_马", title: "", value: "马", className: "" },
  { name: "n_羊", title: "", value: "羊", className: "" },
  { name: "n_0尾", title: "10,20,30,40,", value: "0尾", className: "" },
  { name: "n_1尾", title: "01,11,21,31,41,", value: "1尾", className: "" },
  { name: "n_2尾", title: "02,12,22,32,42,", value: "2尾", className: "" },
  { name: "n_3尾", title: "03,13,23,33,43,", value: "3尾", className: "" },
  { name: "n_4尾", title: "04,14,24,34,44,", value: "4尾", className: "" },
  { name: "n_猴", title: "", value: "猴", className: "" },
  { name: "n_鸡", title: "", value: "鸡", className: "" },
  { name: "n_狗", title: "", value: "狗", className: "" },
  { name: "n_猪", title: "", value: "猪", className: "" },
  { name: "n_5尾", title: "05,15,25,35,45,", value: "5尾", className: "" },
  { name: "n_6尾", title: "06,16,26,36,46,", value: "6尾", className: "" },
  { name: "n_7尾", title: "07,17,27,37,47,", value: "7尾", className: "" },
  { name: "n_8尾", title: "08,18,28,38,48,", value: "8尾", className: "" },
  { name: "n_9尾", title: "09,19,29,39,49,", value: "9尾", className: "" }
];

export const OTHER_BUTTONS = [
  { name: "n_1合", title: "01,10,", value: "1合", className: "" },
  { name: "n_2合", title: "02,11,20,", value: "2合", className: "" },
  { name: "n_3合", title: "03,12,21,30,", value: "3合", className: "" },
  { name: "n_4合", title: "04,13,22,31,40,", value: "4合", className: "" },
  { name: "n_5合", title: "05,14,23,32,41,", value: "5合", className: "" },
  { name: "n_合大", title: "07,08,09,16,17,18,19,25,26,27,28,29,34,35,36,37,38,39,43,44,45,46,47,48,49,", value: "合大", className: "" },
  { name: "n_尾大", title: "05,06,07,08,09,15,16,17,18,19,25,26,27,28,29,35,36,37,38,39,45,46,47,48,49,", value: "尾大", className: "" },
  { name: "n_大单", title: "25,27,29,31,33,35,37,39,41,43,45,47,49,", value: "大单", className: "" },
  { name: "n_大双", title: "26,28,30,32,34,36,38,40,42,44,46,48,", value: "大双", className: "" },
  { name: "n_6合", title: "06,15,24,33,42,", value: "6合", className: "" },
  { name: "n_7合", title: "07,16,25,34,43,", value: "7合", className: "" },
  { name: "n_8合", title: "08,17,26,35,44,", value: "8合", className: "" },
  { name: "n_9合", title: "09,18,27,36,45,", value: "9合", className: "" },
  { name: "n_10合", title: "19,28,37,46,", value: "10合", className: "" },
  { name: "n_合小", title: "01,02,03,04,05,06,10,11,12,13,14,15,20,21,22,23,24,30,31,32,33,40,41,42,", value: "合小", className: "" },
  { name: "n_尾小", title: "01,02,03,04,10,11,12,13,14,20,21,22,23,24,30,31,32,33,34,40,41,42,43,44,", value: "尾小", className: "" },
  { name: "n_小单", title: "01,03,05,07,09,11,13,15,17,19,21,23,", value: "小单", className: "" },
  { name: "n_小双", title: "02,04,06,08,10,12,14,16,18,20,22,24,", value: "小双", className: "" },
  { name: "n_11合", title: "29,38,47,", value: "11合", className: "" },
  { name: "n_12合", title: "39,48,", value: "12合", className: "" },
  { name: "n_13合", title: "49,", value: "13合", className: "" },
  { name: "n_日肖", title: "兔,龙,蛇,马,羊,猴,", value: "日肖", className: "" },
  { name: "n_夜肖", title: "鼠,牛,虎,鸡,狗,猪,", value: "夜肖", className: "" },
  { name: "n_左肖", title: "鼠,牛,龙,蛇,猴,鸡,", value: "左肖", className: "" },
  { name: "n_右肖", title: "虎,兔,马,羊,狗,猪,", value: "右肖", className: "" },
  { name: "n_美肖", title: "兔,龙,蛇,马,羊,鸡,", value: "美肖", className: "" },
  { name: "n_丑肖", title: "鼠,牛,虎,猴,狗,猪,", value: "丑肖", className: "" },
  { name: "n_金肖", title: "猴,鸡,", value: "金肖", className: "" },
  { name: "n_木肖", title: "虎,兔,", value: "木肖", className: "" },
  { name: "n_水肖", title: "鼠,猪,", value: "水肖", className: "" },
  { name: "n_火肖", title: "蛇,马,", value: "火肖", className: "" },
  { name: "n_土肖", title: "牛,龙,羊,狗,", value: "土肖", className: "" },
  { name: "n_阴肖", title: "鼠,龙,蛇,马,狗,猪,", value: "阴肖", className: "" },
  { name: "n_阳肖", title: "牛,虎,兔,羊,猴,鸡,", value: "阳肖", className: "" },
  { name: "n_吉肖", title: "兔,龙,蛇,马,羊,鸡,", value: "吉肖", className: "" },
  { name: "n_凶肖", title: "鼠,牛,虎,猴,狗,猪,", value: "凶肖", className: "" },
  { name: "n_0合尾", title: "19,28,37,46,", value: "0合尾", className: "" },
  { name: "n_1合尾", title: "01,10,29,38,47,", value: "1合尾", className: "" },
  { name: "n_2合尾", title: "02,11,20,39,48,", value: "2合尾", className: "" },
  { name: "n_3合尾", title: "03,12,21,30,49,", value: "3合尾", className: "" },
  { name: "n_4合尾", title: "04,13,22,31,40,", value: "4合尾", className: "" },
  { name: "n_春", title: "虎,兔,龙,", value: "春", className: "" },
  { name: "n_夏", title: "蛇,马,羊,", value: "夏", className: "" },
  { name: "n_胆大", title: "牛,虎,马,狗,猪,", value: "胆大", className: "" },
  { type: 'space' },
  { name: "n_5合尾", title: "05,14,23,32,41,", value: "5合尾", className: "" },
  { name: "n_6合尾", title: "06,15,24,33,42,", value: "6合尾", className: "" },
  { name: "n_7合尾", title: "07,16,25,34,43,", value: "7合尾", className: "" },
  { name: "n_8合尾", title: "08,17,26,35,44,", value: "8合尾", className: "" },
  { name: "n_9合尾", title: "09,18,27,36,45,", value: "9合尾", className: "" },
  { name: "n_秋", title: "猴,鸡,狗,", value: "秋", className: "" },
  { name: "n_冬", title: "鼠,牛,猪,", value: "冬", className: "" },
  { name: "n_胆小", title: "鼠,兔,龙,羊,鸡,", value: "胆小", className: "" },
  { type: 'space' },
  { name: "n_0头单", title: "01,03,05,07,09,", value: "0头单", className: "" },
  { name: "n_1头单", title: "11,13,15,17,19,", value: "1头单", className: "" },
  { name: "n_2头单", title: "21,23,25,27,29,", value: "2头单", className: "" },
  { name: "n_3头单", title: "31,33,35,37,39,", value: "3头单", className: "" },
  { name: "n_4头单", title: "41,43,45,47,49,", value: "4头单", className: "" },
  { name: "n_天", title: "鼠,兔,马,鸡,", value: "天", className: "" },
  { name: "n_地", title: "牛,龙,羊,狗,", value: "地", className: "" },
  { name: "n_人", title: "虎,蛇,猴,猪,", value: "人", className: "" },
  { type: 'space' },
  { name: "n_0头双", title: "02,04,06,08,", value: "0头双", className: "" },
  { name: "n_1头双", title: "10,12,14,16,18,", value: "1头双", className: "" },
  { name: "n_2头双", title: "20,22,24,26,28,", value: "2头双", className: "" },
  { name: "n_3头双", title: "30,32,34,36,38,", value: "3头双", className: "" },
  { name: "n_4头双", title: "40,42,44,46,48,", value: "4头双", className: "" },
  { type: 'space' }, { type: 'space' }, { type: 'space' }, { type: 'space' },
  { name: "n_1门", title: "01,02,03,04,05,06,07,08,09,", value: "1门", className: "" },
  { name: "n_2门", title: "10,11,12,13,14,15,16,17,18,", value: "2门", className: "" },
  { name: "n_3门", title: "19,20,21,22,23,24,25,26,27,", value: "3门", className: "" },
  { name: "n_4门", title: "28,29,30,31,32,33,34,35,36,37,", value: "4门", className: "" },
  { name: "n_5门", title: "38,39,40,41,42,43,44,45,46,47,48,49,", value: "5门", className: "" },
  { name: "n_东段", title: "31,32,33,34,35,36,37,38,39,40,41,42,", value: "东段", className: "" },
  { name: "n_西段", title: "07,08,09,10,11,12,13,14,15,16,17,18,", value: "西段", className: "" },
  { name: "n_南段", title: "19,20,21,22,23,24,25,26,27,28,29,30,", value: "南段", className: "" },
  { name: "n_北段", title: "01,02,03,04,05,06,43,44,45,46,47,48,49,", value: "北段", className: "" }
];

export function getNumbersByZodiac(zodiacName, targetYear = 2026) {
    const zodiacs = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    if (!zodiacs.includes(zodiacName)) return null;

    const yearNum = Number(targetYear);
    if (isNaN(yearNum)) return null; 
    const baseYear = 2026;
    const baseZodiacIndex = 6; 
    
    let currentYearZodiacIdx = (baseZodiacIndex + (yearNum - baseYear)) % 12;
    if (currentYearZodiacIdx < 0) currentYearZodiacIdx += 12;

    let assignedNumbers = [];

    for (let i = 1; i <= 49; i++) {
        let zIdx = (currentYearZodiacIdx - (i - 1)) % 12;
        if (zIdx < 0) zIdx += 12; 
        if (zodiacs[zIdx] === zodiacName) {
            let numStr = i < 10 ? "0" + i : "" + i;
            assignedNumbers.push(numStr);
        }
    }
    return assignedNumbers.join(",") + ",";
}

export function renderDynamicPanels() {
    const commonPanel = document.getElementById('panel-common');
    const otherPanel = document.getElementById('panel-other');
    if (!commonPanel || !otherPanel) return false;
    
    const zodiacs = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    const wuxings = ["金", "木", "水", "火", "土"]; 
    
    const dynamicCommonButtons = COMMON_BUTTONS.map(btn => {
        if (!btn.name) return btn;

        if (btn.name.startsWith('n_')) {
            const targetName = btn.name.replace('n_', '');

            if (zodiacs.includes(targetName)) {
                
                const yearMatch = YearWxTool("tj");
                if (yearMatch) {
                    const currentYear = Number(yearMatch);
                    const newTitle = getNumbersByZodiac(targetName, currentYear);
                    
                    if (newTitle) {
                        const has01 = newTitle.split(',').includes('01');
                        
                        const updatedClassName = has01 
                            ? (btn.className ? `${btn.className} tongji-txt-alert` : 'tongji-txt-alert')
                            : btn.className;

                        return { 
                            ...btn, 
                            title: newTitle,
                            className: updatedClassName
                        };
                    }
                }
            }
            if (wuxings.includes(targetName)) {
                const res = YearWxTool("tj", targetName); 
                if (res) {
                    return { ...btn, title: res }; 
                }
            }
        }
        return btn;
    });

    const buildButtonHTML = (btn) => {
        if (!btn) return '';
        if (btn.type === 'space') return `<div class="tongji-space"></div>`;
        return `<input type="button" class="tongji-btn ${btn.className || ''}" name="${btn.name || ''}" title="${btn.title || ''}" value="${btn.value || ''}">`;
    };

    commonPanel.innerHTML = dynamicCommonButtons.map(buildButtonHTML).join('');
    otherPanel.innerHTML = OTHER_BUTTONS.map(buildButtonHTML).join('');
    return true;
}

export function ToCDB(str0) {
    if (!str0) return "";
    var str = str0.replace(/[a-zA-Z\.\s\-、　。，；,':：()【】{}[\]〖〗＝=（）\r\n\t]{1,}/g, ",");
    var tmp = "";
    for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        if (code > 65248 && code < 65375) {
            tmp += String.fromCharCode(code - 65248);
        } else {
            tmp += String.fromCharCode(code);
        }
    }
    return tmp;
}

export function unique(t) {
    t = t || [];
    for (var n = {}, r = 0; r < t.length; r++) {
        var e = t[r];
        void 0 === n[e] && (n[e] = 1);
    }
    for (r in t.length = 0, n) t[t.length] = r;
    return t;
}

export function compareNumbers(t, n) {
    return t - n;
}

export function tongji(t) {
    for (var n = t.split(","), r = new Array(50), e = 0; e < r.length; e++) r[e] = 0;
    for (e = 0; e < n.length; e++) r[parseInt(n[e], 10)] += 1;
    for (var o = new Array(), e = 1; e <= 49; e++) o.push(r[e]);
    (o = unique(o)).sort(compareNumbers);
    for (var u = 0, a = "【期】统计结果：", e = 0; e < o.length; e++) {
        for (var f = o[e], l = "\n〖" + f + "次〗", i = 0, m = 1; m <= 49; m++) r[m] == f && (i += 1, m < 10 && (m = "0" + m), l += m + ",");
        a += l += "（" + i + "个）", u += +i * f;
    }
    return (a += "") + "\n〖总" + u + "个〗";
}

export const lianstr = "红绿蓝兰金木水火土鼠牛虎兔龙蛇马羊猴鸡狗猪大小单双";

export function countma() {
    const inputEl = document.getElementById('tongji-input-area');
    const resultEl = document.getElementById('tongji-result-area');
    if (!inputEl || !resultEl) return;
    
    var t = document.form.inputtxt.value;
    if (0 < t.length) {
        var n = "",
            r = (t = ToCDB(t += ",")).match(/\d{1,}\b[^次码个头尾合门段余]/g);
        if (null != r) {
            var e = (r.join(",") + ",").match(/\d{1,}/g);
            if (null != e) {
                for (var o = 0; o < e.length; o++) {
                    var u = "n_" + e[o];
                    if (u in document.form2) {
                        var val = document.form2[u].title;
                        if (val) n += (n ? "," : "") + val;
                    }
                }
            }
        }
        t = t.split(",");
        for (var u, o = 0; o < t.length; o++) {
            u = "n_" + t[o];
            if (u in document.form) {
                var val = document.form[u].title;
                if (val) n += (n ? "," : "") + val;
            } else {
                for (var a = 2; a < u.length; a++) {
                    var f = u.charAt(a);
                    if (-1 != lianstr.indexOf(f)) {
                        var val = document.form["n_" + f].title;
                        if (val) n += (n ? "," : "") + val;
                    }
                }
            }
        }
        var cleanArr = n.split(",").filter(item => item.trim() !== "");
        n = cleanArr.join(",") + (cleanArr.length > 0 ? "," : "");
        document.form.resultstxt.value = tongji(n);
    }
     tongjiAutoResizeTextarea(resultEl);
}

export function countstyle(t) {
    const inputEl = document.getElementById('tongji-input-area');
    const resultEl = document.getElementById('tongji-result-area');
    if (!inputEl || !resultEl) return;
    
    var n = t.split(","),
        r = document.form.inputtxt.value;
    if (0 < r.length) {
        for (var e = (r = ToCDB(r + ",")).split(","), o = new Array(), u = 0; u < e.length; u++) {
            var a = "n_" + e[u];
            if (a in document.form) {
                o.push(e[u]);
            } else {
                for (var f = 2; f < a.length; f++) {
                    var l = a.charAt(f);
                    if (-1 != lianstr.indexOf(l)) o.push(l);
                }
            }
        }
        for (var i = new Array(n.length), u = 0; u < n.length; u++) i[u] = 0;
        for (f = 0; f < o.length; f++) {
            if (-1 != t.indexOf(o[f])) {
                for (u = 0; u < n.length; u++) {
                    var m = n[u],
                        c = o[f];
                    if (1 == c.length && -1 != "红绿蓝".indexOf(c)) c += "波";
                    if (m == c) {
                        i[u] += 1;
                        break;
                    }
                }
            }
        }
        for (var h = new Array(), u = 0; u < n.length; u++) h.push(i[u]);
        (h = unique(h)).sort(compareNumbers);
        for (var v = 0, s = "【期】统计结果：", u = 0; u < h.length; u++) {
            for (var g = h[u], d = "\n〖" + g + "次〗", p = 0, f = 0; f < n.length; f++) {
                if (i[f] == g) {
                    p += 1;
                    d += n[f] + ",";
                }
            }
            s += (d + "（" + p + "个）");
            v += (+p * g);
        }
        document.form.resultstxt.value = s + "\n〖总" + v + "个〗";
    }
    tongjiAutoResizeTextarea(resultEl);
}

export function cunma() {
    const inputEl = document.getElementById('tongjizc-input-area');
    const resultEl = document.getElementById('tongji-result-area');
    if (!inputEl || !resultEl) return;
    
    var t = document.form.zancuntxt.value;
    if (0 < t.length) {
        var n = "",
            r = (t = ToCDB(t += ",")).match(/\d{1,}\b[^次码个头尾合门段余]/g);
        if (null != r) {
            var e = (r.join(",") + ",").match(/\d{1,}/g);
            if (null != e) {
                for (var o = 0; o < e.length; o++) {
                    var u = "n_" + e[o];
                    if (u in document.form2) {
                        var val = document.form2[u].title;
                        if (val) n += (n ? "," : "") + val;
                    }
                }
            }
        }
        t = t.split(",");
        for (var u, o = 0; o < t.length; o++) {
            u = "n_" + t[o];
            if (u in document.form) {
                var val = document.form[u].title;
                if (val) n += (n ? "," : "") + val;
            } else {
                for (var a = 2; a < u.length; a++) {
                    var f = u.charAt(a);
                    if (-1 != lianstr.indexOf(f)) {
                        var val = document.form["n_" + f].title;
                        if (val) n += (n ? "," : "") + val;
                    }
                }
            }
        }
        var cleanArr = n.split(",").filter(item => item.trim() !== "");
        n = cleanArr.join(",") + (cleanArr.length > 0 ? "," : "");
        document.form.resultstxt.value = tongji(n);
    }
    tongjiAutoResizeTextarea(resultEl);
}

export function cunqt(t) {
    const inputEl = document.getElementById('tongjizc-input-area');
    const resultEl = document.getElementById('tongji-result-area');
    if (!inputEl || !resultEl) return;
    var n = t.split(","),
        r = document.form.zancuntxt.value;
    if (0 < r.length) {
        for (var e = (r = ToCDB(r + ",")).split(","), o = new Array(), u = 0; u < e.length; u++) {
            var a = "n_" + e[u];
            if (a in document.form) {
                o.push(e[u]);
            } else {
                for (var f = 2; f < a.length; f++) {
                    var l = a.charAt(f);
                    if (-1 != lianstr.indexOf(l)) o.push(l);
                }
            }
        }
        for (var i = new Array(n.length), u = 0; u < n.length; u++) i[u] = 0;
        for (f = 0; f < o.length; f++) {
            if (-1 != t.indexOf(o[f])) {
                for (u = 0; u < n.length; u++) {
                    var m = n[u],
                        c = o[f];
                    if (1 == c.length && -1 != "红绿蓝".indexOf(c)) c += "波";
                    if (m == c) {
                        i[u] += 1;
                        break;
                    }
                }
            }
        }
        for (var h = new Array(), u = 0; u < n.length; u++) h.push(i[u]);
        (h = unique(h)).sort(compareNumbers);
        for (var v = 0, s = "【期】统计结果：", u = 0; u < h.length; u++) {
            for (var g = h[u], d = "\n〖" + g + "次〗", p = 0, f = 0; f < n.length; f++) {
                if (i[f] == g) {
                    p += 1;
                    d += n[f] + ",";
                }
            }
            s += (d + "（" + p + "个）");
            v += (+p * g);
        }
        document.form.resultstxt.value = s + "\n〖总" + v + "个〗";
    }
    tongjiAutoResizeTextarea(resultEl);
}

export function initTongjiEvents() {
  const checkInterval = setTimeout(() => {
    if (renderDynamicPanels()) {
      clearTimeout(checkInterval);
    }
  }, 200);

  const tongjiToastNode = document.getElementById('tongji-global-toast');
  let tongjiToastTimer = null;

  function tongjiShowToast(message) {
      if (!tongjiToastNode) return;
      tongjiToastNode.innerText = message;
      tongjiToastNode.classList.add('tongji-show');
      if (tongjiToastTimer) clearTimeout(tongjiToastTimer);
      tongjiToastTimer = setTimeout(() => {
          tongjiToastNode.classList.remove('tongji-show');
      }, 1000);
  }

  function tongjiAutoResizeTextarea(textarea) {
      if (!textarea) return;
      textarea.style.height = 'auto';
      let scrollH = textarea.scrollHeight;
      if (scrollH > 0) {
          textarea.style.setProperty('height', scrollH + 'px', 'important');
      }
  }
  window.tongjiAutoResizeTextarea = tongjiAutoResizeTextarea;

    const inputAreas = [
        document.getElementById('tongji-input-area'),
        document.getElementById('tongjizc-input-area')
    ];

    inputAreas.forEach(textarea => {
        if (!textarea) return;
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

  document.body.addEventListener('click', (e) => {
      const button = e.target.closest('input[type="button"], button');
      if (!button) return;
      if (button.closest('#fushiToolPanel')) return;

      const id = button.id;
      if (id === 'tab-common') {
          e.preventDefault();
          const tabOther = document.getElementById('tab-other');
          const tongjiSlider = document.querySelector('.tongji-tabs-slider');
          const pCommon = document.getElementById('panel-common');
          const pOther = document.getElementById('panel-other');

          button.classList.add('tongji-active');
          if (tabOther) tabOther.classList.remove('tongji-active');
          if (tongjiSlider) tongjiSlider.style.transform = 'translateX(0)';
          if (pOther) pOther.classList.add('tongji-hidden');
          if (pCommon) pCommon.classList.remove('tongji-hidden');
          return;
      }

      if (id === 'tab-other') {
          e.preventDefault();
          const tabCommon = document.getElementById('tab-common');
          const tongjiSlider = document.querySelector('.tongji-tabs-slider');
          const pCommon = document.getElementById('panel-common');
          const pOther = document.getElementById('panel-other');

          button.classList.add('tongji-active');
          if (tabCommon) tabCommon.classList.remove('tongji-active');
          if (tongjiSlider) tongjiSlider.style.transform = 'translateX(100%)';
          if (pCommon) pCommon.classList.add('tongji-hidden');
          if (pOther) pOther.classList.remove('tongji-hidden');
          return;
      }

      const panelCommon = document.getElementById('panel-common');
      const panelOther = document.getElementById('panel-other');
      const tongjiInputArea = document.getElementById('tongji-input-area');

      if (tongjiInputArea && panelCommon && panelOther && (panelCommon.contains(button) || panelOther.contains(button))) {
          e.preventDefault(); 
          const numReg = /^[0-9\s,，]+$/;
          const buttonTitle = (button?.title || "").trim();
          const buttonValue = (button?.value || "").trim();
          const text = numReg.test(buttonTitle) ? buttonValue : `【${buttonValue}】${buttonTitle}`;

          if (tongjiInputArea.value.length > 0) {
              tongjiInputArea.value += "," + text;
          } else {
              tongjiInputArea.value += text;
          }
          if (typeof countma === 'function') countma();                
          tongjiAutoResizeTextarea(tongjiInputArea);
          return;
      }

      if (!id) return;
      const tongjiResultArea = document.getElementById('tongji-result-area');
      const tongjizcInputArea = document.getElementById('tongjizc-input-area');

      if (id === 'tongji-clear-input' && tongjiInputArea) {
          e.preventDefault();
          tongjiInputArea.value = '';
          tongjiAutoResizeTextarea(tongjiInputArea);
          tongjiShowToast('输入内容已清空');
      } else if (id === 'tongji-copy-input' && tongjiInputArea) {
          e.preventDefault();
          if(tongjiInputArea.value.length === 0) { tongjiShowToast('无输入内容可复制'); return; }
          tongjiInputArea.select();
          document.execCommand('copy');
          tongjiShowToast('输入数据已复制到剪贴板');
      } else if (id === 'tongji-clear-result' && tongjiResultArea) {
          e.preventDefault();
          tongjiResultArea.value = '';
          tongjiAutoResizeTextarea(tongjiResultArea);
          tongjiShowToast('统计结果已清空');
      } else if (id === 'tongji-save-result') {
          e.preventDefault(); 
          const tongjizcTargetArea = document.getElementById('tongji-zc');
          if (tongjizcTargetArea) {
              if (tongjizcTargetArea.classList.contains('tongji-hidden')) {
                  tongjizcTargetArea.classList.remove('tongji-hidden');
                  const zcTextarea = document.getElementById('tongjizc-input-area');
                  if (zcTextarea) tongjiAutoResizeTextarea(zcTextarea);
                  tongjiShowToast('已顯示暫存面板');
              } else {
                  tongjizcTargetArea.classList.add('tongji-hidden');
                  tongjiShowToast('已隱藏暫存面板');
              }
          }
      } else if (id === 'tongjizc-clear-input' && tongjizcInputArea) {
          e.preventDefault();
          tongjizcInputArea.value = '';
          tongjiAutoResizeTextarea(tongjizcInputArea);
          tongjiShowToast('暂存内容已清空');
      } else if (id === 'tongjizc-copy-input' && tongjizcInputArea) {
          e.preventDefault();
          if(tongjizcInputArea.value.length === 0) { tongjiShowToast('无暂存内容可复制'); return; }
          tongjizcInputArea.select();
          document.execCommand('copy');
          tongjiShowToast('暂存数据已复制到剪贴板');
      } else if (id === 'tongji-edit-result' && tongjiResultArea) {
          e.preventDefault();
          if (tongjiResultArea.readOnly) {
              tongjiResultArea.readOnly = false;
              button.value = "锁定";
              button.style.borderColor = "#f87171";
              button.style.color = "#f87171";
              tongjiResultArea.style.borderColor = "#38bdf8";
              tongjiAutoResizeTextarea(tongjiResultArea); 
              tongjiShowToast('结果框已解锁，可自由编辑');
          } else {
              tongjiResultArea.readOnly = true;
              button.value = "编辑";
              button.style.borderColor = "rgba(56, 189, 248, 0.4)";
              button.style.color = "#38bdf8";
              tongjiResultArea.style.borderColor = "#222d3d";
              tongjiShowToast('编辑内容已物理锁定');
          }
      } else if (id === 'tongji-copy-result' && tongjiResultArea) {
          e.preventDefault();
          if(tongjiResultArea.value.length === 0) { tongjiShowToast('当前无结果可复制'); return; }
          tongjiResultArea.select();
          document.execCommand('copy');
          tongjiShowToast('分析结果已复制成功');
      }
  });
}

// 复式
export class FushiModule {
  constructor() {
    this.currentPlainTextResult = "";
    this.currentActiveSelectId = null;
    this.tempSelectedObj = null;
    this.isInitialized = false;
  }

  initFushiEvents() {
    var self = this;
    if (self.isInitialized) return;
    var container = document.getElementById('fushiToolPanel');
    if (!container) return;

    self.renderBalls();
    self.renderZodiacs();

    container.querySelectorAll('.fs_ball, .fs_zodiac-item').forEach(function(item) {
      item.addEventListener('click', function() {
        this.classList.toggle('active');
        self.updateBottomStats();
      });
    });

    self.isInitialized = true;
  }

  initDelegationEvents() {
    var self = this;
    var fushiPanel = document.getElementById('fushiToolPanel');
    if (!fushiPanel) return;

    self.initFushiEvents();

    fushiPanel.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');
      var subTarget = target.getAttribute('data-target');
      var tab = target.getAttribute('data-tab');

      if (action === 'openSelectModal' && subTarget) {
        self.openSelectModal(subTarget);
      } else if (action === 'calculateTopMode') {
        self.calculateTopMode();
      } else if (action === 'switchTab' && tab) {
        self.switchTab(tab, e);
      } else if (action === 'clearConditions') {
        self.clearConditions();
      } else if (action === 'calculateBottomMode') {
        self.calculateBottomMode();
      } else if (action === 'closeModalMask') {
        self.closeSelectModalMask(e);
      } else if (action === 'closeSelectModal') {
        self.closeSelectModal();
      } else if (action === 'confirmSelectModal') {
        self.confirmSelectModal();
      } else if (action === 'closeTipModal') {
        self.closeTipModal();
      } else if (action === 'copyResultContent') {
        self.copyResultContent();
      } else if (action === 'closeResultModal') {
        self.closeResultModal();
      }
    });
  }

  renderBalls() {
    var container = document.getElementById('fs_ballsGridContainer');
    if (!container) return;
    container.innerHTML = '';
    var redList = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
    var blueList = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];

    for (var i = 1; i <= 49; i++) {
      var numStr = i < 10 ? '0' + i : '' + i;
      var colorClass = 'green';
      if (redList.includes(i)) colorClass = 'red';
      else if (blueList.includes(i)) colorClass = 'blue';

      var ball = document.createElement('div');
      ball.className = `fs_ball ${colorClass}`;
      ball.innerText = numStr;
      container.appendChild(ball);
    }
  }

  renderZodiacs() {
    var container = document.getElementById('fs_zodiacGridContainer');
    if (!container) return;
    container.innerHTML = '';
    ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'].forEach(function(z) {
      var item = document.createElement('div');
      item.className = 'fs_zodiac-item';
      item.innerText = z;
      container.appendChild(item);
    });
  }

  padZero(val) {
    var num = parseInt(val, 10);
    return (!isNaN(num) && num > 0 && num < 10) ? '0' + num : val;
  }

  combination(n, m) {
    if (m < 0 || m > n) return 0;
    if (m === 0 || m === n) return 1;
    if (m > n / 2) m = n - m;
    var c = 1;
    for (var i = 1; i <= m; i++) c = c * (n - (m - i)) / i;
    return Math.round(c);
  }

  getCombinations(arr, m) {
    var result = [];
    function backtrack(start, current) {
      if (current.length === m) { result.push([...current]); return; }
      for (var i = start; i < arr.length; i++) {
        current.push(arr[i]);
        backtrack(i + 1, current);
        current.pop();
      }
    }
    backtrack(0, []);
    return result;
  }

  getGroupItemsConfig() {
    var items = [];
    for (var i = 2; i <= 6; i++) items.push({ text: `每组${i}个`, val: i });
    return items;
  }

  getSelectDataSources() {
    var cfg = this.getGroupItemsConfig();
    return {
      'fs_select-calc-mode': { title: '选择每组个数', items: cfg },
      'fs_select-num-group': { title: '选择每组个数', items: cfg },
      'fs_select-zodiac-group': { title: '选择每组个数', items: cfg }
    };
  }

  openSelectModal(id) {
    var self = this;
    self.currentActiveSelectId = id;
    var config = self.getSelectDataSources()[id];
    if (!config) return;

    var titleEl = document.getElementById('fs_modalTitle');
    if (titleEl) titleEl.innerText = config.title;

    var targetEl = document.getElementById(id);
    var currentVal = targetEl ? (parseInt(targetEl.getAttribute('data-val'), 10) || 2) : 2;
    self.tempSelectedObj = config.items.find(i => i.val === currentVal) || config.items[0];

    var container = document.getElementById('fs_modalOptionsContainer');
    if (!container) return;
    container.innerHTML = '';

    config.items.forEach(itemData => {
      var item = document.createElement('div');
      item.className = 'fs_modal-option-item';
      if (itemData.val === self.tempSelectedObj.val) item.classList.add('active');
      item.innerText = itemData.text;
      item.onclick = function() {
        container.querySelectorAll('.fs_modal-option-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        self.tempSelectedObj = itemData;
      };
      container.appendChild(item);
    });

    var mask = document.getElementById('fs_globalModalMask');
    if (mask) mask.classList.add('open');
  }

  confirmSelectModal() {
    var self = this;
    if (self.currentActiveSelectId && self.tempSelectedObj) {
      var target = document.getElementById(self.currentActiveSelectId);
      if (target) {
        target.setAttribute('data-val', self.tempSelectedObj.val);
        var textSpan = target.querySelector('.fs_select-value-text');
        if (textSpan) textSpan.innerText = self.tempSelectedObj.text;
      }
    }
    self.closeSelectModal();
  }

  closeSelectModal() {
    var mask = document.getElementById('fs_globalModalMask');
    if (mask) mask.classList.remove('open');
    this.currentActiveSelectId = null;
    this.tempSelectedObj = null;
  }

  closeSelectModalMask(event) {
    if (event.target && event.target.id === 'fs_globalModalMask') this.closeSelectModal();
  }

  switchTab(type, event) {
    var container = document.getElementById('fushiToolPanel');
    if (!container) return;
    container.querySelectorAll('.fs_tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.fs_tab-panel').forEach(panel => panel.classList.remove('active'));

    var currentBtn = container.querySelector(`.fs_tab-btn[data-tab="${type}"]`);
    if (currentBtn) currentBtn.classList.add('active');

    var targetPanel = document.getElementById(`fs_panel-${type}`);
    if (targetPanel) targetPanel.classList.add('active');
    this.updateBottomStats();
  }

  calculateTopMode() {
    var inputEl = document.getElementById('fs_topInputCount');
    if (!inputEl) return;
    var inputValStr = inputEl.value.trim();
    var modeEl = document.getElementById('fs_select-calc-mode');
    var m = modeEl ? (parseInt(modeEl.getAttribute('data-val'), 10) || 2) : 2;
    var resultSpan = document.getElementById('fs_topResultCount');

    if (inputValStr === "") {
      if (resultSpan) resultSpan.innerText = '0';
      this.showTipModal('温馨提示', '请输入要计算的号码数量！');
      return;
    }
    var inputVal = parseInt(inputValStr, 10);
    if (isNaN(inputVal) || inputVal <= 0) {
      if (resultSpan) resultSpan.innerText = '0';
      this.showTipModal('温馨提示', '请输入有效的正整数号码数量！');
      return;
    }
    if (inputVal < m || inputVal > 49) {
      if (resultSpan) resultSpan.innerText = '0';
      this.showTipModal('温馨提示', `号码数量（${inputVal}）不能少于每组个数（${m}个），且最大不超过49`);
      return;
    }
    var total = this.combination(inputVal, m);
    if (resultSpan) resultSpan.innerText = total;
  }

  updateBottomStats() {
    var activePanel = document.querySelector('#fushiToolPanel .fs_tab-panel.active');
    if (!activePanel) return;
    if (activePanel.id === 'fs_panel-number') {
      var selectedCount = activePanel.querySelectorAll('.fs_ball.active').length;
      var textEl = document.getElementById('fs_numStatusText');
      if (textEl) textEl.innerText = `已选择 ${selectedCount} 个号码`;
    } else {
      var selectedCount = activePanel.querySelectorAll('.fs_zodiac-item.active').length;
      var textEl = document.getElementById('fs_zodiacStatusText');
      if (textEl) textEl.innerText = `已选择 ${selectedCount} 个生肖`;
    }
  }

  calculateBottomMode() {
    var activePanel = document.querySelector('#fushiToolPanel .fs_tab-panel.active');
    if (!activePanel) return;
    var activeTab = activePanel.id;
    var selectedItems = [], m = 2;

    if (activeTab === 'fs_panel-number') {
      activePanel.querySelectorAll('.fs_ball.active').forEach(ball => selectedItems.push(ball.innerText));
      var groupEl = document.getElementById('fs_select-num-group');
      m = groupEl ? (parseInt(groupEl.getAttribute('data-val'), 10) || 2) : 2;
    } else {
      activePanel.querySelectorAll('.fs_zodiac-item.active').forEach(zodiac => selectedItems.push(zodiac.innerText));
      var groupEl = document.getElementById('fs_select-zodiac-group');
      m = groupEl ? (parseInt(groupEl.getAttribute('data-val'), 10) || 2) : 2;
    }

    var n = selectedItems.length;
    if (n < m) {
      this.showTipModal('温馨提示', `当前选择数量（${n}个）少于每组个数（${m}个），无法生成复式！`);
      return;
    }
    var combos = this.getCombinations(selectedItems, m);
    var total = combos.length;
    if (total > 10000) {
      this.showTipModal('计算提示', `当前生成的组合过多（共 ${total} 组），为防止浏览器卡死，请减少勾选数量！`);
      return;
    }

    var analysisHtml = `<strong>中奖分析（每组${m}个）：</strong><div class="fs_analysis-grid">`;
    var analysisPlain = "";
    for (var k = m; k <= n; k++) {
      var winCount = this.combination(k, m);
      analysisHtml += `<div class="fs_analysis-item">若中 ${this.padZero(k)} 个号可中 ${this.padZero(winCount)}组;</div>`;
      analysisPlain += `若中 ${this.padZero(k)} 个号可中 ${this.padZero(winCount)}组; `;
    }
    analysisHtml += `</div>`;

    var gridHtml = "", plainTextLines = [];
    combos.forEach(c => {
      var comboStr = `【${c.join('-')}】`;
      gridHtml += `<div class="fs_combo-item">${comboStr}</div>`;
      plainTextLines.push(comboStr);
    });

    this.currentPlainTextResult = `已选 ${n} 个选项，每组 ${m} 个，共 ${total} 注\n` + analysisPlain + `\n------------------\n` + plainTextLines.join(' ');
    this.showResultModal(`生成复式组合明细 (共 ${total} 注)`, analysisHtml, gridHtml);
  }

  showTipModal(title, text) {
    var titleEl = document.getElementById('fs_tipTitle');
    var textEl = document.getElementById('fs_tipText');
    var mask = document.getElementById('fs_tipMask');
    if (titleEl) titleEl.innerText = title;
    if (textEl) textEl.innerText = text;
    if (mask) mask.classList.add('open');
  }

  closeTipModal() {
    var mask = document.getElementById('fs_tipMask');
    if (mask) mask.classList.remove('open');
  }

  showResultModal(title, analysisHtml, gridHtml) {
    var titleEl = document.getElementById('fs_resultTitle');
    var analysisBox = document.getElementById('fs_analysisBox');
    var gridBox = document.getElementById('fs_resultGridBox');
    var mask = document.getElementById('fs_resultMask');
    if (titleEl) titleEl.innerText = title;
    if (analysisBox) analysisBox.innerHTML = analysisHtml;
    if (gridBox) gridBox.innerHTML = gridHtml;
    if (mask) mask.classList.add('open');
  }

  closeResultModal() {
    var mask = document.getElementById('fs_resultMask');
    if (mask) mask.classList.remove('open');
  }

  copyResultContent() {
    var self = this;
    if (!self.currentPlainTextResult) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(self.currentPlainTextResult).then(() => self.showTipModal('成功', '复制成功！')).catch(() => self.fallbackCopyText(self.currentPlainTextResult));
    } else {
      self.fallbackCopyText(self.currentPlainTextResult);
    }
  }

  fallbackCopyText(text) {
    var self = this;
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      var successful = document.execCommand('copy');
      self.showTipModal('成功', successful ? '复制成功！' : '复制失败，请手动复制。');
    } catch (err) {
      self.showTipModal('提示', '复制失败，请手动复制。');
    }
    document.body.removeChild(textarea);
  }

  clearConditions() {
    var container = document.getElementById('fushiToolPanel');
    if (!container) return;
    container.querySelectorAll('.fs_ball.active, .fs_zodiac-item.active').forEach(el => el.classList.remove('active'));
    this.updateBottomStats();
  }
}

// renderers.js 直播與記錄渲染插件

import { hm_ys, lhc, YearWxTool } from './config.js';

function commonLiveRenderer(standardData) {
  if (!standardData || !standardData.lotteryType) return;
  var prefix = standardData.lotteryType;
  var periodEl = document.getElementById(prefix + '_q');
  if (periodEl) periodEl.textContent = standardData.period || '------';

  var nextPeriodEl = document.getElementById(prefix + '_nextq');
  if (nextPeriodEl) nextPeriodEl.textContent = standardData.nextPeriod || '------';

  var nextDateEl = document.getElementById(prefix + '_nextsj');
  if (nextDateEl) nextDateEl.textContent = standardData.nextDate || '------';

  var numbers = standardData.numbers || [];
  var zodiacs = standardData.zodiacs || [];

  for (var i = 1; i <= 7; i++) {
    var kjContainer = document.getElementById(prefix + '_kj' + i);
    var numSpan = document.getElementById(prefix + '_m' + i);
    var zodiacSpan = document.getElementById(prefix + '_w' + i);

    var currentVal = numbers[i - 1];
    var currentZodiac = zodiacs[i - 1] || "";
    var numVal = parseInt(currentVal, 10);
    var isValidNumber = !isNaN(numVal) && numVal >= 1 && numVal <= 49;

    if (kjContainer && numSpan && zodiacSpan) {
      if (isValidNumber) {
        kjContainer.className = hm_ys(numVal);
        numSpan.textContent = String(numVal).padStart(2, '0');
        zodiacSpan.textContent = currentZodiac;
      } else {
        var prevVal = i > 1 ? numbers[i - 2] : "01";
        var prevNumVal = parseInt(prevVal, 10);
        var prevIsValid = !isNaN(prevNumVal) && prevNumVal >= 1 && prevNumVal <= 49;

        if (i === 1 || prevIsValid) {
          kjContainer.className = "item-top-box circle-style kjbjd";
        } else {
          kjContainer.className = "item-top-box circle-style kjbj kjbjopacity";
        }

        numSpan.textContent = "";
        zodiacSpan.textContent = "";
      }
    }
  }
}

// 1. 動態渲染年份標籤列
function renderYearTabs(startYear, currentSelectedYear, isExpanded) {
  var yearListContainer = document.querySelector('.lottery-list');
  if (!yearListContainer) return;

  var nowYear = new Date().getFullYear();
  var sYear = startYear || 1924;
  var targetSelected = currentSelectedYear || nowYear;

  var allYears = [];
  for (var y = nowYear; y >= sYear; y--) {
    allYears.push(y);
  }

  var totalCount = allYears.length;
  var threshold = (totalCount >= 12) ? 11 : 5;

  var displayedYears = isExpanded ? allYears : allYears.slice(0, threshold);

  if (!isExpanded && targetSelected && !displayedYears.includes(targetSelected)) {
    displayedYears.push(targetSelected);
  }

  var yearHtmls = displayedYears.map(function (yr) {
    var isActive = (yr === targetSelected) ? 'active' : '';
    return `<li class="lottery-item ${isActive}" data-year="${yr}">${yr}</li>`;
  });

  if (totalCount > threshold) {
    var toggleText = isExpanded ? "收起" : "更多";
    yearHtmls.push(`<li class="lottery-item year-toggle-btn" id="yearToggleBtn" style="color:#e6a23c;font-weight:bold;cursor:pointer;">${toggleText}</li>`);
  }

  yearListContainer.innerHTML = yearHtmls.join('');
}

// 2. 分頁增量渲染歷史開獎記錄
function renderHistoryBatch(listData, startIndex, batchSize, isAppend) {
  var listContainer = document.querySelector('.lottery_open');
  if (!listContainer) return;

  if (!Array.isArray(listData) || listData.length === 0) {
    listContainer.innerHTML = '<div class="empty-tip"><div class="jz-reload-container-v2" style="cursor: pointer; text-align: center; padding: 10px 20px 30px;" id="jz-reload-container-v2"><span class="jz-reload-tag-v2"><span class="jz-status-dot"></span>暂无歷史記錄</span></div></div>';
    return;
  }

  var rawSliced = listData.slice(startIndex, startIndex + batchSize);

  var slicedData = rawSliced.map(function(row) {
    return {
      period: row.period,
      date: row.date,
      year: row.year,
      lotteryType: row.lotteryType,
      numbers: row.numbers ? [...row.numbers] : [],
      zodiacs: row.zodiacs ? [...row.zodiacs] : [],
      wuxing: row.wuxing ? [...row.wuxing] : []
    };
  });

  var htmlBuffer = [];

  slicedData.forEach(function (row) {
    var rawNums = row.numbers || [];
    var rawZodiacs = row.zodiacs || [];
    var rawWuxing = row.wuxing || [];
    var rowYear = row.year || new Date().getFullYear();
    var rowLotteryType = row.lotteryType || 'hk';

    var front6Tuples = [];
    for (var i = 0; i < 6; i++) {
      var nStr = rawNums[i] || "-";
      var zStr = rawZodiacs[i] || (nStr !== "-" ? lhc.getZodiac(rowYear, nStr, rowLotteryType, i, 0) : "");
      var wStr = rawWuxing[i] || (nStr !== "-" ? YearWxTool(rowLotteryType, nStr) : "");

      front6Tuples.push({
        num: nStr,
        zodiac: zStr,
        wuxing: wStr
      });
    }

    var specNumStr = rawNums[6] || "-";
    var specZodiacStr = rawZodiacs[6] || (specNumStr !== "-" ? lhc.getZodiac(rowYear, specNumStr, rowLotteryType, 6, 0) : "");
    var specWuxingStr = rawWuxing[6] || (specNumStr !== "-" ? YearWxTool(rowLotteryType, specNumStr) : "");

    var specialTuple = {
      num: specNumStr,
      zodiac: specZodiacStr,
      wuxing: specWuxingStr
    };

    var frontCellsHtml = front6Tuples.map(function (item) {
      var nVal = parseInt(item.num, 10);
      var colorClass = !isNaN(nVal) ? hm_ys(nVal) : "";
      return `
        <div class="lottery-third-right-cell">
          <div class="lottery-cell-top-circle ${colorClass}"><h2><span>${item.num}</span></h2></div>
          <div class="lottery-cell-bottom-text">${item.zodiac}<br><h class="wx">${item.wuxing}</h></div>
        </div>
      `;
    }).join('');

    var specVal = parseInt(specialTuple.num, 10);
    var specColorClass = !isNaN(specVal) ? hm_ys(specVal) : "";
    var specialCellHtml = `
      <div class="lottery-third-right-special">+</div>
      <div class="lottery-third-right-cell">
        <div class="lottery-cell-top-circle ${specColorClass}"><h2><span>${specialTuple.num}</span></h2></div>
        <div class="lottery-cell-bottom-text">${specialTuple.zodiac}<br><h class="wx">${specialTuple.wuxing}</h></div>
      </div>
    `;

    var rowHtml = `
      <div class="lottery-row-third history-row-animate">
        <div class="lottery-third-left">
          <div class="lottery-third-left-sub">第<span>${row.period}</span>期</div>
          <div class="lottery-third-left-sub">${row.date}</div>
        </div>
        <div class="lottery-third-right">
          ${frontCellsHtml}
          ${specialCellHtml}
        </div>
      </div>
    `;

    htmlBuffer.push(rowHtml);
  });

  if (isAppend) {
    listContainer.insertAdjacentHTML('beforeend', htmlBuffer.join(''));
  } else {
    listContainer.innerHTML = htmlBuffer.join('');
  }
}

export { commonLiveRenderer, renderYearTabs, renderHistoryBatch };

// templates.js HTML骨架

import { NAVBAR_COLUMN_CONFIG } from './config.js';

export function generateLotteryPanelHTML(id, name, liconSrc) {
  var iconImgHtml = liconSrc ? `<img src="${liconSrc}" class="right-icon">` : '';

  return `
    <div class="kj" id="${id}">
      <div class="row row-flex" onclick="if(window.globalStoreInstance && typeof window.globalStoreInstance.toggleRows === 'function') window.globalStoreInstance.toggleRows('${id}')">
        <div class="left-box"><div class="toggle-btn-container"><div id="${id}_floatingTip" class="floating-tip" style="display:none;"><span>点击展开查看</span><div class="tip-arrow"></div></div><i class="arrow-icon" id="${id}_arrow">▲</i><span id="${id}_toggleText">收起</span></div></div>
        <div class="center-box">第<span id="${id}_q">------</span>期開奖結果</div>
        <div class="right-box">${iconImgHtml}<span id="${id}_m">${name}</span></div>
      </div>
      <div class="toggle-wrapper open" id="${id}_rowWrapper">
        <div class="row row-always-inline">
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj1"><h2><span id="${id}_m1"></span></h2></div><div class="item-bottom-box"><span id="${id}_w1"></span></div></div>
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj2"><h2><span id="${id}_m2"></span></h2></div><div class="item-bottom-box"><span id="${id}_w2"></span></div></div>
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj3"><h2><span id="${id}_m3"></span></h2></div><div class="item-bottom-box"><span id="${id}_w3"></span></div></div>
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj4"><h2><span id="${id}_m4"></span></h2></div><div class="item-bottom-box"><span id="${id}_w4"></span></div></div>
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj5"><h2><span id="${id}_m5"></span></h2></div><div class="item-bottom-box"><span id="${id}_w5"></span></div></div>
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj6"><h2><span id="${id}_m6"></span></h2></div><div class="item-bottom-box"><span id="${id}_w6"></span></div></div>
          <div class="grid-item small-item">+</div>
          <div class="grid-item item-composite"><div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj7"><h2><span id="${id}_m7"></span></h2></div><div class="item-bottom-box"><span id="${id}_w7"></span></div></div>
        </div>
        <div class="row row-third">
          <div class="third-left"><div class="left-top">第<span id="${id}_nextq">------</span>期開奖时间</div><div class="left-bottom" id="${id}_nextsj">------</div></div>
          <div class="third-right" id="${id}_djs">
            <div class="time-box"><span class="time-num" id="${id}_days">00</span><span class="time-label">天</span></div>
            <div class="time-box"><span class="time-num" id="${id}_hours">00</span><span class="time-label">时</span></div>
            <div class="time-box"><span class="time-num" id="${id}_minutes">00</span><span class="time-label">分</span></div>
            <div class="time-box"><span class="time-num" id="${id}_seconds">00</span></div>
          </div>
          <div class="third-right-notice" id="${id}_notice" style="display:none;"></div>
        </div>
      </div>
    </div>
  `;
}

export function getAppHTMLSkeleton() {
  var navItemsHtml = '';
  Object.keys(NAVBAR_COLUMN_CONFIG).forEach(function (key, index) {
    var cfg = NAVBAR_COLUMN_CONFIG[key];
    var isActive = index === 0 ? 'active' : '';
    
    var iconClass = 'nav-icon ';
    if (cfg.lotteryId === 'hk') iconClass += 'xgh';
    else if (cfg.lotteryId) iconClass += 'aoh';
    else if (key === 'tj') iconClass += 'tjzsico';
    else if (key === 'fs') iconClass += 'fsjsico';

    navItemsHtml += `
      <div class="nav-item ${isActive}" data-type="${key}">
        <a><i class="${iconClass}" ${key === 'hk' ? 'id="homeIcon"' : ''}></i>${cfg.title}</a>
      </div>
    `;
  });

  var lotteryPanelsHtml = '';
  Object.keys(NAVBAR_COLUMN_CONFIG).forEach(function (key) {
    var cfg = NAVBAR_COLUMN_CONFIG[key];
    if (cfg.type === 'lottery_hall' && cfg.lotteryId) {
      var lid = cfg.lotteryId;
      var lname = cfg.title;
      var liconSrc = cfg.iconSrc;
      lotteryPanelsHtml += generateLotteryPanelHTML(lid, lname, liconSrc);
    }
  });

  return `
    <div id="network-error-bar" style="display:none;position:fixed;top:0;left:0;right:0;background:#ff4d4f;color:#fff;text-align:center;padding:8px;z-index:9999;font-size:14px;">
      当前网络连接已断开，正在尝试重连... <button id="net-retry-btn" style="margin-left:10px;padding:2px 8px;background:#fff;color:#ff4d4f;border:none;border-radius:3px;cursor:pointer;">刷新重试</button>
    </div>
    <div class="app">
      <div class="loadingContainer"><div class="loadingBox"><span class="arrowIcon"></span><span class="loadingIcon"></span><span class="text">下拉刷新</span></div></div>
      <div id="page-loading-mask" style="display:none;"><div class="outer-heartbeat-circle"><div class="inner-half-spinner"></div></div></div>
      <div class="top-container">
        <div class="time-bar"><div class="time-bar-placeholder1"></div><span class="time-text" id="liveTimeBar">加载中...</span><img src="/img/top.gif" alt="icon" class="time-bar-img"></div>
        <nav class="mobile-navbar">
          <div class="nav-container">
            ${navItemsHtml}
          </div>
        </nav>
      </div>
      <main class="main-content">
        ${lotteryPanelsHtml}
        <div class="lottery-container">
          <div class="lottery-row-first">
            <div class="lottery-header-content">
              <div class="lottery-header-left"><img id="historyIcon" src="/img/xg.png"><span id="historyTitle">香港歷史記錄</span></div>
              <div class="lottery-header-right">
                <div class="lottery-header-right-inner" id="wuxing">五行</div>
                <div class="lottery-header-right-inner" id="daxiao">大小序</div>
              </div>
            </div>
          </div>
          <div class="lottery-row-items"><ul class="lottery-list"></ul></div>
          <div class="lottery_open"></div>
        </div>
      </main>
      ${getFushiToolPanelHTML()}
      
      ${getTongjiToolPanelHTML()}
    </div>
  `;
}

//复式计算
export function getFushiToolPanelHTML() {
  return `
    <div class="fs_app" id="fushiToolPanel" style="display:none;">
      <div class="fs_phone-container">
        <!-- 顶部导航 -->
        <div class="fs_header">
          <span class="fs_title">复式计算</span>
        </div>

        <!-- 上半部分：计算配置区 -->
        <div class="fs_card">
          <div class="fs_card-title">按复式投注组数计算</div>
          
          <div class="fs_input-group">
            <div class="fs_input-with-label">
              <span class="fs_input-prefix">输入号码数量</span>
              <input type="text" id="fs_topInputCount" class="fs_inner-input" placeholder="请输入 2~49">
            </div>
          </div>
          
          <div class="fs_input-group">
            <div class="fs_select-with-label" id="fs_select-calc-mode" data-val="2">
              <span class="fs_input-prefix">每注号码个数</span>
              <div class="fs_select-clickable-right" data-action="openSelectModal" data-target="fs_select-calc-mode">
                <span class="fs_select-value-text">每组2个</span>
                <span class="fs_select-value-jiantou"></span>
              </div>
            </div>
          </div>

          <button class="fs_btn fs_btn-primary" style="margin-top: 8px;" data-action="calculateTopMode">计算</button>
        </div>

        <!-- 虚线提示分割线 -->
        <div class="fs_divider-tag">
          <span>生成全复式<span class="fs_count" id="fs_topResultCount">0</span>注</span>
        </div>

        <!-- 隔离带 -->
        <div class="fs_section-gap"></div>

        <!-- 下半部分：选号核心区域 -->
        <div class="fs_card">
          <div class="fs_tab-header">
            <div class="fs_card-title" style="margin-bottom: 0;">按复式投注组数计算</div>
            <div class="fs_tab-btn-group">
              <button class="fs_tab-btn active" data-action="switchTab" data-tab="number">选号码</button>
              <button class="fs_tab-btn" data-action="switchTab" data-tab="zodiac">选生肖</button>
            </div>
          </div>

          <!-- 面板一：选号码（由 JS 动态生成 01~49 里的波色球） -->
          <div id="fs_panel-number" class="fs_tab-panel active">
            <div class="fs_balls-grid" id="fs_ballsGridContainer"></div>
            
            <div class="fs_footer-status">
              <span id="fs_numStatusText">已选择0个号码</span>
              <div class="fs_select-with-label" id="fs_select-num-group" data-val="2">
                <span class="fs_input-prefix" style="margin-right: 20px;">每注号码个数</span>
                <div class="fs_select-clickable-right" data-action="openSelectModal" data-target="fs_select-num-group">
                  <span class="fs_select-value-text">每组2个</span>
                  <span class="fs_select-value-jiantou"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 面板二：选生肖（由 JS 动态生成十二生肖） -->
          <div id="fs_panel-zodiac" class="fs_tab-panel">
            <div class="fs_zodiac-grid" id="fs_zodiacGridContainer"></div>
            
            <div class="fs_footer-status">
              <span id="fs_zodiacStatusText">已选择0个生肖</span>
              <div class="fs_select-with-label" id="fs_select-zodiac-group" data-val="2">
                <span class="fs_input-prefix" style="margin-right: 20px;">每注生肖个数</span>
                <div class="fs_select-clickable-right" data-action="openSelectModal" data-target="fs_select-zodiac-group">
                  <span class="fs_select-value-text">每组2个</span>
                  <span class="fs_select-value-jiantou"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作按钮 -->
          <div class="fs_button-row">
            <button class="fs_btn fs_btn-secondary" data-action="clearConditions">清除条件</button>
            <button class="fs_btn fs_btn-primary" data-action="calculateBottomMode">生成复式</button>
          </div>
        </div>
      </div>

      <!-- 下拉选择全屏居中弹窗容器 -->
      <div class="fs_select-modal-mask" id="fs_globalModalMask" data-action="closeModalMask">
        <div class="fs_select-modal-content">
          <div class="fs_select-modal-header" id="fs_modalTitle">请选择</div>
          <div class="fs_select-modal-options" id="fs_modalOptionsContainer"></div>
          <div class="fs_select-modal-footer">
            <button class="fs_modal-btn fs_modal-btn-cancel" data-action="closeSelectModal">取消</button>
            <button class="fs_modal-btn fs_modal-btn-confirm" data-action="confirmSelectModal">确定</button>
          </div>
        </div>
      </div>

      <!-- 弹窗 1：提示弹窗 -->
      <div class="fs_tip-mask" id="fs_tipMask">
        <div class="fs_tip-content">
          <div class="fs_tip-title" id="fs_tipTitle">温馨提示</div>
          <div class="fs_tip-text" id="fs_tipText">提示内容</div>
          <button class="fs_tip-btn" data-action="closeTipModal">确定</button>
        </div>
      </div>

      <!-- 弹窗 2：生成结果展示弹窗 -->
      <div class="fs_result-mask" id="fs_resultMask">
        <div class="fs_result-content">
          <div class="fs_result-header-row">
            <div class="fs_result-title" id="fs_resultTitle">生成复式组合明细</div>
            <button class="fs_copy-btn" data-action="copyResultContent">一键复制</button>
          </div>
          <div class="fs_analysis-box" id="fs_analysisBox">中奖分析中...</div>
          <div class="fs_result-grid-box" id="fs_resultGridBox"></div>
          <button class="fs_result-close-btn" data-action="closeResultModal">关闭</button>
        </div>
      </div>
    </div>
  `;
}

// 统计助手
export function getTongjiToolPanelHTML() {
  return `
    <div id="tongjiToolPanel" class="tongji-panel-wrapper" style="display:none;">
  <form name="form2">
    <!-- 隐藏的 1-49 号码表 -->
    <input title="01" type="hidden" value="01" name="n_01">
    <input title="02" type="hidden" value="02" name="n_02">
    <input title="03" type="hidden" value="03" name="n_03">
    <input title="04" type="hidden" value="04" name="n_04">
    <input title="05" type="hidden" value="05" name="n_05">
    <input title="06" type="hidden" value="06" name="n_06">
    <input title="07" type="hidden" value="07" name="n_07">
    <input title="08" type="hidden" value="08" name="n_08">
    <input title="09" type="hidden" value="09" name="n_09">
    <input title="10" type="hidden" value="10" name="n_10">
    <input title="11" type="hidden" value="11" name="n_11">
    <input title="12" type="hidden" value="12" name="n_12">
    <input title="13" type="hidden" value="13" name="n_13">
    <input title="14" type="hidden" value="14" name="n_14">
    <input title="15" type="hidden" value="15" name="n_15">
    <input title="16" type="hidden" value="16" name="n_16">
    <input title="17" type="hidden" value="17" name="n_17">
    <input title="18" type="hidden" value="18" name="n_18">
    <input title="19" type="hidden" value="19" name="n_19">
    <input title="20" type="hidden" value="20" name="n_20">
    <input title="21" type="hidden" value="21" name="n_21">
    <input title="22" type="hidden" value="22" name="n_22">
    <input title="23" type="hidden" value="23" name="n_23">
    <input title="24" type="hidden" value="24" name="n_24">
    <input title="25" type="hidden" value="25" name="n_25">
    <input title="26" type="hidden" value="26" name="n_26">
    <input title="27" type="hidden" value="27" name="n_27">
    <input title="28" type="hidden" value="28" name="n_28">
    <input title="29" type="hidden" value="29" name="n_29">
    <input title="30" type="hidden" value="30" name="n_30">
    <input title="31" type="hidden" value="31" name="n_31">
    <input title="32" type="hidden" value="32" name="n_32">
    <input title="33" type="hidden" value="33" name="n_33">
    <input title="34" type="hidden" value="34" name="n_34">
    <input title="35" type="hidden" value="35" name="n_35">
    <input title="36" type="hidden" value="36" name="n_36">
    <input title="37" type="hidden" value="37" name="n_37">
    <input title="38" type="hidden" value="38" name="n_38">
    <input title="39" type="hidden" value="39" name="n_39">
    <input title="40" type="hidden" value="40" name="n_40">
    <input title="41" type="hidden" value="41" name="n_41">
    <input title="42" type="hidden" value="42" name="n_42">
    <input title="43" type="hidden" value="43" name="n_43">
    <input title="44" type="hidden" value="44" name="n_44">
    <input title="45" type="hidden" value="45" name="n_45">
    <input title="46" type="hidden" value="46" name="n_46">
    <input title="47" type="hidden" value="47" name="n_47">
    <input title="48" type="hidden" value="48" name="n_48">
    <input title="49" type="hidden" value="49" name="n_49">
    <input title="1" type="hidden" value="1" name="n_1">
    <input title="2" type="hidden" value="2" name="n_2">
    <input title="3" type="hidden" value="3" name="n_3">
    <input title="4" type="hidden" value="4" name="n_4">
    <input title="5" type="hidden" value="5" name="n_5">
    <input title="6" type="hidden" value="6" name="n_6">
    <input title="7" type="hidden" value="7" name="n_7">
    <input title="8" type="hidden" value="8" name="n_8">
    <input title="9" type="hidden" value="9" name="n_9">
  </form>

  <form name="form">
    <div class="tongji-toast" id="tongji-global-toast">提示内容</div>
    <div class="tongji-panel-container">
        <div class="tongji-tabs-header">
            <div class="tongji-tabs-slider"></div>
            <input type="button" class="tongji-tab-item tongji-active" id="tab-common" value="常用属性">
            <input type="button" class="tongji-tab-item" id="tab-other" value="其他属性">
        </div>

        <!-- 面板 1：常用属性 -->
        <div class="tongji-grid-board tongji-animate-fade" id="panel-common"></div>

        <!-- 面板 2：其他属性 -->
        <div class="tongji-grid-board tongji-hidden tongji-animate-fade" id="panel-other"></div>

        <!-- 数据输入区 -->
        <div class="tongji-io-section">
            <div class="tongji-io-header">
                <div class="tongji-io-title">📥 输入数据</div>
                <div class="tongji-io-btns">
                    <input type="button" class="tongji-ctl-btn" id="tongji-copy-input" value="复制">
                    <input type="button" class="tongji-ctl-btn tongji-btn-danger" id="tongji-clear-input" value="清空">
                </div>
            </div>
            <textarea class="tongji-io-textarea" id="tongji-input-area" rows="3" placeholder="点击上方属性按钮 或 手动 输入数据..." name="inputtxt"></textarea>
        </div>

        <!-- 统计结果区 -->
        <div class="tongji-io-section">
            <div class="tongji-io-header">
                <div class="tongji-io-title">📊 统计结果</div>
                <div class="tongji-io-btns">
                    <input type="button" class="tongji-ctl-btn" id="tongji-clear-result" value="清空">
                    <input type="button" class="tongji-ctl-btn" id="tongji-save-result" value="暂存">
                    <!-- 改为安全的 window.全局函数 触发 -->
                    <input type="button" class="tongji-ctl-btn tongji-btn-primary tongji-btn-large" id="tongji-btn-countma" value="号统" onclick="window.countma?.()">
                    <input type="button" class="tongji-ctl-btn tongji-btn-primary tongji-btn-large" id="tongji-btn-countstyle" value="肖统" onclick="window.countstyle?.('鼠,牛,虎,兔,龙,蛇,马,羊,猴,鸡,狗,猪')">
                </div>
            </div>
            <div class="tongji-textarea-wrapper">
                <textarea class="tongji-io-textarea" id="tongji-result-area" rows="3" readonly placeholder="统计结果..." name="resultstxt"></textarea>
                <div class="tongji-floating-actions">
                    <input type="button" class="tongji-link-btn" id="tongji-edit-result" value="编辑">
                    <input type="button" class="tongji-link-btn" id="tongji-copy-result" value="复制">
                </div>
            </div>
        </div>

        <!-- 暂存数据输入区 -->
        <div class="tongji-io-section tongji-hidden" id="tongji-zc">
            <div class="tongji-io-header">
                <div class="tongji-io-title">📥 暂存输入</div>
                <div class="tongji-io-btns">
                    <input type="button" class="tongji-ctl-btn" id="tongjizc-copy-input" value="复制">
                    <input type="button" class="tongji-ctl-btn tongji-btn-danger" id="tongjizc-clear-input" value="清空">
                    <!-- 改为安全的 window.全局函数 触发 -->
                    <input type="button" class="tongji-ctl-btn tongji-btn-primary tongji-btn-large" id="tongji-btn-cunma" value="号统" onclick="window.cunma?.()">
                    <input type="button" class="tongji-ctl-btn tongji-btn-primary tongji-btn-large" id="tongji-btn-cunqt" value="肖统" onclick="window.cunqt?.('鼠,牛,虎,兔,龙,蛇,马,羊,猴,鸡,狗,猪')">
                </div>
            </div>
            <textarea class="tongji-io-textarea" id="tongjizc-input-area" rows="3" placeholder="输入暂存数据..." name="zancuntxt"></textarea>
        </div>
    </div>
  </form>
</div>
  `;
}

// transformers.js 數據重構插件

import { lhc, YearWxTool } from './config.js';

// 格式化 Date 对象为标准 "YYYY-MM-DD 星期X"
function formatDateWithWeek(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
  var yyyy = dateObj.getFullYear();
  var mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  var dd = String(dateObj.getDate()).padStart(2, '0');
  var weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  var weekStr = weekDays[dateObj.getDay()];
  return yyyy + "-" + mm + "-" + dd + " " + weekStr;
}
// 统一安全的 Date 解析器（完美兼容 iOS Safari）
function parseSafeDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'number') {
    var timestamp = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
    var d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'string') {
    var trimmed = dateInput.trim();
    if (/^\d+$/.test(trimmed)) {
      var num = parseInt(trimmed, 10);
      var ts = num < 10000000000 ? num * 1000 : num;
      var dNum = new Date(ts);
      return isNaN(dNum.getTime()) ? null : dNum;
    }
    var cleanStr = trimmed.replace(/-/g, '/');
    var dStr = new Date(cleanStr);
    return isNaN(dStr.getTime()) ? null : dStr;
  }
  return null;
}
// 辅助函数：生成 7 个字的拆解数组
function getDefaultNoticeArray(configObj) {
  var globalName = (configObj && configObj.name) ? configObj.name : "香港彩";
  var cleanName = globalName.replace(/彩/g, "");
  var fullStr = cleanName + "最快看開獎";
  var arr = [];
  for (var i = 0; i < 7; i++) {
    arr.push(fullStr[i] || "");
  }
  return arr;
}
// 统一核心号码洗白逻辑
function sanitizeNumbers(rawNumArr, configObj) {
  var defaultArr = getDefaultNoticeArray(configObj);
  var list = [];
  if (Array.isArray(rawNumArr)) {
    list = rawNumArr;
  } else if (typeof rawNumArr === 'string') {
    list = rawNumArr.split(',');
  }
  if (!list || list.length === 0) {
    return defaultArr;
  }
  var processed = list.map(function (item, index) {
    if (item === null || item === undefined) return defaultArr[index] || "";
    var trimmed = String(item).trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "--") return defaultArr[index] || "";
    if (/[\u4e00-\u9fa5]/.test(trimmed)) {
      return trimmed;
    }
    var parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 49) {
      return String(parsed).padStart(2, '0');
    }
    return defaultArr[index] || "";
  });
  while (processed.length < 7) {
    processed.push(defaultArr[processed.length] || "");
  }
  return processed;
}

// 1. WS 線路一
function wsLine1Transformer(rawPayload, configObj) {
  try {
    var json = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    if (!json || json.type !== 'data' || !json.data) return null;

    var groupToType = { 'am': 'xa', 'hk': 'hk' };
    var lType = groupToType[json.group] || json.group;

    var parts = json.data.split('|');
    var mainPart = parts[0] ? parts[0].split(',') : [];
    var zodiacPart = parts[1] ? parts[1].split(',') : [];

    var baseYear = (configObj && configObj.currentZodiacYear) ? configObj.currentZodiacYear : new Date().getFullYear();

    var rawPeriod = mainPart[0] ? mainPart[0].trim() : "";
    var rawNextPeriod = mainPart[8] ? mainPart[8].trim() : "";

    var curPVal = parseInt(rawPeriod, 10);
    var nextPVal = parseInt(rawNextPeriod, 10);

    var currentPeriodStr = rawPeriod;
    var nextPeriodStr = rawNextPeriod;

    if (curPVal > 150 && nextPVal < 10) {
      currentPeriodStr = String(baseYear - 1) + rawPeriod.padStart(3, '0');
      nextPeriodStr = String(baseYear) + rawNextPeriod.padStart(3, '0');
    } else if (rawPeriod.length <= 4 && rawPeriod.length > 0) {
      currentPeriodStr = String(baseYear) + rawPeriod.padStart(3, '0');
      if (rawNextPeriod && rawNextPeriod.length > 0) {
        nextPeriodStr = String(baseYear) + rawNextPeriod.padStart(3, '0');
      }
    }

    var rawNumbers = mainPart.slice(1, 8);
    var numbers = sanitizeNumbers(rawNumbers, configObj);

    var dateRaw = mainPart[9] ? mainPart[9].trim() : "";
    var formattedDateStr = "";
    if (dateRaw) {
      var dateSegs = dateRaw.split('/');
      if (dateSegs.length >= 4) {
        formattedDateStr = dateSegs[0] + "-" + dateSegs[1].padStart(2, '0') + "-" + dateSegs[2].padStart(2, '0') + " 星期" + dateSegs[3];
      } else if (dateSegs.length >= 3) {
        formattedDateStr = dateSegs[0] + "-" + dateSegs[1].padStart(2, '0') + "-" + dateSegs[2].padStart(2, '0');
      }
    }

    var zodiacs = numbers.map(function (num, idx) {
      if (/[\u4e00-\u9fa5]/.test(num)) return "-";
      if (zodiacPart[idx + 1] && zodiacPart[idx + 1].trim()) {
        return zodiacPart[idx + 1].trim();
      }
      return lhc.getZodiac(baseYear, num, lType, idx, 0);
    });

    var wuxing = numbers.map(function (num) {
      if (/[\u4e00-\u9fa5]/.test(num)) return "-";
      return YearWxTool(lType, num);
    });

    return {
      lotteryType: lType,
      period: currentPeriodStr || "------",
      numbers: numbers,
      zodiacs: zodiacs,
      wuxing: wuxing,
      nextPeriod: nextPeriodStr || "------",
      nextDate: formattedDateStr || "------",
      wsajax: "w1"
    };
  } catch (err) {
    console.error("[transformers.js] wsLine1Transformer 解析失败:", err);
    return null;
  }
}

// 2. WS 線路二
function wsLine2Transformer(rawPayload, configObj) {
  try {
    var outerJson = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    if (!outerJson || outerJson.event !== 'forward-data' || !outerJson.data) return null;

    var innerJson = typeof outerJson.data === 'string' ? JSON.parse(outerJson.data) : outerJson.data;
    if (!innerJson || innerJson.code !== 'lottery_draw_result' || !innerJson.data) return null;

    var resData = innerJson.data;
    var codeToType = { 'molhc6': 'xa', 'hklhc6': 'hk' };
    var lType = codeToType[resData.code] || 'hk';

    var prev = resData.prev || {};
    var next = resData.next || {};

    var period = String(prev.issue_number || "");
    var nextPeriod = String(next.issue_number || "");

    var rawNumbers = prev.winning_number || [];
    var numbers = sanitizeNumbers(rawNumbers, configObj);

    var dateFormatted = "";
    var dateIso = next.closed_at || next.ended_at;
    if (dateIso) {
      var d = new Date(dateIso);
      dateFormatted = formatDateWithWeek(d);
    }

    var baseYear = (configObj && configObj.currentZodiacYear) ? configObj.currentZodiacYear : new Date().getFullYear();

    var zodiacs = numbers.map(function (num, idx) {
      if (/[\u4e00-\u9fa5]/.test(num)) return "-";
      return lhc.getZodiac(baseYear, num, lType, idx, 0);
    });

    var wuxing = numbers.map(function (num) {
      if (/[\u4e00-\u9fa5]/.test(num)) return "-";
      return YearWxTool(lType, num);
    });

    return {
      lotteryType: lType,
      period: period || "------",
      numbers: numbers,
      zodiacs: zodiacs,
      wuxing: wuxing,
      nextPeriod: nextPeriod || "------",
      nextDate: dateFormatted || "------",
      wsajax: "w2"
    };
  } catch (err) {
    console.error("[transformers.js] wsLine2Transformer 解析失败:", err);
    return null;
  }
}

// 3. 直播/降級/輪詢/下拉刷新 公用單發 AJAX 解析
function commonLiveAjaxTransformer(rawPayload, configObj) {
  try {
    var res = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    if (!res) return null;

    var live = (res.data && res.data.liveDataResult) ? res.data.liveDataResult : (res.data || res);
    if (!live) return null;

    var lType = configObj ? configObj.id : "hk";
    var baseYear = (configObj && configObj.currentZodiacYear) ? configObj.currentZodiacYear : new Date().getFullYear();

    var rawP = live.expect || live.period || "";
    var period = "------";
    if (rawP) {
      var pStr = String(rawP);
      period = pStr.length >= 7 ? pStr : String(baseYear) + pStr.padStart(3, '0');
    }

    var rawNextP = live.nextExpect || live.nextPeriod || "";
    var nextPeriod = "------";
    if (rawNextP) {
      var npStr = String(rawNextP);
      nextPeriod = npStr.length >= 7 ? npStr : String(baseYear) + npStr.padStart(3, '0');
    }

    var rawNumArr = live.numbers || live.num || [];
    var numbers = sanitizeNumbers(rawNumArr, configObj);

    var zodiacs = [];
    if (live.zodiac) {
      var rawZ = typeof live.zodiac === 'string' ? live.zodiac.split(',') : live.zodiac;
      zodiacs = numbers.map(function (num, idx) {
        if (/[\u4e00-\u9fa5]/.test(num)) return "-";
        return (rawZ[idx] && rawZ[idx].trim()) ? rawZ[idx].trim() : lhc.getZodiac(baseYear, num, lType, idx, 0);
      });
    } else {
      zodiacs = numbers.map(function (num, idx) {
        if (/[\u4e00-\u9fa5]/.test(num)) return "-";
        return lhc.getZodiac(baseYear, num, lType, idx, 0);
      });
    }

    var wuxing = numbers.map(function (num) {
      if (/[\u4e00-\u9fa5]/.test(num)) return "-";
      return YearWxTool(lType, num);
    });

    var nextDateStr = "------";
    if (live.nextLotteryDate) {
      var d1 = parseSafeDate(live.nextLotteryDate);
      if (d1) nextDateStr = formatDateWithWeek(d1);
    } else if (live.lotteryStr) {
      var dStr = live.lotteryStr.split(' ')[0];
      var d2 = parseSafeDate(dStr);
      nextDateStr = d2 ? formatDateWithWeek(d2) : dStr;
    } else if (live.nextDate) {
      nextDateStr = live.nextDate;
    }

    return {
      lotteryType: lType,
      period: period,
      numbers: numbers,
      zodiacs: zodiacs,
      wuxing: wuxing,
      nextPeriod: nextPeriod,
      nextDate: nextDateStr,
      wsajax: "ajax"
    };
  } catch (err) {
    console.error("[transformers.js] commonLiveAjaxTransformer 解析失败:", err);
    return null;
  }
}

// 4. 記錄區單發 AJAX 歷史列表解析
function commonHistoryAjaxTransformer(rawPayload, configObj) {
  try {
    var res = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    var list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
    if (list.length === 0) return [];

    var lType = configObj ? configObj.id : "hk";
    var baseYear = (configObj && configObj.currentZodiacYear) ? configObj.currentZodiacYear : new Date().getFullYear();

    return list.map(function (item) {
      var itemYear = parseInt(item.year, 10) || baseYear;
      var rawQ = String(item.qishu || item.expect || "").trim();

      var periodStr = "";
      if (rawQ) {
        periodStr = (rawQ.length >= 7 || rawQ.indexOf(String(itemYear)) === 0) 
          ? rawQ 
          : String(itemYear) + rawQ.padStart(3, '0');
      } else {
        periodStr = String(itemYear) + "001";
      }

      var rawNQ = String(item.nqi || "").trim();
      var nextPeriodStr = "";
      if (rawNQ) {
        var nYear = parseInt(item.nyear, 10) || itemYear;
        nextPeriodStr = (rawNQ.length >= 7 || rawNQ.indexOf(String(nYear)) === 0)
          ? rawNQ
          : String(nYear) + rawNQ.padStart(3, '0');
      }

      var numRaw = item.num || item.numbers || "";
      var numbers = sanitizeNumbers(numRaw, configObj);

      var zodiacs = item.shengxiao 
        ? (typeof item.shengxiao === 'string' ? item.shengxiao.split(',').map(function (s) { return s.trim(); }) : item.shengxiao)
        : numbers.map(function (n, idx) {
            if (/[\u4e00-\u9fa5]/.test(n)) return "-";
            return lhc.getZodiac(itemYear, n, lType, idx, 0);
          });

      var wuxing = item.wuxing 
        ? (typeof item.wuxing === 'string' ? item.wuxing.split(',').map(function (w) { return w.trim(); }) : item.wuxing)
        : numbers.map(function (n) {
            if (/[\u4e00-\u9fa5]/.test(n)) return "-";
            return YearWxTool(lType, n);
          });

      var formattedDate = item.date || "";
      if (item.date) {
        var dObj = parseSafeDate(item.date);
        if (dObj) {
          var mm = String(dObj.getMonth() + 1).padStart(2, '0');
          var dd = String(dObj.getDate()).padStart(2, '0');
          var weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
          formattedDate = mm + "-" + dd + " " + weekDays[dObj.getDay()];
        }
      }

      return {
        id: item.id || periodStr,
        year: itemYear,
        period: periodStr,
        date: formattedDate,
        numbers: numbers,
        zodiacs: zodiacs,
        wuxing: wuxing,
        nextPeriod: nextPeriodStr,
        wsajax: "jl"
      };
    });
  } catch (err) {
    console.error("[transformers.js] commonHistoryAjaxTransformer 解析失败:", err);
    return [];
  }
}

export {
  wsLine1Transformer,
  wsLine2Transformer,
  commonLiveAjaxTransformer,
  commonHistoryAjaxTransformer
};

// utils-peripheral.js 包含：下拉刷新、无限滚动、PWA、Toast、主题切换

// 1. 初始化无限滚动加载（极致丝滑性能版）
export function initInfiniteScroll(storeInstance) {
  let ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking || storeInstance.isLoadingMore) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      import('./config.js').then(({ NAVBAR_COLUMN_CONFIG }) => {
        var currentNavConfig = NAVBAR_COLUMN_CONFIG[storeInstance.currentNavTab];
        if (!currentNavConfig || currentNavConfig.type !== 'lottery_hall') {
          return;
        }

        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        var windowHeight = window.innerHeight;
        var documentHeight = document.documentElement.scrollHeight;
        if (documentHeight - (scrollTop + windowHeight) < 200) {
          var activeId = currentNavConfig.lotteryId || 'hk';
          var listData = storeInstance.historyDataStore[activeId] || [];
          var nextStartIndex = (storeInstance.currentPageIndex + 1) * storeInstance.pageSize;
          if (nextStartIndex < listData.length) {
            storeInstance.isLoadingMore = true;
            storeInstance.currentPageIndex++;
            requestAnimationFrame(() => {
              storeInstance.renderHistoryWithSort(true);
              setTimeout(function () {
                storeInstance.isLoadingMore = false;
              }, 150);
            });
          }
        }
      });
    });
  }, { passive: true });
}

// 2. 初始化下拉刷新
export function initPullToRefresh(storeInstance) {
  var container = document.querySelector('main');
  var loadingContainer = document.querySelector('.loadingContainer');
  var pullArrow = document.querySelector('.arrowIcon');
  var loadingIcon = document.querySelector('.loadingIcon');
  var pullText = document.querySelector('.text');

  if (!container || !loadingContainer) return;

  var startY = 0;        
  var moveY = 0;        
  var isRefreshing = false; 
  var isDrawing = false; 
  const MAX_HEIGHT = 60; 

  function getClientY(e) {
      return e.touches ? e.touches[0].pageY : e.pageY;
  }

  function handleStart(e) {
      var scrollTop = document.documentElement.scrollTop || window.scrollY || document.body.scrollTop;
      if (scrollTop > 5 || isRefreshing) return;
       
      isDrawing = true;
      loadingContainer.style.transition = 'none'; 
      startY = getClientY(e);

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
  }

  function handleMove(e) {
      if (!isDrawing || isRefreshing) return;

      var currentY = getClientY(e);
      moveY = currentY - startY; 

      if (moveY <= 0) {
          loadingContainer.style.height = '0px';
          return;
      }

      if (moveY > 0) {
          var scrollTop = document.documentElement.scrollTop || window.scrollY || document.body.scrollTop;
          if (scrollTop <= 2 && e.cancelable) {
              e.preventDefault();
          }

          var dragHeight = Math.min(100, Math.pow(moveY, 0.85) * 1.8);
          loadingContainer.style.height = dragHeight + 'px';

          if (dragHeight < MAX_HEIGHT) {
              if (pullArrow) pullArrow.style.display = 'inline-block';
              if (loadingIcon) loadingIcon.style.display = 'none';
              if (pullArrow) pullArrow.style.transform = 'rotate(0deg)';
              if (pullText) pullText.innerText = '下拉刷新';
          } else {
              if (pullArrow) pullArrow.style.transform = 'rotate(180deg)';
              if (pullText) pullText.innerText = '释放刷新';
          }
      }
  }

  function handleEnd(e) {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);

      if (!isDrawing) return;
      isDrawing = false;
      if (isRefreshing) return;

      loadingContainer.style.transition = 'height 0.25s cubic-bezier(0.25, 1, 0.5, 1)'; 
      var currentHeight = parseInt(loadingContainer.style.height) || 0;

      if (currentHeight >= MAX_HEIGHT) {
          isRefreshing = true;
          loadingContainer.style.height = MAX_HEIGHT + 'px'; 
          if (pullArrow) pullArrow.style.display = 'none';
          if (loadingIcon) loadingIcon.style.display = 'inline-block';
          if (pullText) pullText.innerText = '正在刷新..';

          triggerAjaxRefresh();
      } else {
          loadingContainer.style.height = '0px'; 
      }
  }

  function triggerAjaxRefresh() {
    import('./config.js').then(({ NAVBAR_COLUMN_CONFIG }) => {
      var currentNavConfig = NAVBAR_COLUMN_CONFIG[storeInstance.currentNavTab];
      
      if (!currentNavConfig || currentNavConfig.type !== 'lottery_hall') {
        setTimeout(function() {
          if (loadingIcon) loadingIcon.style.display = 'none';
          if (pullText) pullText.innerText = '刷新成功';
          loadingContainer.style.height = '0px';
          setTimeout(function() {
            isRefreshing = false;
            if (pullArrow) { pullArrow.style.display = 'inline-block'; pullArrow.style.transform = 'rotate(0deg)'; }
            if (pullText) pullText.innerText = '下拉刷新';
          }, 250);
        }, 300);
        return;
      }

      var activeLotteryId = currentNavConfig.lotteryId || 'hk';
      
      storeInstance.executeGlobalStorePullRefresh(activeLotteryId)
        .then(function() {
          if (loadingIcon) loadingIcon.style.display = 'none';
          if (pullText) pullText.innerText = '刷新成功';
          
          setTimeout(function() {
            loadingContainer.style.height = '0px'; 
            setTimeout(function() {
              isRefreshing = false;
              if (pullArrow) { pullArrow.style.display = 'inline-block'; pullArrow.style.transform = 'rotate(0deg)'; }
              if (pullText) pullText.innerText = '下拉刷新';
            }, 250);
          }, 300);
        })
        .catch(function(err) {
          console.error("[PullRefresh] ❌ 下拉刷新失敗:", err);
          if (loadingIcon) loadingIcon.style.display = 'none';
          if (pullText) pullText.innerText = '刷新失败';
          setTimeout(function() { loadingContainer.style.height = '0px'; isRefreshing = false; }, 500);
        });
    });
  }

  container.addEventListener('touchstart', handleStart, { passive: true });
  container.addEventListener('touchmove', handleMove, { passive: false });
  container.addEventListener('touchend', handleEnd, { passive: true });
  container.addEventListener('mousedown', handleStart);
}


// 3. 自定义轻提示 (Toast)
export function showCustomToast(message) {
  var oldMask = document.getElementById('custom-toast-root');
  if (oldMask) oldMask.remove();
  var mask = document.createElement('div');
  mask.id = 'custom-toast-root';
  mask.className = 'custom-toast-mask';
  mask.innerHTML = 
    '<div class="custom-toast-box">' +
      '<div class="custom-toast-text">' + message + '</div>' +
      '<button class="custom-toast-btn" id="customToastCloseBtn">确定</button>' +
    '</div>';
  document.body.appendChild(mask);
  var closeBtn = document.getElementById('customToastCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      mask.remove();
    });
  }
  mask.addEventListener('click', function (e) {
    if (e.target === mask) mask.remove();
  });
}

// 4. PWA 离线安装与版本更新管理
export function initPWAModule(storeInstance) {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    storeInstance.deferredPrompt = e;
    if (!isStandaloneMode()) {
      setTimeout(function() {
        showPWABanner('install', storeInstance);
      }, 2000);
    }
  });
  window.addEventListener('appinstalled', function() {
    storeInstance.deferredPrompt = null;
    removePWABanner();
  });
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg) {
      function triggerUpdateFlow(targetWorker) {
        if (sessionStorage.getItem('main_pwa_refresh_lock')) return;
        setTimeout(function() {
          showCustomUpdateBanner(function() {
            sessionStorage.setItem('main_pwa_refresh_lock', 'true');
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              window.location.reload(); 
            });
            if (targetWorker) {
              targetWorker.postMessage({ action: 'skipWaiting' });
            } else if (reg.waiting) {
              reg.waiting.postMessage({ action: 'skipWaiting' });
            }
          });
        }, 3000);
      }
      if (reg.waiting) {
        triggerUpdateFlow(reg.waiting);
      }
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            triggerUpdateFlow(newWorker);
          }
        });
      });
    }).catch(function() {});
  });
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }
  setTimeout(function() {
    sessionStorage.removeItem('main_pwa_refresh_lock');
  }, 2000);
}
function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function removePWABanner() {
  var oldBanner = document.getElementById('pwa-unified-banner');
  if (oldBanner) oldBanner.remove();
  var oldUpdateBanner = document.getElementById('pwa-update-banner');
  if (oldUpdateBanner) oldUpdateBanner.remove();
}
function showPWABanner(type, storeInstance) {
  if (type === 'install' && isStandaloneMode()) return;
  removePWABanner();
  var banner = document.createElement('div');
  banner.id = 'pwa-unified-banner';
  banner.innerHTML = 
    '<div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px;">' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
        '<span style="font-size:18px;">📱</span>' +
        '<span>安装到手机桌面，享受更顺畅的独立体验！</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">' +
        '<button id="pwaInstallActionBtn" style="background:#ff4d4f; color:#fff; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:13px;">立即安装</button>' +
        '<button id="pwaBannerCloseBtn" style="background:transparent; color:#aaa; border:none; padding:4px 8px; cursor:pointer; font-size:16px;">✕</button>' +
      '</div>' +
    '</div>';
  banner.style.cssText = 
    'position: fixed; bottom: 20px; left: 15px; right: 15px; z-index: 99998; ' +
    'background: #1f1f1f; color: #fff; padding: 12px 16px; border-radius: 10px; ' +
    'box-shadow: 0 6px 20px rgba(0,0,0,0.5); display: flex; align-items: center; ' +
    'font-size: 13px; font-family: sans-serif; border: 1px solid #333;';
  document.body.appendChild(banner);
  document.getElementById('pwaInstallActionBtn').addEventListener('click', function() {
    if (!storeInstance.deferredPrompt) return;
    storeInstance.deferredPrompt.prompt();
    storeInstance.deferredPrompt.userChoice.then(function() {
      storeInstance.deferredPrompt = null;
      removePWABanner();
    });
  });
  document.getElementById('pwaBannerCloseBtn').addEventListener('click', function() {
    removePWABanner();
  });
}
function showCustomUpdateBanner(onRefreshCallback) {
  if (document.getElementById('pwa-update-banner')) return;
  var banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.style.cssText = 
    'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); ' +
    'background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff; ' +
    'padding: 14px 20px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); ' +
    'z-index: 999999; display: flex; align-items: center; gap: 15px; ' +
    'font-family: sans-serif; font-size: 14px; max-width: 90%; width: 380px; box-sizing: border-box;';
  banner.innerHTML = 
    '<div style="flex: 1;">' +
      '<div style="font-weight: 600; margin-bottom: 3px; color: #38bdf8;">系统版本更新通知</div>' +
      '<div style="color: #cbd5e1; font-size: 12px; line-height: 1.4;">检测到新版本发布，建议立即更新以获得最佳体验。</div>' +
    '</div>' +
    '<button id="pwa-update-btn" style="background: #0284c7; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; white-space: nowrap;">立即刷新</button>';
  document.body.appendChild(banner);
  document.getElementById('pwa-update-btn').onclick = function() {
    if (banner.parentNode) banner.parentNode.removeChild(banner);
    if (typeof onRefreshCallback === 'function') {
      onRefreshCallback();
    }
  };
}

// 5. 主题切换管理
export function initThemeModule() {
  const themeToggleBtn = document.querySelector('.time-bar-img');
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  function applyTheme(isLight) {
    if (isLight) {
      document.body.classList.add('light-theme');
      themeMeta.setAttribute('content', '#fcf6ed'); 
    } else {
      document.body.classList.remove('light-theme');
      themeMeta.setAttribute('content', '#121212'); 
    }
  }
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    applyTheme(true);
  } else {
    applyTheme(false);
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const willBeLight = !document.body.classList.contains('light-theme');
      applyTheme(willBeLight);
      localStorage.setItem('theme', willBeLight ? 'light' : 'dark');
    });
  }
}

// year.js 多彩种、多年份的“新年第一期开奖节点”配置表

const lottoNodes = {
  'hk': {
    '2026': '2026-02-17 21:30:00',
    '2027': '2027-02-06 21:30:00' //农历新年第一期日期
  },
  'xa': {
    '2026': '2026-02-17 21:33:00',
    '2027': '2027-02-06 21:33:00',
    '2028': '2028-01-26 21:33:00',
    '2029': '2029-02-13 21:33:00',
    '2030': '2030-02-03 21:33:00'
  },
  'la': {
    '2026': '2026-02-17 21:33:00',
    '2027': '2027-02-06 21:33:00',
    '2028': '2028-01-26 21:33:00',
    '2029': '2029-02-13 21:33:00',
    '2030': '2030-02-03 21:33:00'
  },
  'hkls': {
    '2026': '2026-01-01 21:36:00',
    '2027': '2027-01-01 21:36:00' //新历新年第一期日期
  },
  'amls': {
    '2026': '2026-01-01 21:36:00',
    '2027': '2027-01-01 21:36:00',
    '2028': '2028-01-01 21:36:00',
    '2029': '2029-01-01 21:36:00',
    '2030': '2030-01-01 21:36:00'
  },
  'tj': {
    '2026': '2026-02-17 00:00:01',
    '2027': '2027-02-06 00:00:01',
    '2028': '2028-01-26 00:00:01',
    '2029': '2029-02-13 00:00:01',
    '2030': '2030-02-03 00:00:01'
  }
};

export { lottoNodes };

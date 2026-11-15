// templates.js HTML骨架

import { NAVBAR_COLUMN_CONFIG } from './config.js';

export function generateLotteryPanelHTML(id, name, liconSrc) {
  const iconImgHtml = liconSrc ? `<img src="${liconSrc}" class="right-icon">` : '';

  const clickAction = `if(window.globalStoreInstance && typeof window.globalStoreInstance.toggleRows === 'function') window.globalStoreInstance.toggleRows('${id}')`;

  // 完整保留原有类名与 id，内部植入 3D 立体球结构
  const createBallItem = (num) => `
    <div class="grid-item item-composite">
      <div class="item-top-box circle-style kjbj kjbjopacity" id="${id}_kj${num}">
        <span class="orb-stage orb-roll">
          <span class="orb-shadow"></span>
          <span class="orb-body">
            <span class="orb-skin"></span>
            <span class="orb-face">
              <h2><span id="${id}_m${num}"></span></h2>
            </span>
          </span>
        </span>
      </div>
      <div class="item-bottom-box"><span id="${id}_w${num}"></span><h class="wx" id="${id}_wx${num}"></h></div>
    </div>
  `;

  const mainBallsHtml = Array.from({ length: 6 }, (_, i) => createBallItem(i + 1)).join('');

  return `
    <div class="kj" id="${id}">
      <div class="row row-flex" onclick="${clickAction}">
        <div class="left-box">
          <div class="toggle-btn-container">
            <div id="${id}_floatingTip" class="floating-tip" style="display:none;">
              <span>点击展开查看</span>
              <div class="tip-arrow"></div>
            </div>
            <i class="arrow-icon" id="${id}_arrow">▲</i>
            <span id="${id}_toggleText">收起</span>
          </div>
        </div>
        <div class="center-box">第<span id="${id}_q">------</span>期開奖結果</div>
        <div class="right-box">${iconImgHtml}<span id="${id}_m">${name}</span></div>
      </div>
      
      <div class="toggle-wrapper open" id="${id}_rowWrapper">
        <div class="row row-always-inline">
          ${mainBallsHtml}
          
          <div class="grid-item small-item">+</div>
          
          ${createBallItem(7)}
        </div>
        
        <div class="row row-third">
          <div class="third-left">
            <div class="left-top">第<span id="${id}_nextq">------</span>期開奖时间</div>
            <div class="left-bottom" id="${id}_nextsj">------</div>
          </div>
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


const LOTTERY_ICON_MAP = Object.freeze({
  'hk': 'xgh',
  'kl8': 'kl8',
  'xa': 'aoh',
  'la': 'aoh',
  'cx': 'kjjlico',
  'tj': 'tjzsico',
  'fs': 'fsjsico'
});

export function getAppHTMLSkeleton() {
  const navItemsHtml = Object.entries(NAVBAR_COLUMN_CONFIG)
    .map(([key, cfg], index) => {
      const isActive = index === 0 ? 'active' : '';
      const subClass = LOTTERY_ICON_MAP[cfg.lotteryId] || '';
      const iconClass = `nav-icon${subClass ? ' ' + subClass : ''}`;
      const homeIdAttr = key === 'hk' ? 'id="homeIcon"' : '';

      return `
        <div class="nav-item ${isActive}" data-type="${key}">
          <a><i class="${iconClass}" ${homeIdAttr}></i>${cfg.title}</a>
        </div>
      `;
    })
    .join('');

  const lotteryPanelsHtml = Object.values(NAVBAR_COLUMN_CONFIG)
    .filter(cfg => cfg.type === 'lottery_hall' && cfg.lotteryId)
    .map(cfg => generateLotteryPanelHTML(cfg.lotteryId, cfg.title, cfg.iconSrc))
    .join('');

  return `
    <div id="network-error-bar" style="display:none;position:fixed;top:0;left:0;right:0;background:#ff4d4f;color:#fff;text-align:center;padding:8px;z-index:9999;font-size:14px;">
      当前网络连接已断开，正在尝试重连... <button id="net-retry-btn" style="margin-left:10px;padding:2px 8px;background:#fff;color:#ff4d4f;border:none;border-radius:3px;cursor:pointer;">刷新重试</button>
    </div>
    <div class="app">
      <div id="page-loading-mask" style="display:none;"><div class="outer-heartbeat-circle"><div class="inner-half-spinner"></div></div></div>
      <div class="top-container">
        <div class="time-bar is-fixed">
  <span class="time-text" id="liveTimeBar">加载中...</span>
  <button type="button" class="time-bar-img theme-icon-btn" aria-label="切换白天黑夜模式">
    <!-- 月亮图标（暗色模式显示） -->
    <svg class="icon-moon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
    <!-- 太阳图标（亮色模式显示） -->
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  </button>
</div>

        <div class="loadingContainer loadingContainer-fixed"><div class="loadingBox"><span class="arrowIcon"></span><span class="loadingIcon"></span><span class="text">下拉刷新</span></div></div>
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
      ${getLotteryAnalysisHTML()}
    </div>
  `;
}

//复式计算
export function getFushiToolPanelHTML() {
  return `
    <div class="fs_app" id="fushiToolPanel" style="display:none;">
      <div class="fs_phone-container">
        <!-- 顶部导航 -->
        <!-- div class="fs_header">
          <span class="fs_title">复式计算</span>
        </div -->

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

// 查询助手
export function getLotteryAnalysisHTML() {
  return `
  <!-- 顶级独立模块命名空间 -->
<div id="lottery-analysis-module" class="ax-ultra-slim-container" style="display:none;">
  <div class="ax-dashboard-card">
  
    <!-- LINE 0: 独立栏目彩种按钮切换行 -->
    <div class="ax-lane-row">
      <div class="ax-lane-label">彩种</div>
      <div class="ax-lane-content lottery-tab-wrap" style="gap: 8px; flex-wrap: wrap;" id="ax-analysis-lottery-tabs">
      </div>
    </div>
    
    <!-- LINE 1: 独立查询模式按钮切换行 -->
    <div class="ax-lane-row">
      <div class="ax-lane-label">模式</div>
      <div class="ax-lane-content lottery-tab-wrap" id="ax-query-mode-tabs" style="gap: 8px; flex-wrap: wrap;">
        <div class="ax-tab-btn is-active" data-mode="recent">最近 N 期</div>
        <div class="ax-tab-btn" data-mode="period">起止期数</div>
        <div class="ax-tab-btn" data-mode="year">年份范围</div>
      </div>
    </div>
    
    <div class="ax-query-input-lanes">
      <!-- LINE 1.1: 模式 1：最近 N 期输入面板（默认显示） -->
      <div class="ax-lane-row" id="lane-mode-recent">
        <div class="ax-lane-label">最近</div>
        <div class="ax-lane-content">
          <input type="number" id="input-recent-limit" value="100" min="1" max="1000" class="ax-pure-text-input">
          <span class="ax-input-unit">期数据</span>
        </div>
      </div>

      <!-- LINE 1.2: 模式 2：起止期数输入面板（默认隐藏） -->
      <div class="ax-lane-row" id="lane-mode-period" style="display: none;">
        <div class="ax-lane-label">期数</div>
        <div class="ax-lane-content">
          <input type="text" id="input-start-period" placeholder="起始期数" class="ax-pure-text-input" />
          <span class="ax-text-split">至</span>
          <input type="text" id="input-end-period" placeholder="结束期数" class="ax-pure-text-input" style="margin-left: 6px;" />
        </div>
      </div>

      <!-- LINE 1.3: 模式 3：年份范围输入面板（默认隐藏) -->
      <div class="ax-lane-row" id="lane-mode-year" style="display: none;">
        <div class="ax-lane-label">年份</div>
        <div class="ax-lane-content year-flex-wrap">
          <div class="ax-select-trigger" id="trigger-start-year" data-value="">2025 年</div>
          <span class="ax-text-split">至</span>
          <div class="ax-select-trigger" id="trigger-end-year" data-value="">2026 年</div>
          <div class="ax-num-input-wrap">
            <span class="ax-text-split">近</span>
            <input type="number" id="input-recent-years" class="ax-pure-num-field" value="2" min="1" max="7">
            <span class="ax-input-unit">年</span>
          </div>
        </div>
      </div>
    </div>

    <!-- LINE 2: 条件（维度与逻辑模式） -->
    <div class="ax-lane-row">
      <div class="ax-lane-label">条件</div>
      <div class="ax-lane-content">
        <div class="ax-select-trigger" id="trigger-filter-type" data-value="number">按号码</div>
        <div class="ax-select-trigger" id="trigger-logic-mode" data-value="OR">满足任意条件</div>
        <div class="ax-select-trigger" id="trigger-sort-mode" data-value="drop">落球序</div>
      </div>
    </div>

    <!-- LINE 3: 网格输入行 -->
    <div class="ax-lane-row">
      <div class="ax-lane-label" style="border: none;background-color: transparent;"></div>
      <div class="ax-lane-content">
        <div class="ax-grid-input-row">
          <div class="ax-modern-input-box">
          <textarea id="analysis-input-value" class="ax-pure-text-field" rows="1" placeholder="输入条件，如: 08,12,33"></textarea>
          <button type="button" id="btn-extract-recent" class="ax-btn-primary">提取</button>
        </div>
        </div>
      </div>
    </div>

    <!-- LINE 3.5: 延伸区独立行（像网格输入行一样，左侧留空对齐，右侧独占整行） -->
    <div class="ax-lane-row" id="context-extension-alternate" style="display:none;">
      <div class="ax-lane-label" style="border: none;background-color: transparent;"></div>
      <div class="ax-lane-content">
        <div class="ax-popup-extension-wrap" style="max-height: 120px;width: 100%;">
          <div class="ax-ext-inline-inner">
          <span class="ax-text-split">间隔</span>
            <input type="number" id="input-inter-period" class="ax-pure-num-field" style="wid1th: 28px;" value="0">
            <span class="ax-input-unit">期 </span><!--span style="font-size: 11px;color:#999999;margin-left: 5px;">💡 提示：0=连续，1=隔1期 ...</span-->
            <div class="ax-select-trigger" id="trigger-frequency-mode" data-value="SINGLE" style="border: none;background-color: transparent;padding-top: 0;padding-bottom: 0;margin-left: 3px;">单次 (固定)</div>
             <div class="ax-stepper-jjbtn active" id="input-inter-jia" style="margin: 0 3.5px;">加</div><div class="ax-stepper-jjbtn" id="input-inter-jian">减</div>
            <input type="number" id="input-inter-offset" class="ax-pure-num-field" value="0">
          </div>
          <div class="ax-ext-inline-inner">
            <!-- 规律跨位置全自动扫描开关 -->
          <input type="checkbox" id="chk-auto-cross-pos" style="cursor: pointer;" />
          <span class="ax-stepper-unit">规律性跨位置</span>
          <span class="ax-stepper-txt">范围：左</span>
          <input type="number" id="input-zodiac-left" class="ax-pure-num-field" value="0">
          <span class="ax-stepper-txt">右</span>
          <input type="number" id="input-zodiac-right" class="ax-pure-num-field" value="0">
          </div>
        </div>
      </div>
    </div>

    <!-- LINE 4: 结果显示主行（左侧位置选择 + 右侧显示模式） -->
    <div class="ax-lane-row">
      <div class="ax-lane-label">结果</div>
      <div class="ax-lane-content">
        <div class="ax-select-trigger" id="trigger-position-select" data-selected="0,1,2,3,4,5,6" style="flex-shrink: 0;">位置：全部 (7)</div>
        <div class="ax-select-trigger" id="trigger-display-mode" data-value="ALL" style="flex: 1;">显示全部期数</div>
      </div>
    </div>

    <!-- LINE 4.5: 延伸区独立行（像网格输入行一样，左侧留空对齐，右侧独占整行） -->
    <div class="ax-lane-row">
      <div class="ax-lane-label" style="border: none;background-color: transparent;"></div>
      <div class="ax-lane-content">
        <div id="context-extension-lane" class="ax-popup-extension-wrap ax-ext-hide" style="width: 100%;">
          <div class="ax-ext-inline-inner">
            <span class="ax-stepper-txt">前显</span>
            <div class="ax-stepper-btn" id="step-prev-minus">-</div>
            <input type="number" id="input-prev-count" class="ax-stepper-val" value="0" readonly>
            <div class="ax-stepper-btn" id="step-prev-plus">+</div>
            <span class="ax-stepper-unit">期</span>

            <span class="ax-stepper-txt" style="margin-left: 16px;">后显</span>
            <div class="ax-stepper-btn" id="step-next-minus">-</div>
            <input type="number" id="input-next-count" class="ax-stepper-val" value="0" readonly>
            <div class="ax-stepper-btn" id="step-next-plus">+</div>
            <span class="ax-stepper-unit">期</span>
          </div>
        </div>
      </div>
    </div>

    <!-- LINE 5: 底部行动按钮 -->
    <div class="ax-lane-row no-border" style="padding: 14px 0 6px 0;">
      <div class="ax-lane-content" style="justify-content: flex-end; gap: 12px;">
        <button id="btn-analysis-execute" class="ax-luxury-action-btn btn-prime">⚡ 开始查询</button>
        <button id="btn-analysis-reset" class="ax-luxury-action-btn btn-sub">重置</button>
        <button id="btn-analysis-copy" class="ax-luxury-action-btn btn-sub" style="border: 0.8px solid #e6a23c;font-size: 10px;padding:2px 4px;border-radius: 6px;">复制结果</button>
      </div>
    </div>
  </div>

  <div id="analysis-matrix-output" class="ax-matrix-display-canvas">
    <div class="ax-modern-empty-state">暂未触发查询分析。</div>
  </div>

  <!-- 浮层与弹窗系统 -->
  <div id="ax-global-overlay" class="ax-blur-overlay"></div>
  <div id="ax-dropdown-popover" class="ax-luxury-popover">
    <div class="ax-popover-inner" id="ax-popover-options-list"></div>
  </div>
  <div id="ax-toast-container" class="ax-toast-container"></div>
</div>
  `;
}

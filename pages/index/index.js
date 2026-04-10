Page({
  data: {
    basicSalary: '',
    performanceBonus: '',
    allowance: '',
    totalSalary: '0.00',
    
    startTime: '09:00',
    endTime: '18:00',
    presets: ['17:00', '17:30', '18:00', '18:30', '19:00'],
    
    isRunning: false,
    isOvertime: false,
    
    countdownStr: '00:00:00',
    earnedMoney: '0.00',
    lossMoney: '0.00',
    earnedBasic: '0.00',
    earnedPerformance: '0.00',
    earnedAllowance: '0.00',
    
    tickAnimation: false,
    
    showSalaryDetail: true,
    performanceShow: false,
    allowanceShow: false
  },

  timer: null,

  onLoad() {
    const savedBasicSalary = wx.getStorageSync('basicSalary');
    const savedPerformanceBonus = wx.getStorageSync('performanceBonus');
    const savedAllowance = wx.getStorageSync('allowance');
    
    if (savedBasicSalary) {
      this.setData({ basicSalary: savedBasicSalary });
    }
    if (savedPerformanceBonus) {
      this.setData({ performanceBonus: savedPerformanceBonus });
    }
    if (savedAllowance) {
      this.setData({ allowance: savedAllowance });
    }
    // 初始化薪资总计和显示标志
    this.updateTotalSalary();
    this.updateShowFlags();
  },

  onUnload() {
    this.stopTimer();
  },

  sanitizeMoneyValue(value) {
    value = value.replace(/[^\d.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return value;
  },

  bindBasicSalaryInput(e) {
    const value = this.sanitizeMoneyValue(e.detail.value);
    this.setData({ basicSalary: value });
    wx.setStorageSync('basicSalary', value);
    this.updateTotalSalary();
  },

  bindPerformanceBonusInput(e) {
    const value = this.sanitizeMoneyValue(e.detail.value);
    this.setData({ performanceBonus: value });
    wx.setStorageSync('performanceBonus', value);
    this.updateTotalSalary();
    this.updateShowFlags();  // 更新绩效显示标志
  },

  bindAllowanceInput(e) {
    const value = this.sanitizeMoneyValue(e.detail.value);
    this.setData({ allowance: value });
    wx.setStorageSync('allowance', value);
    this.updateTotalSalary();
    this.updateShowFlags();  // 更新补贴显示标志
  },

  toggleSalaryDetail() {
    this.setData({
      showSalaryDetail: !this.data.showSalaryDetail
    });
  },

  getTotalSalary() {
    const basic = parseFloat(this.data.basicSalary) || 0;
    const performance = parseFloat(this.data.performanceBonus) || 0;
    const allowance = parseFloat(this.data.allowance) || 0;
    return basic + performance + allowance;
  },

  updateTotalSalary() {
    const total = this.getTotalSalary();
    this.setData({
      totalSalary: total.toFixed(2)
    });
  },

  // 更新薪资构成显示标志（解决WXML不支持parseFloat的问题）
  updateShowFlags() {
    const performance = parseFloat(this.data.performanceBonus) || 0;
    const allowance = parseFloat(this.data.allowance) || 0;
    this.setData({
      performanceShow: performance > 0,
      allowanceShow: allowance > 0
    });
  },

  bindStartTimeChange(e) {
    this.setData({
      startTime: e.detail.value
    });
  },

  bindEndTimeChange(e) {
    this.setData({
      endTime: e.detail.value
    });
  },

  selectPreset(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      endTime: time
    });
  },

  getTodayDateWithTime(timeStr) {
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(now);
    date.setHours(h);
    date.setMinutes(m);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  },

  startTimer() {
    const totalSalary = this.getTotalSalary();
    if (!totalSalary) {
      wx.showToast({
        title: '请输入至少一项薪资构成',
        icon: 'none'
      });
      return;
    }

    const start = this.getTodayDateWithTime(this.data.startTime);
    const end = this.getTodayDateWithTime(this.data.endTime);
    
    if (start >= end) {
      wx.showToast({
        title: '下班时间需晚于上班时间',
        icon: 'none'
      });
      return;
    }

    this.setData({ isRunning: true });
    this.updateState();

    this.timer = setInterval(() => {
      this.updateState();
    }, 1000);
  },

  goBack() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setData({
      isRunning: false,
      isOvertime: false,
      countdownStr: '00:00:00',
      earnedMoney: '0.00',
      lossMoney: '0.00',
      earnedBasic: '0.00',
      earnedPerformance: '0.00',
      earnedAllowance: '0.00'
    });
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setData({
      isRunning: false,
      isOvertime: false,
      countdownStr: '00:00:00',
      earnedMoney: '0.00',
      lossMoney: '0.00',
      earnedBasic: '0.00',
      earnedPerformance: '0.00',
      earnedAllowance: '0.00'
    });
  },

  updateState() {
    const now = new Date();
    const start = this.getTodayDateWithTime(this.data.startTime);
    const end = this.getTodayDateWithTime(this.data.endTime);
    
    // 计算薪资总额和每秒工资
    const totalSalary = this.getTotalSalary();
    const totalWorkSeconds = (end - start) / 1000;
    const wagePerSecond = totalSalary / totalWorkSeconds;

    // 计算当前时间距离上下班的差值（秒）
    const diffToEnd = (end - now) / 1000;
    const diffFromStart = (now - start) / 1000;

    let isOvertime = false;
    let countdownStr = '';
    let earned = 0;
    let loss = 0;

    // 判断是否在工作时间内，计算已赚金额
    if (diffToEnd > 0) {
      isOvertime = false;
      countdownStr = this.formatDuration(diffToEnd);
      
      if (diffFromStart > 0) {
        // 已上班，按比例计算已赚金额
        earned = diffFromStart * wagePerSecond;
      } else {
        earned = 0;
      }
    } else {
      isOvertime = true;
      const overtimeSeconds = Math.abs(diffToEnd);
      countdownStr = this.formatDuration(overtimeSeconds);
      
      // 已拿满全日工资，计算额外损失金额
      earned = totalSalary;
      loss = overtimeSeconds * wagePerSecond;
    }

    // 按各薪资构成项占比计算分项已赚金额（日薪 = 基本工资 + 绩效 + 补贴）
    const basicRatio = totalSalary > 0 ? (parseFloat(this.data.basicSalary) || 0) / totalSalary : 0;
    const performanceRatio = totalSalary > 0 ? (parseFloat(this.data.performanceBonus) || 0) / totalSalary : 0;
    const allowanceRatio = totalSalary > 0 ? (parseFloat(this.data.allowance) || 0) / totalSalary : 0;
    
    this.setData({
      isOvertime,
      countdownStr,
      earnedMoney: earned.toFixed(2),
      lossMoney: loss.toFixed(2),
      tickAnimation: true,
      
      // 保存各构成项的已赚金额，用于明细展示
      earnedBasic: (earned * basicRatio).toFixed(2),
      earnedPerformance: (earned * performanceRatio).toFixed(2),
      earnedAllowance: (earned * allowanceRatio).toFixed(2)
    });
    
    setTimeout(() => {
        this.setData({ tickAnimation: false });
    }, 200);
  },

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
})

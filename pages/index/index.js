Page({
  data: {
    salary: '',
    salaryComponents: {
      baseSalary: '',
      performance: '',
      subsidy: ''
    },
    showSalaryDetail: false,
    startTime: '09:00',
    endTime: '18:00',
    presets: ['17:00', '17:30', '18:00', '18:30', '19:00'],
    
    isRunning: false,
    isOvertime: false,
    
    countdownStr: '00:00:00',
    earnedMoney: '0.00',
    lossMoney: '0.00',
    
    tickAnimation: false
  },

  timer: null,

  onLoad() {
    const savedSalary = wx.getStorageSync('salary');
    if (savedSalary) {
      this.setData({ salary: savedSalary });
    }
    // 读取本地存储的薪资构成数据，实现数据持久化
    const savedSalaryComponents = wx.getStorageSync('salaryComponents');
    if (savedSalaryComponents) {
      this.setData({ salaryComponents: savedSalaryComponents });
    }
  },

  onUnload() {
    this.stopTimer();
  },

  bindSalaryInput(e) {
    let value = e.detail.value;
    
    value = value.replace(/[^\d.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    this.setData({
      salary: value
    });
    wx.setStorageSync('salary', value);
  },

  toggleSalaryDetail() {
    this.setData({
      showSalaryDetail: !this.data.showSalaryDetail
    });
  },

  bindComponentInput(e) {
    // 获取当前编辑的薪资构成字段名，支持动态绑定
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
    
    // 过滤非数字字符，保证输入格式正确性
    value = value.replace(/[^\d.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    // 解构赋值更新对应薪资构成字段并持久化存储
    const salaryComponents = { ...this.data.salaryComponents };
    salaryComponents[field] = value;
    this.setData({ salaryComponents });
    wx.setStorageSync('salaryComponents', salaryComponents);

    // 根据薪资构成自动计算总日薪
    // 日薪计算公式：日薪 = 基本工资 + 绩效 + 补贴
    const baseSalary = parseFloat(salaryComponents.baseSalary) || 0;
    const performance = parseFloat(salaryComponents.performance) || 0;
    const subsidy = parseFloat(salaryComponents.subsidy) || 0;
    const totalSalary = (baseSalary + performance + subsidy).toFixed(2);
    if (totalSalary > 0) {
      this.setData({ salary: totalSalary });
      wx.setStorageSync('salary', totalSalary);
    }
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
    if (!this.data.salary) {
      wx.showToast({
        title: '请输入日薪',
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
      lossMoney: '0.00'
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
      lossMoney: '0.00'
    });
  },

  updateState() {
    const now = new Date();
    const start = this.getTodayDateWithTime(this.data.startTime);
    const end = this.getTodayDateWithTime(this.data.endTime);
    
    const salary = parseFloat(this.data.salary) || 0;
    const totalWorkSeconds = (end - start) / 1000;
    const wagePerSecond = salary / totalWorkSeconds;

    // 获取各薪资构成数值用于详细计算
    const baseSalary = parseFloat(this.data.salaryComponents.baseSalary) || 0;
    const performance = parseFloat(this.data.salaryComponents.performance) || 0;
    const subsidy = parseFloat(this.data.salaryComponents.subsidy) || 0;
    
    // 计算当前工作进度百分比[0,1]
    const workProgress = Math.min(Math.max((now - start) / (end - start), 0), 1);

    // 按工作进度实时计算各薪资构成已赚取金额
    // 各构成项实时薪资 = 该项设定值 * 当前工作进度
    const earnedBaseSalary = baseSalary * workProgress;
    const earnedPerformance = performance * workProgress;
    const earnedSubsidy = subsidy * workProgress;

    const diffToEnd = (end - now) / 1000;
    const diffFromStart = (now - start) / 1000;

    let isOvertime = false;
    let countdownStr = '';
    let earned = 0;
    let loss = 0;

    if (diffToEnd > 0) {
      isOvertime = false;
      countdownStr = this.formatDuration(diffToEnd);
      
      if (diffFromStart > 0) {
        earned = diffFromStart * wagePerSecond;
      } else {
        earned = 0;
      }
    } else {
      isOvertime = true;
      const overtimeSeconds = Math.abs(diffToEnd);
      countdownStr = this.formatDuration(overtimeSeconds);
      
      earned = salary;
      loss = overtimeSeconds * wagePerSecond;
    }

    this.setData({
      isOvertime,
      countdownStr,
      earnedMoney: earned.toFixed(2),
      earnedBaseSalary: earnedBaseSalary.toFixed(2),
      earnedPerformance: earnedPerformance.toFixed(2),
      earnedSubsidy: earnedSubsidy.toFixed(2),
      lossMoney: loss.toFixed(2),
      tickAnimation: true
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

Page({
  data: {
    salary: '',
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

  // 下班打卡功能
  checkOut() {
    // 获取当前时间
    const now = new Date();
    
    // 计算当日盈亏：实际收入 - 标准日薪，正值表示盈利（早下班），负值表示亏损（加班）
    const dailySalary = parseFloat(this.data.salary);
    const actualEarned = parseFloat(this.data.earnedMoney);
    const actualLoss = parseFloat(this.data.lossMoney);
    const profitLoss = (actualEarned - actualLoss - dailySalary).toFixed(2);
    
    // 格式化下班时间点
    const checkOutTime = now.toLocaleTimeString('zh-CN', { hour12: false });
    
    // 格式化日期
    const date = now.toLocaleDateString('zh-CN');
    
    // 生成唯一记录ID
    const id = Date.now().toString();

    // 构建下班记录，包含5个固定字段
    const record = {
      id: id,                    // 记录唯一ID
      date: date,                // 日期
      dailySalary: dailySalary,  // 日薪
      profitLoss: profitLoss,    // 当日盈亏情况
      checkOutTime: checkOutTime // 下班时间点
    };

    // 从本地存储获取历史记录，没有则初始化空数组
    const records = wx.getStorageSync('checkOutRecords') || [];
    // 将新记录添加到数组开头，最新的在最前面
    records.unshift(record);
    // 保存到本地存储
    wx.setStorageSync('checkOutRecords', records);

    // 停止计时器
    this.stopTimer();

    // 提示用户打卡成功
    wx.showToast({
      title: '下班打卡成功！',
      icon: 'success',
      duration: 2000
    });
  },

  updateState() {
    const now = new Date();
    const start = this.getTodayDateWithTime(this.data.startTime);
    const end = this.getTodayDateWithTime(this.data.endTime);
    
    const salary = parseFloat(this.data.salary);
    const totalWorkSeconds = (end - start) / 1000;
    const wagePerSecond = salary / totalWorkSeconds;

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
  },

  // 跳转到历史记录页面
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
})

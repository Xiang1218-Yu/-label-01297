const app = getApp()

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
    this.setData({
      salary: e.detail.value
    });
    wx.setStorageSync('salary', e.detail.value);
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
      earnedMoney: earned.toFixed(4),
      lossMoney: loss.toFixed(4),
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

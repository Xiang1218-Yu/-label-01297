/**
 * 首页 - 下班倒计时主页面
 * 展示薪资倒计时和赚钱进度
 */

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 日薪相关
    salary: '',
    // 是否启用详细薪资构成
    enableDetailedSalary: false,
    // 薪资构成明细
    salaryComponents: [],
    
    // 工作时间设置
    startTime: '09:00',
    endTime: '18:00',
    presets: ['17:00', '17:30', '18:00', '18:30', '19:00'],
    
    // 运行状态
    isRunning: false,
    isOvertime: false,
    
    // 显示数据
    countdownStr: '00:00:00',
    earnedMoney: '0.00',
    lossMoney: '0.00',
    
    // 动画状态
    tickAnimation: false,

    // 薪资构成实时金额明细
    componentEarnings: []
  },

  // 定时器引用
  timer: null,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadSalaryConfig();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从设置页面返回时刷新薪资配置
    this.loadSalaryConfig();
  },

  /**
   * 从本地存储加载薪资配置
   */
  loadSalaryConfig() {
    const savedConfig = wx.getStorageSync('salaryConfig');
    if (savedConfig) {
      this.setData({
        salary: savedConfig.calculatedTotal || '0',
        enableDetailedSalary: savedConfig.enableDetailedSalary || false,
        salaryComponents: savedConfig.salaryComponents || []
      });
    } else {
      // 兼容旧版本数据
      const oldSalary = wx.getStorageSync('salary');
      if (oldSalary) {
        this.setData({ salary: oldSalary });
      }
    }
  },

  onUnload() {
    this.stopTimer();
  },

  /**
   * 跳转到薪资构成设置页面
   */
  navigateToSalaryConfig() {
    wx.navigateTo({
      url: '/pages/salaryConfig/salaryConfig'
    });
  },

  /**
   * 处理日薪输入（简单模式）
   * @param {Object} e - 事件对象
   */
  bindSalaryInput(e) {
    let value = e.detail.value;

    // 移除非数字和小数点字符
    value = value.replace(/[^\d.]/g, '');

    // 处理多个小数点的情况
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // 限制小数点后两位
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    this.setData({
      salary: value
    });
    wx.setStorageSync('salary', value);
  },

  /**
   * 上班时间选择器变化处理
   * @param {Object} e - 事件对象
   */
  bindStartTimeChange(e) {
    this.setData({
      startTime: e.detail.value
    });
  },

  /**
   * 下班时间选择器变化处理
   * @param {Object} e - 事件对象
   */
  bindEndTimeChange(e) {
    this.setData({
      endTime: e.detail.value
    });
  },

  /**
   * 选择预设下班时间
   * @param {Object} e - 事件对象
   */
  selectPreset(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      endTime: time
    });
  },

  /**
   * 根据时间字符串获取今天的日期对象
   * @param {string} timeStr - 时间字符串，格式为 HH:mm
   * @returns {Date} 日期对象
   */
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

  /**
   * 开始倒计时
   */
  startTimer() {
    if (!this.data.salary) {
      wx.showToast({
        title: '请先设置日薪',
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

    // 每秒更新一次状态
    this.timer = setInterval(() => {
      this.updateState();
    }, 1000);
  },

  /**
   * 返回设置页面
   */
  goBack() {
    this.stopTimer();
  },

  /**
   * 停止计时器并重置状态
   */
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

  /**
   * 更新倒计时和赚钱状态
   */
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
      // 正常工作时间
      isOvertime = false;
      countdownStr = this.formatDuration(diffToEnd);

      if (diffFromStart > 0) {
        earned = diffFromStart * wagePerSecond;
      } else {
        earned = 0;
      }
    } else {
      // 加班时间
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
      tickAnimation: true,
      // 更新薪资构成明细的实时金额
      componentEarnings: this.calculateComponentEarnings()
    });

    // 触发动画效果
    setTimeout(() => {
      this.setData({ tickAnimation: false });
    }, 200);
  },

  /**
   * 格式化时长显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时间字符串 HH:mm:ss
   */
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const pad = n => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  },

  /**
   * 计算各薪资构成项目的实时金额
   * @returns {Array} 带有实时金额的薪资构成项目列表
   */
  calculateComponentEarnings() {
    const { salaryComponents, earnedMoney, enableDetailedSalary } = this.data;

    if (!enableDetailedSalary || !salaryComponents.length) {
      return [];
    }

    const totalSalary = parseFloat(this.data.salary) || 1;
    const earned = parseFloat(earnedMoney) || 0;
    const ratio = earned / totalSalary;

    // 计算每个薪资构成项目的实时金额
    return salaryComponents.map(component => {
      const amount = parseFloat(component.amount) || 0;
      const currentAmount = amount * ratio;
      return {
        ...component,
        currentAmount: currentAmount.toFixed(2),
        originalAmount: amount.toFixed(2)
      };
    });
  },

  /**
   * 获取格式化后的薪资构成实时数据（供WXML使用）
   * @returns {Array} 带有格式化金额的薪资构成项目列表
   */
  getFormattedComponents() {
    return this.calculateComponentEarnings();
  }
});

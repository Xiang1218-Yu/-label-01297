/**
 * 薪资构成配置页面
 * 允许用户设置详细的薪资构成：基本工资、绩效、补贴等
 */

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 是否启用详细薪资构成模式
    enableDetailedSalary: false,
    
    // 薪资构成项目列表
    salaryComponents: [
      { id: 'baseSalary', name: '基本工资', amount: '', icon: '💰', color: '#2f80ed' },
      { id: 'performance', name: '绩效工资', amount: '', icon: '📈', color: '#52c41a' },
      { id: 'subsidy', name: '补贴', amount: '', icon: '🍱', color: '#fa8c16' },
      { id: 'bonus', name: '奖金', amount: '', icon: '🎁', color: '#eb2f96' },
      { id: 'other', name: '其他', amount: '', icon: '📝', color: '#8c8c8c' }
    ],
    
    // 总日薪（简单模式）
    totalSalary: '',
    
    // 计算后的总日薪
    calculatedTotal: '0.00'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadSalaryConfig();
  },

  /**
   * 从本地存储加载薪资配置
   */
  loadSalaryConfig() {
    const savedConfig = wx.getStorageSync('salaryConfig');
    if (savedConfig) {
      this.setData({
        enableDetailedSalary: savedConfig.enableDetailedSalary || false,
        salaryComponents: savedConfig.salaryComponents || this.data.salaryComponents,
        totalSalary: savedConfig.totalSalary || ''
      });
      this.calculateTotal();
    } else {
      // 兼容旧版本数据
      const oldSalary = wx.getStorageSync('salary');
      if (oldSalary) {
        this.setData({
          totalSalary: oldSalary
        });
      }
    }
  },

  /**
   * 切换薪资模式（简单/详细）
   * @param {Object} e - 事件对象
   */
  toggleSalaryMode(e) {
    const enableDetailedSalary = e.detail.value;
    this.setData({ enableDetailedSalary });
    this.calculateTotal();
  },

  /**
   * 处理总日薪输入（简单模式）
   * @param {Object} e - 事件对象
   */
  bindTotalSalaryInput(e) {
    const value = this.formatMoneyInput(e.detail.value);
    this.setData({ totalSalary: value });
  },

  /**
   * 处理薪资构成项目输入
   * @param {Object} e - 事件对象
   */
  bindComponentInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = this.formatMoneyInput(e.detail.value);
    
    const salaryComponents = [...this.data.salaryComponents];
    salaryComponents[index].amount = value;
    
    this.setData({ salaryComponents });
    this.calculateTotal();
  },

  /**
   * 格式化金额输入（只允许数字和小数点后两位）
   * @param {string} value - 输入值
   * @returns {string} 格式化后的值
   */
  formatMoneyInput(value) {
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
    
    return value;
  },

  /**
   * 计算总日薪
   */
  calculateTotal() {
    if (this.data.enableDetailedSalary) {
      // 详细模式：累加各项薪资
      let total = 0;
      this.data.salaryComponents.forEach(component => {
        const amount = parseFloat(component.amount) || 0;
        total += amount;
      });
      this.setData({
        calculatedTotal: total.toFixed(2)
      });
    } else {
      // 简单模式：使用直接输入的总薪资
      const total = parseFloat(this.data.totalSalary) || 0;
      this.setData({
        calculatedTotal: total.toFixed(2)
      });
    }
  },

  /**
   * 添加自定义薪资项目
   */
  addCustomComponent() {
    wx.showModal({
      title: '添加薪资项目',
      editable: true,
      placeholderText: '请输入项目名称',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newComponent = {
            id: 'custom_' + Date.now(),
            name: res.content.trim(),
            amount: '',
            icon: '💵',
            color: '#722ed1',
            isCustom: true
          };
          
          const salaryComponents = [...this.data.salaryComponents, newComponent];
          this.setData({ salaryComponents });
        }
      }
    });
  },

  /**
   * 删除自定义薪资项目
   * @param {Object} e - 事件对象
   */
  deleteComponent(e) {
    const index = e.currentTarget.dataset.index;
    const component = this.data.salaryComponents[index];
    
    // 只能删除自定义项目
    if (!component.isCustom) {
      wx.showToast({
        title: '默认项目不能删除',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定删除"${component.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const salaryComponents = [...this.data.salaryComponents];
          salaryComponents.splice(index, 1);
          this.setData({ salaryComponents });
          this.calculateTotal();
        }
      }
    });
  },

  /**
   * 保存薪资配置
   */
  saveSalaryConfig() {
    const config = {
      enableDetailedSalary: this.data.enableDetailedSalary,
      salaryComponents: this.data.salaryComponents,
      totalSalary: this.data.totalSalary,
      calculatedTotal: this.data.calculatedTotal
    };
    
    // 保存到本地存储
    wx.setStorageSync('salaryConfig', config);
    // 兼容旧版本：同时保存总薪资
    wx.setStorageSync('salary', this.data.calculatedTotal);
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  },

  /**
   * 返回上一页（微信原生导航栏返回按钮触发）
   */
  goBack() {
    wx.navigateBack();
  }
});

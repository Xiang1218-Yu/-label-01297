Page({
  data: {
    records: [],
    isEmpty: false
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  // 加载历史记录数据
  loadRecords() {
    // 从本地存储获取记录
    const rawRecords = wx.getStorageSync('workHistory') || [];
    
    // 预处理数据，计算盈亏显示所需字段（wxml不支持复杂JS函数调用）
    const records = rawRecords.map(item => {
      const profitLossNum = parseFloat(item.profitLoss);
      return {
        ...item,
        // 确保5个固定字段都存在并正确格式化
        id: item.id,
        date: item.date,
        dailySalary: item.dailySalary,
        profitLoss: item.profitLoss,
        offWorkTime: item.offWorkTime,
        // 预处理渲染用字段
        profitLossNum: profitLossNum,
        isProfit: profitLossNum >= 0,
        profitLossAbs: Math.abs(profitLossNum).toFixed(2)
      };
    });
    
    this.setData({
      records: records,
      isEmpty: records.length === 0
    });
  },

  // 删除单条记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 过滤掉要删除的记录
          const records = this.data.records.filter(item => item.id !== id);
          // 更新本地存储
          wx.setStorageSync('workHistory', records);
          // 更新页面数据
          this.setData({
            records: records,
            isEmpty: records.length === 0
          });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 清空所有记录
  clearAllRecords() {
    if (this.data.records.length === 0) return;
    
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('workHistory');
          this.setData({
            records: [],
            isEmpty: true
          });
          
          wx.showToast({
            title: '已清空所有记录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
})

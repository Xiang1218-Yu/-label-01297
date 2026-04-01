Page({
  data: {
    records: []
  },

  // 页面加载时获取历史记录
  onLoad() {
    this.loadHistoryRecords();
  },

  // 页面显示时刷新记录
  onShow() {
    this.loadHistoryRecords();
  },

  // 加载历史记录
  loadHistoryRecords() {
    const records = wx.getStorageSync('historyRecords') || [];
    this.setData({
      records: records
    });
  },

  // 删除单条记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条打卡记录吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          let records = wx.getStorageSync('historyRecords') || [];
          records = records.filter(record => record.id !== id);
          wx.setStorageSync('historyRecords', records);
          this.setData({
            records: records
          });
          wx.showToast({
            title: '已删除记录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 清空所有记录
  clearAllRecords() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有打卡记录吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('historyRecords');
          this.setData({
            records: []
          });
          wx.showToast({
            title: '已清空所有记录',
            icon: 'success'
          });
        }
      }
    });
  }
})

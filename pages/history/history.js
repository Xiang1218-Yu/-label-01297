Page({
  data: {
    // 历史记录列表
    records: []
  },

  onLoad() {
    // 页面加载时获取历史记录
    this.loadRecords();
  },

  onShow() {
    // 页面显示时刷新记录
    this.loadRecords();
  },

  // 从本地存储加载下班记录
  loadRecords() {
    const records = wx.getStorageSync('checkOutRecords') || [];
    // 处理数据格式化，确保日薪正常显示
    const formattedRecords = records.map(item => {
      return {
        ...item,
        // 确保dailySalary格式化为2位小数的字符串
        dailySalary: (Number(item.dailySalary) || 0).toFixed(2)
      };
    });
    this.setData({
      records: formattedRecords
    });
  },

  // 清空所有历史记录
  clearAllRecords() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('checkOutRecords');
          this.setData({
            records: []
          });
          wx.showToast({
            title: '已清空记录',
            icon: 'success'
          });
        }
      }
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
          const records = this.data.records.filter(item => item.id !== id);
          wx.setStorageSync('checkOutRecords', records);
          this.setData({
            records: records
          });
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
})

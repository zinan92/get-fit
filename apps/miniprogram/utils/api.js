const app = getApp();

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...(app.globalData.sessionToken ? { Authorization: `Bearer ${app.globalData.sessionToken}` } : {}),
        ...(options.header || {})
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else reject(response.data || { error: { code: 'HTTP_ERROR' } });
      },
      fail: reject
    });
  });
}

module.exports = { request };

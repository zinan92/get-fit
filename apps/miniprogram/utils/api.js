const preview = require('./preview');

// Every call goes to the single `api` cloud function. Identity is the caller's WeChat OPENID,
// injected by the platform; nothing here carries a token or a client id.
function request(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.data;
  if (getApp().globalData.preview) return preview.respond(path, method, body);
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'api',
      data: { path, method, body },
      success: ({ result }) => {
        if (result && result.statusCode >= 200 && result.statusCode < 300) resolve(result.body);
        else reject((result && result.body) || { error: { code: 'CLOUD_FUNCTION_ERROR' } });
      },
      fail: () => reject({ error: { code: 'NETWORK_ERROR', message: '网络不太稳定，稍后再试' } })
    });
  });
}

module.exports = { request };

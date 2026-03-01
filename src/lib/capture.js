// 全局状态对象 - 确保在所有模块实例之间共享
global.captureState = global.captureState || {
  captureInterval: null,
  ffmpegProcess: null
};

module.exports = global.captureState;

/**
 * 时间工具函数
 * 用于统一处理时间的存储和显示
 * 
 * 约定：数据库统一存储本地时间（北京时间 UTC+8）
 */

/**
 * 获取当前本地时间字符串
 * 用于后端保存时间到数据库
 * 
 * @returns 本地时间字符串，格式如 "2026-03-12 09:25:47"
 */
export const getLocalTimeString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 将时间字符串解析为时间戳
 * 数据库存储的是本地时间，直接解析即可
 * 
 * @param timeStr - 时间字符串，格式如 "2026-03-12 09:25:47"
 * @returns 时间戳（毫秒），如果输入为空则返回 0
 */
export const parseTime = (timeStr: string | null): number => {
  if (!timeStr) return 0;
  // 将空格替换为 T，本地时间不需要 Z 后缀
  const normalized = timeStr.replace(' ', 'T');
  return new Date(normalized).getTime();
};

/**
 * 格式化时间字符串用于显示
 * 由于数据库已经是本地时间，直接返回即可
 * 
 * @param timeStr - 时间字符串，格式如 "2026-03-12 09:25:47"
 * @returns 时间字符串，如果输入为空则返回 "-"
 */
export const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '-';
  return timeStr;
};

/**
 * 获取当前时间的时间戳
 * 用于前端计时等场景
 * 
 * @returns 当前时间戳（毫秒）
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};
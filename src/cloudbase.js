/**
 * cloudbase.js - 腾讯云开发 CloudBase 数据库封装
 * 提供排行榜的云端增删改查，含匿名认证
 * 如果云端不可用，自动降级到 localStorage
 */

const ENV_ID = 'snakeworm-d0g5b63c1b6ed5cc9';
const COLLECTION_NAME = 'leaderboard';
const LOCAL_KEY = 'snakeworm_leaderboard';
const MAX_ENTRIES = 100;

let _app = null;
let _db = null;
let _collection = null;
let _ready = false;
let _initPromise = null;

/**
 * 初始化 CloudBase（只执行一次）
 * @returns {Promise<boolean>} 是否初始化成功
 */
export async function initCloud() {
    if (_initPromise) return _initPromise;
    _initPromise = _doInit();
    return _initPromise;
}

async function _doInit() {
    try {
        // CDN 全局变量可能是 cloudbase 或 tcb
        const sdk = (typeof cloudbase !== 'undefined') ? cloudbase
                   : (typeof tcb !== 'undefined') ? tcb
                   : null;
        if (!sdk) {
            console.warn('[CloudBase] SDK 未加载，使用本地存储');
            return false;
        }

        _app = sdk.init({ env: ENV_ID });
        
        // 匿名登录（auth 是属性，不是函数调用）
        const auth = _app.auth;
        if (auth && typeof auth.signInAnonymously === 'function') {
            await auth.signInAnonymously();
        }
        
        _db = _app.database();
        _collection = _db.collection(COLLECTION_NAME);
        _ready = true;
        console.log('[CloudBase] 初始化成功，匿名登录完成');
        return true;
    } catch (e) {
        console.warn('[CloudBase] 初始化失败，降级到本地存储:', e.message);
        _ready = false;
        return false;
    }
}

/**
 * 云端是否就绪
 */
export function isCloudReady() {
    return _ready;
}

/**
 * 从云端获取排行榜（按分数降序，前 N 条）
 * @returns {Promise<Array|null>} 数据数组，失败返回 null
 */
export async function cloudGetTop() {
    if (!_ready) return null;
    try {
        const res = await _collection
            .orderBy('score', 'desc')
            .limit(MAX_ENTRIES)
            .get();
        return res.data || [];
    } catch (e) {
        console.warn('[CloudBase] 查询排行榜失败:', e.message);
        return null;
    }
}

/**
 * 提交成绩到云端
 * @param {object} entry { name, length, score, children, date }
 * @returns {Promise<boolean>} 是否成功
 */
export async function cloudAddScore(entry) {
    if (!_ready) return false;
    try {
        await _collection.add({
            name: entry.name.substring(0, 12),
            length: entry.length,
            score: entry.score,
            children: entry.children,
            date: entry.date,
            createdAt: new Date()
        });
        return true;
    } catch (e) {
        console.warn('[CloudBase] 提交成绩失败:', e.message);
        return false;
    }
}

/**
 * 从云端删除一条记录
 * @param {string} docId 文档 ID
 * @returns {Promise<boolean>}
 */
export async function cloudDeleteEntry(docId) {
    if (!_ready) return false;
    try {
        await _collection.doc(docId).remove();
        return true;
    } catch (e) {
        console.warn('[CloudBase] 删除记录失败:', e.message);
        return false;
    }
}

/**
 * 同时保存到云端和本地
 * @param {object} entry
 * @returns {Promise<boolean>} 云端是否成功
 */
export async function saveScore(entry) {
    // 本地先存一份
    _saveLocal(entry);
    // 云端异步提交
    return await cloudAddScore(entry);
}

// ====== localStorage 兼容层 ======

function _getLocalData() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function _saveLocal(entry) {
    const data = _getLocalData();
    data.push(entry);
    data.sort((a, b) => b.score - a.score);
    if (data.length > MAX_ENTRIES) data.length = MAX_ENTRIES;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

export function getLocalData() {
    return _getLocalData();
}

export function deleteLocalEntry(origIdx) {
    const data = _getLocalData();
    if (origIdx >= 0 && origIdx < data.length) {
        data.splice(origIdx, 1);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    }
}

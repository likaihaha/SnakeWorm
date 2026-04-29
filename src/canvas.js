/**
 * canvas.js - Canvas 元素和上下文的共享引用
 * 所有需要绘制的模块从此处导入 ctx
 */
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

/**
 * Vector - 2D 向量工具类
 * 不可变方法返回新对象，就地修改方法返回 this 支持链式调用
 */
export class Vector {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector(this.x * n, this.y * n); }
    normalize() {
        const m = this.mag();
        return m === 0 ? new Vector(0, 0) : new Vector(this.x / m, this.y / m);
    }
    addSelf(v) { this.x += v.x; this.y += v.y; return this; }
    subSelf(v) { this.x -= v.x; this.y -= v.y; return this; }
    multSelf(n) { this.x *= n; this.y *= n; return this; }
    normalizeSelf() {
        const m = this.mag();
        if (m > 0) { this.x /= m; this.y /= m; } else { this.x = 0; this.y = 0; }
        return this;
    }
    set(x, y) { this.x = x; this.y = y; return this; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    dist(v) {
        const dx = this.x - v.x, dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    static randomDir() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
    clone() { return new Vector(this.x, this.y); }
}

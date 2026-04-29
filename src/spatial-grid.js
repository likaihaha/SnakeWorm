/**
 * SpatialGrid - 空间网格分区类
 * 用于加速碰撞检测，将空间划分为网格，只检测头部附近的段
 */
export class SpatialGrid {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.cells = new Array(this.cols * this.rows);
        this._queryResults = [];
        this.clear();
    }

    clear() {
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i]) {
                this.cells[i].length = 0;
            } else {
                this.cells[i] = [];
            }
        }
    }

    getCellIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        return row * this.cols + col;
    }

    insert(entity, x, y) {
        const index = this.getCellIndex(x, y);
        if (index >= 0) {
            this.cells[index].push(entity);
        }
    }

    query(x, y, radius) {
        const results = this._queryResults;
        results.length = 0;
        const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const index = row * this.cols + col;
                const cell = this.cells[index];
                for (const entity of cell) {
                    results.push(entity);
                }
            }
        }
        return results;
    }
}

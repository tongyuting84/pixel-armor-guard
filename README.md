# 像素装甲守卫

原创的单人 Canvas 坦克守卫游戏。使用纯 HTML、CSS 和 JavaScript 实现，不包含第三方游戏素材。

## 操作

- `WASD` 或方向键：移动
- `空格`：发射
- `P`：暂停
- 触屏设备：使用屏幕方向键和发射按钮

## 本地预览

```bash
python3 -m http.server 8080 --directory dist
```

访问 `http://localhost:8080`。

## 容器运行

```bash
docker build -t pixel-armor-guard:latest .
docker run --rm -p 8080:80 pixel-armor-guard:latest
```

访问 `http://localhost:8080`，健康检查地址为 `/healthz`。

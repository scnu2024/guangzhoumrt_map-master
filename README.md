# 广州地铁路径规划可视化

一个基于 Flask + 原生前端的广州地铁互动地图，可以在浏览器内计算“站数最少”或“换乘最少”的路线，并在 SVG 地铁图上高亮展示。

- 站点搜索、交换起终点、点击地图设置起终点
- 双策略：最少站数（BFS）/最少换乘（带线路权重的 Dijkstra）
- 路线总览文字 + SVG 轨迹、起终点标记
- 支持缩放、重置视图

## 快速开始

1. 准备环境（Python 3.8+）：
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows 用 .venv\\Scripts\\activate
   pip install flask
   ```
2. 启动本地服务：
   ```bash
   python app.py
   ```
3. 打开浏览器访问 http://127.0.0.1:5000

## 使用说明

- 左侧输入框选择/搜索起点、终点，或在地图上点击站名后选择“设为起点/终点”。
- 策略切换：
  - `站数最少`：纯站点数最短路径（广度优先）。
  - `换乘最少`：优先减少换乘次数，再比较站点数。
- 点击“规划路线”后，右侧展示路线列表和地图高亮。

## API

`GET /api/v1/?start=<起点>&end=<终点>&strategy=<stations|lines>`

- `strategy=stations`：返回站数最短路径。
- `strategy=lines`：返回换乘次数最少的路径。
- 成功时返回 `{"route": ["站A","站B",... ]}`；找不到路径时返回 400。

## 代码与数据结构

- `app.py`：Flask 入口、API 路由。
- `graph.py`：最短路径（BFS）与最少换乘算法，`build_edge_lines` 从 `guangzhou/*.json` 构建线路连接。
- `templates/index.html`：页面骨架与 SVG 地铁图（`templates/stations_gz1.svg`）。
- `static/front-end.js`：前端交互、地图高亮、策略切换、缩放。
- `static/style.css`：样式。
- `static/stations_gz.json`：站点邻接表，用于后台计算。
- `static/stations_gz.js`：供前端搜索与标注使用的站点数据。
- `guangzhou/*.json`：各线路的原始数据，供构建换乘权重。

## 扩展与定制

- 替换 `static/stations_gz.json` 为新的城市邻接表，同时更新 `templates/stations_gz1.svg` 与 `static/stations_gz.js` 的站点 ID/坐标，即可支持新线路图。
- 若有新增线路数据，可在 `guangzhou/` 追加对应 JSON，`build_edge_lines` 会自动解析以支持“换乘最少”策略。

## 开发与调试

- 默认 `app.run(debug=True)`，修改代码后自动重启。
- 如需静态资源缓存控制，可在浏览器开启无缓存模式或自行在 Flask 中添加缓存配置。

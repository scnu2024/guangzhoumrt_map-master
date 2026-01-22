# 广州地铁路径规划可视化系统

一个基于 **Flask + 原生前端** 的广州地铁交互式地图应用。支持实时路线规划、多种搜索策略、地图可视化高亮等功能。

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-Latest-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 核心功能

- 🔍 **智能搜索**：站点名称搜索、模糊匹配
- 📍 **多种设置方式**：输入框选择、地图点击、起终点交换
- ⚡ **双重策略算法**：
  - **站数最少**：BFS 广度优先搜索
  - **换乘最少**：带权重的 Dijkstra 算法
- 🗺️ **交互式地图**：SVG 路线高亮、缩放、重置视图
- 📊 **详细路线信息**：分段线路、换乘详情、站点列表
- 🎯 **实时 API**：支持 RESTful 调用

## 🚀 快速开始

### 环境要求

- Python 3.8+
- Flask（推荐最新版本）

### 安装与运行

1. **克隆项目**
   ```bash
   git clone git@github.com:scnu2024/guangzhoumrt_map-master.git
   cd guangzhoumrt_map-master
   ```

2. **创建虚拟环境**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # macOS/Linux
   # 或
   .venv\Scripts\activate  # Windows
   ```

3. **安装依赖**
   ```bash
   pip install flask
   ```

4. **启动应用**
   ```bash
   python app.py
   ```

5. **访问应用**
   在浏览器中打开：`http://127.0.0.1:5000`

## 📖 使用说明

### 基础操作

1. **选择起点和终点**
   - 在左侧搜索框输入站点名称
   - 或直接在地图上点击站点名称
   - 支持起终点快速交换

2. **选择搜索策略**
   - **最少站数** ⭐：优先选择经过站点数最少的路线（纯图论最短路）
   - **最少换乘** ⭐⭐：优先减少换乘次数，其次比较站点数

3. **查看路线结果**
   - 右侧显示详细的路线信息
   - 地图自动高亮显示路线
   - 显示每段线路、换乘站点和总站数

### 地图交互

- **缩放**：鼠标滚轮或触控板
- **重置视图**：点击"重置"按钮
- **站点标注**：鼠标悬停显示站点信息

## 🔌 API 文档

### 路线规划 API

**请求**
```
GET /api/v1/?start=<起点>&end=<终点>&strategy=<策略>
```

**参数**

| 参数 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `start` | ✅ | 起始站点名称 | 天河城 |
| `end` | ✅ | 终点站点名称 | 广州南站 |
| `strategy` | ❌ | 搜索策略，默认为 `stations` | `stations` 或 `lines` |

**策略说明**

| 策略 | 说明 |
|------|------|
| `stations` | 最少站数路线（BFS） |
| `lines` | 最少换乘路线（Dijkstra） |

**成功响应 (200)**
```json
{
  "route": ["天河城", "体育中心南", "广州南站"],
  "transfers": 1,
  "segments": [
    {
      "line": "5号线",
      "start": "天河城",
      "end": "体育中心南",
      "stations": ["天河城", "体育中心南"]
    }
  ]
}
```

**失败响应 (400)**
```json
{
  "route": "null"
}
```

**示例请求**
```bash
# 最少站数
curl "http://127.0.0.1:5000/api/v1/?start=天河城&end=广州南站&strategy=stations"

# 最少换乘
curl "http://127.0.0.1:5000/api/v1/?start=天河城&end=广州南站&strategy=lines"
```

## 📁 项目结构

```
.
├── app.py                          # Flask 应用入口
├── graph.py                        # 图论算法（BFS、Dijkstra）
├── templates/
│   ├── index.html                  # 主页面
│   └── stations_gz1.svg            # 广州地铁线路图（SVG）
├── static/
│   ├── front-end.js                # 前端交互逻辑
│   ├── style.css                   # 样式表
│   ├── stations_gz.json            # 站点邻接表（后端使用）
│   └── stations_gz.js              # 站点数据（前端使用）
├── guangzhou/                      # 各线路原始数据
│   ├── line1.json                  # 1号线
│   ├── line2.json                  # 2号线
│   ├── ... 
│   └── APM.json                    # APM 线
└── README.md                       # 项目文档
```

## 🔧 核心模块

### app.py
- **功能**：Flask Web 服务器和 API 端点
- **主要路由**：
  - `GET /`：主页面
  - `GET /api/v1/`：路线规划 API

### graph.py
- **load_graph()**：加载站点邻接表
- **shortest_path()**：BFS 最短路径算法
- **shortest_path_min_transfer()**：Dijkstra 最少换乘算法
- **build_edge_lines()**：构建边到线路的映射
- **count_transfers()**：计算路线的换乘详情

### static/front-end.js
- 站点搜索与自动完成
- 地图交互（缩放、平移）
- API 调用和结果渲染
- 路线高亮显示

### static/style.css
- 响应式布局
- 地图样式
- UI 组件样式

## 🧪 测试示例

```javascript
// 在浏览器开发者工具中测试 API
fetch('/api/v1/?start=天河城&end=广州南站&strategy=stations')
  .then(res => res.json())
  .then(data => console.log(data))
```

## 📊 数据结构

### stations_gz.json 格式（站点邻接表）
```json
{
  "天河城": ["体育中心南", "体育西路"],
  "体育中心南": ["天河城", "广州南站"],
  ...
}
```

### guangzhou/*.json 格式（线路数据）
```json
{
  "name": "1号线",
  "stations": ["西门口", "陈家祠", "宝源路", ...]
}
```

## 🎨 算法说明

### BFS（最少站数）
- 使用广度优先搜索遍历图
- 找到从起点到终点的最短路径
- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V)

### Dijkstra（最少换乘）
- 将换乘权重设为 1，相同线路权重设为 0
- 计算最小权重路径
- 优先减少换乘，其次最少站数
- **时间复杂度**：O((V + E) log V)
- **空间复杂度**：O(V)

## 🔄 扩展与定制

### 支持新城市

1. 替换 `static/stations_gz.json` 为新城市的站点邻接表
2. 更新 `templates/stations_gz1.svg` 为新的地铁线路图 SVG
3. 更新 `static/stations_gz.js` 的站点坐标信息
4. 在 `guangzhou/` 目录下添加新城市的线路数据 JSON

### 增加新线路

在 `guangzhou/` 目录中添加新的线路 JSON 文件，格式：
```json
{
  "name": "新线路名称",
  "stations": ["站点1", "站点2", "站点3", ...]
}
```

`build_edge_lines()` 会自动解析并支持"换乘最少"策略。

## 🛠️ 开发与调试

- Flask 应用默认运行 `debug=True`，修改代码后自动重启
- 前端资源可能被浏览器缓存，调试时可开启无缓存模式
- 建议使用浏览器开发者工具的 Network 标签监测 API 调用

## 📝 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 📧 联系方式

- GitHub：[@scnu2024](https://github.com/scnu2024)
- 项目地址：[guangzhoumrt_map-master](https://github.com/scnu2024/guangzhoumrt_map-master)

## 🔗 相关资源

- [Flask 官方文档](https://flask.palletsprojects.com/)
- [广州地铁官网](https://www.gzmtr.com/)
- [SVG 规范](https://www.w3.org/TR/SVG2/)
- [Dijkstra 算法详解](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)

## 📌 更新日志

### v1.0.0 (2026-01-22)
- ✅ 初版发布
- ✅ 支持 BFS 和 Dijkstra 两种算法
- ✅ 完整的 SVG 地图交互
- ✅ RESTful API 接口
- ✅ 详细的路线换乘信息
- ✅ 站点搜索功能
- ✅ 多种起终点设置方式

---

**Made with ❤️ by SCNU**

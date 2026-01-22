import json
import glob
import os
import re
from collections import deque, defaultdict


def load_graph(file_name):
    with open(file_name) as f:
        data = json.load(f)
        return data


def _edge_key(a, b):
    return '|'.join(sorted((a, b)))


def _normalize_line_name(line_name):
    """提取线路的核心名称，忽略方向信息"""
    if not line_name:
        return None
    match = re.match(r'^([^(]+)', line_name)
    if match:
        return match.group(1).strip()
    return line_name


def count_transfers(path, edge_lines):
    """计算路径的换乘次数，并返回详细线路信息"""
    if not path or len(path) < 2:
        return 0, []
    
    current_line = None
    transfers = 0
    segments = []  # 存储每段线路信息: {line: 线路名, start: 起始站, end: 终点站, stations: [站点列表]}
    current_segment = None
    
    for i in range(len(path) - 1):
        a, b = path[i], path[i+1]
        lines = edge_lines.get(_edge_key(a, b), [])
        normalized = set(_normalize_line_name(l) for l in lines if l)
        
        if not normalized:
            # 如果没有线路信息，继续当前段
            if current_segment:
                current_segment['stations'].append(b)
                current_segment['end'] = b
            continue
        
        if current_line is None:
            # 第一段线路
            current_line = list(normalized)[0]
            current_segment = {
                'line': current_line,
                'start': a,
                'end': b,
                'stations': [a, b]
            }
        elif current_line in normalized:
            # 继续当前线路
            current_segment['stations'].append(b)
            current_segment['end'] = b
        else:
            # 换乘
            transfers += 1
            segments.append(current_segment)
            current_line = list(normalized)[0]
            current_segment = {
                'line': current_line,
                'start': a,
                'end': b,
                'stations': [a, b]
            }
    
    # 添加最后一段
    if current_segment:
        segments.append(current_segment)
    
    return transfers, segments


def find_path(graph, start, end, path=[]):
    path = path + [start]
    if start == end:
        return path
    if start not in list(graph.keys()):
        return None
    for node in graph[start]:
        if node not in path:
            newpath = find_path(graph, node, end, path)
            if newpath:
                return newpath
    return None


def all_paths(graph, start, end, path=[]):
    path = path + [start]
    if start == end:
        return [path]
    if start not in list(graph.keys()):
        return []
    paths = []
    for node in graph[start]:
        if node not in path:
            newpaths = all_paths(graph, node, end, path)
            for newpath in newpaths:
                paths.append(newpath)
    return paths


def shortest_path(graph, start, end, path=[]):
    # Use BFS to avoid deep recursion and find the minimal hop path.
    if start not in graph or end not in graph:
        return None
    if start == end:
        return [start]

    visited = {start}
    queue = deque([(start, [start])])

    while queue:
        node, path = queue.popleft()
        for neighbor in graph.get(node, []):
            if neighbor in visited:
                continue
            new_path = path + [neighbor]
            if neighbor == end:
                return new_path
            visited.add(neighbor)
            queue.append((neighbor, new_path))
    return None


def build_edge_lines(data_dir):
    """
    Parse guangzhou/*.json to build an edge->lines mapping.
    Returns dict with key "stationA|stationB" sorted, value set of line names.
    """
    edge_lines = defaultdict(set)
    pattern = os.path.join(data_dir, '*.json')
    for path in glob.glob(pattern):
        try:
            data = json.load(open(path))
        except Exception:
            continue
        for line in data.get('data', {}).get('busline_list', []):
            line_name = line.get('name')
            stations = line.get('stations') or []
            names = [s.get('name') for s in stations if s.get('name')]
            for a, b in zip(names, names[1:]):
                key = '|'.join(sorted((a, b)))
                edge_lines[key].add(line_name)
    # convert sets to lists for JSON safety if needed
    return {k: sorted(v) for k, v in edge_lines.items()}


def shortest_path_min_transfer(graph, edge_lines, start, end):
    """
    Find path minimizing transfers first, then station count.
    edge_lines: mapping "a|b" -> list of line names connecting a and b.
    """
    if start not in graph or end not in graph:
        return None
    if start == end:
        return [start]

    import heapq

    def edge_key(a, b):
        return '|'.join(sorted((a, b)))
    
    def normalize_line_name(line_name):
        """提取线路的核心名称，忽略方向信息"""
        if not line_name:
            return None
        # 移除括号及其内容，只保留主要线路名
        import re
        match = re.match(r'^([^(]+)', line_name)
        if match:
            return match.group(1).strip()
        return line_name

    # 使用Dijkstra算法，优先级：换乘次数最少，其次站数最少
    visited = {}
    heap = []
    # (transfers, hops, station, current_line_normalized, path)
    heapq.heappush(heap, (0, 0, start, None, [start]))

    while heap:
        transfers, hops, node, current_line, path = heapq.heappop(heap)
        
        # 如果到达终点，返回路径
        if node == end:
            return path
        
        # 状态键：(节点, 当前线路)
        state_key = (node, current_line)
        
        # 如果这个状态已经被访问过，跳过
        if state_key in visited:
            continue
        
        visited[state_key] = (transfers, hops)
        
        # 探索邻居节点
        for neighbor in graph.get(node, []):
            if neighbor in path:  # 避免环路
                continue
            
            # 获取这条边的所有线路
            edge_lines_list = edge_lines.get(edge_key(node, neighbor), [])
            
            # 提取并规范化所有线路名
            normalized_lines = set()
            for line_name in edge_lines_list:
                normalized = normalize_line_name(line_name)
                if normalized:
                    normalized_lines.add(normalized)
            
            # 如果没有线路信息，假设不换乘
            if not normalized_lines:
                new_transfers = transfers
                new_line = current_line
            else:
                # 如果当前线路在可用线路中，不换乘
                if current_line in normalized_lines:
                    new_transfers = transfers
                    new_line = current_line
                else:
                    # 需要换乘，选择第一条可用线路
                    new_transfers = transfers + (1 if current_line is not None else 0)
                    new_line = list(normalized_lines)[0]
            
            new_hops = hops + 1
            new_state = (neighbor, new_line)
            
            # 只有在没访问过或找到更优路径时才加入堆
            if new_state not in visited:
                heapq.heappush(heap, (new_transfers, new_hops, neighbor, new_line, path + [neighbor]))
    
    return None

import json
from graph import load_graph, shortest_path, build_edge_lines, shortest_path_min_transfer, count_transfers
from flask import Flask, request, render_template, jsonify


stations = load_graph('static/stations_gz.json')
edge_lines = build_edge_lines('guangzhou')
app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/v1/')
def api():
    req = request.args
    strategy = req.get('strategy', 'stations')
    if strategy == 'lines':
        route = shortest_path_min_transfer(stations, edge_lines, req['start'], req['end'])
    else:
        route = shortest_path(stations, req['start'], req['end'])
    if route==None:
       return jsonify({'route': 'null'}), 400
    else:
       transfers, segments = count_transfers(route, edge_lines)
       return jsonify({'route': route, 'transfers': transfers, 'segments': segments}), 200


app.run(debug=True, port=5001)

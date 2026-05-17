import sqlite3
import os
from flask import Flask, g, jsonify, request, render_template

app = Flask(__name__)

DATABASE = os.path.join(os.path.dirname(__file__), 'data', 'tasks.db')

SUBJECT_PALETTE = [
    '#5B9BD5', '#E74C3C', '#27AE60', '#F39C12',
    '#8E44AD', '#1ABC9C', '#E67E22', '#3498DB',
    '#2ECC71', '#9B59B6', '#16A085', '#D35400',
]


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    db = sqlite3.connect(DATABASE)
    db.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id         TEXT PRIMARY KEY,
            subject    TEXT NOT NULL,
            content    TEXT NOT NULL,
            ddl        TEXT NOT NULL,
            importance TEXT DEFAULT 'medium',
            completed  INTEGER DEFAULT 0,
            pinned     INTEGER DEFAULT 0
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS subject_colors (
            subject TEXT PRIMARY KEY,
            color   TEXT NOT NULL
        )
    ''')
    db.commit()
    db.close()


def task_from_row(row):
    return {
        'id': row['id'],
        'subject': row['subject'],
        'content': row['content'],
        'ddl': row['ddl'],
        'importance': row['importance'],
        'completed': bool(row['completed']),
        'pinned': bool(row['pinned']),
    }


# ===== API 路由 =====

@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    db = get_db()
    q = request.args.get('q', '').strip()
    if q:
        rows = db.execute(
            'SELECT * FROM tasks WHERE subject LIKE ? OR content LIKE ?',
            (f'%{q}%', f'%{q}%')
        ).fetchall()
    else:
        rows = db.execute('SELECT * FROM tasks').fetchall()

    tasks = [task_from_row(r) for r in rows]

    # 排序：置顶优先 → 完成靠后 → DDL 升序
    tasks.sort(key=lambda t: (
        not t['pinned'],
        t['completed'],
        t['ddl'],
    ))

    return jsonify({'ok': True, 'data': tasks})


@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    if not data:
        return jsonify({'ok': False, 'error': '请求数据为空'}), 400

    subject = data.get('subject', '').strip()
    content = data.get('content', '').strip()
    ddl = data.get('ddl', '').strip()
    importance = data.get('importance', 'medium').strip()

    if not subject or not content or not ddl:
        return jsonify({'ok': False, 'error': '科目、内容和截止日期为必填项'}), 400

    import uuid
    task_id = str(uuid.uuid4())

    db = get_db()
    db.execute(
        'INSERT INTO tasks (id, subject, content, ddl, importance) VALUES (?, ?, ?, ?, ?)',
        (task_id, subject, content, ddl, importance)
    )
    db.commit()

    row = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    return jsonify({'ok': True, 'data': task_from_row(row)}), 201


@app.route('/api/tasks/<task_id>/toggle-complete', methods=['PUT'])
def toggle_complete(task_id):
    db = get_db()
    task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not task:
        return jsonify({'ok': False, 'error': '任务不存在'}), 404

    new_val = 0 if task['completed'] else 1
    db.execute('UPDATE tasks SET completed = ? WHERE id = ?', (new_val, task_id))
    db.commit()

    row = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    return jsonify({'ok': True, 'data': task_from_row(row)})


@app.route('/api/tasks/<task_id>/toggle-pin', methods=['PUT'])
def toggle_pin(task_id):
    db = get_db()
    task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not task:
        return jsonify({'ok': False, 'error': '任务不存在'}), 404

    new_val = 0 if task['pinned'] else 1
    db.execute('UPDATE tasks SET pinned = ? WHERE id = ?', (new_val, task_id))
    db.commit()

    row = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    return jsonify({'ok': True, 'data': task_from_row(row)})


@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    db = get_db()
    task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not task:
        return jsonify({'ok': False, 'error': '任务不存在'}), 404

    db.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    db.commit()
    return jsonify({'ok': True}), 200


@app.route('/api/subject-colors', methods=['GET'])
def get_subject_colors():
    db = get_db()
    rows = db.execute('SELECT * FROM subject_colors').fetchall()
    colors = {r['subject']: r['color'] for r in rows}
    return jsonify({'ok': True, 'data': colors})


@app.route('/api/subject-colors', methods=['POST'])
def assign_subject_color():
    data = request.get_json()
    subject = data.get('subject', '').strip()
    if not subject:
        return jsonify({'ok': False, 'error': '科目名不能为空'}), 400

    db = get_db()
    existing = db.execute('SELECT * FROM subject_colors WHERE subject = ?', (subject,)).fetchone()
    if existing:
        return jsonify({'ok': True, 'data': existing['color']})

    used = [r['color'] for r in db.execute('SELECT color FROM subject_colors').fetchall()]
    available = [c for c in SUBJECT_PALETTE if c not in used]
    color = available[0] if available else SUBJECT_PALETTE[len(used) % len(SUBJECT_PALETTE)]

    db.execute('INSERT INTO subject_colors (subject, color) VALUES (?, ?)', (subject, color))
    db.commit()
    return jsonify({'ok': True, 'data': color}), 201


# ===== 页面路由 =====

@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5050)

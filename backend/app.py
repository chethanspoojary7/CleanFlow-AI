import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
from werkzeug.utils import secure_filename
import io

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = 'uploads'
EXPORT_FOLDER = 'exports'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(EXPORT_FOLDER, exist_ok=True)

SESSIONS = {}
HISTORY = {}

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'json', 'tsv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_session_df(session_id):
    if session_id not in SESSIONS:
        return None
    return SESSIONS[session_id]['df'].copy()

def set_session_df(session_id, df):
    if session_id in SESSIONS:
        SESSIONS[session_id]['df'] = df.copy()
        states = SESSIONS[session_id].get('states', [])
        idx = SESSIONS[session_id].get('current_index', -1)
        if idx >= 0:
            states = states[:idx + 1]
        states.append(df.copy())
        SESSIONS[session_id]['states'] = states
        SESSIONS[session_id]['current_index'] = len(states) - 1

def add_history(session_id, operation, description, pandas_code):
    if session_id not in HISTORY:
        HISTORY[session_id] = []
    
    idx = SESSIONS.get(session_id, {}).get('current_index', 0)
    if idx > 0:
        HISTORY[session_id] = HISTORY[session_id][:idx - 1]

    HISTORY[session_id].append({
        'id': str(uuid.uuid4()),
        'timestamp': datetime.now().isoformat(),
        'operation': operation,
        'description': description,
        'pandas_code': pandas_code
    })

def get_memory_usage(df):
    mem = df.memory_usage(deep=True).sum()
    if mem < 1024:
        return f"{mem} B"
    elif mem < 1024 * 1024:
        return f"{mem / 1024:.1f} KB"
    elif mem < 1024 * 1024 * 1024:
        return f"{mem / (1024 * 1024):.1f} MB"
    else:
        return f"{mem / (1024 * 1024 * 1024):.2f} GB"

def normalize_columns(value):
    if not value:
        return []
    if isinstance(value, str):
        return [col.strip() for col in value.split(',') if col.strip()]
    if isinstance(value, list):
        return [str(col).strip() for col in value if str(col).strip()]
    return []

def get_dataset_info(df, name=""):
    missing = int(df.isnull().sum().sum())
    dupes = int(df.duplicated().sum())
    return {
        'name': name,
        'rows': len(df),
        'columns': len(df.columns),
        'memory': get_memory_usage(df),
        'missing_values': missing,
        'duplicate_rows': dupes,
        'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
        'column_stats': {
            col: {
                'unique': int(df[col].nunique()),
                'missing': int(df[col].isnull().sum()),
                'type': str(df[col].dtype)
            }
            for col in df.columns
        },
        'can_undo': SESSIONS.get(request.view_args.get('session_id') if request and request.view_args else None, {}).get('current_index', 0) > 0 if 'SESSIONS' in globals() else False,
        'can_redo': SESSIONS.get(request.view_args.get('session_id') if request and request.view_args else None, {}).get('current_index', 0) < len(SESSIONS.get(request.view_args.get('session_id') if request and request.view_args else None, {}).get('states', [])) - 1 if 'SESSIONS' in globals() else False
    }

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file format'}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()

    try:
        if ext == 'csv':
            df = pd.read_csv(file)
        elif ext == 'tsv':
            df = pd.read_csv(file, sep='\t')
        elif ext == 'xlsx':
            df = pd.read_excel(file)
        elif ext == 'json':
            df = pd.read_json(file)
        else:
            return jsonify({'error': 'Unsupported format'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        'df': df.copy(),
        'name': filename,
        'created_at': datetime.now().isoformat(),
        'states': [df.copy()],
        'current_index': 0
    }
    HISTORY[session_id] = []

    return jsonify({
        'session_id': session_id,
        'info': get_dataset_info(df, filename)
    })

@app.route('/api/preview/<session_id>', methods=['GET'])
def preview(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 50, type=int)

    start = (page - 1) * page_size
    end = start + page_size
    subset = df.iloc[start:end]

    data = []
    for _, row in subset.iterrows():
        r = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                r[col] = None
            elif isinstance(val, (np.integer, np.floating)):
                r[col] = float(val) if isinstance(val, np.floating) else int(val)
            else:
                r[col] = str(val)
        data.append(r)

    return jsonify({
        'columns': list(df.columns),
        'data': data,
        'total_rows': len(df),
        'total_cols': len(df.columns)
    })

@app.route('/api/info/<session_id>', methods=['GET'])
def info(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404
    name = SESSIONS.get(session_id, {}).get('name', '')
    return jsonify(get_dataset_info(df, name))

@app.route('/api/describe/<session_id>', methods=['GET'])
def describe(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404
    desc = df.describe().to_dict()
    return jsonify(desc)

@app.route('/api/clean/missing/<session_id>', methods=['POST'])
def clean_missing(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    strategy = config.get('strategy', 'mean')
    columns = normalize_columns(config.get('columns'))
    custom_value = config.get('custom_value')

    missing_cols = df.columns[df.isna().any()].tolist()
    target_cols = [col for col in columns if col in df.columns] if columns else missing_cols
    code_lines = []

    for col in target_cols:
        if col not in df.columns:
            continue
        if strategy == 'mean':
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].mean())
                code_lines.append(f'df["{col}"] = df["{col}"].fillna(df["{col}"].mean())')
        elif strategy == 'median':
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].median())
                code_lines.append(f'df["{col}"] = df["{col}"].fillna(df["{col}"].median())')
        elif strategy == 'mode':
            mode_val = df[col].mode()
            if len(mode_val) > 0:
                df[col] = df[col].fillna(mode_val.iloc[0])
                code_lines.append(f'df["{col}"] = df["{col}"].fillna(df["{col}"].mode().iloc[0])')
        elif strategy == 'ffill':
            df[col] = df[col].ffill()
            code_lines.append(f'df["{col}"] = df["{col}"].ffill()')
        elif strategy == 'bfill':
            df[col] = df[col].bfill()
            code_lines.append(f'df["{col}"] = df["{col}"].bfill()')
        elif strategy == 'custom' and custom_value is not None:
            df[col] = df[col].fillna(custom_value)
            code_lines.append(f'df["{col}"] = df["{col}"].fillna("{custom_value}")')

    if strategy == 'drop_rows':
        df = df.dropna(subset=target_cols)
        code_lines.append(f'df = df.dropna(subset={target_cols})')
    elif strategy == 'drop_columns':
        df = df.drop(columns=[c for c in target_cols if c in df.columns])
        code_lines.append(f'df = df.drop(columns={target_cols})')

    set_session_df(session_id, df)
    pandas_code = '\n'.join(code_lines) if code_lines else '# No missing value operations applied'
    add_history(session_id, 'Missing Values', f'Applied {strategy} to missing values', pandas_code)

    return jsonify({'message': f'Missing values handled with {strategy}', 'pandas_code': pandas_code})

@app.route('/api/clean/duplicates/<session_id>', methods=['POST'])
def clean_duplicates(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    subset = normalize_columns(config.get('subset')) or None
    keep = config.get('keep', 'first')

    before = len(df)
    if keep == 'false':
        keep_param = False
    else:
        keep_param = keep

    df = df.drop_duplicates(subset=subset, keep=keep_param)
    after = len(df)
    removed = before - after

    set_session_df(session_id, df)
    subset_str = f'subset={subset}, ' if subset else ''
    pandas_code = f'df = df.drop_duplicates({subset_str}keep={repr(keep_param)})'
    add_history(session_id, 'Remove Duplicates', f'Removed {removed} duplicate rows', pandas_code)

    return jsonify({'message': f'Removed {removed} duplicate rows', 'pandas_code': pandas_code})

@app.route('/api/clean/outliers/<session_id>', methods=['POST'])
def clean_outliers(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    method = config.get('method', 'iqr')
    column = config.get('column', '')
    action = config.get('action', 'remove')

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    if not pd.api.types.is_numeric_dtype(df[column]):
        return jsonify({'error': 'Column must be numeric'}), 400

    col_data = df[column]
    mask = pd.Series([True] * len(df))

    if method == 'iqr':
        Q1 = col_data.quantile(0.25)
        Q3 = col_data.quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR
        mask = (col_data >= lower) & (col_data <= upper)
        pandas_code = f"Q1 = df['{column}'].quantile(0.25)\nQ3 = df['{column}'].quantile(0.75)\nIQR = Q3 - Q1\nmask = (df['{column}'] >= Q1 - 1.5*IQR) & (df['{column}'] <= Q3 + 1.5*IQR)"
    elif method == 'zscore':
        mean = col_data.mean()
        std = col_data.std()
        if std > 0:
            z_scores = np.abs((col_data - mean) / std)
            mask = z_scores < 3
        pandas_code = f"mean = df['{column}'].mean()\nstd = df['{column}'].std()\nmask = np.abs((df['{column}'] - mean) / std) < 3"
    else:
        pandas_code = f"# Outlier detection with {method}"

    if action == 'remove':
        df = df[mask]
        pandas_code += '\ndf = df[mask]'
    elif action == 'clip':
        if method == 'iqr':
            df[column] = col_data.clip(lower=lower, upper=upper)
            pandas_code += f"\ndf['{column}'] = df['{column}'].clip(lower={lower}, upper={upper})"

    set_session_df(session_id, df)
    add_history(session_id, 'Outlier Detection', f'{method} outliers in {column}', pandas_code)

    return jsonify({'message': f'Outliers handled with {method}', 'pandas_code': pandas_code})

@app.route('/api/transform/map-values/<session_id>', methods=['POST'])
def map_values(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    column = config.get('column', '')
    mapping = config.get('mapping', {})
    case_insensitive = config.get('case_insensitive', True)
    trim_whitespace = config.get('trim_whitespace', True)

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    if not isinstance(mapping, dict) or len(mapping) == 0:
        return jsonify({'error': 'At least one mapping is required'}), 400

    normalized_mapping = {}
    for key, value in mapping.items():
        normalized_key = str(key)
        if trim_whitespace:
            normalized_key = normalized_key.strip()
        if case_insensitive:
            normalized_key = normalized_key.lower()
        normalized_mapping[normalized_key] = value

    def map_value(value):
        if pd.isna(value):
            return value
        text = str(value)
        if trim_whitespace:
            text = text.strip()
        lookup_key = text.lower() if case_insensitive else text
        return normalized_mapping.get(lookup_key, value)

    df[column] = df[column].apply(map_value)
    set_session_df(session_id, df)

    mapping_preview = ', '.join(f'{key} -> {value}' for key, value in list(mapping.items())[:4])
    if len(mapping) > 4:
        mapping_preview += f', +{len(mapping) - 4} more'

    lookup_expr = 'str(value)'
    if trim_whitespace:
        lookup_expr += '.strip()'
    if case_insensitive:
        lookup_expr += '.lower()'

    pandas_code = (
        f"mapping = {json.dumps(mapping, ensure_ascii=False, indent=2)}\n"
        f"def normalize_value(value):\n"
        f"    if pd.isna(value):\n"
        f"        return value\n"
        f"    key = {lookup_expr}\n"
        f"    return mapping.get(key, value)\n"
        f"df['{column}'] = df['{column}'].apply(normalize_value)"
    )
    add_history(session_id, 'Value Mapping', f'Standardized values in {column}', pandas_code)

    return jsonify({
        'message': f'Standardized {column}' + (f' using {mapping_preview}' if mapping_preview else ''),
        'pandas_code': pandas_code,
    })

@app.route('/api/transform/convert-type/<session_id>', methods=['POST'])
def convert_type(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    column = config.get('column', '')
    new_type = config.get('new_type', 'str')
    strip_text = config.get('strip_text', False)

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    try:
        if new_type == 'datetime64[ns]':
            df[column] = pd.to_datetime(df[column], errors='coerce')
        elif new_type == 'category':
            df[column] = df[column].astype('category')
        elif new_type == 'bool':
            df[column] = df[column].astype(bool)
        elif new_type in ('int64', 'Int64'):
            if strip_text:
                extracted = df[column].astype(str).str.extract(r'(-?\d+(?:\.\d+)?)', expand=False)
                numeric = pd.to_numeric(extracted, errors='coerce')
            else:
                numeric = pd.to_numeric(df[column], errors='coerce')
            df[column] = numeric.round().astype('Int64')
        else:
            df[column] = df[column].astype(new_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    set_session_df(session_id, df)
    if new_type in ('int64', 'Int64'):
        if strip_text:
            pandas_code = (
                f"df['{column}'] = pd.to_numeric("
                f"df['{column}'].astype(str).str.extract(r'(-?\\d+(?:\\.\\d+)?)', expand=False), "
                f"errors='coerce'"
                f").round().astype('Int64')"
            )
        else:
            pandas_code = f"df['{column}'] = pd.to_numeric(df['{column}'], errors='coerce').round().astype('Int64')"
    else:
        pandas_code = f"df['{column}'] = df['{column}'].astype('{new_type}')"
    add_history(session_id, 'Type Conversion', f'Converted {column} to {new_type}', pandas_code)

    return jsonify({'message': f'Converted {column} to {new_type}', 'pandas_code': pandas_code})

@app.route('/api/transform/rename/<session_id>', methods=['POST'])
def rename_col(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    old_name = config.get('old_name', '')
    new_name = config.get('new_name', '')

    if old_name not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    df = df.rename(columns={old_name: new_name})
    set_session_df(session_id, df)
    pandas_code = f"df = df.rename(columns={{'{old_name}': '{new_name}'}})"
    add_history(session_id, 'Rename Column', f'Renamed {old_name} to {new_name}', pandas_code)

    return jsonify({'message': f'Renamed {old_name} to {new_name}', 'pandas_code': pandas_code})

@app.route('/api/transform/drop-column/<session_id>', methods=['POST'])
def drop_col(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    column = config.get('column', '')

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    df = df.drop(columns=[column])
    set_session_df(session_id, df)
    pandas_code = f"df = df.drop(columns=['{column}'])"
    add_history(session_id, 'Drop Column', f'Dropped column {column}', pandas_code)

    return jsonify({'message': f'Dropped column {column}', 'pandas_code': pandas_code})

@app.route('/api/transform/duplicate-column/<session_id>', methods=['POST'])
def duplicate_col(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    source_column = config.get('source_column') or config.get('column', '')
    new_column = config.get('new_column', '')

    if source_column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    if not new_column:
        return jsonify({'error': 'New column name is required'}), 400

    if new_column in df.columns:
        return jsonify({'error': 'New column already exists'}), 400

    df[new_column] = df[source_column].copy()
    set_session_df(session_id, df)
    pandas_code = f"df['{new_column}'] = df['{source_column}'].copy()"
    add_history(session_id, 'Duplicate Column', f'Duplicated {source_column} as {new_column}', pandas_code)

    return jsonify({'message': f'Duplicated {source_column} as {new_column}', 'pandas_code': pandas_code})

@app.route('/api/transform/filter-rows/<session_id>', methods=['POST'])
def filter_rows(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    column = config.get('column', '')
    condition = config.get('condition', '==')
    value = config.get('value', '')

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    try:
        if condition == '==':
            df = df[df[column] == value]
            pandas_code = f"df = df[df['{column}'] == '{value}']"
        elif condition == '!=':
            df = df[df[column] != value]
            pandas_code = f"df = df[df['{column}'] != '{value}']"
        elif condition == '>':
            df = df[df[column] > float(value)]
            pandas_code = f"df = df[df['{column}'] > {value}]"
        elif condition == '<':
            df = df[df[column] < float(value)]
            pandas_code = f"df = df[df['{column}'] < {value}]"
        elif condition == '>=':
            df = df[df[column] >= float(value)]
            pandas_code = f"df = df[df['{column}'] >= {value}]"
        elif condition == '<=':
            df = df[df[column] <= float(value)]
            pandas_code = f"df = df[df['{column}'] <= {value}]"
        elif condition == 'contains':
            df = df[df[column].astype(str).str.contains(value, na=False)]
            pandas_code = f"df = df[df['{column}'].astype(str).str.contains('{value}', na=False)]"
        else:
            pandas_code = f"# Filter on {column}"
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    set_session_df(session_id, df)
    add_history(session_id, 'Filter Rows', f'Filtered {column} {condition} {value}', pandas_code)

    return jsonify({'message': 'Rows filtered', 'pandas_code': pandas_code})

@app.route('/api/transform/sort/<session_id>', methods=['POST'])
def sort_rows(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    column = config.get('column', '')
    ascending = config.get('ascending', True)

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    df = df.sort_values(by=column, ascending=ascending)
    set_session_df(session_id, df)
    pandas_code = f"df = df.sort_values(by='{column}', ascending={ascending})"
    add_history(session_id, 'Sort Rows', f'Sorted by {column} {"asc" if ascending else "desc"}', pandas_code)

    return jsonify({'message': f'Sorted by {column}', 'pandas_code': pandas_code})

@app.route('/api/transform/string/<session_id>', methods=['POST'])
def string_clean(session_id):
    """String/numeric cleaning endpoint.

    Supported operations (by config):
    - String operations:
      - operation: lowercase/uppercase/title/trim/replace
      - column: operate on a single column
      - all_string_columns: operate on all object/string-like columns
    - Numeric operations (negative -> positive):
      - mode: make_positive | abs
      - column: operate on a single column
      - all_numeric_columns: operate on all numeric columns
    """
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}

    # Detect whether request is string-cleaning or numeric-cleaning.
    # Frontend sends numeric cleaning via `mode` + `all_numeric_columns`.
    is_numeric = config.get('mode') is not None

    column = config.get('column', '')

    # ---- String mode ----
    apply_all_string_columns = bool(
        str(config.get('all_string_columns', '')).lower() in ('1', 'true', 'yes', 'y')
    )

    # ---- Numeric mode ----
    apply_all_numeric_columns = bool(
        str(config.get('all_numeric_columns', '')).lower() in ('1', 'true', 'yes', 'y')
    )
    mode = (config.get('mode') or '').lower() or 'make_positive'

    if is_numeric:
        operation = None
        find = ''
        replace = ''

        if apply_all_numeric_columns:
            target_columns = [
                c
                for c in df.columns
                if pd.api.types.is_numeric_dtype(df[c])
            ]
            if not target_columns:
                return jsonify({'error': 'No numeric columns found to apply numeric cleaning'}), 400
        else:
            if column not in df.columns:
                return jsonify({'error': 'Column not found'}), 400
            target_columns = [column]
    else:
        operation = config.get('operation', 'lowercase')
        find = config.get('find', '')
        replace = config.get('replace', '')

        valid_string_operations = {'lowercase', 'uppercase', 'title', 'trim', 'replace'}
        if operation not in valid_string_operations:
            return jsonify({'error': f'Unsupported string operation: {operation}'}), 400

        target_columns = []
        if apply_all_string_columns:
            # Select columns containing string/object values (best-effort).
            target_columns = [
                c
                for c in df.columns
                if pd.api.types.is_object_dtype(df[c]) or pd.api.types.is_string_dtype(df[c])
            ]
            if not target_columns:
                return jsonify({'error': 'No text-like columns found to apply string cleaning'}), 400
        else:
            if column not in df.columns:
                return jsonify({'error': 'Column not found'}), 400
            target_columns = [column]



    pandas_code_lines = []

    for column in target_columns:
        if is_numeric:
            # Numeric cleaning: convert negative values to positive.
            if mode in ('make_positive', 'positive', 'abs'):
                df[column] = pd.to_numeric(df[column], errors='coerce')
                if mode == 'abs':
                    df[column] = df[column].abs()
                    pandas_code_lines.append(f"df['{column}'] = df['{column}'].abs()")
                else:
                    df[column] = df[column].abs()
                    pandas_code_lines.append(f"df['{column}'] = df['{column}'].abs()  # negatives -> positives")
            else:
                pandas_code_lines.append(f"# Numeric mode {mode} not implemented for {column}")
        else:
            if operation == 'lowercase':
                df[column] = df[column].astype(str).str.lower()
                pandas_code_lines.append(f"df['{column}'] = df['{column}'].astype(str).str.lower()")
            elif operation == 'uppercase':
                df[column] = df[column].astype(str).str.upper()
                pandas_code_lines.append(f"df['{column}'] = df['{column}'].astype(str).str.upper()")
            elif operation == 'title':
                df[column] = df[column].astype(str).str.title()
                pandas_code_lines.append(f"df['{column}'] = df['{column}'].astype(str).str.title()")
            elif operation == 'trim':
                df[column] = df[column].astype(str).str.strip()
                pandas_code_lines.append(f"df['{column}'] = df['{column}'].astype(str).str.strip()")
            elif operation == 'replace':
                df[column] = df[column].astype(str).str.replace(find, replace, regex=False)
                pandas_code_lines.append(
                    f"df['{column}'] = df['{column}'].astype(str).str.replace('{find}', '{replace}', regex=False)"
                )
            else:
                pandas_code_lines.append(f"# String operation on {column}")

    pandas_code = '\n'.join(pandas_code_lines) if pandas_code_lines else '# No string cleaning applied'

    set_session_df(session_id, df)

    history_target = (
        'all string/object columns'
        if apply_all_string_columns
        else f'{column}'
    )
    add_history(session_id, 'String Clean', f'{operation} on {history_target}', pandas_code)

    return jsonify({'message': f'String operation applied', 'pandas_code': pandas_code})

@app.route('/api/transform/date/<session_id>', methods=['POST'])
def date_transform(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    column = config.get('column', '')
    operation = config.get('operation', 'to_datetime')

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    if operation == 'to_datetime':
        df[column] = pd.to_datetime(df[column], errors='coerce')
        pandas_code = f"df['{column}'] = pd.to_datetime(df['{column}'], errors='coerce')"
    elif operation == 'extract_year':
        df[f'{column}_year'] = pd.to_datetime(df[column], errors='coerce').dt.year
        pandas_code = f"df['{column}_year'] = pd.to_datetime(df['{column}'], errors='coerce').dt.year"
    elif operation == 'extract_month':
        df[f'{column}_month'] = pd.to_datetime(df[column], errors='coerce').dt.month
        pandas_code = f"df['{column}_month'] = pd.to_datetime(df['{column}'], errors='coerce').dt.month"
    elif operation == 'extract_day':
        df[f'{column}_day'] = pd.to_datetime(df[column], errors='coerce').dt.day
        pandas_code = f"df['{column}_day'] = pd.to_datetime(df['{column}'], errors='coerce').dt.day"
    elif operation == 'extract_hour':
        df[f'{column}_hour'] = pd.to_datetime(df[column], errors='coerce').dt.hour
        pandas_code = f"df['{column}_hour'] = pd.to_datetime(df['{column}'], errors='coerce').dt.hour"
    elif operation == 'extract_weekday':
        df[f'{column}_weekday'] = pd.to_datetime(df[column], errors='coerce').dt.weekday
        pandas_code = f"df['{column}_weekday'] = pd.to_datetime(df['{column}'], errors='coerce').dt.weekday"
    else:
        pandas_code = f"# Date operation on {column}"

    set_session_df(session_id, df)
    add_history(session_id, 'Date Transform', f'{operation} on {column}', pandas_code)

    return jsonify({'message': f'Date operation applied', 'pandas_code': pandas_code})

@app.route('/api/transform/encode/<session_id>', methods=['POST'])
def encode(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    columns = config.get('columns', [])
    method = config.get('method', 'label')

    from sklearn.preprocessing import LabelEncoder, OrdinalEncoder

    code_lines = []
    for col in columns:
        if col not in df.columns:
            continue
        if method == 'label':
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            code_lines.append(f"le = LabelEncoder()\ndf['{col}'] = le.fit_transform(df['{col}'].astype(str))")
        elif method == 'onehot':
            dummies = pd.get_dummies(df[col], prefix=col)
            df = pd.concat([df.drop(columns=[col]), dummies], axis=1)
            code_lines.append(f"dummies = pd.get_dummies(df['{col}'], prefix='{col}')\ndf = pd.concat([df.drop(columns=['{col}']), dummies], axis=1)")
        elif method == 'ordinal':
            oe = OrdinalEncoder()
            df[col] = oe.fit_transform(df[[col]].astype(str))
            code_lines.append(f"oe = OrdinalEncoder()\ndf['{col}'] = oe.fit_transform(df[['{col}']].astype(str))")

    set_session_df(session_id, df)
    pandas_code = '\n'.join(code_lines) if code_lines else '# No encoding applied'
    add_history(session_id, 'Encoding', f'{method} encoding on {len(columns)} columns', pandas_code)

    return jsonify({'message': f'Encoding applied', 'pandas_code': pandas_code})

@app.route('/api/transform/scale/<session_id>', methods=['POST'])
def scale(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    columns = config.get('columns', [])
    method = config.get('method', 'standard')

    from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, Normalizer

    valid_cols = [c for c in columns if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    if not valid_cols:
        return jsonify({'error': 'No valid numeric columns'}), 400

    scaler_map = {
        'standard': StandardScaler(),
        'minmax': MinMaxScaler(),
        'robust': RobustScaler(),
        'normalize': Normalizer()
    }

    scaler = scaler_map.get(method, StandardScaler())
    df[valid_cols] = scaler.fit_transform(df[valid_cols])

    set_session_df(session_id, df)
    pandas_code = f"from sklearn.preprocessing import {scaler.__class__.__name__}\nscaler = {scaler.__class__.__name__}()\ndf[{valid_cols}] = scaler.fit_transform(df[{valid_cols}])"
    add_history(session_id, 'Scaling', f'{method} scaling on {len(valid_cols)} columns', pandas_code)

    return jsonify({'message': f'Scaling applied', 'pandas_code': pandas_code})

@app.route('/api/transform/feature/<session_id>', methods=['POST'])
def feature_engineer(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    operation = config.get('operation', 'create')

    if operation == 'create':
        new_col = config.get('new_column', '')
        expression = config.get('expression', '')
        try:
            df[new_col] = eval(expression, {'df': df, 'pd': pd, 'np': np})
            pandas_code = f"df['{new_col}'] = {expression}"
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    elif operation == 'log':
        col = config.get('column', '')
        df[f'{col}_log'] = np.log1p(df[col])
        pandas_code = f"df['{col}_log'] = np.log1p(df['{col}'])"
    elif operation == 'sqrt':
        col = config.get('column', '')
        df[f'{col}_sqrt'] = np.sqrt(df[col])
        pandas_code = f"df['{col}_sqrt'] = np.sqrt(df['{col}'])"
    elif operation == 'bin':
        col = config.get('column', '')
        bins = config.get('bins', 5)
        df[f'{col}_bin'] = pd.cut(df[col], bins=bins, labels=False)
        pandas_code = f"df['{col}_bin'] = pd.cut(df['{col}'], bins={bins}, labels=False)"
    else:
        pandas_code = '# Feature engineering'

    set_session_df(session_id, df)
    add_history(session_id, 'Feature Engineering', f'{operation} feature', pandas_code)

    return jsonify({'message': 'Feature engineered', 'pandas_code': pandas_code})

@app.route('/api/statistics/<session_id>', methods=['GET'])
def statistics(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    numeric_df = df.select_dtypes(include=[np.number])
    stats = {}
    if len(numeric_df.columns) > 0:
        stats['mean'] = float(numeric_df.mean().mean())
        stats['median'] = float(numeric_df.median().median())
        stats['std'] = float(numeric_df.std().mean())
        stats['variance'] = float(numeric_df.var().mean())
        stats['skewness'] = float(numeric_df.skew().mean())
        stats['kurtosis'] = float(numeric_df.kurtosis().mean())

    return jsonify(stats)

@app.route('/api/generate-code/<session_id>', methods=['POST'])
def generate_code(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    operations = config.get('operations', [])
    code_lines = ['import pandas as pd', 'import numpy as np', '', '# Load your dataset', "df = pd.read_csv('your_file.csv')", '']
    for op in operations:
        code_lines.append(op.get('pandas_code', ''))
    return jsonify({'code': '\n'.join(code_lines)})

@app.route('/api/history/<session_id>', methods=['GET'])
def get_history(session_id):
    return jsonify({'history': HISTORY.get(session_id, [])})

@app.route('/api/history/undo/<session_id>', methods=['POST'])
def undo_op(session_id):
    if session_id not in SESSIONS:
        return jsonify({'error': 'Session not found'}), 404
    
    idx = SESSIONS[session_id].get('current_index', 0)
    if idx > 0:
        SESSIONS[session_id]['current_index'] -= 1
        SESSIONS[session_id]['df'] = SESSIONS[session_id]['states'][idx - 1].copy()
        return jsonify({'message': 'Undo successful', 'can_undo': idx - 1 > 0, 'can_redo': True})
    return jsonify({'error': 'Nothing to undo'}), 400

@app.route('/api/history/redo/<session_id>', methods=['POST'])
def redo_op(session_id):
    if session_id not in SESSIONS:
        return jsonify({'error': 'Session not found'}), 404
    
    idx = SESSIONS[session_id].get('current_index', 0)
    states = SESSIONS[session_id].get('states', [])
    if idx < len(states) - 1:
        SESSIONS[session_id]['current_index'] += 1
        SESSIONS[session_id]['df'] = states[idx + 1].copy()
        return jsonify({'message': 'Redo successful', 'can_undo': True, 'can_redo': idx + 1 < len(states) - 1})
    return jsonify({'error': 'Nothing to redo'}), 400

@app.route('/api/export/<session_id>', methods=['POST'])
def export_data(session_id):
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    config = request.json or {}
    fmt = config.get('format', 'csv')

    buf = io.BytesIO()
    if fmt == 'csv':
        df.to_csv(buf, index=False)
        buf.seek(0)
        return send_file(buf, mimetype='text/csv', as_attachment=True, download_name='dataset.csv')
    elif fmt == 'xlsx':
        df.to_excel(buf, index=False)
        buf.seek(0)
        return send_file(buf, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name='dataset.xlsx')
    elif fmt == 'json':
        df.to_json(buf, orient='records')
        buf.seek(0)
        return send_file(buf, mimetype='application/json', as_attachment=True, download_name='dataset.json')
    elif fmt == 'parquet':
        df.to_parquet(buf, index=False)
        buf.seek(0)
        return send_file(buf, mimetype='application/octet-stream', as_attachment=True, download_name='dataset.parquet')
    else:
        return jsonify({'error': 'Unsupported format'}), 400

@app.route('/api/auto-detect/<session_id>', methods=['GET'])
def auto_detect(session_id):
    """Automatically detect potential data cleaning and transformation operations."""
    df = get_session_df(session_id)
    if df is None:
        return jsonify({'error': 'Session not found'}), 404

    recommendations = []

    # 1. Check for missing values
    missing_cols = []
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        if missing_count > 0:
            missing_cols.append({
                'column': col,
                'count': missing_count,
                'percentage': round((missing_count / len(df)) * 100, 2)
            })
    
    if missing_cols:
        # Suggest appropriate strategy based on column type
        for item in missing_cols[:3]:  # Limit to top 3
            col = item['column']
            if pd.api.types.is_numeric_dtype(df[col]):
                strategy = 'mean'
            else:
                strategy = 'mode'
            
            recommendations.append({
                'id': f'missing_{col}',
                'category': 'cleaning',
                'operation': 'missing',
                'priority': 'high',
                'title': f'Handle missing values in {col}',
                'description': f'{item["count"]} missing values ({item["percentage"]}%). Suggested: Fill with {strategy}.',
                'config': {
                    'strategy': strategy,
                    'columns': [col]
                },
                'auto_applicable': True
            })

    # 2. Check for duplicate rows
    duplicate_count = int(df.duplicated().sum())
    if duplicate_count > 0:
        recommendations.append({
            'id': 'duplicates',
            'category': 'cleaning',
            'operation': 'duplicates',
            'priority': 'high',
            'title': 'Remove duplicate rows',
            'description': f'{duplicate_count} duplicate rows found. Remove to clean dataset.',
            'config': {
                'keep': 'first'
            },
            'auto_applicable': True
        })

    # 3. Check for potential type conversions
    for col in df.columns:
        if df[col].dtype == 'object':
            # Check if column contains numeric strings
            sample = df[col].dropna().head(100)
            if len(sample) > 0:
                numeric_pattern = sample.astype(str).str.match(r'^\s*-?\d+\.?\d*\s*$')
                if numeric_pattern.sum() / len(sample) > 0.7:  # 70% numeric
                    recommendations.append({
                        'id': f'type_conv_{col}',
                        'category': 'transformation',
                        'operation': 'convert_type',
                        'priority': 'medium',
                        'title': f'Convert {col} to numeric',
                        'description': f'Column appears to contain numeric values stored as text.',
                        'config': {
                            'column': col,
                            'new_type': 'float64',
                            'strip_text': False
                        },
                        'auto_applicable': True
                    })

    # 4. Check for inconsistent text casing
    for col in df.columns:
        if df[col].dtype == 'object':
            sample = df[col].dropna().head(100)
            if len(sample) > 0:
                # Check for mixed casing
                has_upper = sample.astype(str).str.contains(r'[A-Z]').any()
                has_lower = sample.astype(str).str.contains(r'[a-z]').any()
                if has_upper and has_lower:
                    unique_count = df[col].nunique()
                    if unique_count < len(df) * 0.5:  # Categorical-ish
                        recommendations.append({
                            'id': f'standardize_{col}',
                            'category': 'transformation',
                            'operation': 'string_clean',
                            'priority': 'low',
                            'title': f'Standardize text casing in {col}',
                            'description': f'Mixed text casing detected. Standardize to lowercase.',
                            'config': {
                                'column': col,
                                'operation': 'lowercase'
                            },
                            'auto_applicable': True
                        })
                        break  # Only suggest once

    # 5. Check for whitespace issues
    for col in df.columns:
        if df[col].dtype == 'object':
            sample = df[col].dropna().head(50)
            if len(sample) > 0:
                has_whitespace = sample.astype(str).str.match(r'^\s+.*|.*\s+$').any()
                if has_whitespace:
                    recommendations.append({
                        'id': f'trim_{col}',
                        'category': 'transformation',
                        'operation': 'string_clean',
                        'priority': 'medium',
                        'title': f'Trim whitespace in {col}',
                        'description': f'Leading or trailing whitespace detected.',
                        'config': {
                            'column': col,
                            'operation': 'trim'
                        },
                        'auto_applicable': True
                    })
                    break  # Only suggest once

    # 6. Check for potential outliers in numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols[:2]:  # Check first 2 numeric columns
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
        
        if outliers > 0 and outliers < len(df) * 0.1:  # Less than 10% outliers
            recommendations.append({
                'id': f'outliers_{col}',
                'category': 'cleaning',
                'operation': 'outliers',
                'priority': 'low',
                'title': f'Handle outliers in {col}',
                'description': f'{int(outliers)} potential outliers detected using IQR method.',
                'config': {
                    'method': 'iqr',
                    'column': col,
                    'action': 'remove'
                },
                'auto_applicable': False  # Requires user decision
            })

    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda x: priority_order.get(x['priority'], 3))

    return jsonify({
        'recommendations': recommendations,
        'total_count': len(recommendations)
    })

@app.route('/api/sample-data', methods=['GET'])
def sample_data():
    df = pd.DataFrame({
        'Name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
        'Age': [25, 30, 35, 28, 32],
        'Salary': [50000, 60000, 75000, 55000, 65000],
        'Department': ['Engineering', 'Sales', 'Engineering', 'Marketing', 'Sales']
    })
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return send_file(buf, mimetype='text/csv', as_attachment=True, download_name='sample.csv')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

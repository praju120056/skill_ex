from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from db_config import init_db

app = Flask(__name__, static_folder='static')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
app.config['JWT_SECRET_KEY'] = 'super-secret'
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
jwt = JWTManager(app)
mysql = init_db(app)

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data['name']
    email = data['email']
    password = generate_password_hash(data['password'])

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        return jsonify({'message': 'Email already exists'}), 400

    cur.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", (name, email, password))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'User registered'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    password = data['password']

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()

    if user and check_password_hash(user['password'], password):
        access_token = create_access_token(identity=str(user['user_id']))
        return jsonify({'token': access_token})
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/skills', methods=['GET'])
def get_skills():
    cur = mysql.connection.cursor()
    cur.execute("SELECT skill_name FROM skills")
    skills = [row['skill_name'] for row in cur.fetchall()]
    cur.close()
    return jsonify(skills)

@app.route('/add_skill', methods=['POST'])
@jwt_required()
def add_skill():
    user_id = get_jwt_identity()
    data = request.get_json()
    skill_name = data['skill_name']
    skill_type = data['skill_type']

    cur = mysql.connection.cursor()

    cur.execute("SELECT skill_id FROM skills WHERE skill_name = %s", (skill_name,))
    skill = cur.fetchone()

    if not skill:
        cur.execute("INSERT INTO skills (skill_name) VALUES (%s)", (skill_name,))
        mysql.connection.commit()
        skill_id = cur.lastrowid
    else:
        skill_id = skill['skill_id']

    cur.execute("""
        INSERT INTO user_skills (user_id, skill_id, skill_type)
        VALUES (%s, %s, %s)
    """, (user_id, skill_id, skill_type))
    mysql.connection.commit()
    cur.close()

    return jsonify({'message': f'Skill "{skill_name}" added to your profile'})

@app.route('/match/<skill_name>', methods=['GET'])
@jwt_required()
def match(skill_name):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT u.name, u.email FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON s.skill_id = us.skill_id
        WHERE s.skill_name = %s AND us.skill_type = 'know'
    """, (skill_name,))
    users = cur.fetchall()
    cur.close()
    return jsonify(users)

@app.route('/me', methods=['GET'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    cur = mysql.connection.cursor()

    # Get user info
    cur.execute("SELECT name, email FROM users WHERE user_id = %s", (user_id,))
    user = cur.fetchone()

    # Get user's skills
    cur.execute("""
        SELECT s.skill_name, us.skill_type
        FROM user_skills us
        JOIN skills s ON s.skill_id = us.skill_id
        WHERE us.user_id = %s
    """, (user_id,))
    skills = cur.fetchall()

    cur.close()
    user['skills'] = skills  # Add skills to the user profile
    return jsonify(user)

@app.route('/user_search', methods=['GET'])
@jwt_required()
def user_search():
    query = request.args.get('q', '')
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT user_id, name, email FROM users
        WHERE name LIKE %s OR email LIKE %s
    """, (f"%{query}%", f"%{query}%"))
    users = cur.fetchall()
    cur.close()
    return jsonify(users)

@app.route('/skill_search', methods=['GET'])
def skill_search():
    q = request.args.get('q')
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT DISTINCT u.name, u.email
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE s.skill_name LIKE %s AND us.skill_type = 'know'
    """, (f'%{q}%',))
    results = cur.fetchall()
    cur.close()
    return jsonify(results)

@app.route('/profile/<int:user_id>', methods=['GET'])
@jwt_required()
def profile_view(user_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT name, email FROM users WHERE user_id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    if user:
        return jsonify(user)
    else:
        return jsonify({'message': 'User not found'}), 404

@app.route('/match_skill/<skill>', methods=['GET'])
@jwt_required()
def match_skill(skill):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT u.name, u.email
        FROM user_skills us
        JOIN users u ON us.user_id = u.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE s.skill_name = %s AND us.skill_type = 'know'
    """, (skill,))
    results = cur.fetchall()
    cur.close()
    return jsonify(results)

@app.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    cur = mysql.connection.cursor()

    cur.execute("SELECT name, email FROM users WHERE user_id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    cur.execute("""
        SELECT s.skill_name, us.skill_type
        FROM user_skills us
        JOIN skills s ON s.skill_id = us.skill_id
        WHERE us.user_id = %s
    """, (user_id,))
    skills = cur.fetchall()
    cur.close()

    user['skills'] = skills
    return jsonify(user)

@app.route('/all_users', methods=['GET'])
@jwt_required()
def all_users():
    cur = mysql.connection.cursor()
    cur.execute("SELECT name, email FROM users")
    users = cur.fetchall()
    cur.close()
    return jsonify(users)

@app.route('/all_skills', methods=['GET'])
@jwt_required()
def all_skills():
    cur = mysql.connection.cursor()
    cur.execute("SELECT DISTINCT skill_name FROM skills")
    skills = [row['skill_name'] for row in cur.fetchall()]
    cur.close()
    return jsonify(skills)

if __name__ == '__main__':
    app.run(debug=True)
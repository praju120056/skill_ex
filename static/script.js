const API = "http://127.0.0.1:5000";

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

async function register() {
  console.log("Token:", localStorage.getItem("token"));
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('reg_name').value,
      email: document.getElementById('reg_email').value,
      password: document.getElementById('reg_pass').value
    })
  });
  const result = await res.json();
  alert(result.message);
}

async function login() {
  console.log("Token:", localStorage.getItem("token"));
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: document.getElementById('log_email').value,
      password: document.getElementById('log_pass').value
    })
  });

  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    document.getElementById("auth").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    loadProfile();
  } else {
    alert(data.message);
  }
}

async function loadProfile() {
  const res = await fetch(`${API}/me`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  let content = `<strong>Name:</strong> ${data.name}<br><strong>Email:</strong> ${data.email}<br><br><strong>Skills:</strong><ul>`;
  if (data.skills && data.skills.length > 0) {
    data.skills.forEach(skill => {
      content += `<li>${skill.skill_name} (${skill.skill_type})</li>`;
    });
    content += `</ul>`;
  } else {
    content += `</ul>No skills added yet.`;
  }

  document.getElementById("profileInfo").innerHTML = `<div class="result-box">${content}</div>`;
}

async function addSkill(skillName, skillType) {
  console.log("Token:", localStorage.getItem("token"));
  const response = await fetch(`${API}/add_skill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ skill_name: skillName, skill_type: skillType })
  });
  return response.json();
}

async function findMatches(skillName) {
  console.log("Token:", localStorage.getItem("token"));
  const response = await fetch(`${API}/match/${encodeURIComponent(skillName)}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  return response.json();
}

async function userSearch(query) {
  console.log("Token:", localStorage.getItem("token"));
  const response = await fetch(`${API}/user_search?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  return response.json();
}

async function skillSearch(query) {
  console.log("Token:", localStorage.getItem("token"));
  const response = await fetch(`${API}/skill_search?q=${encodeURIComponent(query)}`);
  return response.json();
}

async function viewProfile(userId) {
  console.log("Token:", localStorage.getItem("token"));
  const response = await fetch(`${API}/profile/${userId}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (response.ok) {
    return response.json();
  } else {
    throw new Error('User not found');
  }
}

async function handleAddSkill() {
  const name = document.getElementById('addSkillName').value.trim();
  const type = document.getElementById('addSkillType').value;
  const resultDiv = document.getElementById('addSkillResult');
  if (!name) {
    resultDiv.textContent = 'Please enter a skill name.';
    return;
  }
  try {
    const result = await addSkill(name, type);
    resultDiv.textContent = result.message || JSON.stringify(result);
  } catch (err) {
    resultDiv.textContent = 'Error adding skill.';
  }
}

async function handleUserSearch() {
  const q = document.getElementById("userSearchInput").value;
  const res = await fetch(`${API}/user_search?q=${q}`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  let content = `<strong>Search Results:</strong><ul>`;
  data.forEach(user => {
    content += `<li>${user.name} (${user.email})</li>`;
  });
  content += `</ul>`;

  document.getElementById("userSearchResults").innerHTML = `<div class="result-box">${content}</div>`;
}

async function handleSkillSearch() {
  const q = document.getElementById("skillSearchInput").value;
  const res = await fetch(`${API}/skill_search?q=${q}`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  let content = `<strong>Users who know:</strong> ${q}<ul>`;
  data.forEach(user => {
    content += `<li>${user.name} (${user.email})</li>`;
  });
  content += `</ul>`;

  document.getElementById("skillSearchResults").innerHTML = `<div class="result-box">${content}</div>`;
}

async function handleFindMatches() {
  const skill = document.getElementById("matchSkillInput").value;
  const res = await fetch(`${API}/match_skill/${skill}`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  let content = `<strong>Matches for:</strong> ${skill}<ul>`;
  data.forEach(user => {
    content += `<li>${user.name} (${user.email})</li>`;
  });
  content += `</ul>`;

  document.getElementById("matchResults").innerHTML = `<div class="result-box">${content}</div>`;
}

async function handleViewProfile() {
  const id = document.getElementById("profileUserId").value;
  const res = await fetch(`${API}/user/${id}`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  if (data.error) {
    document.getElementById("profileResult").innerHTML = `<div class="result-box">${data.error}</div>`;
    return;
  }

  let content = `<strong>Name:</strong> ${data.name}<br><strong>Email:</strong> ${data.email}<br><br><strong>Skills:</strong><ul>`;
  data.skills.forEach(skill => {
    content += `<li>${skill.skill_name} (${skill.skill_type})</li>`;
  });
  content += `</ul>`;

  document.getElementById("profileResult").innerHTML = `<div class="result-box">${content}</div>`;
}

async function loadAllUsers() {
  const res = await fetch(`${API}/all_users`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  let content = `<strong>All Users:</strong><ul>`;
  data.forEach(user => {
    content += `<li>${user.name} (${user.email})</li>`;
  });
  content += `</ul>`;

  document.getElementById("userSearchResults").innerHTML = `<div class="result-box">${content}</div>`;
}

async function loadAllSkills() {
  const res = await fetch(`${API}/all_skills`, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem("token")
    }
  });
  const data = await res.json();

  let content = `<strong>All Skills:</strong><ul>`;
  data.forEach(skill => {
    content += `<li>${skill}</li>`;
  });
  content += `</ul>`;

  document.getElementById("skillSearchResults").innerHTML = `<div class="result-box">${content}</div>`;
}

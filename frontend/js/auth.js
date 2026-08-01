// If already logged in, skip straight to the dashboard.
if (getToken()) {
  window.location.href = 'dashboard.html';
}

// Clicking "Continue with Google" navigates to the backend's OAuth start
// route — this is a real page navigation (not a fetch), since the whole
// point is to leave our site, log in on Google's site, then come back.
document.getElementById('googleBtn').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = `${API_BASE}/auth/google`;
});

let isSignupMode = false;

const nameField = document.getElementById('nameField');
const pageSubtitle = document.getElementById('pageSubtitle');
const submitBtn = document.getElementById('submitBtn');
const toggleLink = document.getElementById('toggleLink');
const errorBox = document.getElementById('errorBox');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('visible');
}

function clearError() {
  errorBox.classList.remove('visible');
}

// Toggling between login/signup just swaps labels and which field is shown —
// same form, same submit handler, less duplicated markup.
toggleLink.addEventListener('click', () => {
  isSignupMode = !isSignupMode;
  clearError();

  if (isSignupMode) {
    nameField.style.display = 'block';
    pageSubtitle.textContent = 'Create an account to get started';
    submitBtn.textContent = 'Sign Up';
    toggleLink.textContent = 'Already have an account? Log in';
  } else {
    nameField.style.display = 'none';
    pageSubtitle.textContent = 'Log in to manage your shared expenses';
    submitBtn.textContent = 'Log In';
    toggleLink.textContent = "Don't have an account? Sign up";
  }
});

submitBtn.addEventListener('click', async () => {
  clearError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();

  if (!email || !password) {
    showError('Please fill in email and password');
    return;
  }
  if (isSignupMode && !name) {
    showError('Please enter your name');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = isSignupMode ? 'Signing up...' : 'Logging in...';

  try {
    const endpoint = isSignupMode ? '/auth/signup' : '/auth/login';
    const body = isSignupMode ? { name, email, password } : { email, password };

    const data = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setTokens(data.accessToken, data.refreshToken);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = isSignupMode ? 'Sign Up' : 'Log In';
  }
});

// Let pressing Enter in the password field submit the form too.
document.getElementById('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitBtn.click();
});
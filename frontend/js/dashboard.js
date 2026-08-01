requireAuth();

const groupsList = document.getElementById('groupsList');
const createGroupBtn = document.getElementById('createGroupBtn');
const createError = document.getElementById('createError');

async function loadGroups() {
  try {
    const groups = await apiFetch('/groups');

    if (groups.length === 0) {
      groupsList.innerHTML = '<div class="empty-state">No groups yet — create one above to get started.</div>';
      return;
    }

    // Clicking a group navigates to its detail page, passing the id in the URL.
    groupsList.innerHTML = groups
      .map(
        (g) => `
        <div class="group-item" onclick="window.location.href='group.html?id=${g.id}'">
          <span>${escapeHtml(g.name)}</span>
          <span style="color: #999;">›</span>
        </div>
      `
      )
      .join('');
  } catch (err) {
    groupsList.innerHTML = `<div class="empty-state">Failed to load groups: ${err.message}</div>`;
  }
}

// Basic escaping so a group named e.g. "<script>" can't break the page.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

createGroupBtn.addEventListener('click', async () => {
  createError.classList.remove('visible');
  const name = document.getElementById('groupName').value.trim();

  if (!name) {
    createError.textContent = 'Please enter a group name';
    createError.classList.add('visible');
    return;
  }

  createGroupBtn.disabled = true;
  createGroupBtn.textContent = 'Creating...';

  try {
    await apiFetch('/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    document.getElementById('groupName').value = '';
    await loadGroups();
  } catch (err) {
    createError.textContent = err.message;
    createError.classList.add('visible');
  } finally {
    createGroupBtn.disabled = false;
    createGroupBtn.textContent = 'Create Group';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearTokens();
  window.location.href = 'index.html';
});

loadGroups();